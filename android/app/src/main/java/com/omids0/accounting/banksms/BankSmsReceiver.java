package com.omids0.accounting.banksms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Stores bank-like SMS as they arrive, even while the app is closed. */
public class BankSmsReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
        if (!BankSmsStore.isEnabled(context)) return;

        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);

        if (messages == null || messages.length == 0) return;

        // A long SMS arrives as several parts; join the parts per sender.
        Map<String, StringBuilder> bodies = new LinkedHashMap<>();

        for (SmsMessage message : messages) {
            if (message == null) continue;

            String sender = message.getDisplayOriginatingAddress();
            String part = message.getDisplayMessageBody();

            if (sender == null) sender = "";

            StringBuilder body = bodies.get(sender);

            if (body == null) {
                body = new StringBuilder();
                bodies.put(sender, body);
            }
            if (part != null) body.append(part);
        }

        long now = System.currentTimeMillis();
        List<BankSmsStore.Candidate> candidates = new ArrayList<>();

        for (Map.Entry<String, StringBuilder> entry : bodies.entrySet()) {
            String body = entry.getValue().toString();

            if (BankSmsFilter.isBankLike(body)) {
                candidates.add(new BankSmsStore.Candidate(entry.getKey(), body, now, "live"));
            }
        }

        if (BankSmsStore.addAll(context, candidates) > 0) {
            BankSmsNotifier.notifyPending(context, BankSmsStore.pendingCount(context));
        }
    }
}
