package com.omids0.accounting;

import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.omids0.accounting.banksms.BankSmsPlugin;
import com.omids0.accounting.widget.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge starts.
        registerPlugin(BankSmsPlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);

        // The in-app toggle picks light or dark; WebView must not darken the light theme.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getBridge().getWebView().getSettings().setAlgorithmicDarkeningAllowed(false);
        }
    }
}
