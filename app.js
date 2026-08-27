// app.js
// App initialization and simple routing
const authArea = document.getElementById('auth-area');
const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');
const views = document.querySelectorAll('.view');
let currentView = null;

function showView(name) {
  views.forEach(v => v.classList.add('hidden'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.remove('hidden');
  currentView = name;
}

// Tabs
document.querySelectorAll('.tabs button').forEach(b => {
  b.addEventListener('click', () => showView(b.dataset.view));
});

// Auth state
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    authArea.innerHTML = `<button id="logout">خروج</button>`;
    document.getElementById('logout').onclick = () => firebase.auth().signOut();

    // load role info
    const doc = await firebase.firestore().collection('users').doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};
    window.__USER = { uid: user.uid, email: user.email, role: data.role || 'tenant', tenantId: data.tenantId || null };

    // Show appropriate default view
    if (window.__USER.role === 'admin') showView('admin');
    else showView('company');

    initAfterAuth();
  } else {
    window.__USER = null;
    loginSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
    authArea.innerHTML = '';
  }
});

function initAfterAuth(){
  // Initialize company/admin modules if they expose init
  if (window.companyInit) window.companyInit();
  if (window.adminInit) window.adminInit();
  if (window.mapInit) window.mapInit();
}

// login form handlers
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try{
    await firebase.auth().signInWithEmailAndPassword(email, password);
  }catch(err){ alert('خطأ في تسجيل الدخول: '+err.message); }
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if(!email||!password){ alert('املأ الحقول'); return; }
  try{
    const cred = await firebase.auth().createUserWithEmailAndPassword(email,password);
    // create minimal user doc (tenant by default). Admins should be created manually.
    await firebase.firestore().collection('users').doc(cred.user.uid).set({role:'tenant', tenantId:null, createdAt: Date.now()});
    alert('تم إنشاء الحساب. عدّ تسجيل الدخول');
  }catch(err){ alert('خطأ إنشاؤ الحساب: '+err.message); }
});

// search + follow buttons
let followCode = null;
document.getElementById('follow-btn').addEventListener('click', () => {
  const code = document.getElementById('search-code').value.trim();
  if(!code) return alert('أدخل كود السائق');
  followCode = code; mapFollow(code);
});
document.getElementById('stop-follow-btn').addEventListener('click', ()=>{ followCode = null; mapStopFollow(); });
