// firebase-config.js
// Contains client Firebase config. You provided values; keep them here or override via Vercel env.
const firebaseConfig = {
  apiKey: "AIzaSyBgRkceRq7FRbhCevLlULYNy-A5Tl_cr0w",
  authDomain: "sr-test-c9e06.firebaseapp.com",
  databaseURL: "https://sr-test-c9e06-default-rtdb.firebaseio.com",
  projectId: "sr-test-c9e06",
  storageBucket: "sr-test-c9e06.firebasestorage.app",
  messagingSenderId: "658396508062",
  appId: "1:658396508062:web:c56cd84f93daa2e176308f",
  measurementId: "G-3ZZV344NDK"
};

// Initialize Firebase (compat for ease)
if (!window.firebase || !firebase.apps) {
  console.error('Firebase SDK not loaded');
} else {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}
