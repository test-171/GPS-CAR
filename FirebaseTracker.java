package com.tracker.app;

import android.content.Context;
import android.location.Location;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class FirebaseTracker {

    public interface AuthCallback {
        void onSuccess(String name, String phone);
        void onError(String msg);
    }

    private Context ctx;
    private DatabaseReference rootRef;
    private TrackerUtils.Prefs prefs;
    private TrackerUtils.Queue queue;

    public FirebaseTracker(Context ctx) {
        this.ctx = ctx;
        this.rootRef = FirebaseDatabase.getInstance().getReference();
        this.prefs = new TrackerUtils.Prefs(ctx);
        this.queue = new TrackerUtils.Queue(ctx);
    }

    public void loginAndBind(final String inputCode, final AuthCallback callback) {
        if (!TrackerUtils.isOnline(ctx)) {
            callback.onError("لا يوجد اتصال بالإنترنت");
            return;
        }

        // 1️⃣ البحث عن الكود في جدول أكواد التفعيل (activationCodes) أولاً
        rootRef.child("activationCodes").child(inputCode).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot actSnap) {
                final String vehicleCode;
                final String actTenantId;

                if (actSnap.exists()) {
                    vehicleCode = actSnap.child("vehicleCode").getValue(String.class);
                    actTenantId = actSnap.child("tenantId").getValue(String.class);
                } else {
                    vehicleCode = inputCode;
                    actTenantId = null;
                }

                // 2️⃣ جلب بيانات السائق بناءً على vehicleCode الأصلي
                fetchDriverAndBind(vehicleCode, actTenantId, inputCode, callback);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                callback.onError("خطأ في الاتصال: " + error.getMessage());
            }
        });
    }

    private void fetchDriverAndBind(final String vehicleCode, final String actTenantId, final String inputCode, final AuthCallback callback) {
        rootRef.child("vehicleDrivers").child(vehicleCode).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snap) {
                if (!snap.exists()) {
                    callback.onError("كود الدخول أو التفعيل غير صحيح");
                    return;
                }

                // فحص مرن لحالة الاشتراك
                Object subObj = snap.child("subscriptionValid").getValue();
                if (subObj instanceof Boolean && !((Boolean) subObj)) {
                    callback.onError("اشتراك هذا السائق موقوف");
                    return;
                }

                String currentDevId = TrackerUtils.getDeviceId(ctx);
                String boundDevId = snap.child("deviceId").getValue(String.class);

                if (boundDevId != null && !boundDevId.isEmpty() && !boundDevId.equals(currentDevId)) {
                    callback.onError("هذا الكود مرتبط بجهاز آخر بالفعل");
                    return;
                }

                String driverId = snap.child("vehicleDriverId").getValue(String.class);
                String tenantId = snap.child("tenantId").getValue(String.class);
                if (tenantId == null || tenantId.isEmpty()) {
                    tenantId = actTenantId;
                }

                String name = snap.child("displayName").getValue(String.class);
                String phone = snap.child("phone").getValue(String.class);

                // تحديث بيانات الجلسة والربط بالفايربيس
                Map<String, Object> bindUpdates = new HashMap<>();
                bindUpdates.put("deviceId", currentDevId);
                bindUpdates.put("lastLogin", System.currentTimeMillis());
                bindUpdates.put("status", "online");
                if (tenantId != null) {
                    bindUpdates.put("tenantId", tenantId);
                }

                rootRef.child("vehicleDrivers").child(vehicleCode).updateChildren(bindUpdates);
                rootRef.child("vehicleDrivers").child(vehicleCode).keepSynced(true);

                // حفظ بيانات الجلسة محلياً
                prefs.saveSession(
                    vehicleCode,
                    driverId != null ? driverId : vehicleCode,
                    tenantId != null ? tenantId : "default",
                    currentDevId,
                    name != null ? name : "سائق",
                    phone != null ? phone : ""
                );

                callback.onSuccess(prefs.getDisplayName(), prefs.getPhone());
            }

            @Override
            public void onCancelled(DatabaseError err) {
                callback.onError(err.getMessage());
            }
        });
    }

    public void sendLocation(Location loc) {
        String code = prefs.getCode();
        if (code == null || code.isEmpty()) return;

        String tenantId = prefs.getTenantId();
        float speedKmH = loc.hasSpeed() ? loc.getSpeed() * 3.6f : 0.0f;

        Map<String, Object> data = new HashMap<>();
        data.put("eventId", UUID.randomUUID().toString());
        data.put("latitude", loc.getLatitude());
        data.put("longitude", loc.getLongitude());
        data.put("speed", speedKmH);
        data.put("bearing", loc.hasBearing() ? loc.getBearing() : 0.0f);
        data.put("accuracy", loc.hasAccuracy() ? loc.getAccuracy() : 0.0f);
        data.put("timestamp", System.currentTimeMillis());
        data.put("battery", TrackerUtils.getBatteryLevel(ctx));
        data.put("tenantId", tenantId);

        if (TrackerUtils.isOnline(ctx)) {
            // 1️⃣ تحديث الموقع اللحظي والحالة لجدول السائق
            rootRef.child("vehicleDrivers").child(code).child("liveLocation").setValue(data);
            rootRef.child("vehicleDrivers").child(code).child("status").setValue(speedKmH > 2.0f ? "moving" : "online");

            // 2️⃣ حفظ النقطة في سجل الرحلات ليعرضها الويب على الخريطة (locationHistory)
            rootRef.child("locationHistory").child(code).push().setValue(data);

            // 3️⃣ تفريغ الطابور الأوفلاين
            flushQueue();
        } else {
            queue.enqueue(data);
        }
    }

    public void sendHealth(boolean gpsStatus) {
        String code = prefs.getCode();
        if (code == null || code.isEmpty() || !TrackerUtils.isOnline(ctx)) return;

        Map<String, Object> h = new HashMap<>();
        h.put("battery", TrackerUtils.getBatteryLevel(ctx));
        h.put("isCharging", TrackerUtils.isCharging(ctx));
        h.put("gpsStatus", gpsStatus);
        h.put("internetStatus", true);
        h.put("lastSync", System.currentTimeMillis());

        rootRef.child("vehicleDrivers").child(code).child("deviceHealth").setValue(h);
    }

    public void flushQueue() {
        List<Map<String, Object>> list = queue.getAll();
        if (list == null || list.isEmpty() || !TrackerUtils.isOnline(ctx)) return;
        String code = prefs.getCode();

        for (Map<String, Object> item : list) {
            String id = (String) item.get("eventId");
            if (id != null) {
                rootRef.child("vehicleDrivers").child(code).child("offlineHistory").child(id).setValue(item);
                rootRef.child("locationHistory").child(code).push().setValue(item);
            }
        }
        queue.clear();
    }
}
