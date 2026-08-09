// firebase-config.js
// Alpha 1 — Firebase Configuration

const firebaseConfig = {
    apiKey: "AIzaSyAQx9I9rL2XTLf2GZV_xuwufkXilWwDAE4",
    authDomain: "alpha1-10be6.firebaseapp.com",
    projectId: "alpha1-10be6",
    storageBucket: "alpha1-10be6.firebasestorage.app",
    messagingSenderId: "1046483351913",
    appId: "1:1046483351913:web:1562f345f49e8dfc9265f8",
    measurementId: "G-BFFYGRXXQV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence for better UX
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser');
    }
});

console.log('🔥 Firebase initialized — Project: alpha1-10be6');
