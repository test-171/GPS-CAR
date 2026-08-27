// Admin Module - Enhanced
let allTenants = [];
let allUsers = [];
let allAdmins = [];
let adminSettings = {};

// تحميل بيانات الإدارة
async function loadAdminData() {
    try {
        // تحميل الشركات
        firestore.collection('tenants').onSnapshot((snapshot) => {
            allTenants = [];
            snapshot.forEach(doc => {
                allTenants.push({ id: doc.id, ...doc.data() });
            });
            updateTenantsList(allTenants);
            updateAdminStats();
        });
        
        // تحميل جميع المستخدمين
        firestore.collection('users').where('role', '!=', 'admin').onSnapshot((snapshot) => {
            allUsers = [];
            snapshot.forEach(doc => {
                allUsers.push({ id: doc.id, ...doc.data() });
            });
            updateAdminUsersList(allUsers);
            updateAdminStats();
        });
        
        // تحميل المسؤولين
        firestore.collection('users').where('role', '==', 'admin').onSnapshot((snapshot) => {
            allAdmins = [];
            snapshot.forEach(doc => {
                allAdmins.push({ id: doc.id, ...doc.data() });
            });
            updateAdminsList(allAdmins);
            updateAdminStats();
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

// تحديث قائمة الشركات
function updateTenantsList(tenants) {
    const tbody = document.getElementById('tenants-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    tenants.forEach(tenant => {
        const usedVehicles = tenant.usedVehicles || 0;
        const maxVehicles = tenant.maxVehicles || 50;
        const usagePercent = ((usedVehicles / maxVehicles) * 100).toFixed(0);
        
        const createdAt = new Date(tenant.createdAt.toDate()).toLocaleDateString('ar-EG');
        
        const html = `
            <tr>
                <td><strong>${tenant.name}</strong></td>
                <td>${tenant.email}</td>
                <td>${tenant.country || '-'}</td>
                <td>
                    <div style="width: 100px; background: #ddd; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${usagePercent}%; background: ${usagePercent > 80 ? '#dc3545' : '#28a745'}; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white;">
                            ${usedVehicles}/${maxVehicles}
                        </div>
                    </div>
                </td>
                <td><span style="background: ${tenant.subscriptionType === 'premium' ? '#ffc107' : '#6c757d'}; color: white; padding: 4px 8px; border-radius: 4px;">${tenant.subscriptionType === 'premium' ? 'متميز' : 'مجاني'}</span></td>
                <td><span style="background: ${tenant.subscriptionStatus === 'active' ? '#28a745' : '#dc3545'}; color: white; padding: 4px 8px; border-radius: 4px;">${tenant.subscriptionStatus}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="viewTenantDetails('${tenant.id}')">عرض</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTenant('${tenant.id}')">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث جدول المستخدمين
function updateAdminUsersList(users) {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const tenant = allTenants.find(t => t.id === user.tenantId);
        const createdAt = new Date(user.createdAt.toDate()).toLocaleDateString('ar-EG');
        
        const html = `
            <tr>
                <td>${user.displayName}</td>
                <td>${user.email}</td>
                <td>${tenant ? tenant.name : 'N/A'}</td>
                <td>${user.role === 'company_manager' ? 'مدير الشركة' : 'عارض'}</td>
                <td><span style="background: ${user.active ? '#28a745' : '#dc3545'}; color: white; padding: 4px 8px; border-radius: 4px;">${user.active ? 'نشط' : 'معطل'}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="disableAdminUser('${user.id}')">${user.active ? 'تعطيل' : 'تفعيل'}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminUser('${user.id}')">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث جدول المسؤولين
function updateAdminsList(admins) {
    const tbody = document.getElementById('admins-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    admins.forEach(admin => {
        const createdAt = new Date(admin.createdAt.toDate()).toLocaleDateString('ar-EG');
        const lastLogin = admin.lastLogin ? new Date(admin.lastLogin.toDate()).toLocaleString('ar-EG') : 'لم يسجل دخول';
        
        const html = `
            <tr>
                <td>${admin.displayName}</td>
                <td>${admin.email}</td>
                <td>${createdAt}</td>
                <td>${lastLogin}</td>
                <td><span style="background: ${admin.active ? '#28a745' : '#dc3545'}; color: white; padding: 4px 8px; border-radius: 4px;">${admin.active ? 'نشط' : 'معطل'}</span></td>
                <td>
                    ${admin.id !== currentUser.uid ? `
                        <button class="btn btn-sm" onclick="disableAdmin('${admin.id}')">${admin.active ? 'تعطيل' : 'تفعيل'}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${admin.id}')">حذف</button>
                    ` : '<span style="color: #666;">أنت</span>'}
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

// تحديث الإحصائيات
function updateAdminStats() {
    document.getElementById('total-tenants').textContent = allTenants.length;
    document.getElementById('total-users').textContent = allUsers.length;
    document.getElementById('total-admins').textContent = allAdmins.length;
    
    let totalVehicles = 0;
    let totalDrivers = 0;
    let activeSubscriptions = 0;
    
    allTenants.forEach(tenant => {
        totalVehicles += tenant.usedVehicles || 0;
        activeSubscriptions += tenant.subscriptionStatus === 'active' ? 1 : 0;
    });
    
    document.getElementById('total-all-vehicles').textContent = totalVehicles;
    document.getElementById('total-all-drivers').textContent = totalDrivers;
    document.getElementById('active-subscriptions').textContent = activeSubscriptions;
}

// فتح نافذة إضافة مسؤول
function openAddAdminModal() {
    document.getElementById('add-admin-modal').style.display = 'block';
}

// إضافة مسؤول جديد
async function addAdminUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('admin-name').value;
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (password.length < 6) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    try {
        const result = await createAdminUser(email, password, name);
        
        if (result.success) {
            alert('✅ تم إنشاء حساب المسؤول بنجاح!');
            closeModal('add-admin-modal');
            document.getElementById('add-admin-form').reset();
        } else {
            alert('❌ خطأ: ' + result.error);
        }
    } catch (error) {
        console.error('خطأ في إنشاء المسؤول:', error);
        alert('❌ حدث خطأ: ' + error.message);
    }
}

// تعطيل/تفعيل مستخدم
async function disableAdminUser(userId) {
    try {
        const user = allUsers.find(u => u.id === userId);
        await firestore.collection('users').doc(userId).update({
            active: !user.active
        });
        alert('✅ تم ' + (!user.active ? 'تفعيل' : 'تعطيل') + ' المستخدم!');
    } catch (error) {
        console.error('خطأ:', error);
        alert('❌ حدث خطأ');
    }
}

// حذف مستخدم
async function deleteAdminUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
        await firestore.collection('users').doc(userId).delete();
        alert('✅ تم حذف المستخدم بنجاح!');
    } catch (error) {
        console.error('خطأ:', error);
        alert('❌ حدث خطأ في حذف المستخدم');
    }
}

// تعطيل/تفعيل مسؤول
async function disableAdmin(adminId) {
    try {
        const admin = allAdmins.find(a => a.id === adminId);
        await firestore.collection('users').doc(adminId).update({
            active: !admin.active
        });
        alert('✅ تم ' + (!admin.active ? 'تفعيل' : 'تعطيل') + ' المسؤول!');
    } catch (error) {
        console.error('خطأ:', error);
        alert('❌ حدث خطأ');
    }
}

// حذف مسؤول
async function deleteAdmin(adminId) {
    if (!confirm('هل أنت متأكد من حذف هذا المسؤول؟')) return;
    
    try {
        await firestore.collection('users').doc(adminId).delete();
        alert('✅ تم حذف المسؤول بنجاح!');
    } catch (error) {
        console.error('خطأ:', error);
        alert('❌ حدث خطأ في حذف المسؤول');
    }
}

// حذف شركة
async function deleteTenant(tenantId) {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة وجميع بيانتها؟')) return;
    
    try {
        // حذف المستخدمين المرتبطين
        const usersSnapshot = await firestore.collection('users').where('tenantId', '==', tenantId).get();
        const batch = firestore.batch();
        
        usersSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // حذف الشركة
        batch.delete(firestore.collection('tenants').doc(tenantId));
        await batch.commit();
        
        alert('✅ تم حذف الشركة بنجاح!');
    } catch (error) {
        console.error('خطأ في حذف الشركة:', error);
        alert('❌ حدث خطأ في حذف الشركة');
    }
}

// عرض تفاصيل الشركة
function viewTenantDetails(tenantId) {
    const tenant = allTenants.find(t => t.id === tenantId);
    if (!tenant) return;
    
    const details = `
🏢 ${tenant.name}
📧 البريد: ${tenant.email}
📱 الهاتف: ${tenant.phone}
🌍 الدولة: ${tenant.country}
🏘️ المدينة: ${tenant.city}
📍 العنوان: ${tenant.address}
🌐 الموقع: ${tenant.website || 'N/A'}
📊 نوع الاشتراك: ${tenant.subscriptionType === 'premium' ? 'متميز' : 'مجاني'}
✅ حالة الاشتراك: ${tenant.subscriptionStatus}
🚗 المركبات: ${tenant.usedVehicles}/${tenant.maxVehicles}
👥 المستخدمون: ${tenant.usedUsers}/${tenant.maxUsers}
    `;
    
    alert(details);
}

// تبديل التبويبات
function switchAdminTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    contents.forEach(content => content.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));
    
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.classList.add('active');
    
    event.target.classList.add('active');
}

// تحديث الإعدادات
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
    const maxFreeVehicles = parseInt(document.getElementById('max-free-vehicles').value);
    const maxFreeUsers = parseInt(document.getElementById('max-free-users').value);
    
    if (updateInterval < 1 || updateInterval > 60) {
        alert('رجاءً أدخل قيمة بين 1 و 60');
        return;
    }
    
    try {
        await firestore.collection('settings').doc('global').set({
            liveTracking: liveTracking,
            emailAlerts: emailAlerts,
            locationUpdateInterval: updateInterval,
            maxFreeVehicles: maxFreeVehicles,
            maxFreeUsers: maxFreeUsers,
            updatedAt: new Date(),
            updatedBy: currentUser.uid
        }, { merge: true });
        
        alert('✅ تم حفظ الإعدادات بنجاح!');
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        alert('❌ حدث خطأ في حفظ الإعدادات');
    }
}

// تهيئة لوحة الإدارة
function initializeAdminPage() {
    if (currentUser && userRole === 'admin') {
        loadAdminData();
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
