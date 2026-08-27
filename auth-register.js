// Advanced Registration Module

// عرض خيارات التسجيل
function showRegisterOptions() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('register-options-container').style.display = 'block';
}

// عرض نموذج التسجيل
function showRegisterForm(type) {
    document.getElementById('register-options-container').style.display = 'none';
    
    if (type === 'individual') {
        document.getElementById('register-individual-container').style.display = 'block';
    } else if (type === 'company') {
        document.getElementById('register-company-container').style.display = 'block';
    }
}

// عرض نموذج تسجيل الدخول
function showLoginForm() {
    document.getElementById('login-form-container').style.display = 'block';
    document.getElementById('register-options-container').style.display = 'none';
    document.getElementById('register-individual-container').style.display = 'none';
    document.getElementById('register-company-container').style.display = 'none';
    document.getElementById('admin-login-container').style.display = 'none';
}

// التبديل إلى دخول المسؤول
function toggleToAdminLogin() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('admin-login-container').style.display = 'block';
}

// تسجيل حساب فردي
const registerIndividualForm = document.getElementById('register-individual-form');
if (registerIndividualForm) {
    registerIndividualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('ind-name').value;
        const email = document.getElementById('ind-email').value;
        const phone = document.getElementById('ind-phone').value;
        const password = document.getElementById('ind-password').value;
        const confirmPassword = document.getElementById('ind-confirm-password').value;
        const subscription = document.querySelector('input[name="ind-subscription"]:checked').value;
        
        const errorDiv = document.getElementById('register-individual-error');
        
        // التحقق من صحة كلمة المرور
        if (password !== confirmPassword) {
            errorDiv.textContent = '❌ كلمات المرور غير متطابقة';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (password.length < 6) {
            errorDiv.textContent = '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!Utils.isValidEmail(email)) {
            errorDiv.textContent = '❌ البريد الإلكتروني غير صحيح';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!Utils.isValidPhone(phone)) {
            errorDiv.textContent = '❌ رقم الهاتف غير صحيح';
            errorDiv.style.display = 'block';
            return;
        }
        
        errorDiv.textContent = 'جاري إنشاء الحساب...';
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#666';
        
        try {
            // إنشاء حساب في Firebase
            const result = await auth.createUserWithEmailAndPassword(email, password);
            const user = result.user;
            
            // إنشاء وثيقة المستخدم
            await firestore.collection('users').doc(user.uid).set({
                email: email,
                displayName: name,
                phone: phone,
                role: 'viewer',
                accountType: 'individual',
                tenantId: null,
                createdAt: new Date(),
                active: true,
                lastLogin: null
            });
            
            // إنشاء وثيقة الاشتراك
            await firestore.collection('subscriptions').add({
                userId: user.uid,
                type: subscription,
                accountType: 'individual',
                status: 'active',
                maxVehicles: subscription === 'free' ? 5 : subscription === 'monthly' ? 50 : 200,
                usedVehicles: 0,
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + (subscription === 'annual' ? 12 : 1))),
                price: subscription === 'free' ? 0 : subscription === 'monthly' ? 99 : 999,
                paymentStatus: subscription === 'free' ? 'none' : 'pending'
            });
            
            errorDiv.textContent = '✅ تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...';
            errorDiv.style.color = 'green';
            
            setTimeout(() => {
                loginUser(email, password);
            }, 2000);
            
        } catch (error) {
            console.error('خطأ في التسجيل:', error);
            errorDiv.textContent = '❌ خطأ: ' + error.message;
            errorDiv.style.color = '#dc3545';
        }
    });
}

// تسجيل حساب شركة
const registerCompanyForm = document.getElementById('register-company-form');
if (registerCompanyForm) {
    registerCompanyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const companyName = document.getElementById('comp-name').value;
        const companyEmail = document.getElementById('comp-email').value;
        const companyPhone = document.getElementById('comp-phone').value;
        const address = document.getElementById('comp-address').value;
        const city = document.getElementById('comp-city').value;
        const country = document.getElementById('comp-country').value;
        const website = document.getElementById('comp-website').value;
        
        const managerName = document.getElementById('manager-name').value;
        const managerEmail = document.getElementById('manager-email').value;
        const managerPhone = document.getElementById('manager-phone').value;
        const managerPassword = document.getElementById('manager-password').value;
        const managerConfirmPassword = document.getElementById('manager-confirm-password').value;
        
        const subscription = document.querySelector('input[name="comp-subscription"]:checked').value;
        
        const errorDiv = document.getElementById('register-company-error');
        
        // التحقق من صحة البيانات
        if (managerPassword !== managerConfirmPassword) {
            errorDiv.textContent = '❌ كلمات المرور غير متطابقة';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (managerPassword.length < 6) {
            errorDiv.textContent = '❌ كلمة المرور قصيرة جداً';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!Utils.isValidEmail(companyEmail) || !Utils.isValidEmail(managerEmail)) {
            errorDiv.textContent = '❌ بريد إلكتروني غير صحيح';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!Utils.isValidPhone(companyPhone) || !Utils.isValidPhone(managerPhone)) {
            errorDiv.textContent = '❌ رقم هاتف غير صحيح';
            errorDiv.style.display = 'block';
            return;
        }
        
        errorDiv.textContent = 'جاري إنشاء حساب الشركة...';
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#666';
        
        try {
            // إنشاء حساب مدير الشركة
            const result = await auth.createUserWithEmailAndPassword(managerEmail, managerPassword);
            const managerUser = result.user;
            
            // إنشاء وثيقة الشركة (Tenant)
            const tenantRef = await firestore.collection('tenants').add({
                name: companyName,
                email: companyEmail,
                phone: companyPhone,
                address: address,
                city: city,
                country: country,
                website: website || null,
                createdAt: new Date(),
                active: true,
                subscriptionStatus: 'active',
                subscriptionType: subscription,
                maxVehicles: subscription === 'free' ? 10 : subscription === 'starter' ? 50 : subscription === 'pro' ? 250 : 9999,
                usedVehicles: 0,
                maxUsers: subscription === 'free' ? 3 : subscription === 'starter' ? 10 : subscription === 'pro' ? 50 : 9999,
                usedUsers: 1,
                features: {
                    liveTracking: true,
                    reports: true,
                    alerts: subscription !== 'free',
                    analytics: subscription === 'pro' || subscription === 'enterprise',
                    api: subscription === 'pro' || subscription === 'enterprise',
                    advancedReports: subscription === 'pro' || subscription === 'enterprise'
                }
            });
            
            // إنشاء وثيقة مدير الشركة
            await firestore.collection('users').doc(managerUser.uid).set({
                email: managerEmail,
                displayName: managerName,
                phone: managerPhone,
                role: 'company_manager',
                accountType: 'company',
                tenantId: tenantRef.id,
                createdAt: new Date(),
                active: true,
                lastLogin: null
            });
            
            // إنشاء وثيقة الاشتراك
            await firestore.collection('subscriptions').add({
                tenantId: tenantRef.id,
                userId: managerUser.uid,
                type: subscription,
                accountType: 'company',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                price: subscription === 'free' ? 0 : subscription === 'starter' ? 299 : subscription === 'pro' ? 999 : 0,
                paymentStatus: subscription === 'free' ? 'none' : 'pending',
                autoRenew: true
            });
            
            errorDiv.textContent = '✅ تم إنشاء حساب الشركة بنجاح! جاري تسجيل الدخول...';
            errorDiv.style.color = 'green';
            
            setTimeout(() => {
                loginUser(managerEmail, managerPassword);
            }, 2000);
            
        } catch (error) {
            console.error('خطأ في التسجيل:', error);
            errorDiv.textContent = '❌ خطأ: ' + error.message;
            errorDiv.style.color = '#dc3545';
        }
    });
}

// دخول المسؤول
const adminLoginForm = document.getElementById('admin-login-form');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const adminEmail = document.getElementById('admin-email').value;
        const adminPassword = document.getElementById('admin-password').value;
        const adminCode = document.getElementById('admin-code').value;
        
        const errorDiv = document.getElementById('admin-login-error');
        errorDiv.textContent = 'جاري التحقق...';
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#666';
        
        try {
            // التحقق من رمز المسؤول
            const adminCodeDoc = await firestore.collection('admin-codes').doc(adminCode).get();
            
            if (!adminCodeDoc.exists) {
                throw new Error('رمز المسؤول غير صحيح');
            }
            
            if (!adminCodeDoc.data().active) {
                throw new Error('رمز المسؤول معطل');
            }
            
            // تسجيل الدخول
            const result = await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
            const user = result.user;
            
            // التحقق من أن المستخدم مسؤول
            const userDoc = await firestore.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists || userDoc.data().role !== 'admin') {
                throw new Error('هذا الحساب ليس حساب مسؤول');
            }
            
            // تسجيل دخول المسؤول
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: new Date(),
                active: true
            });
            
            errorDiv.textContent = '✅ تم الدخول بنجاح!';
            errorDiv.style.color = 'green';
            
            currentUser = user;
            userRole = 'admin';
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('userName', userDoc.data().displayName);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userEmail', user.email);
            
            setTimeout(() => {
                initializeDashboard();
            }, 1500);
            
        } catch (error) {
            console.error('خطأ في دخول المسؤول:', error);
            errorDiv.textContent = '��� خطأ: ' + error.message;
            errorDiv.style.color = '#dc3545';
        }
    });
}

// إنشاء رمز مسؤول جديد (للإدارة)
async function generateAdminCode() {
    try {
        if (userRole !== 'admin') {
            throw new Error('ليس لديك صلاحيات كافية');
        }
        
        const code = 'ADMIN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        await firestore.collection('admin-codes').doc(code).set({
            createdAt: new Date(),
            createdBy: currentUser.uid,
            active: true,
            usedCount: 0,
            lastUsed: null
        });
        
        notificationManager.addNotification('success', '✅ تم إنشاء الرمز', `الرمز: ${code}`, '🔐');
        return code;
        
    } catch (error) {
        console.error('خطأ في إنشاء الرمز:', error);
        notificationManager.addNotification('error', '❌ خطأ', error.message, '❌');
    }
}

// تعطيل رمز مسؤول
async function disableAdminCode(code) {
    try {
        await firestore.collection('admin-codes').doc(code).update({
            active: false
        });
        
        notificationManager.addNotification('success', '✅ تم التعطيل', 'تم تعطيل الرمز بنجاح', '🔒');
        
    } catch (error) {
        console.error('خطأ:', error);
        notificationManager.addNotification('error', '❌ خطأ', error.message, '❌');
    }
}

// الحصول على قائمة أرمز المسؤولين
async function getAdminCodes() {
    try {
        if (userRole !== 'admin') {
            throw new Error('ليس لديك صلاحيات كافية');
        }
        
        const snapshot = await firestore.collection('admin-codes')
            .where('createdBy', '==', currentUser.uid)
            .get();
        
        const codes = [];
        snapshot.forEach(doc => {
            codes.push({
                code: doc.id,
                ...doc.data()
            });
        });
        
        return codes;
        
    } catch (error) {
        console.error('خطأ في الحصول على الأرمز:', error);
        return [];
    }
}
