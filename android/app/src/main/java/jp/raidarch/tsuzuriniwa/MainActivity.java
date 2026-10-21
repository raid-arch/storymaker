package jp.raidarch.tsuzuriniwa;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle state) {
    registerPlugin(StorymakerPlugin.class);
    super.onCreate(state);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    getWindow().setStatusBarColor(Color.rgb(17, 26, 23));
    getWindow().setNavigationBarColor(Color.rgb(17, 26, 23));
    ViewCompat.setOnApplyWindowInsetsListener(
        findViewById(android.R.id.content),
        (view, insets) -> {
          Insets safe =
              insets.getInsets(
                  WindowInsetsCompat.Type.systemBars()
                      | WindowInsetsCompat.Type.displayCutout()
                      | WindowInsetsCompat.Type.ime());
          view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
          return WindowInsetsCompat.CONSUMED;
        });
    getOnBackPressedDispatcher()
        .addCallback(
            this,
            new OnBackPressedCallback(true) {
              @Override
              public void handleOnBackPressed() {
                emit("native-back");
              }
            });
  }

  private void emit(String event) {
    if (bridge != null)
      bridge
          .getWebView()
          .evaluateJavascript("window.dispatchEvent(new Event('" + event + "'))", null);
  }

  @Override
  public void onPause() {
    emit("native-pause");
    super.onPause();
  }

  @Override
  public void onResume() {
    super.onResume();
    emit("native-resume");
  }
}
