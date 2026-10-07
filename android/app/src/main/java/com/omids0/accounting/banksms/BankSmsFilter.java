package com.omids0.accounting.banksms;

import java.util.regex.Pattern;

/** Cheap prefilter run on every incoming SMS; real parsing happens in TypeScript. */
final class BankSmsFilter {

    /** Keep equal to BANK_SMS_KEYWORDS in src/services/bankSmsText.ts (a vitest checks it). */
    static final String[] BANK_SMS_KEYWORDS = {
        "مبلغ",
        "ریال",
        "تومان",
        "مانده",
        "موجودی",
        "برداشت",
        "واریز",
        "خرید",
        "انتقال"
    };

    private static final Pattern THREE_DIGITS = Pattern.compile("\\d{3,}");

    private BankSmsFilter() {}

    /** ASCII digits, Persian ye/kaf, no thousands separators. */
    static String normalize(String text) {
        StringBuilder out = new StringBuilder(text.length());

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);

            if (c >= 0x06F0 && c <= 0x06F9) {
                out.append((char) ('0' + (c - 0x06F0)));
            } else if (c >= 0x0660 && c <= 0x0669) {
                out.append((char) ('0' + (c - 0x0660)));
            } else if (c == 0x064A) {
                out.append((char) 0x06CC);
            } else if (c == 0x0643) {
                out.append((char) 0x06A9);
            } else if (c != ',' && c != 0x060C && c != 0x066C) {
                out.append(c);
            }
        }

        return out.toString();
    }

    static boolean isBankLike(String body) {
        if (body == null) return false;

        String text = normalize(body);

        if (!THREE_DIGITS.matcher(text).find()) return false;

        for (String word : BANK_SMS_KEYWORDS) {
            if (text.contains(word)) return true;
        }

        return false;
    }
}
