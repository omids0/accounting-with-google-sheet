package com.omids0.accounting.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import com.omids0.accounting.MainActivity;
import com.omids0.accounting.R;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

/**
 * Home-screen widget. It draws the last snapshot the app stored (WidgetStore)
 * and never touches the network; the subclasses only pick the size.
 */
public abstract class AccountingWidgetProvider extends AppWidgetProvider {

    static final String URL_EXPENSE = "com.omids0.accounting://entry?action=expense";
    static final String URL_INCOME = "com.omids0.accounting://entry?action=income";
    static final String URL_SMS = "com.omids0.accounting://bank-sms";
    static final String URL_DASHBOARD = "com.omids0.accounting://dashboard";

    private static final int REQUEST_BODY = 7100;
    private static final int REQUEST_EXPENSE = 7101;
    private static final int REQUEST_INCOME = 7102;
    private static final int REQUEST_SMS = 7103;

    protected abstract boolean isLarge();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        if (appWidgetIds == null) return;

        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, buildViews(context, isLarge()));
        }
    }

    /** Redraws every placed widget of both sizes (after the app sent a new snapshot). */
    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        if (manager == null) return;

        refresh(context, manager, LargeWidgetProvider.class, true);
        refresh(context, manager, SmallWidgetProvider.class, false);
    }

    private static void refresh(Context context, AppWidgetManager manager, Class<?> provider, boolean large) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));

        if (ids == null) return;

        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context, large));
        }
    }

    static RemoteViews buildViews(Context context, boolean large) {
        JSONObject json = parse(WidgetStore.load(context));

        if (json == null || json.optBoolean("empty", false)) return emptyViews(context);

        return large ? largeViews(context, json) : smallViews(context, json);
    }

    private static JSONObject parse(String text) {
        if (text == null || text.trim().isEmpty()) return null;

        try {
            return new JSONObject(text);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static RemoteViews emptyViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_empty);

        views.setOnClickPendingIntent(R.id.widget_root, open(context, URL_DASHBOARD, REQUEST_BODY));
        views.setOnClickPendingIntent(R.id.widget_open, open(context, URL_DASHBOARD, REQUEST_BODY));

        return views;
    }

    private static RemoteViews largeViews(Context context, JSONObject json) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_large);
        boolean hidden = json.optBoolean("hidden", false);
        String accounts = json.optString("accountsLabel", "").trim();
        String title = context.getString(R.string.app_name) + (accounts.isEmpty() ? "" : " · " + accounts);
        int pendingSms = json.optInt("pendingSms", 0);

        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_time, WidgetText.time(json.optString("updatedAt", "")));
        views.setTextViewText(
            R.id.widget_amount,
            hidden ? WidgetText.HIDDEN : WidgetText.amount(json.optDouble("netAvailable", 0))
        );
        views.setTextViewText(R.id.widget_line, summaryLine(json, hidden, pendingSms));
        views.setTextViewText(
            R.id.widget_sms,
            context.getString(R.string.widget_sms) + (pendingSms > 0 ? " " + WidgetText.digits(String.valueOf(pendingSms)) : "")
        );

        views.setOnClickPendingIntent(R.id.widget_root, open(context, URL_DASHBOARD, REQUEST_BODY));
        views.setOnClickPendingIntent(R.id.widget_expense, open(context, URL_EXPENSE, REQUEST_EXPENSE));
        views.setOnClickPendingIntent(R.id.widget_income, open(context, URL_INCOME, REQUEST_INCOME));
        views.setOnClickPendingIntent(R.id.widget_sms, open(context, URL_SMS, REQUEST_SMS));

        return views;
    }

    private static RemoteViews smallViews(Context context, JSONObject json) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_small);
        boolean hidden = json.optBoolean("hidden", false);

        views.setTextViewText(
            R.id.widget_amount,
            hidden ? WidgetText.HIDDEN : WidgetText.shortAmount(json.optDouble("netAvailable", 0))
        );
        views.setOnClickPendingIntent(R.id.widget_root, open(context, URL_DASHBOARD, REQUEST_BODY));
        views.setOnClickPendingIntent(R.id.widget_expense, open(context, URL_EXPENSE, REQUEST_EXPENSE));

        return views;
    }

    /** «هزینهٔ مهر ۱۹٫۴ م · ۳ پیامک ثبت‌نشده · وام مسکن ۵ مهر»; empty parts are left out. */
    private static String summaryLine(JSONObject json, boolean hidden, int pendingSms) {
        List<String> parts = new ArrayList<>();
        String month = json.optString("monthLabel", "").trim();
        String expense = hidden ? WidgetText.HIDDEN : WidgetText.shortAmount(json.optDouble("monthExpense", 0));

        parts.add(("هزینهٔ " + month).trim() + " " + expense);

        if (pendingSms > 0) parts.add(WidgetText.digits(String.valueOf(pendingSms)) + " پیامک ثبت‌نشده");

        JSONObject next = json.optJSONObject("nextDue");

        if (next != null) {
            String due = (next.optString("title", "").trim() + " " + next.optString("day", "").trim()).trim();

            if (!due.isEmpty()) parts.add(due);
        }

        return join(parts);
    }

    private static String join(List<String> parts) {
        StringBuilder out = new StringBuilder();

        for (String part : parts) {
            if (part == null || part.isEmpty()) continue;
            if (out.length() > 0) out.append(" · ");
            out.append(part);
        }

        return out.toString();
    }

    /** The same explicit VIEW intent as the launcher shortcuts; useLaunchAction routes the URL. */
    private static PendingIntent open(Context context, String url, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));

        intent.setClass(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
