package com.omids0.accounting.banksms;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.omids0.accounting.MainActivity;

/** One summary notification; it never shows amounts or account names (lock screen). */
final class BankSmsNotifier {

    static final String CHANNEL_ID = "bank-sms";

    /** Opened through the App plugin's appUrlOpen event; the web app routes it to /bank-sms. */
    static final String OPEN_URL = "com.omids0.accounting://bank-sms";

    private static final int NOTIFICATION_ID = 7301;

    private BankSmsNotifier() {}

    static void notifyPending(Context context, int count) {
        if (count <= 0) return;

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);

        if (!manager.areNotificationsEnabled()) return;

        ensureChannel(context);

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(OPEN_URL));

        open.setClass(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pending = PendingIntent.getActivity(context, NOTIFICATION_ID, open, flags);
        String text = count == 1
            ? "یک پیامک بانکی در انتظار بررسی است"
            : count + " پیامک بانکی در انتظار بررسی است";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIcon(context))
            .setContentTitle("پیامک بانکی جدید")
            .setContentText(text)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        try {
            manager.notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // POST_NOTIFICATIONS was revoked; the queue still shows the SMS in the app.
        }
    }

    static void cancel(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);

        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        manager.createNotificationChannel(
            new NotificationChannel(CHANNEL_ID, "پیامک‌های بانکی", NotificationManager.IMPORTANCE_DEFAULT)
        );
    }

    private static int smallIcon(Context context) {
        int id = context.getResources().getIdentifier("ic_stat_reminder", "drawable", context.getPackageName());

        return id != 0 ? id : context.getApplicationInfo().icon;
    }
}
