package com.omids0.accounting.widget;

import android.content.Context;
import android.content.SharedPreferences;

/** The last snapshot the web app sent; the widget only reads it, never the network. */
public final class WidgetStore {

    private static final String PREFS_NAME = "accounting_widget";
    private static final String KEY_SNAPSHOT = "snapshot";

    private WidgetStore() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static void save(Context context, String json) {
        prefs(context).edit().putString(KEY_SNAPSHOT, json == null ? "" : json).apply();
    }

    /** The JSON string, or "" when nothing was sent yet. */
    public static String load(Context context) {
        String json = prefs(context).getString(KEY_SNAPSHOT, "");

        return json == null ? "" : json;
    }
}
