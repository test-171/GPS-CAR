// Admin Module - لوحة إدارة النظام
let allTenants = [];
let allUsers = [];
let adminSettings = {};

// فتح نافذة إضافة مستأجر
function openAddTenantModal() {
    document.getElementById('add-tenant-modal').style.display = 'block';
}

// فتح نافذة إضافة مستخدم
function openAddUserModal() {
    const select = document.getElementById('user-tenant');
    select.innerHTML = '';
    allTenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant.id;
        option.textContent = tenant.name;
        select.appendChild(option);
    });
    document.getElementById('add-user-modal').style.display = 'block';
}

// تحميل بيانات الإدارة
async function loadAdminData() {
    try {
        // تحميل المستأجرين
        firestore.collection('tenants').onSnapshot((snapshot) => {
            allTenants = [];
            snapshot.forEach(doc => {
                allTenants.push({ id: doc.id, ...doc.data() });
            });
            updateTenantsList(allTenants);
        });
        
        // تحميل المستخدمين
        firestore.collection('users').onSnapshot((snapshot) => {
            allUsers = [];
            snapshot.forEach(doc => {
                allUsers.push({ id: doc.id, ...doc.data() });
            });
            updateUsersList(allUsers);
        });
        
        // تحميل الإعدادات
        firestore.collection('settings').doc('global').onSnapshot((doc) => {
            if (doc.exists) {
                adminSettings = doc.data();
                updateSettingsUI();
            }
        });
    } catch (error) {
        console.error('خطأ في تحميل بيانات الإدارة:', error);
    }
}

// إضافة مستأجر
async function addTenant(event) {
    event.preventDefault();
    
    const name = document.getElementById('tenant-name').value;
    const email = document.getElementById('tenant-email').value;
    const phone = document.getElementById('tenant-phone').value;
    
    if (!name || !email || !phone) {
        alert('رجاءاً ملئ جميع الحقول');
        return;
    }
    
    try {
        const docRef = await firestore.collection('tenants').add({
            name: name,
            email: email,
            phone: phone,
            createdAt: new Date(),
            active: true,
            subscriptionStatus: 'active',
            maxVehicles: 50,
            usedVehicles: 0
        });
        
        alert('✅ تم إضافة المستأجر بنجاح!');
        closeModal('add-tenant-modal');
        document.getElementById('add-tenant-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة المستأجر:', error);
        alert('❌ حدث خطأ: ' + error.message);
    }
}

// إضافة مستخدم
async function addUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const tenantId = document.getElementById('user-tenant').value;
    
    if (!name || !email || !password || !role) {
        alert('رجاءاً ملئ جميع الحقول');
        return;
    }
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        await firestore.collection('users').doc(user.uid).set({
            email: email,
            displayName: name,
            role: role,
            tenantId: tenantId || null,
            createdAt: new Date(),
            active: true,
            lastLogin: null
        });
        
        alert('✅ تم إضافة المستخدم بنجاح!');
        closeModal('add-user-modal');
        document.getElementById('add-user-form').reset();
    } catch (error) {
        console.error('خطأ في إضافة المستخدم:', error);
        alert('❌ حدث خطأ: ' + error.message);
    }
}

// حذف مستأجر
async function deleteTenant(tenantId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستأجر؟')) {
        return;
    }
    
    try {
        // حذف المسطخدمين المرتبطين
        const usersSnapshot = await firestore.collection('users').where('tenantId', '==', tenantId).get();
        const batch = firestore.batch();
        
        usersSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // حذف المستأجر
        batch.delete(firestore.collection('tenants').doc(tenantId));
        await batch.commit();
        
        alert('✅ تم حذف المستأجر بنجاح!');
    } catch (error) {
        console.error('خطأ في حذف المستأجر:', error);
        alert('❌ حدث خطأ في حذف المستأجر');
    }
}

// حذف مستخدم
async function deleteUser(userId) {
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

// تبديل التبويبات الإدارية
function switchAdminTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    contents.forEach(content => {
        content.classList.remove('active');
    });
    
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    event.target.classList.add('active');
}

// تحديث واجهة الإعدادات
function updateSettingsUI() {
    if (adminSettings.liveTracking !== undefined) {
        document.getElementById('live-tracking').checked = adminSettings.liveTracking;
    }
    if (adminSettings.emailAlerts !== undefined) {
        document.getElementById('email-alerts').checked = adminSettings.emailAlerts;
    }
    if (adminSettings.locationUpdateInterval) {
        document.getElementById('location-update-interval').value = adminSettings.locationUpdateInterval;
    }
}

// حفظ الإعدادات
async function saveSettings() {
    const liveTracking = document.getElementById('live-tracking').checked;
    const emailAlerts = document.getElementById('email-alerts').checked;
    const updateInterval = parseInt(document.getElementById('location-update-interval').value);
    
    if (updateInterval < 1 || updateInterval > 60) {
        alert('رجاءاً أدخل قيمة بين 1 و 60');
        return;
    }
    
    try {
        await firestore.collection('settings').doc('global').set({
            liveTracking: liveTracking,
            emailAlerts: emailAlerts,
            locationUpdateInterval: updateInterval,
            updatedAt: new Date(),
            updatedBy: currentUser.uid
        }, { merge: true });
        
        alert('✅ تم حفظ الإعدادات بنجاح!');
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        alert('❌ حدث خطأ في حفظ الإعدادات');
    }
}

// الحصول على عدد المركبات للمستأجر
function getVehicleCountForTenant(tenantId) {
    return Object.values(driversData).filter(d => d.tenantId === tenantId).length;
}

// تحميل بيانات الإدارة عند فتح اللوحة
function initializeAdminPage() {
    if (currentUser && userRole === 'admin') {
        loadAdminData();
    }
}

// تراصل عرض الصفحات
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // تهيئة بيانات الصفحة
        if (pageId === 'company-page') {
            initializeCompanyPage();
        } else if (pageId === 'admin-page') {
            initializeAdminPage();
        }
    }
}

// معالجة نموذج تسجيل الدخول
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            errorDiv.textContent = 'جاري التحقق من بياناتك...';
            const success = await loginUser(email, password);
            
            if (success) {
                initializeDashboard();
                initializeMap();
                errorDiv.textContent = '';
            } else {
                errorDiv.textContent = 'فشل تسجيل الدخول. تحقق من بياناتك';
            }
        } catch (error) {
            errorDiv.textContent = 'خطأ في تسجيل الدخول: ' + error.message;
        }
    });
}