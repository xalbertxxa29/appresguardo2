// firebase-config.js — inicializa una sola vez y habilita modo offline
const firebaseConfig = {
  apiKey: "AIzaSyB7wgz1vL9GNhT8HL-TzvzaLI5Dduo82Iw",
  authDomain: "resguardo-b4d86.firebaseapp.com",
  projectId: "resguardo-b4d86",
  storageBucket: "resguardo-b4d86.firebasestorage.app", // verifica si debe ser *.appspot.com
  messagingSenderId: "454182824752",
  appId: "1:454182824752:web:f09be903adef25be4576f5",
  measurementId: "G-0MFVWNF6ZN"
};

// Inicializa UNA sola vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Atajos globales
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

// Mantener sesión local (no se cierra sola)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});

// Firestore offline (con multi-pestaña)
firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch((err) => {
  // code: 'failed-precondition' (multi pestañas sin sync), 'unimplemented' (navegador no soportado)
  console.warn('Firestore persistence:', err && err.code);
});

// Exponer en window para otros scripts
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.storage = storage;
