package com.omids0.accounting;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.omids0.accounting.banksms.BankSmsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge starts.
        registerPlugin(BankSmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
