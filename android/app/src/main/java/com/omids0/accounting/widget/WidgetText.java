package com.omids0.accounting.widget;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Persian numbers for the widget, the same rules as formatWidgetAmount /
 * formatWidgetShort in widgetSnapshot.ts. Month names arrive in the JSON.
 */
public final class WidgetText {

    public static final String HIDDEN = "••••••";

    private static final char[] DIGITS = { '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹' };
    private static final char GROUP = '٬';
    private static final char DECIMAL = '٫';
    private static final String MINUS = "−";
    private static final double MILLION = 1_000_000d;

    private WidgetText() {}

    /** ASCII digits to Persian; everything else stays. */
    public static String digits(String text) {
        if (text == null) return "";

        StringBuilder out = new StringBuilder(text.length());

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);

            out.append(c >= '0' && c <= '9' ? DIGITS[c - '0'] : c);
        }

        return out.toString();
    }

    private static String grouped(long value) {
        String plain = Long.toString(Math.abs(value));
        StringBuilder out = new StringBuilder();

        for (int i = 0; i < plain.length(); i++) {
            if (i > 0 && (plain.length() - i) % 3 == 0) out.append(GROUP);
            out.append(plain.charAt(i));
        }

        return digits(out.toString());
    }

    /** «۲۹٬۷۷۰٬۰۰۰» */
    public static String amount(double value) {
        long rounded = Math.round(value);

        return (rounded < 0 ? MINUS : "") + grouped(rounded);
    }

    /** One decimal at most, «٫» as the separator: 29.77 → «۲۹٫۸», 3.0 → «۳». */
    private static String oneDecimal(double value) {
        long tenths = Math.round(value * 10);
        long whole = tenths / 10;
        long fraction = tenths % 10;
        String text = grouped(whole);

        return fraction == 0 ? text : text + DECIMAL + DIGITS[(int) fraction];
    }

    /** «۲۹٫۸ م» from a million, «۸۵۰ هزار» from 100 thousand, else «۱۲٬۰۰۰». */
    public static String shortAmount(double value) {
        String sign = value < 0 ? MINUS : "";
        double abs = Math.abs(value);

        if (abs >= 1000 * MILLION) return sign + oneDecimal(abs / (1000 * MILLION)) + " میلیارد";
        if (abs >= MILLION) return sign + oneDecimal(abs / MILLION) + " م";
        if (abs >= 100_000) return sign + grouped(Math.round(abs / 1000)) + " هزار";

        return sign + grouped(Math.round(abs));
    }

    /** «۱۴:۰۵» in local time from an ISO instant such as 2026-10-13T10:35:00.000Z; "" if unreadable. */
    public static String time(String iso) {
        if (iso == null || iso.length() < 19) return "";

        try {
            SimpleDateFormat parser = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);

            parser.setTimeZone(TimeZone.getTimeZone("UTC"));

            Date date = parser.parse(iso.substring(0, 19));

            if (date == null) return "";

            Calendar local = Calendar.getInstance();

            local.setTime(date);

            return digits(String.format(
                Locale.US,
                "%02d:%02d",
                local.get(Calendar.HOUR_OF_DAY),
                local.get(Calendar.MINUTE)
            ));
        } catch (Exception ignored) {
            return "";
        }
    }
}
