// Main Application Logic
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
        // تحميل بيانات المركبات
        database.ref('vehicleDrivers').on('value', (snapshot) => {
            if (snapshot.exists()) {
                driversData = snapshot.val();
                updateVehiclesList();
                updateDriversTable();
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
        
        // تحميل بيانات المستأجرين للمسؤول
        if (userRole === 'admin') {
            firestore.collection('tenants').onSnapshot((snapshot) => {
                const tenantsList = [];
                snapshot.forEach((doc) => {
                    tenantsList.push({id: doc.id, ...doc.data()});
                });
                updateTenantsList(tenantsList);
            });
            
            // تحميل بيانات المستخدمين
            firestore.collection('users').onSnapshot((snapshot) => {
                const usersList = [];
                snapshot.forEach((doc) => {
                    usersList.push({id: doc.id, ...doc.data()});
                });
                updateUsersList(usersList);
            });
        }
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
    list.innerHTML = '';
    
    Object.entries(driversData).forEach(([code, driver]) => {
        const vehicle = vehiclesData[code];
        const html = `
            <div class="vehicle-item" onclick="selectVehicle('${code}')">
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

// تحديث جدول السائقين
function updateDriversTable() {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';
    
    Object.entries(driversData).forEach(([code, driver]) => {
        const vehicle = vehiclesData[code];
        const time = vehicle?.timestamp ? new Date(vehicle.timestamp).toLocaleString('ar-EG') : 'N/A';
        const html = `
            <tr>
                <td>${code}</td>
                <td>${driver.name}</td>
                <td>${vehicle?.location || 'غير معروف'}</td>
                <td>${time}</td>
                <td>${vehicle?.speed || 0} كم/س</td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث جدول السجل
function updateHistoryTable() {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';
    
    historyData.slice(-20).reverse().forEach(record => {
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
    }
}

// تحديث قائمة المستأجرين
function updateTenantsList(tenants) {
    const tbody = document.getElementById('tenants-tbody');
    tbody.innerHTML = '';
    
    tenants.forEach(tenant => {
        const vehicleCount = Object.values(driversData).filter(d => d.tenantId === tenant.id).length;
        const html = `
            <tr>
                <td>${tenant.name}</td>
                <td>${tenant.email}</td>
                <td>${tenant.phone}</td>
                <td>${vehicleCount}</td>
                <td><span class="badge active">نشط</span></td>
                <td>
                    <button class="btn btn-sm" onclick="editTenant('${tenant.id}')">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTenant('${tenant.id}')">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث قائمة المستخدمين
function updateUsersList(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const html = `
            <tr>
                <td>${user.displayName}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.tenantId || 'N/A'}</td>
                <td><span class="badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'نشط' : 'معطل'}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="editUser('${user.id}')">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// بدء التحديثات الفورية
function startRealtimeUpdates() {
    // تحديث المسافة اليومية
    database.ref('vehicleDrivers').on('child_changed', (snapshot) => {
        updateStats();
    });
}

// تحديث الخريطة
function updateMap() {
    Object.entries(vehiclesData).forEach(([code, vehicle]) => {
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
                
                // إضافة معلومات عند النقر على العلامة
                if (driver) {
                    const infoWindow = new google.maps.InfoWindow({
                        content: `
                            <div class="info-window">
                                <h3>${driver.name}</h3>
                                <p>المركبة: ${code}</p>
                                <p>السرعة: ${vehicle.speed} كم/س</p>
                                <p>الموقع: ${vehicle.location || 'غير معروف'}</p>
                            </div>
                        `
                    });
                    
                    markers[code].addListener('click', () => {
                        infoWindow.open(map, markers[code]);
                    });
                }
            }
        }
    });
}

// إضافة سائق
async function addDriver(event) {
    event.preventDefault();
    
    const driverName = document.getElementById('driver-name').value;
    const driverPhone = document.getElementById('driver-phone').value;
    const driverVehicle = document.getElementById('driver-vehicle').value;
    const driverId = document.getElementById('driver-id').value;
    
    try {
        // إضافة إلى Realtime Database
        await database.ref(`vehicleDrivers/${driverId}`).set({
            name: driverName,
            phone: driverPhone,
            vehicleCode: driverVehicle,
            tenantId: tenantId,
            createdAt: new Date().toISOString()
        });
        
        // إضافة رمز التفعيل
        await database.ref(`activationCodes/${driverPhone}`).set({
            driverCode: driverId,
            driverName: driverName,
            createdAt: new Date().toISOString(),
            used: false
        });
        
        // إضافة إلى Firestore للنسخ الاحتياطية
        await firestore.collection('drivers').doc(driverId).set({
            name: driverName,
            phone: driverPhone,
            vehicleCode: driverVehicle,
            tenantId: tenantId,
            createdAt: new Date()
        });
        
        alert('تم إضافة السائق بنجاح!');
        closeModal('add-driver-modal');
        document.getElementById('add-driver-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة السائق:', error);
        alert('حدث خطأ في إضافة السائق');
    }
}

// إضافة مستأجر
async function addTenant(event) {
    event.preventDefault();
    
    const tenantName = document.getElementById('tenant-name').value;
    const tenantEmail = document.getElementById('tenant-email').value;
    const tenantPhone = document.getElementById('tenant-phone').value;
    
    try {
        const docRef = await firestore.collection('tenants').add({
            name: tenantName,
            email: tenantEmail,
            phone: tenantPhone,
            createdAt: new Date(),
            active: true
        });
        
        alert('تم إضافة المستأجر بنجاح!');
        closeModal('add-tenant-modal');
        document.getElementById('add-tenant-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة المستأجر:', error);
        alert('حدث خطأ في إضافة المستأجر');
    }
}

// إضافة مستخدم
async function addUser(event) {
    event.preventDefault();
    
    const userName = document.getElementById('user-name').value;
    const userEmail = document.getElementById('user-email').value;
    const userPassword = document.getElementById('user-password').value;
    const userRole = document.getElementById('user-role').value;
    const userTenant = document.getElementById('user-tenant').value;
    
    try {
        const user = await createUser(userEmail, userPassword, userName, userRole, userTenant);
        alert('تم إضافة المستخدم بنجاح!');
        closeModal('add-user-modal');
        document.getElementById('add-user-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة المستخدم:', error);
        alert('حدث خطأ: ' + error.message);
    }
}

// حذف مستأجر
async function deleteTenant(tenantId) {
    if (confirm('هل تريد حذف هذا المستأجر؟')) {
        try {
            await firestore.collection('tenants').doc(tenantId).delete();
            alert('تم حذف المستأجر بنجاح!');
        } catch (error) {
            console.error('خطأ في حذف المستأجر:', error);
            alert('حدث خطأ في حذف المستأجر');
        }
    }
}

// حذف مستخدم
async function deleteUser(userId) {
    if (confirm('هل تريد حذف هذا المستخدم؟')) {
        try {
            await firestore.collection('users').doc(userId).delete();
            alert('تم حذف المستخدم بنجاح!');
        } catch (error) {
            console.error('خطأ في حذف المستخدم:', error);
            alert('حدث خطأ في حذف المستخدم');
        }
    }
}

// تعديل مستأجر
async function editTenant(tenantId) {
    // يمكن إضافة نموذج تعديل
    alert('وظيفة التعديل قيد التطوير');
}

// تعديل مستخدم
async function editUser(userId) {
    // يمكن إضافة نموذج تعديل
    alert('وظيفة التعديل قيد التطوير');
}

// حفظ الإعدادات
async function saveSettings() {
    const liveTracking = document.getElementById('live-tracking').checked;
    const emailAlerts = document.getElementById('email-alerts').checked;
    const updateInterval = document.getElementById('location-update-interval').value;
    
    try {
        await firestore.collection('settings').doc('global').set({
            liveTracking: liveTracking,
            emailAlerts: emailAlerts,
            locationUpdateInterval: parseInt(updateInterval),
            updatedAt: new Date()
        }, { merge: true });
        
        alert('تم حفظ الإعدادات بنجاح!');
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        alert('حدث خطأ في حفظ الإعدادات');
    }
}

// إضافة سائق من لوحة الشركة
async function addDriver(event) {
    event.preventDefault();
    
    const driverName = document.getElementById('driver-name').value;
    const driverPhone = document.getElementById('driver-phone').value;
    const driverVehicle = document.getElementById('driver-vehicle').value;
    const driverId = document.getElementById('driver-id').value;
    
    try {
        await database.ref(`vehicleDrivers/${driverId}`).set({
            name: driverName,
            phone: driverPhone,
            vehicleCode: driverVehicle,
            tenantId: tenantId,
            createdAt: new Date().toISOString()
        });
        
        await database.ref(`activationCodes/${driverPhone}`).set({
            driverCode: driverId,
            driverName: driverName,
            createdAt: new Date().toISOString(),
            used: false
        });
        
        alert('تم إضافة السائق بنجاح!');
        closeModal('add-driver-modal');
        document.getElementById('add-driver-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة السائق:', error);
        alert('حدث خطأ في إضافة السائق');
    }
}

// تحديث سجل الحركة
function refreshHistory() {
    database.ref('locationHistory').limitToLast(100).once('value', (snapshot) => {
        if (snapshot.exists()) {
            historyData = Object.values(snapshot.val());
            updateHistoryTable();
            alert('تم تحديث السجل بنجاح!');
        }
    });
}