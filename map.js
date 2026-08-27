// map.js
let map, tileStreet, tileSat, markers = {}, followRef = null, followCb = null, historyLayer = null;
function mapInit(){
  if(map) return;
  map = L.map('map', {zoomControl:true}).setView([24.7,46.7],6);
  tileStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
  tileSat = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{attribution:'sat'});

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
  const live = data.liveLocation || null;
  let lat = live ? (live.latitude || live.lat) : null;
  let lng = live ? (live.longitude || live.lng) : null;
  let speed = live ? live.speed : (data.speed || 0);
  let battery = live ? live.battery : (data.battery||0);
  let status = data.status || (speed>2? 'moving':'offline');
  let name = data.displayName || data.name || data.vehicleName || 'سائق';

  if(lat==null||lng==null){ removeMarker(key); return; }

  if(markers[key]){
    markers[key].setLatLng([lat,lng]);
    markers[key].setPopupContent(popupHtml(key,name,speed,battery,status));
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
  mapStopFollow();
  const ref = firebase.database().ref(`vehicleDrivers/${code}/liveLocation`);
  followRef = ref;
  followCb = ref.on('value', snap =>{
    const v = snap.val(); if(!v) return;
    const lat = v.latitude || v.lat; const lng = v.longitude || v.lng;
    if(lat && lng){ map.setView([lat,lng],16); if(markers[code]) markers[code].setLatLng([lat,lng]); }
  });
}
function mapStopFollow(){
  try{
    if(followRef && followCb){ followRef.off('value', followCb); }
  }catch(e){}
  followRef = null; followCb = null;
}

// Show history (polyline) for a driver between optional timestamps
async function showHistory(code, startTs = 0, endTs = Date.now()){
  // remove old layer
  if(historyLayer){ map.removeLayer(historyLayer); historyLayer = null; }
  const ref = firebase.database().ref(`locationHistory/${code}`).orderByChild('timestamp').startAt(startTs).endAt(endTs);
  const snap = await ref.once('value');
  const points = [];
  snap.forEach(child => {
    const v = child.val();
    const lat = v.latitude || v.lat; const lng = v.longitude || v.lng; const ts = v.timestamp || v.time;
    if(lat && lng) points.push({lat, lng, ts, speed: v.speed||0});
  });
  if(points.length===0) return alert('لا توجد نقاط في الفترة المحددة');
  const latlngs = points.map(p=>[p.lat, p.lng]);
  historyLayer = L.polyline(latlngs, {color:'#c79a2d', weight:4}).addTo(map);
  map.fitBounds(historyLayer.getBounds());

  // compute stats
  const stats = computeStats(points);
  alert(`نقاط: ${stats.count}\nالمسافة: ${stats.distance.toFixed(2)} كم\nمدة الحركة: ${formatDuration(stats.movingTime)}\nمتوسط السرعة: ${stats.avgSpeed.toFixed(2)} كم/س\nاعلى سرعة: ${stats.maxSpeed.toFixed(2)} كم/س`);
}

function computeStats(points){
  // points sorted by ts
  points.sort((a,b)=>a.ts - b.ts);
  let distance = 0; let prev = null; let movingTime = 0; let totalSpeed = 0; let maxSpeed = 0; let count=points.length;
  for(const p of points){
    if(prev){
      const d = haversine(prev.lat, prev.lng, p.lat, p.lng);
      distance += d;
      const dt = (p.ts - prev.ts)/1000; // seconds
      if((p.speed||0) > 2){ movingTime += dt; }
    }
    totalSpeed += (p.speed||0);
    if((p.speed||0) > maxSpeed) maxSpeed = p.speed||0;
    prev = p;
  }
  const avgSpeed = (totalSpeed / Math.max(count,1));
  return {distance, movingTime, avgSpeed, maxSpeed, count};
}

function haversine(lat1,lon1,lat2,lon2){
  function toRad(x){ return x*Math.PI/180; }
  const R = 6371; // km
  const dLat = toRad(lat2-lat1); const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}
function formatDuration(sec){
  const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = Math.floor(sec%60);
  return `${h}س ${m}د ${s}ث`;
}

window.mapInit = mapInit; window.mapFollow = mapFollow; window.mapStopFollow = mapStopFollow; window.showHistory = showHistory;
