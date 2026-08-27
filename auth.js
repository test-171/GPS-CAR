// Authentication Module
let currentUser = null;
let userRole = null;
let tenantId = null;

// تسجيل الدخول
async function loginUser(email, password) {
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        currentUser = result.user;
        
        // الحصول على بيانات المستخدم من Firestore
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userRole = userDoc.data().role;
            tenantId = userDoc.data().tenantId;
            
            // حفظ البيانات في localStorage
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('tenantId', tenantId);
            localStorage.setItem('userName', userDoc.data().displayName);
            localStorage.setItem('userId', currentUser.uid);
            
            return true;
        } else {
            alert('لم يتم العثور على بيانات المستخدم');
            return false;
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return false;
    }
}

// تسجيل الخروج
async function logout() {
    try {
        await auth.signOut();
        currentUser = null;
        userRole = null;
        tenantId = null;
        localStorage.clear();
        showPage('login-page');
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
}

// التحقق من حالة تسجيل الدخول
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        const storedRole = localStorage.getItem('userRole');
        userRole = storedRole;
        tenantId = localStorage.getItem('tenantId');
        
        // تحديث عرض واجهة المستخدم بناءً على الدور
        updateUIByRole();
        initializeDashboard();
    } else {
        currentUser = null;
        userRole = null;
        tenantId = null;
    }
});

// تحديث واجهة المستخدم بناءً على الدور
function updateUIByRole() {
    const userName = localStorage.getItem('userName') || 'المستخدم';
    document.getElementById('user-name').textContent = userName;
    document.getElementById('company-user-name').textContent = userName;
    document.getElementById('admin-user-name').textContent = userName;
    
    // إظهار/إخفاء الخيارات بناءً على الدور
    const companyBtn = document.getElementById('company-nav-btn');
    const adminBtn = document.getElementById('admin-nav-btn');
    const adminBtn2 = document.getElementById('admin-nav-btn-2');
    
    if (userRole === 'admin') {
        if (companyBtn) companyBtn.style.display = 'block';
        if (adminBtn) adminBtn.style.display = 'block';
        if (adminBtn2) adminBtn2.style.display = 'block';
    } else if (userRole === 'company_manager') {
        if (companyBtn) companyBtn.style.display = 'block';
        if (adminBtn) adminBtn.style.display = 'none';
        if (adminBtn2) adminBtn2.style.display = 'none';
    } else {
        if (companyBtn) companyBtn.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        if (adminBtn2) adminBtn2.style.display = 'none';
    }
}

// إنشاء مستخدم جديد
async function createUser(email, password, displayName, role, tenantId) {
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        // إضافة بيانات المستخدم إلى Firestore
        await firestore.collection('users').doc(user.uid).set({
            email: email,
            displayName: displayName,
            role: role,
            tenantId: tenantId,
            createdAt: new Date(),
            active: true
        });
        
        return user;
    } catch (error) {
        console.error('خطأ في إنشاء المستخدم:', error);
        throw error;
    }
}