// script.js
// Manejo de login con “Recordarme” para email y contraseña

document.addEventListener("DOMContentLoaded", () => {
  // ——— Inicializar Firebase ———
  const auth = firebase.auth();
  const db   = firebase.firestore();

  // ——— Función para aplicar color de sirena y guardar en localStorage ———
  function applySirenColor(hex) {
    document.documentElement.style.setProperty('--siren-color', hex);
    const c = hex.replace('#','');
    const r = parseInt(c.substr(0,2),16),
          g = parseInt(c.substr(2,2),16),
          b = parseInt(c.substr(4,2),16);
    document.documentElement.style.setProperty('--siren-rgb', `${r},${g},${b}`);
    localStorage.setItem('sirenColor', hex);
  }

  // ——— Suscripción en tiempo real a Firestore ———
  db.collection('settings').doc('siren')
    .onSnapshot(doc => {
      let color = '#00ff00'; // verde por defecto
      if (doc.exists && doc.data().color) {
        color = doc.data().color;
      } else {
        const saved = localStorage.getItem('sirenColor');
        if (saved) color = saved;
      }
      applySirenColor(color);
    }, err => {
      console.error("Error escuchando siren en Firestore:", err);
      const saved = localStorage.getItem('sirenColor') || '#00ff00';
      applySirenColor(saved);
    });

  // ——— Captura elementos del DOM ———
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

  if (!loginForm) {
    console.error("❌ No se encontró #login-form en el DOM");
    return;
  }

  // ——— Estado inicial ———
  loginForm.reset();
  usernameInput.disabled = false;
  passwordInput.disabled = false;
  loginBtn.disabled     = false;
  loadingOverlay.hidden = true;
  errorModal.style.display = "none";

  // ——— Prefill “Recordarme” ———
  const rememberedEmail = localStorage.getItem("rememberedEmail");
  const rememberedPwd   = localStorage.getItem("rememberedPassword");
  if (rememberedEmail && rememberedPwd) {
    usernameInput.value      = rememberedEmail;
    passwordInput.value      = rememberedPwd;
    rememberCheckbox.checked = true;
  } else if (rememberedEmail) {
    // Si solo email existe
    usernameInput.value      = rememberedEmail;
    rememberCheckbox.checked = true;
  }

  // ——— Toggle visibilidad de la contraseña ———
  togglePassword.addEventListener("click", () => {
    const isPwd = passwordInput.type === "password";
    passwordInput.type = isPwd ? "text" : "password";
    togglePassword.style.transform = isPwd ? "rotate(180deg)" : "rotate(0)";
    togglePassword.setAttribute(
      "aria-label",
      isPwd ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  });

  // ——— Cerrar modal de error ———
  modalClose.addEventListener("click", () => {
    errorModal.style.display = "none";
  });
  errorModal.addEventListener("click", e => {
    if (e.target === errorModal) {
      errorModal.style.display = "none";
    }
  });

  // ——— Manejo del submit ———
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    modalMessage.textContent = "";
    errorModal.style.display  = "none";

    const email    = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      return showModal("Completa todos los campos.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showModal("Ingresa un correo válido.");
    }

    // ——— Guardar o limpiar "Recordarme" ———
    if (rememberCheckbox.checked) {
      localStorage.setItem("rememberedEmail", email);
      localStorage.setItem("rememberedPassword", password);
    } else {
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberedPassword");
    }

    loginBtn.disabled     = true;
    loadingOverlay.hidden = false;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = "menu.html";
    } catch (error) {
      loadingOverlay.hidden = true;
      loginBtn.disabled     = false;

      const code = error.code;
      const msg =
        ["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(code)
          ? "Usuario o contraseña incorrectos."
          : code === "auth/too-many-requests"
            ? "Demasiados intentos. Intenta más tarde."
            : error.message;

      showModal(msg);
    }
  });

  function showModal(text) {
    modalMessage.textContent = text;
    errorModal.style.display  = "flex";
    modalClose.focus();
  }
});
