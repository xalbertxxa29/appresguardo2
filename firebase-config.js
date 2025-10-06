// firebase-config.js — compat SDK: init 1 sola vez, autologin y offline
(function () {
  // === 1) Config del proyecto ===
  const firebaseConfig = {
    apiKey: "AIzaSyB7wgz1vL9GNhT8HL-TzvzaLI5Dduo82Iw",
    authDomain: "resguardo-b4d86.firebaseapp.com",
    projectId: "resguardo-b4d86",
    storageBucket: "resguardo-b4d86.firebasestorage.app", // Revisa en consola: a menudo es <project>.appspot.com
    messagingSenderId: "454182824752",
    appId: "1:454182824752:web:f09be903adef25be4576f5",
    measurementId: "G-0MFVWNF6ZN"
  };

  // === 2) Inicializa UNA sola vez ===
  const app = (firebase.apps && firebase.apps.length)
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

  // === 3) Atajos ===
  const auth    = firebase.auth();
  const db      = firebase.firestore();
  const storage = firebase.storage();

  // (Opcional) hint si el bucket luce raro
  try {
    if (/\.firebasestorage\.app$/i.test(firebaseConfig.storageBucket)) {
      console.warn("[Aviso] Verifica storageBucket en Firebase Console; suele ser <project>.appspot.com");
    }
  } catch (_) {}

  // === 4) Sesión persistente LOCAL (autologin) — set una sola vez por página ===
  if (!window.__FB_PERSISTENCE_SET__) {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    window.__FB_PERSISTENCE_SET__ = true;
  }

  // === 5) Firestore offline (cache + multi-pestaña) — habilitar una sola vez ===
  if (!window.__FB_FS_PERSISTENCE_ENABLED__) {
    firebase.firestore()
      .enablePersistence({ synchronizeTabs: true })
      .catch(err => {
        // 'failed-precondition' (varias pestañas sin sync) o 'unimplemented'
        console.warn("Firestore persistence:", err && err.code);
      });
    window.__FB_FS_PERSISTENCE_ENABLED__ = true;
  }

  // (Opcional) Ajustes de Firestore
  try { db.settings({ ignoreUndefinedProperties: true }); } catch (_) {}

  // === 6) Exponer en window para otros scripts ===
  window.firebaseConfig = firebaseConfig;
  window.auth    = auth;
  window.db      = db;
  window.storage = storage;

  // Útil si quieres esperar a que esté listo
  window.firebaseReady = Promise.resolve({ auth, db, storage });
})();
