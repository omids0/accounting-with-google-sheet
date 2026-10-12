package com.omids0.accounting.banksms;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.omids0.accounting.MainActivity;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Evening summary of what was left undone today: bank SMS still waiting for review and
 * whether anything was recorded. The body is built when the alarm fires, from values the
 * web app mirrors into SharedPreferences, so the app does not need to be running.
 * Alarms are dropped on reboot and on update, so those broadcasts schedule it again.
 */
public class NightlyDigest extends BroadcastReceiver {

    static final String CHANNEL_ID = "nightly-digest";

    /** Opened through the App plugin's appUrlOpen event; the web app routes it to /entry. */
    static final String ENTRY_URL = "com.omids0.accounting://entry";

    private static final int REQUEST_CODE = 7303;
    private static final int NOTIFICATION_ID = 7304;
    private static final String PREFS_NAME = "nightly_digest";
    private static final String PREF_ENABLED = "enabled";
    private static final String PREF_HOUR = "hour";
    private static final String PREF_MINUTE = "minute";
    private static final String PREF_LAST_OPERATION = "last_operation_date";
    private static final String PREF_NOTES = "notes";
    private static final String PREF_NOTES_DATE = "notes_date";
    private static final int DEFAULT_HOUR = 21;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            schedule(context);
            if (BankSmsStore.isEnabled(context)) BankSmsDailyCheck.schedule(context);
            return;
        }

        if (!isEnabled(context)) return;

        // An inexact alarm can slip past midnight; "today" would then describe the wrong day.
        if (Calendar.getInstance().get(Calendar.HOUR_OF_DAY) < prefs(context).getInt(PREF_HOUR, DEFAULT_HOUR)) return;

        int smsCount = BankSmsStore.isEnabled(context) ? BankSmsStore.pendingInRangeCount(context) : 0;
        boolean recordedToday = today().equals(prefs(context).getString(PREF_LAST_OPERATION, ""));
        SharedPreferences digestPrefs = prefs(context);
        String notes = today().equals(digestPrefs.getString(PREF_NOTES_DATE, ""))
            ? digestPrefs.getString(PREF_NOTES, "")
            : "";
        String body = withNotes(body(smsCount, recordedToday), notes);

        if (body != null) notifyDigest(context, body, smsCount > 0 ? BankSmsNotifier.OPEN_URL : ENTRY_URL);
    }

    /** Null when nothing was left undone, so no notification is shown. */
    static String body(int smsCount, boolean recordedToday) {
        String sms = smsCount > 0 ? "امروز " + persianDigits(smsCount) + " پیامک بانکی ثبت نشده" : null;

        if (recordedToday) return sms;
        if (sms == null) return "امروز هنوز چیزی ثبت نکردی";

        return sms + " و هنوز چیزی ثبت نکردی";
    }

    /** Budget alerts go under the undone-today line; alone when nothing else is undone. */
    static String withNotes(String body, String notes) {
        if (notes == null || notes.trim().isEmpty()) return body;
        if (body == null) return notes.trim();

        return body + "\n" + notes.trim();
    }

    static void configure(Context context, boolean enabled, int hour, int minute) {
        prefs(context)
            .edit()
            .putBoolean(PREF_ENABLED, enabled)
            .putInt(PREF_HOUR, clamp(hour, 0, 23))
            .putInt(PREF_MINUTE, clamp(minute, 0, 59))
            .apply();
        schedule(context);
    }

    static void setLastOperationDate(Context context, String date) {
        prefs(context).edit().putString(PREF_LAST_OPERATION, date == null ? "" : date.trim()).apply();
    }

    static void setNotes(Context context, String date, String lines) {
        prefs(context)
            .edit()
            .putString(PREF_NOTES_DATE, date == null ? "" : date.trim())
            .putString(PREF_NOTES, lines == null ? "" : lines)
            .apply();
    }

    /** Safe to call often: the same PendingIntent replaces the earlier alarm. */
    static void schedule(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarms == null) return;

        if (!isEnabled(context)) {
            alarms.cancel(pendingIntent(context));
            return;
        }

        SharedPreferences prefs = prefs(context);

        alarms.setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            nextRun(System.currentTimeMillis(), prefs.getInt(PREF_HOUR, DEFAULT_HOUR), prefs.getInt(PREF_MINUTE, 0)),
            AlarmManager.INTERVAL_DAY,
            pendingIntent(context)
        );
    }

    /** On by default, like the web app's rule, until the app mirrors the user's choice. */
    private static boolean isEnabled(Context context) {
        return prefs(context).getBoolean(PREF_ENABLED, true);
    }

    static long nextRun(long now, int hour, int minute) {
        Calendar next = Calendar.getInstance();

        next.setTimeInMillis(now);
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        if (next.getTimeInMillis() <= now) next.add(Calendar.DAY_OF_MONTH, 1);

        return next.getTimeInMillis();
    }

    private static void notifyDigest(Context context, String body, String url) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);

        // Covers Android 13+ POST_NOTIFICATIONS as well as notifications turned off by the user.
        if (!manager.areNotificationsEnabled()) return;

        ensureChannel(context);

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url));

        open.setClass(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pending = PendingIntent.getActivity(context, NOTIFICATION_ID, open, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(BankSmsNotifier.smallIcon(context))
            .setContentTitle("جمع‌بندی شبانه")
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        try {
            manager.notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // POST_NOTIFICATIONS was revoked between the check and the post.
        }
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);

        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        manager.createNotificationChannel(
            new NotificationChannel(CHANNEL_ID, "جمع‌بندی شبانه", NotificationManager.IMPORTANCE_DEFAULT)
        );
    }

    private static PendingIntent pendingIntent(Context context) {
        Intent intent = new Intent(context, NightlyDigest.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Same local `yyyy-MM-dd` as the web app's toIsoDate. */
    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static String persianDigits(int value) {
        String digits = String.valueOf(value);
        StringBuilder out = new StringBuilder(digits.length());

        for (int i = 0; i < digits.length(); i++) {
            char c = digits.charAt(i);

            out.append(c >= '0' && c <= '9' ? (char) ('۰' + (c - '0')) : c);
        }

        return out.toString();
    }
}
