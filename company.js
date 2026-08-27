// company.js
// Manage tenant drivers (minimal UI)
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
    <div id="drivers-list"></div>
  `;

  document.getElementById('add-driver').addEventListener('click', addDriver);
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
  const activationCode = phone; // per spec, company phone used as activation code possibility
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

  // write to Realtime DB
  await rdb.ref(`vehicleDrivers/${driverCode}`).set(payload);
  // create activationCodes entry
  await rdb.ref(`activationCodes/${activationCode}`).set({vehicleCode: driverCode, tenantId});
  // mirror to Firestore for admin queries
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
      <div class="row"><button data-code="${doc.id}" class="view">عرض</button></div>`;
    list.appendChild(card);
  });
}

window.companyInit = companyInit;
