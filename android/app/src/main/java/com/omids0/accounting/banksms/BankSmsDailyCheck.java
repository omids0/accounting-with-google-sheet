package com.omids0.accounting.banksms;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;

/**
 * Once a day: remind about bank SMS still waiting inside the review range, and clear a
 * stale notification once nothing in the range is left. Alarms do not survive a reboot,
 * so every app start and every captured SMS schedules it again.
 */
public class BankSmsDailyCheck extends BroadcastReceiver {

    private static final int REQUEST_CODE = 7302;
    private static final int HOUR_OF_DAY = 10;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!BankSmsStore.isEnabled(context)) return;

        int count = BankSmsStore.pendingInRangeCount(context);

        if (count > 0) {
            BankSmsNotifier.notifyPending(context, count, "یادآوری پیامک‌های بانکی");
        } else {
            BankSmsNotifier.cancel(context);
        }
    }

    /** Safe to call often: the same PendingIntent replaces the earlier alarm. */
    static void schedule(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarms == null) return;

        alarms.setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            nextRun(System.currentTimeMillis()),
            AlarmManager.INTERVAL_DAY,
            pendingIntent(context)
        );
    }

    static void cancel(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarms != null) alarms.cancel(pendingIntent(context));
    }

    /** Next 10:00 local time. */
    static long nextRun(long now) {
        Calendar next = Calendar.getInstance();

        next.setTimeInMillis(now);
        next.set(Calendar.HOUR_OF_DAY, HOUR_OF_DAY);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        if (next.getTimeInMillis() <= now) next.add(Calendar.DAY_OF_MONTH, 1);

        return next.getTimeInMillis();
    }

    private static PendingIntent pendingIntent(Context context) {
        Intent intent = new Intent(context, BankSmsDailyCheck.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;

        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags);
    }
}
