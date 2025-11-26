import { navigateTo, makeRequest } from "../app.js";

export default async function renderGuestsSummary(routeData = {}) {
  const app = document.getElementById("app");
  // Read partyId from route data, URL querystring, or localStorage
  const queryPartyId = new URLSearchParams(window.location.search).get('partyId');
  const partyId = routeData?.partyId || queryPartyId || localStorage.getItem('selectedPartyId') || 1;
  // Persist selected partyId for navigation continuity
  localStorage.setItem('selectedPartyId', partyId);

  app.innerHTML = `
    <div id="guests-summary-screen" class="manage-party">
      <div class="top-section">
        <div class="top-label">Admin's management</div>
        <div class="page-header">
          <button class="back-btn" id="gs-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="page-title">Guests List</h2>
        </div>
      </div>

      <section class="status-card">
        <div class="status-header">
          <h3 id="partyTitle">Party</h3>
        </div>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-number" id="pendingCount">0</div>
            <div class="status-label">Pending</div>
          </div>
          <div class="status-item">
            <div class="status-number" id="validatedCount">0</div>
            <div class="status-label">Validated</div>
          </div>
          <div class="status-item">
            <div class="status-number" id="deniedCount">0</div>
            <div class="status-label">Denied</div>
          </div>
        </div>
      </section>

      <section class="guest-list">
        <div class="guest-list-header">
          <h3>Latest Verifications</h3>
        </div>
        <ul id="validatedList" class="guest-items"></ul>
        <div class="guest-list-header">
          <h3>Pending</h3>
        </div>
        <ul id="pendingList" class="guest-items"></ul>
        <div class="guest-list-header">
          <h3>Access denied</h3>
        </div>
        <ul id="deniedList" class="guest-items"></ul>
      </section>

      <nav class="bottom-nav">
        <div class="nav-item" data-nav="parties">
          <span class="nav-icon icon-party"></span>
          <span class="nav-label">My Parties</span>
        </div>
        <div class="nav-item" data-nav="new">
          <span class="nav-icon icon-plus"></span>
          <span class="nav-label">New Party</span>
        </div>
        <div class="nav-item" data-nav="profile">
          <span class="nav-icon icon-user"></span>
          <span class="nav-label">Profile</span>
        </div>
      </nav>

      <!-- Modal: aceptar/denegar invitado -->
      <div id="guestModal" class="modal-overlay hidden">
        <div class="modal-card">
          <div class="modal-close" id="gm-close">×</div>
          <div class="modal-title">Solicitud de invitación</div>
          <img id="gm-avatar" src="/app2/assets/userIcon.svg" alt="Avatar" class="modal-avatar"/>
          <div id="gm-name" class="modal-name">Invitado</div>
          <div class="modal-actions">
            <button id="gm-approve" class="btn btn-approve">✓</button>
            <button id="gm-reject" class="btn btn-reject">X</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Cargar CSS específico de la pantalla
  (function(){
    const cssHref = '/app2/screens/guestsSummary.css';
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      document.head.appendChild(link);
    }
  })();

  document.getElementById('gs-back')?.addEventListener('click', () => navigateTo('/manage-party', { partyId }));

  try {
    // Usar el helper centralizado y enviar email del admin para pasar el middleware
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminEmail = adminUser?.email;

    const summaryUrl = `/parties/${partyId}/guests/summary${adminEmail ? `?email=${encodeURIComponent(adminEmail)}` : ''}`;
    const summary = await makeRequest(summaryUrl, 'GET');

    // Mantener referencia para actualizar UI luego
    let summaryData = summary;

    document.getElementById('partyTitle').textContent = summary?.party?.title || `Party #${partyId}`;
    document.getElementById('pendingCount').textContent = summary?.totals?.pending ?? 0;
    document.getElementById('validatedCount').textContent = summary?.totals?.validated ?? 0;
    document.getElementById('deniedCount').textContent = summary?.totals?.denied ?? 0;

    const renderItems = (items, status) => items.map(g => `
      <li class="guest-item" data-id="${g.id}" data-name="${g.name}" data-status="${status}">
        <img src="/app2/assets/userIcon.svg" alt="${g.name}" class="guest-avatar"/>
        <div class="guest-info">
          <div class="guest-name">${g.name}</div>
          <div class="guest-time"></div>
        </div>
        <div class="guest-status ${status === 'Valid' ? 'valid' : (status === 'Invalid' ? 'invalid' : 'pending')}">${status}</div>
      </li>
    `).join('');

    const refreshUI = () => {
      document.getElementById('pendingCount').textContent = summaryData?.totals?.pending ?? 0;
      document.getElementById('validatedCount').textContent = summaryData?.totals?.validated ?? 0;
      document.getElementById('deniedCount').textContent = summaryData?.totals?.denied ?? 0;
      document.getElementById('validatedList').innerHTML = renderItems(summaryData?.lists?.validated || [], 'Valid');
      document.getElementById('pendingList').innerHTML = renderItems(summaryData?.lists?.pending || [], 'Pending');
      document.getElementById('deniedList').innerHTML = renderItems(summaryData?.lists?.denied || [], 'Invalid');
    };

    document.getElementById('validatedList').innerHTML = renderItems(summary?.lists?.validated || [], 'Valid');
    document.getElementById('pendingList').innerHTML = renderItems(summary?.lists?.pending || [], 'Pending');
    document.getElementById('deniedList').innerHTML = renderItems(summary?.lists?.denied || [], 'Invalid');

    // Modal handlers
    const modalEl = document.getElementById('guestModal');
    const modalNameEl = document.getElementById('gm-name');
    const modalApproveBtn = document.getElementById('gm-approve');
    const modalRejectBtn = document.getElementById('gm-reject');
    const modalCloseBtn = document.getElementById('gm-close');
    let currentGuest = null;

    const openModal = (guest) => {
      currentGuest = guest;
      modalNameEl.textContent = guest?.name || 'Invitado';
      modalEl.classList.remove('hidden');
    };
    const closeModal = () => {
      modalEl.classList.add('hidden');
      currentGuest = null;
    };
    modalCloseBtn?.addEventListener('click', closeModal);

    

    const moveGuestInSummary = (guestId, newStatus) => {
      // Remove from all lists
      ['pending','validated','denied'].forEach(key => {
        const arr = summaryData?.lists?.[key] || [];
        const idx = arr.findIndex(i => String(i.id) === String(guestId));
        if (idx !== -1) arr.splice(idx, 1);
        summaryData.lists[key] = arr;
      });
      // Add to target list
      const targetKey = newStatus === 'validated' ? 'validated' : 'denied';
      const displayName = currentGuest?.name || 'Invitado';
      summaryData.lists[targetKey] = [{ id: guestId, name: displayName }, ...(summaryData.lists[targetKey] || [])];
      // Recompute totals
      const totalArr = ['pending','validated','denied'].map(k => summaryData.lists[k]?.length || 0);
      summaryData.totals.validated = summaryData.lists.validated.length;
      summaryData.totals.pending = summaryData.lists.pending.length;
      summaryData.totals.denied = summaryData.lists.denied.length;
    };

    modalApproveBtn?.addEventListener('click', async () => {
      if (!currentGuest) return;
      try {
        const url = `/parties/${partyId}/guests/${currentGuest.id}/status${adminEmail ? `?email=${encodeURIComponent(adminEmail)}` : ''}`;
        await makeRequest(url, 'PATCH', { status: 'validated' });
        moveGuestInSummary(currentGuest.id, 'validated');
        refreshUI();
        closeModal();
      } catch (e) {
        console.error('Error approving guest:', e);
      }
    });

    modalRejectBtn?.addEventListener('click', async () => {
      if (!currentGuest) return;
      try {
        const url = `/parties/${partyId}/guests/${currentGuest.id}/status${adminEmail ? `?email=${encodeURIComponent(adminEmail)}` : ''}`;
        await makeRequest(url, 'PATCH', { status: 'denied' });
        moveGuestInSummary(currentGuest.id, 'denied');
        refreshUI();
        closeModal();
      } catch (e) {
        console.error('Error denying guest:', e);
      }
    });
  } catch (err) {
    console.error('Error loading guests summary:', err);
  }

  const bottomNav = document.querySelector('.bottom-nav');
  bottomNav?.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.nav;
      if (target === 'parties') navigateTo('/my-parties');
      if (target === 'new') navigateTo('/create-party');
      if (target === 'profile') navigateTo('/profile');
    });
  });
}