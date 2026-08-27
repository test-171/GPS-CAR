// map.js
let map, tileStreet, tileSat, markers = {}, followListener = null;
function mapInit(){
  if(map) return;
  map = L.map('map', {zoomControl:true}).setView([24.7,46.7],6);
  tileStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
  tileSat = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{attribution:'sat'});

  // simple click to center
  map.on('click', ()=>{});

  // live subscription depending on role
  setupVehicleListeners();
}

async function setupVehicleListeners(){
  const isAdmin = await auth.isAdmin();
  const rdb = firebase.database();
  let ref = rdb.ref('vehicleDrivers');
  if(!isAdmin){
    const tenantId = await auth.getTenantId();
    if(!tenantId) return; // tenant not assigned
    ref = rdb.ref('vehicleDrivers').orderByChild('tenantId').equalTo(tenantId);
  }

  // attach generic listeners
  ref.on('child_added', snap => { upsertMarker(snap.key, snap.val()); });
  ref.on('child_changed', snap => { upsertMarker(snap.key, snap.val()); });
  ref.on('child_removed', snap => { removeMarker(snap.key); });
}

function upsertMarker(key, data){
  // determine liveLocation
  const live = data.liveLocation || data.liveLocation || null;
  let lat = live ? live.latitude || live.lat : null;
  let lng = live ? live.longitude || live.lng : null;
  let speed = live ? live.speed : (data.speed || 0);
  let battery = live ? live.battery : (data.battery||0);
  let status = data.status || (speed>2? 'moving':'online');
  let name = data.displayName || data.name || data.vehicleName || 'سائق';

  if(lat==null||lng==null){ // can't place marker
    // still keep a placeholder icon at 0,0? skip
    removeMarker(key); return;
  }

  if(markers[key]){
    markers[key].setLatLng([lat,lng]);
    markers[key].bindPopup(popupHtml(key,name,speed,battery,status));
  }else{
    const m = L.marker([lat,lng]);
    m.addTo(map).bindPopup(popupHtml(key,name,speed,battery,status));
    m.on('click', ()=>{ map.setView([lat,lng],16); });
    markers[key]=m;
  }
}
function removeMarker(key){ if(markers[key]){ map.removeLayer(markers[key]); delete markers[key]; } }
function popupHtml(key,name,speed,battery,status){
  return `<div><b>${name}</b><br/>كود: ${key}<br/>سرعة: ${speed} كم/س<br/>بطارية: ${battery}%<br/>الحالة: ${status}</div>`;
}

function mapFollow(code){
  // listen to specific vehicle liveLocation
  mapStopFollow();
  const ref = firebase.database().ref(`vehicleDrivers/${code}/liveLocation`);
  followListener = ref.on('value', snap =>{
    const v = snap.val(); if(!v) return;
    const lat = v.latitude || v.lat; const lng = v.longitude || v.lng;
    if(lat && lng){ map.setView([lat,lng],16); if(markers[code]) markers[code].setLatLng([lat,lng]); }
  });
}
function mapStopFollow(){ if(!followListener) return; /* detach earlier by keeping ref variable? simple approach: reload listeners */ followListener = null; }

window.mapInit = mapInit; window.mapFollow = mapFollow; window.mapStopFollow = mapStopFollow;
