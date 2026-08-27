// auth.js
// small helpers for role checks
window.auth = {
  async isAdmin(){
    const u = firebase.auth().currentUser; if(!u) return false;
    const doc = await firebase.firestore().collection('users').doc(u.uid).get();
    return doc.exists && doc.data().role === 'admin';
  },
  async getTenantId(){
    const u = firebase.auth().currentUser; if(!u) return null;
    const doc = await firebase.firestore().collection('users').doc(u.uid).get();
    return doc.exists ? doc.data().tenantId : null;
  }
};
