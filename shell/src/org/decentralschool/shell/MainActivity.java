package org.decentralschool.shell;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * A full-screen WebView that serves the game from assets/www/ at
 * https://appassets.androidplatform.net/ (a real https origin, so fetch(), modules and
 * localStorage behave as on the web). Runtime options come from assets/shell.json,
 * which the DecentralSchool studio (src/studio/apk) writes from the game's game.json.
 *
 * JavaScript sees one bridge object, window.AndroidShell:
 *   speak(text, lang[, rate])  text-to-speech with the device's engine
 *   stopSpeaking()
 *   info()                     JSON string: {"id", "version", "versionCode"}
 *   print(title)               Android print dialog (includes "Save as PDF")
 *   saveFile(name, mime, b64)  "Save to..." picker for a file the page made
 * and the shell calls window.onShellBack() on the system back gesture; return true from
 * it when the page handled the back press itself (e.g. closed a screen).
 *
 * WebView ignores window.print() and <a download> links, so WEB_SHIM routes both to the
 * bridge: pages written for a normal browser work unchanged.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ORIGIN = "https://" + HOST + "/";
    private static final String BACK_JS =
            "(function(){try{return !!(window.onShellBack&&window.onShellBack())}catch(e){return false}})()";
    private static final String WEB_SHIM = "(function(){"
            + "if(window.__shellShim||!window.AndroidShell)return;window.__shellShim=true;"
            + "var S=window.AndroidShell;"
            + "window.print=function(){S.print(document.title||'Document')};"
            // Remember blobs behind object URLs: pages often revoke the URL right after click().
            + "var blobs=new Map(),create=URL.createObjectURL,revoke=URL.revokeObjectURL;"
            + "URL.createObjectURL=function(o){var u=create.call(URL,o);if(o instanceof Blob)blobs.set(u,o);return u};"
            + "URL.revokeObjectURL=function(u){setTimeout(function(){blobs.delete(u)},60000);return revoke.call(URL,u)};"
            + "function isDownload(a){return a&&a.hasAttribute&&a.hasAttribute('download')&&a.href}"
            + "function save(a){var href=a.href,name=a.getAttribute('download')||href.split('/').pop()||'download';"
            + "var b=blobs.get(href);(b?Promise.resolve(b):fetch(href).then(function(r){return r.blob()})).then(function(b){"
            + "var r=new FileReader();r.onload=function(){var s=String(r.result);"
            + "S.saveFile(name,b.type||'application/octet-stream',s.slice(s.indexOf(',')+1))};r.readAsDataURL(b)"
            + "}).catch(function(e){console.error('download failed',e)})}"
            + "window.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;"
            + "if(isDownload(a)&&!e.defaultPrevented){e.preventDefault();save(a)}});"
            + "var click=HTMLAnchorElement.prototype.click;"
            + "HTMLAnchorElement.prototype.click=function(){if(!this.isConnected&&isDownload(this))return save(this);"
            + "return click.call(this)};"
            + "})()";
    private static final int REQUEST_SAVE = 1;

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady;
    private String[] pendingSpeech;
    private byte[] pendingSave;
    private OnBackInvokedCallback backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        JSONObject config = readConfig();

        int background = parseColor(config.optString("backgroundColor", "#ffffff"));
        applyOrientation(config.optString("orientation", "portrait"));
        if (config.optBoolean("keepScreenOn", false)) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        if (config.optBoolean("debug", false)) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(background);
        web = new WebView(this);
        web.setBackgroundColor(background);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        setUpSystemBars(root, background);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        web.setWebViewClient(new AssetClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "AndroidShell");

        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }

        web.loadUrl(ORIGIN + config.optString("start", "index.html"));
    }

    private JSONObject readConfig() {
        try (InputStream in = getAssets().open("shell.json")) {
            return new JSONObject(new String(readAll(in), StandardCharsets.UTF_8));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static int parseColor(String value) {
        try {
            return Color.parseColor(value);
        } catch (IllegalArgumentException e) {
            return Color.WHITE;
        }
    }

    private void applyOrientation(String value) {
        switch (value) {
            case "landscape":
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                break;
            case "any":
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
                break;
            default:
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }

    /** Draws edge to edge on every version and pads the page clear of the bars and keyboard. */
    @SuppressWarnings("deprecation")
    private void setUpSystemBars(View root, int background) {
        boolean light = (0.299 * Color.red(background) + 0.587 * Color.green(background)
                + 0.114 * Color.blue(background)) > 150;
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(light ? mask : 0, mask);
            }
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            });
        } else {
            getWindow().setStatusBarColor(background);
            getWindow().setNavigationBarColor(background);
            if (light) {
                int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                getWindow().getDecorView().setSystemUiVisibility(flags);
            }
        }
    }

    private void handleBack() {
        web.evaluateJavascript(BACK_JS, handled -> {
            if ("true".equals(handled)) return;
            if (web.canGoBack()) web.goBack();
            else finish();
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack(); // Android 12 and older; 13+ uses backCallback.
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        if (tts != null) tts.stop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (tts != null) tts.shutdown();
        web.destroy();
        super.onDestroy();
    }

    private void speak(String text, String lang, float rate) {
        if (tts == null) {
            pendingSpeech = new String[] {text, lang, Float.toString(rate)};
            tts = new TextToSpeech(this, status -> {
                ttsReady = status == TextToSpeech.SUCCESS;
                String[] pending = pendingSpeech;
                pendingSpeech = null;
                if (ttsReady && pending != null) {
                    speak(pending[0], pending[1], Float.parseFloat(pending[2]));
                }
            });
            return;
        }
        if (!ttsReady) {
            pendingSpeech = new String[] {text, lang, Float.toString(rate)};
            return;
        }
        if (lang != null && !lang.isEmpty()) tts.setLanguage(Locale.forLanguageTag(lang));
        tts.setSpeechRate(rate > 0 ? rate : 1f);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "shell");
    }

    private void saveFile(String name, String mime, byte[] data) {
        pendingSave = data;
        String type = mime == null ? "" : mime.split(";")[0].trim();
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(type.isEmpty() ? "application/octet-stream" : type)
                .putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(intent, REQUEST_SAVE);
        } catch (ActivityNotFoundException e) {
            pendingSave = null;
            Toast.makeText(this, "Saving files is not supported on this device", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_SAVE) return;
        byte[] bytes = pendingSave;
        pendingSave = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
        try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
            if (out == null) throw new IOException("no output stream");
            out.write(bytes);
            Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show();
        } catch (IOException e) {
            Toast.makeText(this, "Could not save the file", Toast.LENGTH_LONG).show();
        }
    }

    private final class Bridge {
        @JavascriptInterface
        public void speak(String text, String lang) {
            speak(text, lang, 1f);
        }

        @JavascriptInterface
        public void speak(String text, String lang, float rate) {
            runOnUiThread(() -> MainActivity.this.speak(text, lang, rate));
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> {
                if (tts != null) tts.stop();
            });
        }

        @JavascriptInterface
        public void print(String title) {
            runOnUiThread(() -> {
                PrintManager printer = (PrintManager) getSystemService(PRINT_SERVICE);
                String job = title == null || title.isEmpty() ? "Document" : title;
                if (printer != null) printer.print(job, web.createPrintDocumentAdapter(job), null);
            });
        }

        @JavascriptInterface
        public void saveFile(String name, String mime, String base64) {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            runOnUiThread(() -> MainActivity.this.saveFile(name, mime, data));
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public String info() {
            JSONObject out = new JSONObject();
            try {
                PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
                out.put("id", getPackageName());
                out.put("version", p.versionName);
                out.put("versionCode", p.versionCode);
            } catch (Exception ignored) {
                // Leave whatever was filled in.
            }
            return out.toString();
        }
    }

    /** Serves assets/www/ on the app origin; opens every other site in the browser. */
    private final class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (!HOST.equals(url.getHost())) return null;
            String path = url.getPath();
            if (path == null || path.isEmpty() || path.endsWith("/")) path = (path == null ? "/" : path) + "index.html";
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            if (path.contains("..")) return error(403, "Forbidden", headers);
            try {
                InputStream in = getAssets().open("www" + path);
                String mime = mimeType(path);
                String charset = mime.startsWith("text/") || mime.endsWith("json")
                        || mime.endsWith("javascript") || mime.endsWith("xml") ? "utf-8" : null;
                return new WebResourceResponse(mime, charset, 200, "OK", headers, in);
            } catch (IOException e) {
                return error(404, "Not Found", headers);
            }
        }

        private WebResourceResponse error(int code, String reason, Map<String, String> headers) {
            return new WebResourceResponse("text/plain", "utf-8", code, reason, headers,
                    new ByteArrayInputStream(reason.getBytes(StandardCharsets.UTF_8)));
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (url != null && url.startsWith(ORIGIN)) view.evaluateJavascript(WEB_SHIM, null);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (HOST.equals(url.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, url));
            } catch (ActivityNotFoundException ignored) {
                // Nothing can open it; stay on the page.
            }
            return true;
        }
    }

    private static String mimeType(String path) {
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "html": case "htm": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "txt": case "csv": return "text/plain";
            case "xml": return "application/xml";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";
            case "webp": return "image/webp";
            case "ico": return "image/x-icon";
            case "mp3": return "audio/mpeg";
            case "ogg": case "oga": return "audio/ogg";
            case "wav": return "audio/wav";
            case "m4a": return "audio/mp4";
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            case "ttf": return "font/ttf";
            case "otf": return "font/otf";
            case "wasm": return "application/wasm";
            default: return "application/octet-stream";
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        return out.toByteArray();
    }
}
