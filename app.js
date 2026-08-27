// Main Application Logic - Enhanced
let vehiclesData = {};
let driversData = {};
let historyData = [];
let map = null;
let markers = {};

// تهيئة لوحة التحكم
async function initializeDashboard() {
    if (currentUser) {
        showPage('dashboard-page');
        loadDashboardData();
        startRealtimeUpdates();
    }
}

// تحميل بيانات لوحة التحكم
async function loadDashboardData() {
    try {
        // تحميل بيانات المركبات والسائقين
        database.ref('vehicleDrivers').on('value', (snapshot) => {
            if (snapshot.exists()) {
                driversData = snapshot.val();
                updateVehiclesList();
                updateStats();
            }
        });
        
        // تحميل بيانات الموقع الحالي
        database.ref('liveLocation').on('value', (snapshot) => {
            if (snapshot.exists()) {
                vehiclesData = snapshot.val();
                updateMap();
                updateStats();
            }
        });
        
        // تحميل سجل المواقع
        database.ref('locationHistory').limitToLast(100).on('value', (snapshot) => {
            if (snapshot.exists()) {
                historyData = Object.values(snapshot.val());
                updateHistoryTable();
            }
        });
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }
}

// تحديث الإحصائيات
function updateStats() {
    let activeCount = 0;
    let totalDistance = 0;
    
    Object.values(vehiclesData).forEach(vehicle => {
        if (vehicle.speed > 0) activeCount++;
        if (vehicle.dailyDistance) totalDistance += vehicle.dailyDistance;
    });
    
    document.getElementById('active-vehicles').textContent = activeCount;
    document.getElementById('total-vehicles').textContent = Object.keys(vehiclesData).length;
    document.getElementById('total-drivers').textContent = Object.keys(driversData).length;
    document.getElementById('daily-distance').textContent = totalDistance.toFixed(2) + ' كم';
}

// تحديث قائمة المركبات
function updateVehiclesList() {
    const list = document.getElementById('vehicles-list');
    if (!list) return;
    list.innerHTML = '';
    
    Object.entries(driversData).forEach(([code, driver]) => {
        if (userRole === 'company_manager' && driver.tenantId !== tenantId) return;
        
        const vehicle = vehiclesData[code];
        const html = `
            <div class="vehicle-item" data-code="${code}" onclick="selectVehicle('${code}')">
                <div class="vehicle-header">
                    <h4>${driver.name}</h4>
                    <span class="status ${vehicle?.speed > 0 ? 'active' : 'inactive'}">
                        ${vehicle?.speed > 0 ? 'نشط' : 'متوقف'}
                    </span>
                </div>
                <div class="vehicle-info">
                    <p><i class="fas fa-phone"></i> ${driver.phone}</p>
                    <p><i class="fas fa-car"></i> ${code}</p>
                    ${vehicle ? `<p><i class="fas fa-tachometer-alt"></i> ${vehicle.speed} كم/س</p>` : ''}
                </div>
            </div>
        `;
        list.innerHTML += html;
    });
}

// تحديث جدول السجل
function updateHistoryTable() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    historyData.slice(-20).reverse().forEach(record => {
        if (userRole === 'company_manager') {
            const driver = Object.values(driversData).find(d => d.code === record.driverCode);
            if (!driver || driver.tenantId !== tenantId) return;
        }
        
        const time = new Date(record.timestamp).toLocaleString('ar-EG');
        const html = `
            <tr>
                <td>${record.driverCode}</td>
                <td>${record.driverName}</td>
                <td>${record.location}</td>
                <td>${time}</td>
                <td>${record.speed || 0} كم/س</td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// اختيار مركبة
function selectVehicle(vehicleCode) {
    const vehicle = vehiclesData[vehicleCode];
    if (vehicle && vehicle.latitude && vehicle.longitude) {
        map.setCenter({lat: vehicle.latitude, lng: vehicle.longitude});
        map.setZoom(15);
        selectVehicleOnMap(vehicleCode);
    }
}

// تحديث الخريطة
function updateMap() {
    if (!map) return;
    
    Object.entries(vehiclesData).forEach(([code, vehicle]) => {
        if (userRole === 'company_manager') {
            const driver = driversData[code];
            if (!driver || driver.tenantId !== tenantId) return;
        }
        
        if (vehicle.latitude && vehicle.longitude) {
            const driver = driversData[code];
            const markerColor = vehicle.speed > 0 ? 'green' : 'red';
            
            if (markers[code]) {
                markers[code].setPosition({lat: vehicle.latitude, lng: vehicle.longitude});
            } else {
                markers[code] = new google.maps.Marker({
                    position: {lat: vehicle.latitude, lng: vehicle.longitude},
                    map: map,
                    title: driver ? driver.name : code,
                    icon: `http://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`
                });
                
                if (driver) {
                    const infoWindow = new google.maps.InfoWindow({
                        content: createMarkerInfoWindow(code, driver, vehicle)
                    });
                    
                    markers[code].addListener('click', () => {
                        infoWindow.open(map, markers[code]);
                    });
                }
            }
        }
    });
}

// حفظ/تحديث آخر تسجيل دخول
async function updateLastLogin() {
    try {
        await firestore.collection('users').doc(currentUser.uid).update({
            lastLogin: new Date()
        });
    } catch (error) {
        console.error('خطأ في تحديث آخر دخول:', error);
    }
}

// تحديث الصفحة المعروضة
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        if (pageId === 'company-page') {
            initializeCompanyPage();
        } else if (pageId === 'admin-page') {
            initializeAdminPage();
        } else if (pageId === 'dashboard-page') {
            initializeMap();
        }
    }
}

// بدء التحديثات الفورية
function startRealtimeUpdates() {
    // تحديث الإحصائيات
    setInterval(() => {
        updateStats();
    }, 5000);
}

// تحديث السجل
function refreshHistory() {
    database.ref('locationHistory').limitToLast(100).once('value', (snapshot) => {
        if (snapshot.exists()) {
            historyData = Object.values(snapshot.val());
            updateHistoryTable();
            alert('✅ تم تحديث السجل بنجاح!');
        }
    });
}

// حساب المسافة بين نقطتين
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// إغلاق النوافذ المنبثقة
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// تحديث آخر دخول عند تسجيل الدخول
auth.onAuthStateChanged((user) => {
    if (user && currentUser) {
        updateLastLogin();
    }
});
