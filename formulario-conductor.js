// formulario-conductor.js — sin doble init, sesión persistente y soporte offline
(() => {
  // Usa la instancia creada en firebase-config.js (NO volver a inicializar aquí)
  const fb   = window.firebase || firebase;
  const auth = window.auth     || fb.auth();
  const db   = window.db       || fb.firestore();

  // Asegura persistencia LOCAL (no se cierra sesión hasta signOut)
  try { auth.setPersistence(fb.auth.Auth.Persistence.LOCAL); } catch (_) {}

  // Utilidad corta
  const $ = (s) => document.querySelector(s);

  // ===== 1) Guard de sesión + saludo con userMap =====
  let displayName = '';
  document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // Si no hay sesión, vuelve al login
        window.location.href = 'index.html';
        return;
      }
      const uid = (user.email || '').split('@')[0] || user.uid;

      // Carga nombre desde userMap/{uid}
      try {
        const snap = await db.collection('userMap').doc(uid).get();
        displayName = (snap.exists && snap.data().nombre) ? snap.data().nombre : uid;
      } catch {
        displayName = uid;
      }

      // Pinta saludo
      const welcomeEl = $('#welcome-message');
      if (welcomeEl) {
        welcomeEl.classList.remove('skeleton');
        welcomeEl.style.animation = 'typing 1.5s steps(30,end) forwards, blink .7s step-end infinite';
        welcomeEl.textContent = `Bienvenido, ${displayName}`;
      }
    });
  });

  // ===== 2) Efecto reveal para items =====
  const itemsIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        itemsIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach(el => itemsIO.observe(el));
    const obsGroup = document.querySelector('.textarea-group');
    if (obsGroup) itemsIO.observe(obsGroup);
  });

  // ===== 3) Estado de red (opcional, si tienes un span#net-status) =====
  const statusBadge = $('#net-status');
  function renderNetStatus() {
    if (!statusBadge) return;
    statusBadge.textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
    statusBadge.dataset.state = navigator.onLine ? 'online' : 'offline';
  }
  window.addEventListener('online',  renderNetStatus);
  window.addEventListener('offline', renderNetStatus);
  renderNetStatus();

  // ===== 4) Envío del formulario con Lottie y soporte offline =====
  const lottieModal     = $('#lottie-modal');
  const lottieContainer = $('#lottie-container');
  const formEl          = $('#conductor-form');

  // Marca de tiempo de servidor
  const nowTs = () => fb.firestore.FieldValue.serverTimestamp();

  function buildPayload() {
    // Recolecta respuestas de todos los radio-group
    const data = {};
    document.querySelectorAll('.radio-group').forEach(group => {
      const q = group.querySelector('.question')?.textContent?.trim() || '';
      const checked = group.querySelector('input[type="radio"]:checked');
      // Evita undefined si el usuario no marcó algo
      data[q || `pregunta_${Math.random().toString(36).slice(2)}`] = checked ? checked.value : '';
    });

    data['Observaciones']  = ($('#observaciones')?.value || '').trim();

    const now = new Date();
    data['Fecha']          = now.toLocaleDateString();
    data['Hora']           = now.toLocaleTimeString();
    data['Usuario ID']     = (auth.currentUser?.email || '').split('@')[0] || auth.currentUser?.uid || 'anon';
    data['Usuario Nombre'] = displayName || data['Usuario ID'];

    // Campos de control/sync
    data['timestamp'] = nowTs();
    data['syncState'] = navigator.onLine ? 'synced' : 'pending';
    return data;
  }

  function playLottieOnce(onDone) {
    if (!lottieModal || !lottieContainer || !window.lottie) { onDone(); return; }
    lottieModal.style.display = 'flex';
    const anim = lottie.loadAnimation({
      container: lottieContainer,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: 'https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json'
    });
    anim.addEventListener('complete', () => {
      lottieModal.style.display = 'none';
      onDone();
    });
  }

  async function saveForm(data) {
    // Firestore soporta cache offline: .add() funciona sin red y sincroniza al volver
    const ref = await db.collection('conductor').add(data);

    // Si estabas offline, guarda referencia local (opcional, para UI)
    if (!navigator.onLine) {
      const key = 'pendingDocs_conductor';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push({ id: ref.id, when: Date.now() });
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const data = buildPayload();

    // Animación -> guardar -> redirigir
    playLottieOnce(async () => {
      try {
        await saveForm(data);
        // Limpia y vuelve al menú
        formEl?.reset();
        window.location.href = 'menu.html';
      } catch (err) {
        console.error(err);
        alert('No se pudo guardar. Si estás sin internet, intenta nuevamente cuando recuperes conexión.');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    formEl?.addEventListener('submit', handleSubmit);
    $('#back-btn')?.addEventListener('click', () => (window.location.href = 'tipo.html'));
  });

  // Al volver la conexión, marcar como "synced" (opcional)
  window.addEventListener('online', async () => {
    try {
      const key = 'pendingDocs_conductor';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.length) return;
      await Promise.all(
        list.map(it => db.collection('conductor').doc(it.id).update({ syncState: 'synced' }).catch(() => {}))
      );
      localStorage.removeItem(key);
    } catch (_) {}
  });
})();
