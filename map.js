// Map Module - خريطة Google Maps مع تتبع المركبات
let map = null;
let markers = {};
let polylines = {};
let infoWindows = {};
let selectedVehicle = null;
let routeHistories = {};

// تهيئة الخريطة
function initializeMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    // إنشاء الخريطة برتكز على الرياض
    map = new google.maps.Map(mapElement, {
        zoom: 12,
        center: { lat: 24.7136, lng: 46.6753 },
        mapTypeId: 'roadmap',
        styles: [
            {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#666666' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#c9c9c9' }]
            },
            {
                featureType: 'water',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#9ca5b0' }]
            }
        ]
    });
    
    startMapUpdates();
}

// بدء تحديث الخريطة الفوري
function startMapUpdates() {
    database.ref('liveLocation').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const locations = snapshot.val();
            updateMapMarkers(locations);
            updateMapPolylines(locations);
        }
    });
    
    // تحديث سجل المواقع التاريخي
    database.ref('locationHistory').limitToLast(500).on('value', (snapshot) => {
        if (snapshot.exists()) {
            routeHistories = {};
            Object.values(snapshot.val()).forEach(record => {
                if (!routeHistories[record.driverCode]) {
                    routeHistories[record.driverCode] = [];
                }
                routeHistories[record.driverCode].push({
                    lat: record.latitude,
                    lng: record.longitude,
                    speed: record.speed,
                    timestamp: record.timestamp
                });
            });
        }
    });
}

// تحديث علامات المركبات على الخريطة
function updateMapMarkers(locations) {
    Object.entries(locations).forEach(([driverCode, vehicleData]) => {
        if (!vehicleData.latitude || !vehicleData.longitude) return;
        
        const position = {
            lat: parseFloat(vehicleData.latitude),
            lng: parseFloat(vehicleData.longitude)
        };
        
        const driver = driversData[driverCode];
        const isActive = vehicleData.speed > 0;
        const markerColor = isActive ? 'green' : 'red';
        const markerIcon = getCustomMarkerIcon(markerColor, isActive);
        
        if (markers[driverCode]) {
            // تحديث موقع العلامة الموجودة
            markers[driverCode].setPosition(position);
            markers[driverCode].setIcon(markerIcon);
            
            // تحديث الرسالة المعلوماتية
            if (infoWindows[driverCode]) {
                infoWindows[driverCode].setContent(
                    createMarkerInfoWindow(driverCode, driver, vehicleData)
                );
            }
        } else {
            // إنشاء علامة جديدة
            const marker = new google.maps.Marker({
                position: position,
                map: map,
                title: driver ? driver.name : driverCode,
                icon: markerIcon,
                animation: google.maps.Animation.DROP,
                driverCode: driverCode
            });
            
            // إنشاء نافذة معلومات
            const infoWindow = new google.maps.InfoWindow({
                content: createMarkerInfoWindow(driverCode, driver, vehicleData),
                maxWidth: 300
            });
            
            infoWindows[driverCode] = infoWindow;
            markers[driverCode] = marker;
            
            // حدث الضغط على العلامة
            marker.addListener('click', () => {
                selectVehicleOnMap(driverCode);
            });
        }
    });
    
    // حذف العلامات المحذوفة
    Object.keys(markers).forEach(driverCode => {
        if (!locations[driverCode]) {
            markers[driverCode].setMap(null);
            if (polylines[driverCode]) {
                polylines[driverCode].setMap(null);
            }
            delete markers[driverCode];
            delete polylines[driverCode];
        }
    });
}

// إنشاء أيقونة العلامة المخصصة
function getCustomMarkerIcon(color, isActive) {
    const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="20" cy="20" r="14" fill="${color}" opacity="0.7"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
            ${isActive ? '<circle cx="20" cy="20" r="6" fill="' + color + '" opacity="0.8"/>' : ''}
        </svg>
    `;
    
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarker),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40)
    };
}

// إنشاء محتوى نافذة المعلومات
function createMarkerInfoWindow(driverCode, driver, vehicleData) {
    const statusColor = vehicleData.speed > 0 ? '#28a745' : '#dc3545';
    const statusText = vehicleData.speed > 0 ? 'نشط' : 'متوقف';
    const time = new Date(vehicleData.timestamp).toLocaleString('ar-EG');
    
    return `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 10px; width: 280px;">
            <div style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #333;">${driver ? driver.name : 'مركبة ' + driverCode}</h3>
                <p style="margin: 5px 0; color: #666; font-size: 0.9em;">${driverCode}</p>
            </div>
            
            <div style="margin: 8px 0;">
                <span style="background-color: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">${statusText}</span>
            </div>
            
            <div style="margin: 10px 0;">
                <p style="margin: 5px 0;">
                    <strong>🚗 رقم السائق:</strong> ${driverCode}
                </p>
                <p style="margin: 5px 0;">
                    <strong>👤 السائق:</strong> ${driver ? driver.name : 'غير معروف'}
                </p>
                <p style="margin: 5px 0;">
                    <strong>📞 الهاتف:</strong> ${driver ? driver.phone : 'N/A'}
                </p>
                <p style="margin: 5px 0;">
                    <strong>📍 الموقع:</strong> ${vehicleData.location || 'تحديث الموقع...'}
                </p>
                <p style="margin: 5px 0;">
                    <strong>⚡ السرعة:</strong> <span style="color: #007bff; font-weight: bold;">${vehicleData.speed || 0} كم/س</span>
                </p>
                <p style="margin: 5px 0;">
                    <strong>📏 الارتفاع:</strong> ${vehicleData.altitude || 'N/A'} م
                </p>
                <p style="margin: 5px 0;">
                    <strong>🕐 الوقت:</strong> ${time}
                </p>
                <p style="margin: 5px 0;">
                    <strong>📊 المسافة اليومية:</strong> ${vehicleData.dailyDistance ? vehicleData.dailyDistance.toFixed(2) : '0.00'} كم
                </p>
            </div>
            
            <div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
                <button onclick="viewVehicleHistory('${driverCode}')" style="
                    width: 100%;
                    padding: 8px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    margin-bottom: 5px;
                ">📊 عرض السجل</button>
                <button onclick="toggleRoutePolyline('${driverCode}')" style="
                    width: 100%;
                    padding: 8px;
                    background-color: #28a745;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">🛣️ رسم المسار</button>
            </div>
        </div>
    `;
}

// تحديث خطوط المسار على الخريطة
function updateMapPolylines(locations) {
    Object.entries(locations).forEach(([driverCode, vehicleData]) => {
        if (!vehicleData.latitude || !vehicleData.longitude) return;
        
        if (!polylines[driverCode]) {
            // إنشاء خط مسار جديد
            polylines[driverCode] = new google.maps.Polyline({
                map: map,
                path: [],
                geodesic: true,
                strokeColor: getPolylineColor(driverCode),
                strokeOpacity: 0.7,
                strokeWeight: 3,
                zIndex: 1,
                visible: false,
                driverCode: driverCode
            });
        }
    });
}

// اختيار مركبة على الخريطة
function selectVehicleOnMap(driverCode) {
    // إغلاق نافذة المعلومات السابقة
    if (selectedVehicle && selectedVehicle !== driverCode && infoWindows[selectedVehicle]) {
        infoWindows[selectedVehicle].close();
    }
    
    selectedVehicle = driverCode;
    const marker = markers[driverCode];
    
    if (marker) {
        // فتح نافذة المعلومات
        if (infoWindows[driverCode]) {
            Object.keys(infoWindows).forEach(code => {
                if (code !== driverCode) {
                    infoWindows[code].close();
                }
            });
            infoWindows[driverCode].open(map, marker);
        }
        
        // تركيز الخريطة على المركبة مع تأثير حركة سلسة
        map.panTo(marker.getPosition());
        map.setZoom(16);
        
        // تغيير أيقونة العلامة
        const vehicleData = vehiclesData[driverCode];
        if (vehicleData) {
            const isActive = vehicleData.speed > 0;
            marker.setIcon(getSelectedMarkerIcon(isActive));
        }
        
        // تحديث القائمة الجانبية
        highlightVehicleInSidebar(driverCode);
    }
}

// أيقونة العلامة المختارة
function getSelectedMarkerIcon(isActive) {
    const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="22" fill="${isActive ? '#FFD700' : '#FF6347'}" stroke="white" stroke-width="3"/>
            <circle cx="25" cy="25" r="17" fill="${isActive ? '#FFD700' : '#FF6347'}" opacity="0.8"/>
            <circle cx="25" cy="25" r="10" fill="white"/>
            <circle cx="25" cy="25" r="8" fill="${isActive ? '#28a745' : '#dc3545'}" opacity="0.9"/>
            <circle cx="25" cy="25" r="3" fill="white"/>
        </svg>
    `;
    
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarker),
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 50)
    };
}

// رسم أو إخفاء خط المسار
function toggleRoutePolyline(driverCode) {
    if (!polylines[driverCode]) return;
    
    const polyline = polylines[driverCode];
    const isVisible = polyline.getVisible();
    
    if (!isVisible) {
        // رسم المسار
        if (routeHistories[driverCode] && routeHistories[driverCode].length > 0) {
            const path = routeHistories[driverCode].map(point => ({
                lat: point.lat,
                lng: point.lng
            }));
            
            polyline.setPath(path);
            polyline.setVisible(true);
            
            // إضافة نقاط البداية والنهاية
            const startPoint = routeHistories[driverCode][0];
            const endPoint = routeHistories[driverCode][routeHistories[driverCode].length - 1];
            
            // علامة البداية (أخضر)
            new google.maps.Marker({
                position: { lat: startPoint.lat, lng: startPoint.lng },
                map: map,
                title: 'نقطة البداية',
                icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                zIndex: 10
            });
            
            // علامة النهاية (أحمر)
            new google.maps.Marker({
                position: { lat: endPoint.lat, lng: endPoint.lng },
                map: map,
                title: 'نقطة النهاية',
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                zIndex: 10
            });
            
            alert(`✅ تم رسم المسار - ${routeHistories[driverCode].length} نقطة`);
        } else {
            alert('❌ لا توجد بيانات مسار متاحة');
        }
    } else {
        // إخفاء المسار
        polyline.setVisible(false);
        alert('✅ تم إخفاء المسار');
    }
}

// الحصول على لون الخط بناءً على رمز السائق
function getPolylineColor(driverCode) {
    const colors = [
        '#FF6347', '#4169E1', '#32CD32', '#FFD700', '#FF69B4',
        '#00CED1', '#FF8C00', '#9370DB', '#20B2AA', '#FF1493'
    ];
    const index = Object.keys(polylines).indexOf(driverCode);
    return colors[index % colors.length];
}

// تمييز المركبة في القائمة الجانبية
function highlightVehicleInSidebar(driverCode) {
    const items = document.querySelectorAll('.vehicle-item');
    items.forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.code === driverCode) {
            item.classList.add('selected');
        }
    });
}

// عرض سجل المركبة
function viewVehicleHistory(driverCode) {
    if (!routeHistories[driverCode]) {
        alert('لا توجد بيانات سجل متاحة');
        return;
    }
    
    const history = routeHistories[driverCode];
    const driver = driversData[driverCode];
    
    let totalDistance = 0;
    let maxSpeed = 0;
    let avgSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;
    
    history.forEach((point, index) => {
        if (index > 0) {
            const prev = history[index - 1];
            const distance = calculateDistance(prev.lat, prev.lng, point.lat, point.lng);
            totalDistance += distance;
        }
        
        if (point.speed) {
            maxSpeed = Math.max(maxSpeed, point.speed);
            speedSum += point.speed;
            speedCount++;
        }
    });
    
    if (speedCount > 0) {
        avgSpeed = (speedSum / speedCount).toFixed(2);
    }
    
    const startTime = new Date(history[0].timestamp).toLocaleString('ar-EG');
    const endTime = new Date(history[history.length - 1].timestamp).toLocaleString('ar-EG');
    
    const historyInfo = `
📊 سجل المركبة
━━━━━━━━━━━━━━━━━━━━━━
👤 السائق: ${driver ? driver.name : 'غير معروف'}
🚗 رقم المركبة: ${driverCode}
━━━━━━━━━━━━━━━━━━━━━━
📍 عدد النقاط المسجلة: ${history.length}
📏 إجمالي المسافة: ${totalDistance.toFixed(2)} كم
⚡ أقصى سرعة: ${maxSpeed.toFixed(2)} كم/س
📊 متوسط السرعة: ${avgSpeed} كم/س
🕐 وقت البداية: ${startTime}
🕐 وقت النهاية: ${endTime}
━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    alert(historyInfo);
}

// حساب المسافة بين نقطتين (صيغة Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // المسافة بالكيلومتر
}

// تهيئة الخريطة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeMap, 1000);
});

// البحث عن مركبة في القائمة الجانبية
const searchInput = document.getElementById('search-vehicles');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.vehicle-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}