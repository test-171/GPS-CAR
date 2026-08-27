// admin.js
// Minimal admin functions: list tenants, global map
async function adminInit(){
  const container = document.getElementById('view-admin');
  container.innerHTML = `
    <h2>لوحة المدير العام</h2>
    <div class="card">
      <button id="refresh-tenants">تحديث قائمة الشركات</button>
      <div id="tenants-list"></div>
    </div>
  `;
  document.getElementById('refresh-tenants').addEventListener('click', loadTenants);
  loadTenants();
}

async function loadTenants(){
  const list = document.getElementById('tenants-list'); list.innerHTML='';
  const snaps = await firebase.firestore().collection('tenants').limit(100).get();
  snaps.forEach(doc=>{
    const d = doc.data();
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<b>${d.name||'بدون اسم'}</b><div>مالك: ${d.ownerName||''}</div><div>هاتف: ${d.phone||''}</div><div>tenantId: ${doc.id}</div>`;
    list.appendChild(el);
  });
}

window.adminInit = adminInit;
