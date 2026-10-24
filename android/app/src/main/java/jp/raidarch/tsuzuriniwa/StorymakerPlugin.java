package jp.raidarch.tsuzuriniwa;

import android.app.Activity;
import android.accounts.Account;
import android.accounts.AccountManager;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.common.api.Scope;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.*;

@CapacitorPlugin(name = "Storymaker")
public class StorymakerPlugin extends Plugin {
  private final ExecutorService io = Executors.newFixedThreadPool(2);
  private static final String RELEASE_PREFIX = "https://raid-arch.github.io/storymaker/downloads/";
  private static final String LATEST =
      "https://raid-arch.github.io/storymaker/android-release.json";

  private ActivityResultLauncher<IntentSenderRequest> googleLauncher;
  private PluginCall googleCall;

  @Override
  public void load() {
    googleLauncher = bridge.registerForActivityResult(
      new ActivityResultContracts.StartIntentSenderForResult(), result -> {
        PluginCall call = googleCall;
        googleCall = null;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
          call.reject("Googleへの接続をキャンセルしました。");
          return;
        }
        try {
          finishGoogle(call, Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData()));
        } catch (Exception e) { call.reject("Googleへの接続を完了できませんでした。"); }
      });
  }

  private void finishGoogle(PluginCall call, AuthorizationResult result) {
    String token = result.getAccessToken();
    if (token == null || token.isEmpty() || result.getGrantedScopes() == null || !result.getGrantedScopes().contains("https://www.googleapis.com/auth/drive.appdata")) {
      call.reject("Google Driveへのアクセスが許可されませんでした。");
      return;
    }
    JSObject response = new JSObject();
    response.put("accessToken", token);
    call.resolve(response);
  }

  @PluginMethod
  public void googleAuthorize(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (googleCall != null) { call.reject("Googleへの接続処理中です。"); return; }
      String email = call.getString("email", "");
      if (email.isEmpty()) {
        if (!Boolean.TRUE.equals(call.getBoolean("interactive", false))) { call.reject("Googleへの接続が必要です。"); return; }
        googleCall = call;
        try {
          startActivityForResult(call, AccountManager.newChooseAccountIntent(null, null, new String[] { "com.google" }, null, null, null, null), "googleAccountSelected");
        } catch (Exception e) { googleCall = null; call.reject("Googleアカウントの選択画面を開けませんでした。"); }
      } else authorizeGoogle(call, email);
    });
  }

  @ActivityCallback
  private void googleAccountSelected(PluginCall call, ActivityResult result) {
    googleCall = null;
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("アカウントの選択をキャンセルしました。"); return; }
    String email = result.getData().getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
    if (email == null || email.isEmpty()) { call.reject("アカウントを確認できませんでした。"); return; }
    authorizeGoogle(call, email);
  }

  private void authorizeGoogle(PluginCall call, String email) {
    getActivity().runOnUiThread(() -> {
      if (googleCall != null) { call.reject("Googleへの接続処理中です。"); return; }
      AuthorizationRequest.Builder builder = AuthorizationRequest.builder()
        .setRequestedScopes(Arrays.asList(new Scope("https://www.googleapis.com/auth/drive.appdata")));
      if (!email.isEmpty()) builder.setAccount(new Account(email, "com.google"));
      googleCall = call;
      Identity.getAuthorizationClient(getActivity()).authorize(builder.build())
        .addOnSuccessListener(result -> {
          if (result.hasResolution()) {
            if (!Boolean.TRUE.equals(call.getBoolean("interactive", false))) {
              googleCall = null;
              call.reject("Googleへの再接続が必要です。");
              return;
            }
            try {
              googleLauncher.launch(new IntentSenderRequest.Builder(result.getPendingIntent().getIntentSender()).build());
            } catch (Exception e) { googleCall = null; call.reject("Googleの接続画面を開けませんでした。"); }
          } else { googleCall = null; finishGoogle(call, result); }
        })
        .addOnFailureListener(error -> { googleCall = null; call.reject("Google認証に失敗しました。アプリ登録を確認してください。"); });
    });
  }

  private PackageInfo current() throws Exception {
    return getContext()
        .getPackageManager()
        .getPackageInfo(getContext().getPackageName(), PackageManager.GET_SIGNATURES);
  }

  private long code(PackageInfo info) {
    return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
  }

  private HttpURLConnection connection(String url) throws Exception {
    if (!url.startsWith(RELEASE_PREFIX) && !url.equals(LATEST))
      throw new IOException("更新先が正しくありません。");
    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
    c.setConnectTimeout(15000);
    c.setReadTimeout(30000);
    c.setRequestProperty("User-Agent", "Tsuzuriniwa-Android");
    c.setInstanceFollowRedirects(true);
    c.setUseCaches(false);
    c.setRequestProperty("Cache-Control", "no-cache");
    if (c.getResponseCode() != 200) {
      c.disconnect();
      throw new IOException("更新サーバーに接続できませんでした。");
    }
    return c;
  }

  private JSONObject json(String url) throws Exception {
    HttpURLConnection c = connection(url);
    try (InputStream input = c.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[8192];
      int size;
      while ((size = input.read(buffer)) != -1) {
        out.write(buffer, 0, size);
        if (out.size() > 1024 * 1024) throw new IOException("更新情報が大きすぎます。");
      }
      return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
    } finally {
      c.disconnect();
    }
  }

  private JSObject latest() throws Exception {
    PackageInfo installed = current();
    JSONObject remote = json(LATEST);
    long version = remote.getLong("versionCode");
    String url = remote.getString("apkUrl"), hash = remote.getString("sha256");
    if (version < 1
        || version > 2100000000L
        || !url.startsWith(RELEASE_PREFIX)
        || !url.endsWith(".apk")
        || !hash.matches("[0-9a-f]{64}")) throw new IOException("更新情報の形式が正しくありません。");
    JSObject result = new JSObject();
    result.put("available", version > code(installed));
    result.put("installedVersion", installed.versionName);
    result.put("versionName", remote.getString("versionName"));
    result.put("versionCode", version);
    result.put("apkUrl", url);
    result.put("sha256", hash);
    return result;
  }

  @PluginMethod
  public void checkUpdate(PluginCall call) {
    io.execute(
        () -> {
          try {
            call.resolve(latest());
          } catch (Exception e) {
            call.reject("更新を確認できませんでした。通信状態を確認してください。", e);
          }
        });
  }

  @PluginMethod
  public void minimize(PluginCall call) {
    getActivity()
        .runOnUiThread(
            () -> {
              getActivity().moveTaskToBack(true);
              call.resolve();
            });
  }

  @PluginMethod
  public void installUpdate(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 26
        && !getContext().getPackageManager().canRequestPackageInstalls()) {
      Intent intent =
          new Intent(
              Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
              Uri.parse("package:" + getContext().getPackageName()));
      getActivity().startActivity(intent);
      JSObject result = new JSObject();
      result.put("permissionRequired", true);
      call.resolve(result);
      return;
    }
    io.execute(
        () -> {
          File apk = null;
          try {
            JSObject update = latest();
            if (!update.getBoolean("available", false)) throw new IOException("すでに最新のAPKです。");
            File folder = new File(getContext().getCacheDir(), "updates");
            if (!folder.exists() && !folder.mkdirs()) throw new IOException("保存先を作成できません。");
            apk = new File(folder, "tsuzuriniwa-update.apk");
            HttpURLConnection c = connection(update.getString("apkUrl"));
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long total = 0;
            try (InputStream input = c.getInputStream();
                OutputStream output = new FileOutputStream(apk)) {
              byte[] buffer = new byte[32768];
              int n;
              while ((n = input.read(buffer)) != -1) {
                total += n;
                if (total > 100L * 1024 * 1024) throw new IOException("APKのサイズが上限を超えています。");
                digest.update(buffer, 0, n);
                output.write(buffer, 0, n);
              }
            } finally {
              c.disconnect();
            }
            StringBuilder hash = new StringBuilder();
            for (byte b : digest.digest()) hash.append(String.format("%02x", b & 255));
            if (!hash.toString().equals(update.getString("sha256")))
              throw new IOException("ダウンロードが完全ではありません。再試行してください。");
            PackageInfo
                archive =
                    getContext()
                        .getPackageManager()
                        .getPackageArchiveInfo(
                            apk.getAbsolutePath(), PackageManager.GET_SIGNATURES),
                installed = current();
            if (archive == null
                || !installed.packageName.equals(archive.packageName)
                || code(archive) <= code(installed)
                || !Arrays.equals(installed.signatures, archive.signatures))
              throw new IOException("同じアプリの正規の更新APKではありません。");
            Uri uri =
                FileProvider.getUriForFile(
                    getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent intent =
                new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity()
                .runOnUiThread(
                    () -> {
                      try {
                        getActivity().startActivity(intent);
                        call.resolve();
                      } catch (Exception e) {
                        call.reject("Androidの更新画面を開けませんでした。", e);
                      }
                    });
          } catch (Exception e) {
            if (apk != null) apk.delete();
            call.reject(e.getMessage() == null ? "更新できませんでした。" : e.getMessage(), e);
          }
        });
  }

  @PluginMethod
  public void exportFile(PluginCall call) {
    String name = call.getString("name", "settings.json").replaceAll("[/\\\\]", "_");
    String mime = call.getString("type", "application/json");
    if (!Arrays.asList("application/json", "text/markdown", "text/plain").contains(mime))
      mime = "text/plain";
    Intent intent =
        new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mime)
            .putExtra(Intent.EXTRA_TITLE, name);
    startActivityForResult(call, intent, "exportResult");
  }

  @ActivityCallback
  private void exportResult(PluginCall call, ActivityResult result) {
    if (call == null) return;
    JSObject response = new JSObject();
    if (result.getResultCode() != Activity.RESULT_OK
        || result.getData() == null
        || result.getData().getData() == null) {
      response.put("saved", false);
      call.resolve(response);
      return;
    }
    Uri uri = result.getData().getData();
    io.execute(
        () -> {
          try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (out == null) throw new IOException("保存先を開けませんでした。");
            out.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
            response.put("saved", true);
            call.resolve(response);
          } catch (Exception e) {
            call.reject("ファイルを保存できませんでした。空き容量と保存先を確認してください。", e);
          }
        });
  }

  @Override
  protected void handleOnDestroy() {
    io.shutdown();
  }
}
