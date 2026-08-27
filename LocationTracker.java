package com.tracker.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Looper;

import java.util.HashMap;
import java.util.Map;

public class LocationTracker {

    public interface LocationResultCallback {
        void onLocationUpdated(Location location, Map<String, Object> data);
    }

    private Context ctx;
    private LocationManager locationManager;
    private LocationListener locationListener;
    private LocationResultCallback callback;
    private Location lastLocation;

    public LocationTracker(Context ctx, LocationResultCallback callback) {
        this.ctx = ctx;
        this.callback = callback;
        this.locationManager = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        initListener();
    }

    private void initListener() {
        this.locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (location == null) return;
                
                // تصفية الموقع والتأكد من دقة الإحداثيات
                if (isValidLocation(location)) {
                    lastLocation = location;
                    if (callback != null) {
                        callback.onLocationUpdated(location, processLocationData(location));
                    }
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}

            @Override
            public void onProviderEnabled(String provider) {}

            @Override
            public void onProviderDisabled(String provider) {}
        };
    }

    @SuppressLint("MissingPermission")
    public void startTracking() {
        if (!TrackerUtils.hasLocationPermissions(ctx)) return;
        if (locationManager == null) return;

        try {
            // استقبال الإحداثيات عبر GPS
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        TrackerUtils.Config.UPDATE_INTERVAL,
                        TrackerUtils.Config.MIN_DISTANCE,
                        locationListener,
                        Looper.getMainLooper()
                );
            }

            // استقبال الإحداثيات عبر أبراج الشبكة كبديل احتياطي
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        TrackerUtils.Config.UPDATE_INTERVAL,
                        TrackerUtils.Config.MIN_DISTANCE,
                        locationListener,
                        Looper.getMainLooper()
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @SuppressLint("MissingPermission")
    public void stopTracking() {
        if (locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private boolean isValidLocation(Location loc) {
        if (loc.getAccuracy() > TrackerUtils.Config.MAX_ACCURACY) return false;
        
        // التحقق من السرعة بالـ كم/ساعة
        float speedKmh = loc.getSpeed() * 3.6f;
        if (speedKmh > TrackerUtils.Config.MAX_SPEED_KMH) return false;

        return true;
    }

    private Map<String, Object> processLocationData(Location loc) {
        Map<String, Object> map = new HashMap<>();
        map.put("lat", loc.getLatitude());
        map.put("lng", loc.getLongitude());
        map.put("acc", loc.getAccuracy());
        map.put("speed", loc.getSpeed() * 3.6f); // تحويل السرعة إلى كم/ساعة
        map.put("bearing", loc.getBearing());
        map.put("time", loc.getTime());
        map.put("provider", loc.getProvider());
        return map;
    }
}
