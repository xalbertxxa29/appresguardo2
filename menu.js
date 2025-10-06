// menu.js
// Versión actualizada con botones adicionales de Evidencia y Reporte de Incidencias

document.addEventListener("DOMContentLoaded", () => {
  const auth               = firebase.auth();
  const db                 = firebase.firestore();
  const statusMessageElem  = document.getElementById("status-message");
  const checklistBtn       = document.getElementById("checklist-btn");
  const planEjerciciosBtn  = document.getElementById("plan-ejercicios-btn");
  const contactosBtn       = document.getElementById("contactos-btn");
  const evidenciaBtn       = document.getElementById("evidencia-ejercicios-btn");
  const reporteBtn         = document.getElementById("reporte-incidencias-btn");
  const logoutBtn          = document.getElementById("logout-btn");

  // ——— Función para aplicar color de sirena ———
  function applySiren(colorHex) {
    document.documentElement.style.setProperty('--siren-color', colorHex);
    const c = colorHex.replace('#','');
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    document.documentElement.style.setProperty('--siren-rgb', `${r},${g},${b}`);
    localStorage.setItem('sirenColor', colorHex);
  }

  // ——— Inicializar sirena con valor almacenado en localStorage ———
  const savedColor = localStorage.getItem('sirenColor');
  if (savedColor) applySiren(savedColor);

  // ——— Escuchar cambios en Firestore para actualizar en tiempo real ———
  db.collection('settings').doc('siren')
    .onSnapshot(doc => {
      const color = (doc.exists && doc.data().color) ? doc.data().color : '#00ff00';
      applySiren(color);
    }, err => {
      console.error('Error escuchando siren en Firestore:', err);
      applySiren(localStorage.getItem('sirenColor') || '#00ff00');
    });

  // ——— Escuchar storage events de otras pestañas ———
  window.addEventListener('storage', e => {
    if (e.key === 'sirenColor' && e.newValue) applySiren(e.newValue);
  });

  // --- Modal de cierre de sesión ---
  const logoutModal = document.createElement("div");
  logoutModal.id = "logout-modal";
  logoutModal.setAttribute("role","dialog");
  logoutModal.setAttribute("aria-modal","true");
  logoutModal.style.display = "none";

  const modalContent = document.createElement("div");
  modalContent.id = "logout-modal-content";

  const modalMessage = document.createElement("p");
  modalMessage.classList.add("modal-message");
  modalMessage.textContent = "Gracias por preferir a Liderman Alarmas.";

  const continueButton = document.createElement("button");
  continueButton.classList.add("modal-button");
  continueButton.textContent = "Continuar";
  continueButton.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch {
      alert("Error al cerrar sesión. Intenta de nuevo.");
    }
  });

  modalContent.append(modalMessage, continueButton);
  logoutModal.appendChild(modalContent);
  document.body.appendChild(logoutModal);

  // --- Control de acceso y saludo ---
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
    const emailName = user.email.trim().split("@")[0];
    try {
      const doc = await db.collection("userMap").doc(emailName).get();
      const displayName = (doc.exists && doc.data().nombre)
        ? doc.data().nombre
        : emailName;
      statusMessageElem.textContent = `Bienvenido, ${displayName}`;
    } catch {
      statusMessageElem.textContent = `Bienvenido, ${emailName}`;
    }
  });

  // --- Ripple efecto táctil en todos los botones ---
  document.querySelectorAll(".menu-button").forEach(btn => {
    const ripple = e => {
      const rect = btn.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      btn.style.setProperty("--ripple-x", `${x}px`);
      btn.style.setProperty("--ripple-y", `${y}px`);
    };
    btn.addEventListener("click", ripple);
    btn.addEventListener("touchstart", ripple, { passive: true });
  });

  // --- Navegación a páginas ---
  checklistBtn     .addEventListener("click", () => window.location.href = "tipo.html");
  planEjerciciosBtn.addEventListener("click", () => window.location.href = "ejercicios.html");
  contactosBtn     .addEventListener("click", () => window.location.href = "contactos.html");
  evidenciaBtn     .addEventListener("click", () => window.location.href = "evidencia-ejercicios.html");
  reporteBtn       .addEventListener("click", () => window.location.href = "reporte-incidencias.html");
  logoutBtn        .addEventListener("click", () => logoutModal.style.display = "flex");

  // --- Cerrar modal con Escape o clic fuera ---
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") logoutModal.style.display = "none";
  });
  logoutModal.addEventListener("click", e => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
});
