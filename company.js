// Company Module - Enhanced
let companyDrivers = [];
let companyVehicles = [];
let companyUsers = [];
let reportData = null;
let currentTenantData = null;

// تحميل بيانات الشركة
async function loadCompanyData() {
    try {
        // تحميل بيانات الشركة الحالية
        if (tenantId) {
            const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
            if (tenantDoc.exists) {
                currentTenantData = tenantDoc.data();
            }
        }

        // تحميل السائقين الخاصين بالشركة
        database.ref('vehicleDrivers').on('value', (snapshot) => {
            if (snapshot.exists()) {
                companyDrivers = [];
                Object.entries(snapshot.val()).forEach(([code, driver]) => {
                    if (driver.tenantId === tenantId) {
                        companyDrivers.push({ code, ...driver });
                    }
                });
                updateDriversTable();
            }
        });
        
        // تحميل المركبات
        database.ref('liveLocation').on('value', (snapshot) => {
            if (snapshot.exists()) {
                companyVehicles = [];
                Object.entries(snapshot.val()).forEach(([code, vehicle]) => {
                    const driver = companyDrivers.find(d => d.code === code);
                    if (driver) {
                        companyVehicles.push({ code, ...vehicle });
                    }
                });
                updateVehiclesTable();
            }
        });
        
        // تحميل مستخدمي الشركة
        firestore.collection('users').where('tenantId', '==', tenantId).onSnapshot((snapshot) => {
            companyUsers = [];
            snapshot.forEach(doc => {
                companyUsers.push({ id: doc.id, ...doc.data() });
            });
            updateCompanyUsersTable();
        });
    } catch (error) {
        console.error('خطأ في تحميل بيانات الشركة:', error);
    }
}

// تحديث جدول السائقين
function updateDriversTable() {
    const tbody = document.getElementById('drivers-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    companyDrivers.forEach(driver => {
        const vehicle = companyVehicles.find(v => v.code === driver.code);
        const status = vehicle && vehicle.speed > 0 ? 'نشط' : 'متوقف';
        const statusColor = vehicle && vehicle.speed > 0 ? '#28a745' : '#dc3545';
        const dailyDistance = vehicle ? (vehicle.dailyDistance || 0).toFixed(2) : '0.00';
        
        const html = `
            <tr>
                <td>${driver.name}</td>
                <td>${driver.phone}</td>
                <td>${driver.code}</td>
                <td><span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px;">${status}</span></td>
                <td>${dailyDistance} كم</td>
                <td>
                    <button class="btn btn-sm" onclick="editDriver('${driver.code}')" style="padding: 5px 10px; margin-right: 5px;">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDriver('${driver.code}')" style="padding: 5px 10px;">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث جدول المركبات
function updateVehiclesTable() {
    const tbody = document.getElementById('vehicles-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    companyVehicles.forEach(vehicle => {
        const driver = companyDrivers.find(d => d.code === vehicle.code);
        const status = vehicle.speed > 0 ? 'نشط' : 'متوقف';
        const statusColor = vehicle.speed > 0 ? '#28a745' : '#dc3545';
        
        const html = `
            <tr>
                <td>${vehicle.code}</td>
                <td>مركبة</td>
                <td>${driver ? driver.name : 'لم يلحق'}</td>
                <td><span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px;">${status}</span></td>
                <td>${vehicle.location || 'تحديث...'}</td>
                <td>
                    <button class="btn btn-sm" onclick="selectVehicleOnMap('${vehicle.code}')">عرض</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث جدول مستخدمي الشركة
function updateCompanyUsersTable() {
    const tbody = document.getElementById('company-users-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    companyUsers.forEach(user => {
        const createdAt = new Date(user.createdAt.toDate()).toLocaleDateString('ar-EG');
        const status = user.active ? 'نشط' : 'معطل';
        const statusColor = user.active ? '#28a745' : '#dc3545';
        
        const html = `
            <tr>
                <td>${user.displayName}</td>
                <td>${user.email}</td>
                <td>${user.role === 'company_manager' ? 'مدير الشركة' : 'عارض'}</td>
                <td><span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px;">${status}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="disableUser('${user.id}')" style="padding: 5px 10px; margin-right: 5px;">${user.active ? 'تعطيل' : 'تفعيل'}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCompanyUser('${user.id}')" style="padding: 5px 10px;">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// فتح نافذة إضافة سائق
function openAddDriverModal() {
    document.getElementById('add-driver-modal').style.display = 'block';
}

// فتح نافذة إضافة مستخدم للشركة
function openAddCompanyUserModal() {
    document.getElementById('add-company-user-modal').style.display = 'block';
}

// إضافة سائق جديد
async function addDriver(event) {
    event.preventDefault();
    
    const name = document.getElementById('driver-name').value;
    const phone = document.getElementById('driver-phone').value;
    const vehicleCode = document.getElementById('driver-vehicle').value;
    const driverId = document.getElementById('driver-id').value;
    
    if (!name || !phone || !vehicleCode || !driverId) {
        alert('رجاءً ملء جميع الحقول');
        return;
    }
    
    try {
        // إضافة السائق إلى Realtime Database
        await database.ref(`vehicleDrivers/${driverId}`).set({
            name: name,
            phone: phone,
            vehicleCode: vehicleCode,
            tenantId: tenantId,
            createdAt: new Date().toISOString(),
            active: true
        });
        
        // إضافة رمز التفعيل
        await database.ref(`activationCodes/${phone}`).set({
            driverCode: driverId,
            driverName: name,
            createdAt: new Date().toISOString(),
            used: false,
            tenantId: tenantId
        });
        
        // إضافة إلى Firestore
        await firestore.collection('drivers').doc(driverId).set({
            name: name,
            phone: phone,
            vehicleCode: vehicleCode,
            tenantId: tenantId,
            createdAt: new Date(),
            active: true
        });
        
        alert('✅ تم إضافة السائق بنجاح!');
        closeModal('add-driver-modal');
        document.getElementById('add-driver-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة السائق:', error);
        alert('❌ حدث خطأ: ' + error.message);
    }
}

// إضافة مستخدم جديد للشركة
async function addCompanyUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('comp-user-name').value;
    const email = document.getElementById('comp-user-email').value;
    const password = document.getElementById('comp-user-password').value;
    const role = document.getElementById('comp-user-role').value;
    
    if (password.length < 6) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    try {
        // إنشاء حساب في Firebase Auth
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        // إضافة بيانات المستخدم إلى Firestore
        await firestore.collection('users').doc(user.uid).set({
            email: email,
            displayName: name,
            role: role,
            tenantId: tenantId,
            createdAt: new Date(),
            active: true,
            lastLogin: null
        });
        
        alert('✅ تم إضافة المستخدم بنجاح!');
        closeModal('add-company-user-modal');
        document.getElementById('add-company-user-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة المستخدم:', error);
        alert('❌ حدث خطأ: ' + error.message);
    }
}

// تعديل بيانات السائق
async function editDriver(driverId) {
    const driver = companyDrivers.find(d => d.code === driverId);
    if (!driver) {
        alert('لم يتم العثور على السائق');
        return;
    }
    
    const newName = prompt('الاسم الجديد:', driver.name);
    if (!newName) return;
    
    try {
        await database.ref(`vehicleDrivers/${driverId}/name`).set(newName);
        await firestore.collection('drivers').doc(driverId).update({ name: newName });
        alert('✅ تم تحديث بيانات السائق!');
    } catch (error) {
        console.error('خطأ في التعديل:', error);
        alert('❌ حدث خطأ في تعديل بيانات السائق');
    }
}

// حذف سائق
async function deleteDriver(driverId) {
    if (!confirm('هل أنت متأكد من حذف هذا السائق؟')) {
        return;
    }
    
    try {
        const driver = companyDrivers.find(d => d.code === driverId);
        
        // حذف من Realtime Database
        await database.ref(`vehicleDrivers/${driverId}`).remove();
        await database.ref(`activationCodes/${driver.phone}`).remove();
        
        // حذف من Firestore
        await firestore.collection('drivers').doc(driverId).delete();
        
        alert('✅ تم حذف السائق بنجاح!');
    } catch (error) {
        console.error('خطأ في حذف السائق:', error);
        alert('❌ حدث خطأ في حذف السائق');
    }
}

// تعطيل/تفعيل مستخدم
async function disableUser(userId) {
    try {
        const user = companyUsers.find(u => u.id === userId);
        await firestore.collection('users').doc(userId).update({
            active: !user.active
        });
        alert('✅ تم ' + (!user.active ? 'تفعيل' : 'تعطيل') + ' المستخدم!');
    } catch (error) {
        console.error('خطأ:', error);
        alert('❌ حدث خطأ');
    }
}

// حذف مستخدم من الشركة
async function deleteCompanyUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        return;
    }
    
    try {
        await firestore.collection('users').doc(userId).delete();
        alert('✅ تم حذف المستخدم بنجاح!');
    } catch (error) {
        console.error('خطأ في حذف المستخدم:', error);
        alert('❌ حدث خطأ في حذف المستخدم');
    }
}

// تبديل التبويبات
function switchTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    contents.forEach(content => content.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));
    
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.classList.add('active');
    
    event.target.classList.add('active');
    
    if (tabName === 'reports-tab') {
        loadReportDriversList();
    }
}

// تحميل قائمة السائقين للتقارير
function loadReportDriversList() {
    const select = document.getElementById('report-driver-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">اختر سائق...</option>';
    
    companyDrivers.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver.code;
        option.textContent = driver.name;
        select.appendChild(option);
    });
}

// إنشاء التقرير
async function generateReport() {
    const driverCode = document.getElementById('report-driver-select').value;
    const reportDate = document.getElementById('report-date').value;
    
    if (!driverCode) {
        alert('رجاءً اختر سائق');
        return;
    }
    
    if (!reportDate) {
        alert('رجاءً اختر تاريخ');
        return;
    }
    
    try {
        const driver = companyDrivers.find(d => d.code === driverCode);
        
        const startDate = new Date(reportDate);
        const endDate = new Date(reportDate);
        endDate.setDate(endDate.getDate() + 1);
        
        const snapshot = await database.ref('locationHistory').orderByChild('timestamp')
            .startAt(startDate.getTime())
            .endAt(endDate.getTime())
            .once('value');
        
        let records = [];
        if (snapshot.exists()) {
            Object.values(snapshot.val()).forEach(record => {
                if (record.driverCode === driverCode) {
                    records.push(record);
                }
            });
        }
        
        // حساب الإحصائيات
        let totalDistance = 0;
        let maxSpeed = 0;
        let avgSpeed = 0;
        let speedSum = 0;
        let speedCount = 0;
        let totalStopTime = 0;
        let startTime = null;
        let endTime = null;
        
        records.forEach((record, index) => {
            if (index === 0) {
                startTime = new Date(record.timestamp).toLocaleString('ar-EG');
            }
            endTime = new Date(record.timestamp).toLocaleString('ar-EG');
            
            if (index > 0) {
                const prev = records[index - 1];
                const distance = calculateDistance(prev.latitude, prev.longitude, record.latitude, record.longitude);
                totalDistance += distance;
                
                if (record.speed === 0) {
                    totalStopTime += (record.timestamp - prev.timestamp) / 1000 / 60;
                }
            }
            
            if (record.speed) {
                maxSpeed = Math.max(maxSpeed, record.speed);
                speedSum += record.speed;
                speedCount++;
            }
        });
        
        if (speedCount > 0) {
            avgSpeed = (speedSum / speedCount).toFixed(2);
        }
        
        const reportContent = `
            <div style="direction: rtl; font-family: Arial; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h2 style="color: #007bff; text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 15px;">📊 تقرير يومي</h2>
                
                <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-right: 4px solid #28a745;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">👤 بيانات السائق</h3>
                    <p style="margin: 5px 0;"><strong>الاسم:</strong> ${driver ? driver.name : 'غير معروف'}</p>
                    <p style="margin: 5px 0;"><strong>رمز السائق:</strong> ${driverCode}</p>
                    <p style="margin: 5px 0;"><strong>رقم الهاتف:</strong> ${driver ? driver.phone : 'N/A'}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-right: 4px solid #007bff;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">📊 إحصائيات اليوم</h3>
                    <p style="margin: 5px 0;"><strong>عدد نقاط التتبع:</strong> ${records.length}</p>
                    <p style="margin: 5px 0;"><strong>إجمالي المسافة:</strong> <span style="color: #007bff; font-weight: bold;">${totalDistance.toFixed(2)} كم</span></p>
                    <p style="margin: 5px 0;"><strong>أقصى سرعة:</strong> <span style="color: #dc3545; font-weight: bold;">${maxSpeed.toFixed(2)} كم/س</span></p>
                    <p style="margin: 5px 0;"><strong>متوسط السرعة:</strong> <span style="color: #ffc107; font-weight: bold;">${avgSpeed} كم/س</span></p>
                    <p style="margin: 5px 0;"><strong>وقت التوقف:</strong> ${totalStopTime.toFixed(0)} دقيقة</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-right: 4px solid #17a2b8;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">🕐 الوقت</h3>
                    <p style="margin: 5px 0;"><strong>بداية:</strong> ${startTime}</p>
                    <p style="margin: 5px 0;"><strong>نهاية:</strong> ${endTime}</p>
                    <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${reportDate}</p>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="printReport()" style="
                        padding: 10px 20px;
                        background-color: #28a745;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        margin-left: 10px;
                    ">🖨️ طباعة</button>
                    <button onclick="downloadReportPDF()" style="
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                    ">📄 تحميل PDF</button>
                </div>
            </div>
        `;
        
        document.getElementById('report-content').innerHTML = reportContent;
    } catch (error) {
        console.error('خطأ في إنشاء التقرير:', error);
        alert('❌ حدث خطأ في إنشاء التقرير');
    }
}

// طباعة التقرير
function printReport() {
    const reportContent = document.getElementById('report-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة التقرير</title>
            <style>
                body { font-family: Arial; margin: 20px; }
                h2 { color: #007bff; text-align: center; }
            </style>
        </head>
        <body>
            ${reportContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// تحميل بيانات الشركة عند فتح الصفحة
function initializeCompanyPage() {
    if (currentUser && userRole === 'company_manager') {
        loadCompanyData();
        loadReportDriversList();
    }
}

// إغلاق النوافذ المنبثقة
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
