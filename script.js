// script.js — Login con autologin, “Recordarme” y color de sirena
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    // ===== Firebase (usa la instancia creada en firebase-config.js) =====
    const fb   = (window.firebase || firebase);
    const auth = (window.auth || fb.auth());
    const db   = (window.db   || fb.firestore());

    // Asegura persistencia LOCAL (la sesión no se cierra hasta signOut)
    try { auth.setPersistence(fb.auth.Auth.Persistence.LOCAL); } catch (_) {}

    // ===== Sirena (realtime + fallback localStorage) =====
    function applySirenColor(hex) {
      document.documentElement.style.setProperty('--siren-color', hex);
      const c = (hex || '#00ff00').replace('#','').padEnd(6,'0');
      const r = parseInt(c.slice(0,2),16),
            g = parseInt(c.slice(2,4),16),
            b = parseInt(c.slice(4,6),16);
      document.documentElement.style.setProperty('--siren-rgb', `${r},${g},${b}`);
      localStorage.setItem('sirenColor', hex);
    }
    let unsubscribeSiren = null;
    try {
      unsubscribeSiren = db.collection('settings').doc('siren').onSnapshot(doc => {
        const saved = localStorage.getItem('sirenColor') || '#00ff00';
        applySirenColor((doc.exists && doc.data().color) ? doc.data().color : saved);
      }, () => applySirenColor(localStorage.getItem('sirenColor') || '#00ff00'));
    } catch {
      applySirenColor(localStorage.getItem('sirenColor') || '#00ff00');
    }

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

    const showOverlay = (msg='Verificando credenciales…') => {
      if (loadingOverlay) {
        loadingOverlay.hidden = false;
        loadingOverlay.setAttribute('aria-hidden', 'false');
      }
    };
    const hideOverlay = () => {
      if (loadingOverlay) {
        loadingOverlay.hidden = true;
        loadingOverlay.setAttribute('aria-hidden', 'true');
      }
    };
    const lockUI = () => {
      usernameInput && (usernameInput.disabled = true);
      passwordInput && (passwordInput.disabled = true);
      loginBtn      && (loginBtn.disabled = true);
      showOverlay();
    };
    const unlockUI = () => {
      usernameInput && (usernameInput.disabled = false);
      passwordInput && (passwordInput.disabled = false);
      loginBtn      && (loginBtn.disabled = false);
      hideOverlay();
    };

    // ===== AUTOLOGIN (clave) =====
    // Bloquea la UI y espera onAuthStateChanged: si hay sesión, redirige directo
    lockUI();
    let handled = false;
    auth.onAuthStateChanged(user => {
      if (user) {
        showOverlay('Reanudando sesión…');
        // Redirigir inmediatamente evita parpadeo del login
        setTimeout(() => window.location.replace("menu.html"), 30);
        return;
      }
      if (!handled) {
        unlockUI();
        handled = true;
      }
    });

    // Si esta página no tiene formulario, no seguimos (pero el autologin ya corrió)
    if (!loginForm) return;

    // ===== Estado inicial del formulario =====
    try { loginForm.reset(); } catch {}
    if (errorModal) errorModal.style.display = "none";

    // ===== Prefill “Recordarme” =====
    const remEmail = localStorage.getItem("rememberedEmail");
    const remPwd   = localStorage.getItem("rememberedPassword");
    if (remEmail) {
      if (usernameInput) usernameInput.value = remEmail;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }
    if (remEmail && remPwd && passwordInput) {
      passwordInput.value = remPwd;
    }

    // ===== Mostrar/Ocultar contraseña =====
    togglePassword?.addEventListener("click", () => {
      if (!passwordInput) return;
      const isPwd = passwordInput.type === "password";
      passwordInput.type = isPwd ? "text" : "password";
      togglePassword.style.transform = isPwd ? "rotate(180deg)" : "rotate(0)";
      togglePassword.setAttribute("aria-label", isPwd ? "Ocultar contraseña" : "Mostrar contraseña");
    });

    // ===== Modal de error =====
    const showError = (text) => {
      if (!errorModal || !modalMessage) return alert(text);
      modalMessage.textContent = text;
      errorModal.style.display  = "flex";
      modalClose?.focus();
    };
    modalClose?.addEventListener("click", () => errorModal.style.display = "none");
    errorModal?.addEventListener("click", e => { if (e.target === errorModal) errorModal.style.display = "none"; });

    // ===== Login normal =====
    async function doLogin(e) {
      e?.preventDefault?.();
      if (!usernameInput || !passwordInput) return;

      const email    = (usernameInput.value || "").trim();
      const password = (passwordInput.value || "").trim();

      if (!email || !password) return showError("Completa todos los campos.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("Ingresa un correo válido.");

      // Recordarme (nota: guarda también password porque así lo usas hoy)
      if (rememberCheckbox?.checked) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      // Primer login requiere internet si no hay sesión previa
      if (!navigator.onLine && !auth.currentUser) {
        return showError("No hay conexión. El primer inicio de sesión requiere internet.");
      }

      lockUI();
      try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged hará el redirect; fallback:
        setTimeout(() => {
          if (auth.currentUser) window.location.replace("menu.html");
        }, 400);
      } catch (error) {
        unlockUI();
        const code = error.code || "";
        const msg =
          ["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(code)
            ? "Usuario o contraseña incorrectos."
            : code === "auth/too-many-requests"
              ? "Demasiados intentos. Intenta más tarde."
              : error.message || "No se pudo iniciar sesión.";
        showError(msg);
      }
    }

    // Soporta envío por <form> y por botón
    loginForm.addEventListener("submit", doLogin);
    loginBtn?.addEventListener("click", doLogin);

    // Limpieza al salir
    window.addEventListener('beforeunload', () => { try { unsubscribeSiren && unsubscribeSiren(); } catch {} });
  });
})();
