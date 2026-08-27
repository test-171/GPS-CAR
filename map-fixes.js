// Map Fixes and Improvements

// إصلاح مشاكل الخريطة
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('maps')) {
        console.warn('خطأ في خريطة Google:', event.message);
        handleMapError();
    }
});

// معالج أخطاء الخريطة
function handleMapError() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = '<div class="map-error"><i class="fas fa-exclamation-triangle"></i><p>خطأ في تحميل الخريطة. جاري المحاولة...';
        // إعادة محاولة التهيئة
        setTimeout(() => {
            initializeMap();
        }, 2000);
    }
}

// تحسين تهيئة الخريطة
function initializeMapSafe() {
    return new Promise((resolve, reject) => {
        try {
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                reject('عنصر الخريطة غير موجود');
                return;
            }
            
            // التحقق من Google Maps API
            if (!window.google || !window.google.maps) {
                console.error('Google Maps API لم يتم تحميله بعد');
                setTimeout(() => {
                    initializeMapSafe().then(resolve).catch(reject);
                }, 1000);
                return;
            }
            
            const mapOptions = {
                zoom: 12,
                center: { lat: 24.7136, lng: 46.6753 },
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                gestureHandling: 'cooperative',
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
                    }
                ]
            };
            
            map = new google.maps.Map(mapElement, mapOptions);
            
            // إضافة مستمع للأخطاء
            map.addListener('error', () => {
                console.error('خطأ في الخريطة');
                handleMapError();
            });
            
            resolve(map);
            
        } catch (error) {
            console.error('خطأ في تهيئة الخريطة:', error);
            reject(error);
        }
    });
}

// تحسين إضافة الواسمات
function addMarkerSafe(position, options = {}) {
    try {
        if (!map) {
            console.error('الخريطة لم تتم تهيئتها');
            return null;
        }
        
        if (!position || !position.lat || !position.lng) {
            console.error('موقع غير صالح');
            return null;
        }
        
        const markerOptions = {
            position: {
                lat: parseFloat(position.lat),
                lng: parseFloat(position.lng)
            },
            map: map,
            title: options.title || 'موقع',
            icon: options.icon || null,
            animation: options.animation || null,
            ...options
        };
        
        const marker = new google.maps.Marker(markerOptions);
        return marker;
        
    } catch (error) {
        console.error('خطأ في إضافة واسمة:', error);
        return null;
    }
}

// تحسين رسم المسارات
function addPolylineSafe(path, options = {}) {
    try {
        if (!map) {
            console.error('الخريطة لم تتم تهيئتها');
            return null;
        }
        
        if (!path || path.length === 0) {
            console.error('مسار غير صالح');
            return null;
        }
        
        // تنظيف المسار
        const cleanPath = path.map(point => ({
            lat: parseFloat(point.lat),
            lng: parseFloat(point.lng)
        }));
        
        const polylineOptions = {
            path: cleanPath,
            map: map,
            geodesic: true,
            strokeColor: options.strokeColor || '#FF0000',
            strokeOpacity: options.strokeOpacity || 0.7,
            strokeWeight: options.strokeWeight || 3,
            ...options
        };
        
        const polyline = new google.maps.Polyline(polylineOptions);
        return polyline;
        
    } catch (error) {
        console.error('خطأ في رسم المسار:', error);
        return null;
    }
}

// تحسين حساب حدود الخريطة
function fitBounds(markers) {
    try {
        if (!map || !markers || markers.length === 0) {
            return;
        }
        
        const bounds = new google.maps.LatLngBounds();
        
        markers.forEach(marker => {
            if (marker && marker.getPosition) {
                bounds.extend(marker.getPosition());
            }
        });
        
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds);
            // إضافة padding
            const padding = { top: 50, right: 50, bottom: 50, left: 50 };
            map.fitBounds(bounds, padding);
        }
        
    } catch (error) {
        console.error('خطأ في حساب الحدود:', error);
    }
}

// معالج الحركة على الخريطة
function handleMapZoom() {
    try {
        if (!map) return;
        
        const zoomLevel = map.getZoom();
        
        // إخفاء/إظهار التفاصيل حسب مستوى التكبير
        if (zoomLevel < 10) {
            // عرض عام
            showClusterMarkers();
        } else if (zoomLevel < 14) {
            // عرض متوسط
            showNormalMarkers();
        } else {
            // عرض تفصيلي
            showDetailedMarkers();
        }
        
    } catch (error) {
        console.error('خطأ في معالجة الحركة:', error);
    }
}

// حذف جميع الواسمات والمسارات
function clearMap() {
    try {
        // حذف الواسمات
        Object.values(markers).forEach(marker => {
            if (marker) {
                marker.setMap(null);
            }
        });
        markers = {};
        
        // حذف المسارات
        Object.values(polylines).forEach(polyline => {
            if (polyline) {
                polyline.setMap(null);
            }
        });
        polylines = {};
        
        // حذف نوافذ المعلومات
        Object.values(infoWindows).forEach(infoWindow => {
            if (infoWindow) {
                infoWindow.close();
            }
        });
        infoWindows = {};
        
    } catch (error) {
        console.error('خطأ في حذف العناصر:', error);
    }
}

// التعامل مع أخطاء الموقع
function handleLocationError(error) {
    const errorMessages = {
        1: 'تم رفض الوصول إلى موقعك',
        2: 'معلومات الموقع غير متاحة',
        3: 'انتهت مهلة الوقت'
    };
    
    console.error('خطأ في الموقع:', errorMessages[error.code] || 'خطأ غير معروف');
    notificationManager.addNotification('error', '❌ خطأ الموقع', errorMessages[error.code], '📍');
}

// تحسين أداء الخريطة
function optimizeMapPerformance() {
    try {
        if (!map) return;
        
        // تقليل عدد تحديثات الخريطة
        map.setOptions({
            draggable: true,
            scrollwheel: true,
            disableDoubleClickZoom: false
        });
        
        // تحديث الخريطة بشكل دوري بدلاً من الفوري
        setInterval(() => {
            if (map) {
                map.triggerResize();
            }
        }, 5000);
        
    } catch (error) {
        console.error('خطأ في تحسين الأداء:', error);
    }
}

// اختبار اتصال Google Maps
async function testMapConnection() {
    try {
        if (!window.google || !window.google.maps) {
            throw new Error('Google Maps API لم يتم تحميله');
        }
        
        return true;
        
    } catch (error) {
        console.error('خطأ في اختبار الاتصال:', error);
        notificationManager.addNotification('error', '❌ خطأ', 'فشل تحميل خرائط Google', '🗺️');
        return false;
    }
}
