package com.minto.food;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Enable Edge-to-Edge display for Android 10 (API 29) to Android 15 (API 35+)
        EdgeToEdge.enable(this);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        super.onCreate(savedInstanceState);

        // Apply system bar insets handling to prevent UI elements from being hidden behind system bars
        if (this.bridge != null && this.bridge.getWebView() != null) {
            ViewCompat.setOnApplyWindowInsetsListener(this.bridge.getWebView(), (view, insets) -> {
                return insets;
            });
        }
    }
}
