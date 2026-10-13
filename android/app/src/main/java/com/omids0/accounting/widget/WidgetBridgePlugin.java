package com.omids0.accounting.widget;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The web app hands over the widget snapshot (widgetNative.ts); the widgets redraw from it. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void setSnapshot(PluginCall call) {
        String json = call.getString("json", "");

        WidgetStore.save(getContext(), json == null ? "" : json);
        AccountingWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
