// admin.js
// Enhanced admin: create tenant, view payments, approve/reject
async function adminInit(){
  const container = document.getElementById('view-admin');
  container.innerHTML = `
    <h2>لوحة المدير العام</h2>
    <div class="card">
      <h3>إنشاء شركة / فرد</h3>
      <label>tenantId (رقمي/هاتف أو اتركه فارغًا): <input id="new-tenant-id"/></label>
      <label>اسم الشركة: <input id="new-tenant-name"/></label>
      <label>اسم المالك: <input id="new-tenant-owner"/></label>
      <label>هاتف: <input id="new-tenant-phone"/></label>
      <label>بريد: <input id="new-tenant-email"/></label>
      <label>نوع: <select id="new-tenant-type"><option value="company">شركة</option><option value="individual">فرد</option></select></label>
      <div class="row"><button id="create-tenant">إنشاء Tenant</button></div>
    </div>
    <div class="card">
      <button id="refresh-tenants">تحديث قائمة الشركات</button>
      <div id="tenants-list"></div>
    </div>
    <div id="tenant-payments" class="card"></div>
  `;
  document.getElementById('create-tenant').addEventListener('click', createTenant);
  document.getElementById('refresh-tenants').addEventListener('click', loadTenants);
  loadTenants();
}

async function createTenant(){
  const id = document.getElementById('new-tenant-id').value.trim() || null;
  const name = document.getElementById('new-tenant-name').value.trim();
  const ownerName = document.getElementById('new-tenant-owner').value.trim();
  const phone = document.getElementById('new-tenant-phone').value.trim();
  const email = document.getElementById('new-tenant-email').value.trim();
  const type = document.getElementById('new-tenant-type').value;
  if(!name||!ownerName) return alert('املأ الاسم واسم المالك');
  const fs = firebase.firestore();
  const tenantId = id || (phone?rtnNormalizePhone(phone):('t'+Date.now()));
  await fs.collection('tenants').doc(tenantId).set({tenantId, name, ownerName, phone, email, type, status:'active', subscriptionStatus:'trial', subscriptionStartDate: Date.now(), subscriptionEndDate: Date.now()+30*24*3600*1000, subscriptionPrice:0, subscriptionPlan:'trial', createdAt: Date.now()});
  alert('تم إنشاء Tenant: '+tenantId);
  loadTenants();
}

function rtnNormalizePhone(p){ return p.replace(/\D/g,''); }

async function loadTenants(){
  const list = document.getElementById('tenants-list'); list.innerHTML='';
  const snaps = await firebase.firestore().collection('tenants').limit(200).get();
  snaps.forEach(doc=>{
    const d = doc.data();
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<b>${d.name||'بدون اسم'}</b><div>مالك: ${d.ownerName||''}</div><div>هاتف: ${d.phone||''}</div><div>tenantId: ${doc.id}</div>
      <div class="row"><button data-id="${doc.id}" class="view-payments">عرض المدفوعات</button></div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.view-payments').forEach(btn=> btn.addEventListener('click', e=> viewPayments(e.target.dataset.id)));
}

async function viewPayments(tenantId){
  const el = document.getElementById('tenant-payments'); el.innerHTML = `<h3>مدفوعات ${tenantId}</h3>`;
  const snaps = await firebase.firestore().collection('tenants').doc(tenantId).collection('payments').orderBy('createdAt','desc').get();
  snaps.forEach(doc=>{
    const p = doc.data();
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `<div>مبلغ: ${p.amount} - طريقة: ${p.method} - الحالة: ${p.status}</div>
      <div class="row"><button data-t="${tenantId}" data-id="${doc.id}" class="approve">قبول</button>
      <button data-t="${tenantId}" data-id="${doc.id}" class="reject">رفض</button></div>`;
    el.appendChild(div);
  });
  el.querySelectorAll('.approve').forEach(b=> b.addEventListener('click', async e=>{
    const tid = e.target.dataset.t; const id = e.target.dataset.id; await acceptPayment(tid,id); viewPayments(tid);
  }));
  el.querySelectorAll('.reject').forEach(b=> b.addEventListener('click', async e=>{
    const tid = e.target.dataset.t; const id = e.target.dataset.id; await rejectPayment(tid,id); viewPayments(tid);
  }));
}

async function acceptPayment(tenantId, paymentId){
  const db = firebase.firestore();
  const pRef = db.collection('tenants').doc(tenantId).collection('payments').doc(paymentId);
  const p = (await pRef.get()).data();
  if(!p) return alert('طلب غير موجود');
  await pRef.update({status:'paid', processedAt: Date.now()});
  // update tenant subscription (simple: extend 1 month from now)
  const tenantRef = db.collection('tenants').doc(tenantId);
  const tdoc = await tenantRef.get();
  const now = Date.now();
  const newEnd = now + 30*24*3600*1000;
  await tenantRef.update({subscriptionStatus:'active', subscriptionStartDate: now, subscriptionEndDate: newEnd});
  alert('تم قبول الدفع وتفعيل الاشتراك');
}
async function rejectPayment(tenantId, paymentId){ await firebase.firestore().collection('tenants').doc(tenantId).collection('payments').doc(paymentId).update({status:'rejected', processedAt: Date.now()}); alert('تم رفض الطلب'); }

window.adminInit = adminInit;
