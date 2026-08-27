// Authentication Module - Enhanced
let currentUser = null;
let userRole = null;
let tenantId = null;
let userData = null;

// تسجيل الدخول
async function loginUser(email, password) {
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        currentUser = result.user;
        
        // الحصول على بيانات المستخدم من Firestore
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            userRole = userData.role;
            tenantId = userData.tenantId;
            
            // حفظ البيانات في localStorage
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('tenantId', tenantId || '');
            localStorage.setItem('userName', userData.displayName);
            localStorage.setItem('userId', currentUser.uid);
            localStorage.setItem('userEmail', currentUser.email);
            
            return true;
        } else {
            alert('لم يتم العثور على بيانات المستخدم');
            return false;
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showLoginError(error.message);
        return false;
    }
}

// تسجيل حساب جديد
async function registerUser(email, password, displayName, tenantData) {
    try {
        // إنشاء حساب في Firebase Auth
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        // إنشاء مستند Tenant
        const tenantRef = await firestore.collection('tenants').add({
            name: tenantData.companyName,
            email: tenantData.companyEmail,
            phone: tenantData.companyPhone,
            address: tenantData.address,
            city: tenantData.city,
            country: tenantData.country,
            website: tenantData.website,
            createdAt: new Date(),
            active: true,
            subscriptionStatus: 'active',
            subscriptionType: tenantData.subscriptionType || 'free',
            maxVehicles: tenantData.subscriptionType === 'premium' ? 500 : 50,
            usedVehicles: 0,
            maxUsers: tenantData.subscriptionType === 'premium' ? 50 : 5,
            usedUsers: 1,
            features: {
                liveTracking: true,
                reports: true,
                alerts: tenantData.subscriptionType === 'premium',
                analytics: tenantData.subscriptionType === 'premium',
                api: tenantData.subscriptionType === 'premium'
            }
        });
        
        // إنشاء مستند المستخدم (مدير الشركة)
        await firestore.collection('users').doc(user.uid).set({
            email: email,
            displayName: displayName,
            role: 'company_manager',
            tenantId: tenantRef.id,
            createdAt: new Date(),
            active: true,
            lastLogin: null,
            phone: tenantData.contactPhone,
            position: tenantData.position
        });
        
        return { success: true, tenantId: tenantRef.id, userId: user.uid };
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        return { success: false, error: error.message };
    }
}

// إنشاء حساب Admin (من لوحة الإدارة فقط)
async function createAdminUser(email, password, displayName) {
    try {
        // التحقق من أن المستخدم الحالي هو Admin
        if (userRole !== 'admin') {
            throw new Error('لا تملك صلاحيات كافية لإنشاء حساب Admin');
        }
        
        // إنشاء حساب في Firebase Auth
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const user = result.user;
        
        // إنشاء مستند المستخدم (Admin)
        await firestore.collection('users').doc(user.uid).set({
            email: email,
            displayName: displayName,
            role: 'admin',
            tenantId: null,
            createdAt: new Date(),
            active: true,
            lastLogin: null,
            createdBy: currentUser.uid
        });
        
        return { success: true, userId: user.uid };
    } catch (error) {
        console.error('خطأ في إنشاء Admin:', error);
        return { success: false, error: error.message };
    }
}

// تسجيل الخروج
async function logout() {
    try {
        await auth.signOut();
        currentUser = null;
        userRole = null;
        tenantId = null;
        userData = null;
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
    const userEmail = localStorage.getItem('userEmail') || '';
    
    // تحديث أسماء المستخدمين
    const userNameElements = document.querySelectorAll('#user-name, #company-user-name, #admin-user-name');
    userNameElements.forEach(el => {
        el.textContent = userName;
    });
    
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

// عرض خطأ تسجيل الدخول
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = 'خطأ: ' + message;
        errorDiv.style.display = 'block';
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
        
        errorDiv.textContent = 'جاري التحقق من البيانات...';
        errorDiv.style.display = 'block';
        
        const success = await loginUser(email, password);
        
        if (success) {
            errorDiv.style.display = 'none';
            initializeDashboard();
            initializeMap();
        }
    });
}

// معالجة نموذج التسجيل
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const displayName = document.getElementById('reg-name').value;
        const companyName = document.getElementById('company-name').value;
        const companyEmail = document.getElementById('company-email').value;
        const companyPhone = document.getElementById('company-phone').value;
        const contactPhone = document.getElementById('contact-phone').value;
        const position = document.getElementById('position').value;
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const country = document.getElementById('country').value;
        const website = document.getElementById('website').value;
        const subscriptionType = document.getElementById('subscription-type').value;
        
        const errorDiv = document.getElementById('register-error');
        
        // التحقق من صحة كلمة المرور
        if (password !== confirmPassword) {
            errorDiv.textContent = 'كلمات المرور غير متطابقة';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (password.length < 6) {
            errorDiv.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
            errorDiv.style.display = 'block';
            return;
        }
        
        errorDiv.textContent = 'جاري إنشاء الحساب...';
        errorDiv.style.display = 'block';
        
        const result = await registerUser(email, password, displayName, {
            companyName,
            companyEmail,
            companyPhone,
            contactPhone,
            position,
            address,
            city,
            country,
            website,
            subscriptionType
        });
        
        if (result.success) {
            errorDiv.textContent = '✅ تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...';
            errorDiv.style.color = 'green';
            
            setTimeout(() => {
                // تسجيل الدخول التلقائي
                loginUser(email, password);
            }, 2000);
        } else {
            errorDiv.textContent = 'خطأ: ' + result.error;
            errorDiv.style.display = 'block';
        }
    });
}

// التبديل بين نموذج التسجيل والدخول
function toggleAuthForm() {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const loginTitle = document.getElementById('login-title');
    const registerTitle = document.getElementById('register-title');
    
    if (loginForm && registerForm) {
        loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
        registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
        
        if (loginTitle) loginTitle.style.display = loginTitle.style.display === 'none' ? 'block' : 'none';
        if (registerTitle) registerTitle.style.display = registerTitle.style.display === 'none' ? 'block' : 'none';
    }
}