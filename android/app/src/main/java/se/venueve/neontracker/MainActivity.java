package se.venueve.neontracker;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Required by @capacitor-community/safe-area: draw behind the system
        // bars so the web layer handles insets via env(safe-area-inset-*).
        EdgeToEdge.enable(this);
    }
}
