// company.js
// Manage tenant drivers with extra actions: view live, history, regenerate activation, payment request
function companyInit(){
  const container = document.getElementById('view-company');
  container.innerHTML = `
    <h2>لوحة الشركة</h2>
    <div class="card">
      <h3>إضافة سائق / سيارة</h3>
      <label>الاسم: <input id="new-name"/></label>
      <label>الهاتف: <input id="new-phone"/></label>
      <label>كود دخول (اختياري): <input id="new-code"/></label>
      <div class="row"><button id="add-driver">إضافة</button></div>
    </div>
    <div class="card">
      <h3>طلب دفع</h3>
      <label>المبلغ: <input id="payment-amount" type="number"/></label>
      <label>طريقة الدفع: <select id="payment-method"><option value="manual">تحويل بنكي</option><option value="vodafone_cash">فودافون كاش</option></select></label>
      <div class="row"><button id="send-payment-request">إرسال طلب دفع</button></div>
    </div>
    <div id="drivers-list"></div>
  `;

  document.getElementById('add-driver').addEventListener('click', addDriver);
  document.getElementById('send-payment-request').addEventListener('click', sendPaymentRequest);
  loadDriversList();
}

async function addDriver(){
  const name = document.getElementById('new-name').value.trim();
  const phone = document.getElementById('new-phone').value.trim();
  let code = document.getElementById('new-code').value.trim();
  if(!name||!phone) return alert('املأ الاسم والهاتف');
  if(!code) code = phone.replace(/\D/g,'');
  const tenantId = await auth.getTenantId();
  if(!tenantId) return alert('لا يوجد Tenant معين لحسابك');

  const driverCode = code;
  const activationCode = phone; // per spec
  const rdb = firebase.database();
  const fs = firebase.firestore();

  const payload = {
    displayName: name,
    phone: phone,
    tenantId: tenantId,
    vehicleDriverId: driverCode,
    deviceId: '',
    status: 'offline',
    subscriptionValid: true,
    createdAt: Date.now()
  };

  await rdb.ref(`vehicleDrivers/${driverCode}`).set(payload);
  await rdb.ref(`activationCodes/${activationCode}`).set({vehicleCode: driverCode, tenantId});
  await fs.collection('tenants').doc(tenantId).collection('drivers').doc(driverCode).set(payload);

  alert('تم الإضافة'); loadDriversList();
}

async function loadDriversList(){
  const list = document.getElementById('drivers-list'); list.innerHTML = '<h3>قائمة السائقين</h3>';
  const tenantId = await auth.getTenantId(); if(!tenantId) return list.innerHTML += '<p>لم يتم تعيين tenant</p>';
  const snaps = await firebase.firestore().collection('tenants').doc(tenantId).collection('drivers').get();
  snaps.forEach(doc=>{
    const d = doc.data();
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<b>${d.displayName}</b> <div>${d.phone}</div><div>كود: ${doc.id}</div>
      <div class="row">
        <button data-code="${doc.id}" class="view">عرض</button>
        <button data-history="${doc.id}">سجل اليوم</button>
        <button data-follow="${doc.id}">متابعة</button>
        <button data-regenerate="${doc.id}">إعادة توليد كود</button>
      </div>`;
    list.appendChild(card);
  });

  // delegate
  list.querySelectorAll('button[data-follow]').forEach(btn=> btn.addEventListener('click', e=> mapFollow(e.target.dataset.follow)));
  list.querySelectorAll('button[data-history]').forEach(btn=> btn.addEventListener('click', e=> showDriverHistory(e.target.dataset.history)));
  list.querySelectorAll('button[data-regenerate]').forEach(btn=> btn.addEventListener('click', e=> regenerateCode(e.target.dataset.regenerate)));
}

async function showDriverHistory(code){
  // show today's history
  const now = Date.now();
  const start = new Date(); start.setHours(0,0,0,0);
  await showHistory(code, start.getTime(), now);
}

async function regenerateCode(code){
  if(!confirm('هل تريد إعادة توليد كود التفعيل لهذا السائق؟')) return;
  const fs = firebase.firestore();
  const rdb = firebase.database();
  const docRef = fs.collectionGroup('drivers');
  // get driver doc to find phone
  const snap = await firebase.firestore().collectionGroup('drivers').where(firebase.firestore.FieldPath.documentId(), '==', code).get();
  let phone = '';
  if(!snap.empty){ snap.forEach(d=>{ phone = d.data().phone || ''; }); }
  const newCode = phone ? (phone + '-' + Math.floor(Math.random()*9000+1000)) : (code + '-r' + Date.now());
  // update activationCodes: remove old phone entry if existed and add new
  // For safety, write new activationCodes entry
  await rdb.ref(`activationCodes/${newCode}`).set({vehicleCode: code, tenantId: (await auth.getTenantId())});
  // mirror in firestore driver doc
  const tenantId = await auth.getTenantId();
  await fs.collection('tenants').doc(tenantId).collection('drivers').doc(code).update({activationCode:newCode});
  alert('تم توليد كود جديد: '+newCode);
}

async function sendPaymentRequest(){
  const amount = Number(document.getElementById('payment-amount').value||0);
  const method = document.getElementById('payment-method').value;
  if(!amount) return alert('أدخل المبلغ');
  const tenantId = await auth.getTenantId(); if(!tenantId) return alert('لا يوجد Tenant');
  const fs = firebase.firestore();
  await fs.collection('tenants').doc(tenantId).collection('payments').add({amount, method, createdAt: Date.now(), status:'pending', requester: firebase.auth().currentUser.uid});
  alert('تم إرسال طلب الدفع');
}

window.companyInit = companyInit;
