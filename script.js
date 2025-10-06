// script.js — Login con autologin, “Recordarme” y color de sirena
document.addEventListener("DOMContentLoaded", () => {
  // ===== Firebase (usa la instancia de firebase-config.js) =====
  const fb   = window.firebase || firebase;
  const auth = window.auth     || fb.auth();
  const db   = window.db       || fb.firestore();

  // Asegura persistencia LOCAL (la sesión no se cierra hasta signOut)
  try { auth.setPersistence(fb.auth.Auth.Persistence.LOCAL); } catch (_) {}

  // ===== Sirena (realtime + fallback localStorage) =====
  function applySirenColor(hex) {
    document.documentElement.style.setProperty('--siren-color', hex);
    const c = hex.replace('#','');
    const r = parseInt(c.substr(0,2),16),
          g = parseInt(c.substr(2,2),16),
          b = parseInt(c.substr(4,2),16);
    document.documentElement.style.setProperty('--siren-rgb', `${r},${g},${b}`);
    localStorage.setItem('sirenColor', hex);
  }
  db.collection('settings').doc('siren').onSnapshot(doc => {
    const saved = localStorage.getItem('sirenColor') || '#00ff00';
    applySirenColor((doc.exists && doc.data().color) ? doc.data().color : saved);
  }, () => {
    applySirenColor(localStorage.getItem('sirenColor') || '#00ff00');
  });

  // ===== DOM =====
  const loginForm        = document.getElementById("login-form");
  const loginBtn         = document.getElementById("login-btn");
  const loadingOverlay   = document.getElementById("loadingOverlay");
  const errorModal       = document.getElementById("errorModal");
  const modalMessage     = document.getElementById("modalMessage");
  const modalClose       = document.getElementById("modalClose");
  const usernameInput    = document.getElementById("username");
  const passwordInput    = document.getElementById("password");
  const rememberCheckbox = document.getElementById("remember");
  const togglePassword   = document.getElementById("togglePassword");

  const lockUI = () => {
    if (!loginForm) return;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    loginBtn.disabled      = true;
    loadingOverlay.hidden  = false;
  };
  const unlockUI = () => {
    if (!loginForm) return;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    loginBtn.disabled      = false;
    loadingOverlay.hidden  = true;
  };

  // ===== AUTOLOGIN (clave) =====
  // Bloquea la UI y espera el primer onAuthStateChanged: si hay sesión, redirige directo
  lockUI();
  let firstAuthEventHandled = false;
  auth.onAuthStateChanged(user => {
    if (user) {
      window.location.replace("menu.html");
      return;
    }
    // No hay sesión -> mostrar login
    if (!firstAuthEventHandled) {
      unlockUI();
      firstAuthEventHandled = true;
    }
  });

  // ===== Estado inicial del formulario =====
  if (!loginForm) return; // este script sólo vive en la página de login
  loginForm.reset();
  errorModal.style.display = "none";

  // ===== Prefill “Recordarme” =====
  const remEmail = localStorage.getItem("rememberedEmail");
  const remPwd   = localStorage.getItem("rememberedPassword");
  if (remEmail) {
    usernameInput.value = remEmail;
    rememberCheckbox.checked = true;
  }
  if (remEmail && remPwd) {
    passwordInput.value = remPwd;
  }

  // ===== Mostrar/Ocultar contraseña =====
  togglePassword?.addEventListener("click", () => {
    const isPwd = passwordInput.type === "password";
    passwordInput.type = isPwd ? "text" : "password";
    togglePassword.style.transform = isPwd ? "rotate(180deg)" : "rotate(0)";
    togglePassword.setAttribute("aria-label", isPwd ? "Ocultar contraseña" : "Mostrar contraseña");
  });

  // ===== Modal de error =====
  const showError = (text) => {
    modalMessage.textContent = text;
    errorModal.style.display  = "flex";
    modalClose?.focus();
  };
  modalClose?.addEventListener("click", () => errorModal.style.display = "none");
  errorModal?.addEventListener("click", e => { if (e.target === errorModal) errorModal.style.display = "none"; });

  // ===== Login normal =====
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorModal.style.display = "none";
    modalMessage.textContent = "";

    const email    = (usernameInput.value || "").trim();
    const password = (passwordInput.value || "").trim();

    if (!email || !password) return showError("Completa todos los campos.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("Ingresa un correo válido.");

    // Recordarme
    if (rememberCheckbox.checked) {
      localStorage.setItem("rememberedEmail", email);
      localStorage.setItem("rememberedPassword", password);
    } else {
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberedPassword");
    }

    lockUI();
    try {
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged hará el redirect; dejamos un fallback por si tarda:
      setTimeout(() => {
        if (auth.currentUser) window.location.replace("menu.html");
      }, 500);
    } catch (error) {
      unlockUI();
      const code = error.code;
      const msg =
        ["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(code)
          ? "Usuario o contraseña incorrectos."
          : code === "auth/too-many-requests"
            ? "Demasiados intentos. Intenta más tarde."
            : error.message || "No se pudo iniciar sesión.";
      showError(msg);
    }
  });
});
