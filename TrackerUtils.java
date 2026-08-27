package com.tracker.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class TrackerUtils {

    // 1. الإعدادات (Config)
    public static class Config {
        public static final long UPDATE_INTERVAL = 5000;
        public static final long FASTEST_INTERVAL = 3000;
        public static final float MIN_DISTANCE = 5.0f;
        public static final float MAX_ACCURACY = 50.0f;
        public static final float MAX_SPEED_KMH = 180.0f;
        public static final double MAX_JUMP_MS = 60.0;
    }

    // 2. التخزين المحلي (Preferences)
    public static class Prefs {
        private static final String PREF_NAME = "VehicleTrackerPrefs";
        private SharedPreferences sp;

        public Prefs(Context ctx) {
            sp = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        }

        public void saveSession(String code, String driverId, String tenantId, String devId, String name, String phone) {
            saveSession(code, driverId, tenantId, devId, name, phone, "");
        }

        public void saveSession(String code, String driverId, String tenantId, String devId, String name, String phone, String companyName) {
            sp.edit().putString("code", code)
                    .putString("driverId", driverId)
                    .putString("tenantId", tenantId)
                    .putString("devId", devId)
                    .putString("name", name)
                    .putString("phone", phone)
                    .putString("companyName", companyName)
                    .putBoolean("isLoggedIn", true).apply();
        }

        public void setCompanyName(String companyName) { sp.edit().putString("companyName", companyName).apply(); }
        public String getCompanyName() { return sp.getString("companyName", ""); }

        public void setTrackingEnabled(boolean enabled) { sp.edit().putBoolean("tracking", enabled).apply(); }
        public boolean isTrackingEnabled() { return sp.getBoolean("tracking", false); }
        public boolean isLoggedIn() { return sp.getBoolean("isLoggedIn", false); }
        public String getCode() { return sp.getString("code", ""); }
        public String getDriverId() { return sp.getString("driverId", ""); }
        public String getTenantId() { return sp.getString("tenantId", ""); }
        public String getDeviceId() { return sp.getString("devId", ""); }
        public String getDisplayName() { return sp.getString("name", "سائق"); }
        public String getPhone() { return sp.getString("phone", ""); }
        public void clear() { sp.edit().clear().apply(); }
    }

    // 3. معرّف الجهاز (Device ID)
    public static String getDeviceId(Context ctx) {
        Prefs prefs = new Prefs(ctx);
        String saved = prefs.getDeviceId();
        if (!saved.isEmpty()) return saved;
        String id = Settings.Secure.getString(ctx.getContentResolver(), Settings.Secure.ANDROID_ID);
        if (id == null || id.isEmpty() || "9774d56d682e549c".equals(id)) {
            id = UUID.randomUUID().toString();
        }
        return id;
    }

    // 4. حالة الإنترنت (Network)
    public static boolean isOnline(Context ctx) {
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NetworkCapabilities cap = cm.getNetworkCapabilities(cm.getActiveNetwork());
            return cap != null && (cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || cap.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
        }
        return cm.getActiveNetworkInfo() != null && cm.getActiveNetworkInfo().isConnected();
    }

    // 5. حالة البطارية وتوفير الطاقة (Battery)
    public static int getBatteryLevel(Context ctx) {
        Intent status = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (status == null) return -1;
        int level = status.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = status.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        return (level == -1 || scale == -1) ? -1 : (int) ((level / (float) scale) * 100);
    }

    public static boolean isCharging(Context ctx) {
        Intent status = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (status == null) return false;
        int st = status.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        return st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
    }

    public static boolean isIgnoringBatteryOpt(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        return true;
    }

    public static void requestIgnoreBatteryOpt(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.getPackageName()));
                i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception ignored) {}
        }
    }

    // 6. إدارة الصلاحيات (Permissions)
    public static boolean hasLocationPermissions(Context ctx) {
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    public static void requestPermissions(Activity act) {
        List<String> perms = new ArrayList<String>();
        perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
        perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        ActivityCompat.requestPermissions(act, perms.toArray(new String[0]), 100);
    }

    public static void requestBackgroundLocation(Activity act) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ActivityCompat.requestPermissions(act, new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, 101);
        }
    }

    // 7. طابور التخزين محلياً (Offline Queue بدون مكتبات خارجية)
    public static class Queue {
        private SharedPreferences sp;

        public Queue(Context ctx) {
            sp = ctx.getSharedPreferences("OfflineQueuePref", Context.MODE_PRIVATE);
        }

        public synchronized void enqueue(Map<String, Object> data) {
            List<Map<String, Object>> list = getAll();
            list.add(data);
            JSONArray jsonArray = new JSONArray();
            for (Map<String, Object> map : list) {
                jsonArray.put(new JSONObject(map));
            }
            sp.edit().putString("data", jsonArray.toString()).apply();
        }

        public synchronized List<Map<String, Object>> getAll() {
            List<Map<String, Object>> res = new ArrayList<>();
            String json = sp.getString("data", "[]");
            try {
                JSONArray jsonArray = new JSONArray(json);
                for (int i = 0; i < jsonArray.length(); i++) {
                    JSONObject obj = jsonArray.getJSONObject(i);
                    Map<String, Object> map = new HashMap<>();
                    Iterator<String> keys = obj.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        map.put(key, obj.get(key));
                    }
                    res.add(map);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return res;
        }

        public synchronized void clear() { sp.edit().remove("data").apply(); }
    }
}
