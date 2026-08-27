package com.tracker.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

import java.util.Map;

public class TrackingService extends Service implements LocationTracker.LocationResultCallback {

    private LocationTracker tracker;
    private FirebaseTracker firebase;
    private TrackerUtils.Prefs prefs;

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = new TrackerUtils.Prefs(this);
        firebase = new FirebaseTracker(this);
        tracker = new LocationTracker(this, this);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // دعم التوافقية مع Android 10+ و Android 14 لمنع النظام من إنهاء الخدمة في الخلفية
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(888, getNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(888, getNotification());
        }

        if (prefs != null && prefs.isTrackingEnabled()) {
            if (tracker != null) {
                tracker.startTracking();
            }
        } else {
            stopSelf();
        }

        return START_STICKY;
    }

    @Override
    public void onLocationUpdated(Location location, Map<String, Object> data) {
        if (firebase != null && location != null) {
            firebase.sendLocation(location);

            LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
            boolean isGpsEnabled = (lm != null && lm.isProviderEnabled(LocationManager.GPS_PROVIDER));
            firebase.sendHealth(isGpsEnabled);
        }
    }

    private Notification getNotification() {
        Intent i = new Intent(this, TrackingActivity.class);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pi = PendingIntent.getActivity(this, 0, i, flags);

        // جلب اسم الشركة واسم السائق من التفضيلات المحفوظة
        String companyName = prefs.getCompanyName(); // أو اسم الشركة المخزن
        String driverName = prefs.getDisplayName();

        String notificationTitle;
        if (companyName != null && !companyName.isEmpty()) {
            notificationTitle = "مرحباً شركة " + companyName;
        } else {
            notificationTitle = "نظام تتبع السيارة";
        }

        String notificationText = "التتبع يعمل في الخلفية بنجاح";
        if (driverName != null && !driverName.isEmpty()) {
            notificationText = "السائق: " + driverName + " | التتبع نشط الان";
        }

        return new NotificationCompat.Builder(this, "TrackingChannel")
                .setContentTitle(notificationTitle)
                .setContentText(notificationText)
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setContentIntent(pi)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    "TrackingChannel",
                    "Vehicle Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(ch);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (tracker != null) {
            tracker.stopTracking();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
