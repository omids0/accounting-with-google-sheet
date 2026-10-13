package com.omids0.accounting.banksms;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.provider.Telephony;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Bridge for bank SMS capture. It only stores and hands over raw SMS;
 * templates, matching and Sheets writes all live in the web app.
 */
@CapacitorPlugin(
    name = "BankSms",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS })
    }
)
public class BankSmsPlugin extends Plugin {

    private static final String SMS = "sms";
    private static final int MAX_SCAN_ROWS = 1000;
    private static final int MAX_LIST_ROWS = 300;
    private static final String[] PROJECTION = { Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE };

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));

        BankSmsStore.setEnabled(getContext(), enabled);

        if (enabled) {
            BankSmsDailyCheck.schedule(getContext());
        } else {
            BankSmsStore.clearPending(getContext());
            BankSmsNotifier.cancel(getContext());
            BankSmsDailyCheck.cancel(getContext());
        }

        call.resolve();
    }

    /** Alarms do not survive a reboot or an update; every app start arms the digest again. */
    @Override
    public void load() {
        NightlyDigest.schedule(getContext());
    }

    @PluginMethod
    public void setNightlyDigest(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);
        Integer hour = call.getInt("hour", 21);
        Integer minute = call.getInt("minute", 0);

        NightlyDigest.configure(
            getContext(),
            !Boolean.FALSE.equals(enabled),
            hour == null ? 21 : hour,
            minute == null ? 0 : minute
        );
        call.resolve();
    }

    @PluginMethod
    public void setLastOperationDate(PluginCall call) {
        NightlyDigest.setLastOperationDate(getContext(), call.getString("date", ""));
        call.resolve();
    }

    /** Budget alerts from the web app; shown in the digest of that date only. */
    @PluginMethod
    public void setDigestNotes(PluginCall call) {
        NightlyDigest.setNotes(getContext(), call.getString("date", ""), call.getString("lines", ""));
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        String packageName = getContext().getPackageName();
        Intent intent;

        if (Build.VERSION.SDK_INT >= 26) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Notification settings are not available", e);
        }
    }

    @PluginMethod
    public void setViewDays(PluginCall call) {
        Integer days = call.getInt("days", 7);

        BankSmsStore.setViewDays(getContext(), days == null ? 7 : days);

        // A narrower range can leave the shown count pointing at nothing listed.
        if (BankSmsStore.pendingInRangeCount(getContext()) == 0) BankSmsNotifier.cancel(getContext());

        call.resolve();
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject ret = new JSObject();

        ret.put("items", BankSmsStore.pending(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void markHandled(PluginCall call) {
        JSArray ids = call.getArray("ids");
        List<String> list = new ArrayList<>();

        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                String id = ids.optString(i, "");

                if (!id.isEmpty()) list.add(id);
            }
        }

        BankSmsStore.markHandled(getContext(), list);

        if (BankSmsStore.pendingInRangeCount(getContext()) == 0) BankSmsNotifier.cancel(getContext());

        call.resolve();
    }

    @PluginMethod
    public void scanInbox(PluginCall call) {
        if (getPermissionState(SMS) != PermissionState.GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }

        long since = parseMillis(call.getString("sinceMs", "0"));
        long scannedAt = System.currentTimeMillis();
        List<BankSmsStore.Candidate> candidates = new ArrayList<>();

        try (
            Cursor cursor = getContext()
                .getContentResolver()
                .query(
                    Telephony.Sms.Inbox.CONTENT_URI,
                    PROJECTION,
                    Telephony.Sms.DATE + " > ?",
                    new String[] { String.valueOf(since) },
                    // Newest first, so a capped scan keeps the most recent SMS.
                    Telephony.Sms.DATE + " DESC"
                )
        ) {
            while (cursor != null && cursor.moveToNext() && candidates.size() < MAX_SCAN_ROWS) {
                String body = cursor.getString(1);

                if (BankSmsFilter.isBankLike(body)) {
                    candidates.add(new BankSmsStore.Candidate(cursor.getString(0), body, cursor.getLong(2), "inbox"));
                }
            }
        } catch (RuntimeException e) {
            call.reject("Reading the SMS inbox failed", e);
            return;
        }

        JSObject ret = new JSObject();

        ret.put("added", BankSmsStore.addAll(getContext(), candidates));
        ret.put("scannedAt", scannedAt);
        call.resolve(ret);
    }

    @PluginMethod
    public void listInbox(PluginCall call) {
        if (getPermissionState(SMS) != PermissionState.GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }

        int limit = call.getInt("limit", 30);
        JSArray items = new JSArray();
        int scanned = 0;

        try (
            Cursor cursor = getContext()
                .getContentResolver()
                .query(Telephony.Sms.Inbox.CONTENT_URI, PROJECTION, null, null, Telephony.Sms.DATE + " DESC")
        ) {
            while (cursor != null && cursor.moveToNext() && items.length() < limit && scanned < MAX_LIST_ROWS) {
                scanned++;

                String body = cursor.getString(1);

                if (!BankSmsFilter.isBankLike(body)) continue;

                JSONObject item = new JSONObject();

                item.put("id", BankSmsStore.idFor(body));
                item.put("sender", cursor.getString(0) == null ? "" : cursor.getString(0));
                item.put("body", body);
                item.put("receivedAt", cursor.getLong(2));
                item.put("source", "inbox");
                items.put(item);
            }
        } catch (RuntimeException | JSONException e) {
            call.reject("Reading the SMS inbox failed", e);
            return;
        }

        JSObject ret = new JSObject();

        ret.put("items", items);
        call.resolve(ret);
    }

    /** Sent as a string: a JSON number can arrive as a Double and silently become 0. */
    private static long parseMillis(String raw) {
        try {
            return Math.max(0L, Long.parseLong(raw.trim()));
        } catch (RuntimeException e) {
            return 0L;
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        BankSmsStore.clear(getContext());
        BankSmsNotifier.cancel(getContext());
        call.resolve();
    }
}
