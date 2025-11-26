import { navigateTo, makeRequest } from "../app.js";
import { openScannerModal } from "../controllers/lector.controller.js";

export default async function renderManageParty(routeData = {}) {
  const app = document.getElementById("app");
  const partyId = routeData?.partyId || localStorage.getItem('selectedPartyId') || 1; // default demo id
  // Persist the current party id so nested handlers use the right value
  localStorage.setItem('selectedPartyId', partyId);
  const currentPartyId = partyId;

  app.innerHTML = `
    <div id="manage-party-screen" class="manage-party">
      <div class="top-section">
        <div class="top-label">Admin's management</div>
        <div class="page-header">
          <button class="back-btn" id="mp-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="page-title">Manage Party</h2>
        </div>
      </div>

      <section class="scan-card">
        <div class="scan-box">
          <div class="scan-icon"></div>
          <p>Scan Qr</p>
        </div>
      </section>

      <section class="status-card">
        <div class="status-header">
          <h3>Current Status</h3>
          <span class="live-dot">• Live</span>
        </div>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-number" id="insideCount">0</div>
            <div class="status-label">Inside</div>
          </div>
          <div class="status-item">
            <div class="status-number" id="remainingCount">0</div>
            <div class="status-label">Remaining</div>
          </div>
          <div class="status-item">
            <div class="status-number" id="capacityCount">0</div>
            <div class="status-label">Capacity</div>
          </div>
        </div>
      </section>

      <!-- Guest Approval Modal -->
      <div id="guestApprovalModal" class="modal-overlay hidden">
        <div class="modal-card">
          <div class="modal-close" id="ga-close">ÁE/div>
          <div class="modal-title">Solicitud de invitación</div>
          <img id="ga-avatar" src="./assets/userIcon.svg" alt="Avatar" class="modal-avatar"/>
          <div id="ga-name" class="modal-name">Invitado</div>
          <div class="modal-actions">
            <button id="ga-approve" class="btn btn-approve">✁E/button>
            <button id="ga-reject" class="btn btn-reject">X</button>
          </div>
        </div>
      </div>

      <section class="guest-list">
        <div class="guest-list-header">
          <h3>Guest List</h3>
          <button id="seeMoreBtn" class="see-more">See more</button>
        </div>
        <ul id="guestList" class="guest-items"></ul>
      </section>

      <section class="entry-codes-section">
        <div class="entry-codes-header">
          <h3>Entry Codes</h3>
          <button id="createCodesBtn" class="create-codes-btn">Create Codes</button>
        </div>
        <div class="entry-codes-content">
          <p class="entry-codes-description">Generate entry codes for different ticket types</p>
        </div>
      </section>

      <!-- Create Codes Modal -->
      <div id="createCodesModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create Entry Codes</h3>
            <button id="closeCreateModal" class="close-modal">ÁE/button>
          </div>
          <form id="createCodesForm" class="create-codes-form">
            <div class="form-group">
              <label for="ticketType">Ticket Type</label>
              <select id="ticketType" name="ticketType">
                <option value="" disabled selected>Loading ticket types...</option>
              </select>
            </div>
            <div class="form-group">
              <label for="codeQuantity">Quantity</label>
              <input id="codeQuantity" name="codeQuantity" type="number" min="1" value="1" />
            </div>
            <div class="form-actions">
              <button type="button" id="cancelCreateCodes" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary">Generate Codes</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Display Codes Modal -->
      <div id="displayCodesModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Generated Codes</h3>
            <button id="closeDisplayModal" class="close-modal">ÁE/button>
          </div>
          <div class="codes-display">
            <p><strong>Ticket Type:</strong> <span id="displayTicketType"></span></p>
            <p><strong>Quantity:</strong> <span id="displayQuantity"></span></p>
            <div id="codesList" class="codes-list"></div>
            <div class="codes-actions">
              <button id="copyAllCodes" class="btn-secondary">Copy All</button>
              <button id="downloadCodes" class="btn-primary">Download</button>
            </div>
          </div>
        </div>
      </div>

      <nav class="bottom-nav">
        <div class="nav-item active" data-nav="parties">
          <span class="nav-icon icon-party" aria-hidden="true"></span>
          <span class="nav-label">Parties</span>
        </div>
        <div class="nav-item" data-nav="new">
          <span class="nav-icon icon-plus" aria-hidden="true"></span>
          <span class="nav-label">New</span>
        </div>
        <div class="nav-item" data-nav="profile">
          <span class="nav-icon icon-user" aria-hidden="true"></span>
          <span class="nav-label">Profile</span>
        </div>
      </nav>
    </div>
  `;

  // Cargar CSS específico de la pantalla
  (function(){
    const cssHref = './screens/manageParty.css';
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      document.head.appendChild(link);
    }
  })();

  // Back to My Parties list for admins
  document.getElementById('mp-back')?.addEventListener('click', () => navigateTo('/my-parties'));
  document.getElementById('seeMoreBtn')?.addEventListener('click', () => navigateTo('/guests-summary', { partyId }));
  document.querySelector('.scan-box')?.addEventListener('click', () => {
    openScannerModal({
      onDecoded: async (text) => {
        try {
          const qrText = String(text).trim();
          console.log('Decoded QR:', qrText);
          const resp = await makeRequest(`/codes/scan-qr-code?qr=${encodeURIComponent(qrText)}&party=${encodeURIComponent(currentPartyId)}`, 'GET');
          if (resp && resp.status === 404) {
            alert('Endpoint no encontrado en el servidor');
            return;
          }
          if (resp?.success) {
            await reloadPartyData();
            const n = resp?.qr_code?.users?.name || 'Invitado';
            const p = resp?.qr_code?.parties?.title || 'Fiesta';
            // Buscar invitado en la lista para obtener su id
            let guestsList = await makeRequest(`/parties/${currentPartyId}/guests`, 'GET');
            if (!Array.isArray(guestsList) && guestsList?.guests) guestsList = guestsList.guests;
            const match = (guestsList || []).find(g => String(g.name).toLowerCase() === String(n).toLowerCase());
            const guestId = match?.id;
            // Abrir modal de aprobación inmediata
            const modalEl = document.getElementById('guestApprovalModal');
            const nameEl = document.getElementById('ga-name');
            const closeEl = document.getElementById('ga-close');
            const approveEl = document.getElementById('ga-approve');
            const rejectEl = document.getElementById('ga-reject');
            nameEl.textContent = n || 'Invitado';
            modalEl.classList.remove('hidden');
            const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
            const adminEmail = adminUser?.email;
            const onClose = () => { modalEl.classList.add('hidden'); cleanupHandlers(); };
            const cleanupHandlers = () => {
              closeEl.removeEventListener('click', onClose);
              approveEl.replaceWith(approveEl.cloneNode(true));
              rejectEl.replaceWith(rejectEl.cloneNode(true));
            };
            closeEl.addEventListener('click', onClose);
            document.getElementById('ga-approve').addEventListener('click', async () => {
              try {
                if (guestId) {
                  const url = `/parties/${currentPartyId}/guests/${guestId}/status${adminEmail ? `?email=${encodeURIComponent(adminEmail)}` : ''}`;
                  await makeRequest(url, 'PATCH', { status: 'validated' });
                }
                await reloadPartyData();
              } catch (e) { console.error('Approve error:', e); }
              onClose();
            });
            document.getElementById('ga-reject').addEventListener('click', async () => {
              try {
                if (guestId) {
                  const url = `/parties/${currentPartyId}/guests/${guestId}/status${adminEmail ? `?email=${encodeURIComponent(adminEmail)}` : ''}`;
                  await makeRequest(url, 'PATCH', { status: 'denied' });
                }
                await reloadPartyData();
              } catch (e) { console.error('Reject error:', e); }
              onClose();
            });
          } else {
            alert(resp?.message || 'QR inválido');
          }
        } catch (_) {
          alert('Error al validar QR');
        }
      },
      onError: () => {
        alert('Error al iniciar el escáner');
      }
    });
  });

  // Fetch guests from backend (Supabase via server)
  try {
    // Obtener email del admin para autenticación de endpoints protegidos
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminEmail = adminUser?.email;
    let guestsData = [];

    const eventDetails = await makeRequest(`/parties/${partyId}`, 'GET');
    if (adminEmail) {
      // El helper ya envía 'x-admin-email' en headers; no incluir body en GET
      const guestsResponse = await makeRequest(`/parties/${partyId}/guests`, 'GET');
      guestsData = Array.isArray(guestsResponse) ? guestsResponse : (guestsResponse?.guests || []);
    } else {
      console.warn('No admin email found; skipping guests fetch');
    }

    // Update status counts
    const partyObj = eventDetails?.party || eventDetails;
    const capacity = partyObj?.capacity || 220;
    const inside = guestsData.filter(g => g.status === 'Valid').length;
    // "Remaining" in this view = people who added codes (reserved_count)
    const remaining = partyObj?.reserved_count ?? Math.max(capacity - inside, 0);

    document.getElementById('insideCount').textContent = inside;
    document.getElementById('remainingCount').textContent = remaining;
    document.getElementById('capacityCount').textContent = capacity;

    // Render guest list
    const listEl = document.getElementById('guestList');
    listEl.innerHTML = guestsData.slice(0, 10).map(g => `
      <li class="guest-item">
        <img src="${g.avatar || './assets/userIcon.svg'}" alt="${g.name}" class="guest-avatar"/>
        <div class="guest-info">
          <div class="guest-name">${g.name}</div>
          <div class="guest-time">${g.time || ''}</div>
        </div>
        <div class="guest-status ${g.status === 'Valid' ? 'valid' : 'invalid'}">${g.status}</div>
      </li>
    `).join('');
  } catch (err) {
    console.error('Error fetching guests:', err);
  }

  // Bottom nav behavior
  const bottomNav = document.querySelector('.bottom-nav');
  bottomNav?.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.nav;
      if (target === 'parties') navigateTo('/my-parties');
      if (target === 'new') navigateTo('/create-party');
      if (target === 'profile') navigateTo('/profile');
    });
  });

  // Initialize entry codes with the current party id
  initializeEntryCodes(currentPartyId);
  async function reloadPartyData() {
    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      const adminEmail = adminUser?.email;
      let guestsData = [];
      const eventDetails = await makeRequest(`/parties/${partyId}`, 'GET');
      if (adminEmail) {
        const guestsResponse = await makeRequest(`/parties/${partyId}/guests`, 'GET');
        guestsData = Array.isArray(guestsResponse) ? guestsResponse : (guestsResponse?.guests || []);
      }
      const partyObj = eventDetails?.party || eventDetails;
      const capacity = partyObj?.capacity || 220;
      const inside = guestsData.filter(g => g.status === 'Valid').length;
      const remaining = partyObj?.reserved_count ?? Math.max(capacity - inside, 0);
      document.getElementById('insideCount').textContent = inside;
      document.getElementById('remainingCount').textContent = remaining;
      document.getElementById('capacityCount').textContent = capacity;
      const listEl = document.getElementById('guestList');
      listEl.innerHTML = guestsData.slice(0, 10).map(g => `
        <li class="guest-item">
          <img src="${g.avatar || './assets/userIcon.svg'}" alt="${g.name}" class="guest-avatar"/>
          <div class="guest-info">
            <div class="guest-name">${g.name}</div>
            <div class="guest-time">${g.time || ''}</div>
          </div>
          <div class="guest-status ${g.status === 'Valid' ? 'valid' : 'invalid'}">${g.status}</div>
        </li>
      `).join('');
    } catch (_) {}
  }
}

// Entry Codes Functionality
function initializeEntryCodes(partyIdFromRender) {
  const createCodesBtn = document.getElementById('createCodesBtn');
  const createCodesModal = document.getElementById('createCodesModal');
  const displayCodesModal = document.getElementById('displayCodesModal');
  const createCodesForm = document.getElementById('createCodesForm');
  const closeCreateModal = document.getElementById('closeCreateModal');
  const closeDisplayModal = document.getElementById('closeDisplayModal');
  const cancelCreateCodes = document.getElementById('cancelCreateCodes');

  // Open create codes modal
  createCodesBtn?.addEventListener('click', async () => {
    createCodesModal.style.display = 'block';
    // Refresh ticket types when modal opens
    await loadPartyPrices(partyIdFromRender);
  });

  // Close modals
  closeCreateModal?.addEventListener('click', () => {
    createCodesModal.style.display = 'none';
  });

  closeDisplayModal?.addEventListener('click', () => {
    displayCodesModal.style.display = 'none';
  });

  cancelCreateCodes?.addEventListener('click', () => {
    createCodesModal.style.display = 'none';
  });

  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === createCodesModal) {
      createCodesModal.style.display = 'none';
    }
    if (event.target === displayCodesModal) {
      displayCodesModal.style.display = 'none';
    }
  });

  // Handle form submission
  createCodesForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const ticketSelect = document.getElementById('ticketType');
    const selectedOption = ticketSelect?.selectedOptions?.[0];
    const priceId = parseInt(selectedOption?.value, 10);
    const ticketTypeName = selectedOption?.dataset?.name || (selectedOption?.textContent || '').split(' - ')[0];
    const quantity = parseInt(document.getElementById('codeQuantity').value);
    
    if ((!priceId && !ticketTypeName) || !quantity) {
      alert('Please fill in all fields');
      return;
    }
    
    if (selectedOption?.textContent === 'No ticket types found for this party') {
      alert('This party has no ticket types configured. Please add ticket types to the party first.');
      return;
    }

    try {
      // Show loading state
      const submitBtn = createCodesForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Generating...';
      submitBtn.disabled = true;

      // Use the current party ID captured on render
      const partyId = partyIdFromRender;
      
      // Generate codes
      const response = await makeRequest('/codes/generate', 'POST', {
        party_id: partyId,
        price_id: priceId,
        price_name: ticketTypeName,
        quantity: quantity,
        persist: false
      });

      if (response.success) {
        // Close create modal
        createCodesModal.style.display = 'none';
        
        // Prefer saved_codes (objects from DB) when available; otherwise, use raw codes
        const codesToDisplay = Array.isArray(response.saved_codes) && response.saved_codes.length
          ? response.saved_codes
          : (Array.isArray(response.codes) ? response.codes : []);

        // Show generated codes
        displayGeneratedCodes(ticketTypeName, quantity, codesToDisplay);
      } else {
        alert('Error generating codes: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating codes:', error);
      alert('Error generating codes. Please try again.');
    } finally {
      // Reset button state
      const submitBtn = createCodesForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Generate Codes';
      submitBtn.disabled = false;
    }
  });

  // Copy all codes functionality
  document.getElementById('copyAllCodes')?.addEventListener('click', () => {
    const codesList = document.getElementById('codesList');
    const codes = Array.from(codesList.querySelectorAll('.code-item')).map(item => item.textContent.trim());
    const codesText = codes.join('\n');
    
    navigator.clipboard.writeText(codesText).then(() => {
      alert('All codes copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy codes:', err);
      alert('Failed to copy codes. Please try again.');
    });
  });

  // Download codes functionality
  document.getElementById('downloadCodes')?.addEventListener('click', () => {
    const codesList = document.getElementById('codesList');
    const codes = Array.from(codesList.querySelectorAll('.code-item')).map(item => item.textContent.trim());
    const ticketType = document.getElementById('displayTicketType').textContent;
    const quantity = document.getElementById('displayQuantity').textContent;
    
    const content = `Entry Codes for ${ticketType} Tickets\nQuantity: ${quantity}\n\n${codes.join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entry-codes-${ticketType.toLowerCase().replace(' ', '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function displayGeneratedCodes(ticketType, quantity, codes) {
  const displayModal = document.getElementById('displayCodesModal');
  const displayTicketType = document.getElementById('displayTicketType');
  const displayQuantity = document.getElementById('displayQuantity');
  const codesList = document.getElementById('codesList');

  // Update modal content
  displayTicketType.textContent = ticketType;
  displayQuantity.textContent = quantity;

  // Normalize codes to strings for display
  const normalizedCodes = Array.isArray(codes) ? codes.map(c => (typeof c === 'string' ? c : c.code)).filter(Boolean) : [];

  // Render codes
  codesList.innerHTML = normalizedCodes.map(codeStr => `
    <div class="code-item-row">
      <span class="code-item">${codeStr}</span>
      <button class="copy-single" onclick="copySingleCode(this, '${codeStr}')">Copy</button>
    </div>
  `).join('');

  // Show modal
  displayModal.style.display = 'block';
}

// Copy single code function (global for onclick)
window.copySingleCode = function(button, code) {
  navigator.clipboard.writeText(code).then(() => {
    // Show temporary feedback
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#2ecc71';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 1000);
  }).catch(err => {
    console.error('Failed to copy code:', err);
    alert('Failed to copy code. Please try again.');
  });
};

async function loadPartyPrices(partyIdParam) {
  const ticketSelect = document.getElementById('ticketType');
  try {
    const partyId = partyIdParam || localStorage.getItem('selectedPartyId') || 1;
    console.log('Loading party prices for party ID:', partyId);
    const partyResponse = await makeRequest(`/parties/${partyId}`, 'GET');
    console.log('Party response:', partyResponse);

    // The backend returns { success, party: { ..., prices: [...] } }
    // Safely extract prices from the nested party object, with a fallback
    const partyObj = partyResponse?.party || partyResponse;
    const partyPrices = partyObj?.prices || [];
    console.log('Found party prices:', Array.isArray(partyPrices) ? partyPrices.length : 0);

    updateTicketTypeOptions(partyPrices);
  } catch (error) {
    console.error('Error loading party prices:', error);
    if (ticketSelect) {
      ticketSelect.innerHTML = '<option disabled selected>Failed to load ticket types</option>';
    }
  }
}

function updateTicketTypeOptions(prices) {
  const ticketSelect = document.getElementById('ticketType');
  if (!ticketSelect) {
    console.warn('Ticket type select element not found');
    return;
  }
  
  ticketSelect.innerHTML = '';

  if (Array.isArray(prices) && prices.length > 0) {
    prices.forEach(price => {
      const opt = document.createElement('option');
      opt.value = String(price.id);
      opt.dataset.name = price.price_name;
      opt.textContent = `${price.price_name} - ${price.price}`;
      ticketSelect.appendChild(opt);
    });
  } else {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No ticket types found for this party';
    ticketSelect.appendChild(opt);
    console.log('Using fallback ticket type options');
  }
}

// Add test function for codes API
window.testCodesAPI = async function() {
  console.log('=== TESTING CODES API ===');
  
  try {
    console.log('1. Testing database connection...');
    const connectionTest = await makeRequest('/codes/test', 'GET');
    console.log('2. Connection test result:', connectionTest);
    
    if (connectionTest.success) {
      console.log('3. Testing code generation...');
      const partyId = localStorage.getItem('selectedPartyId') || 1;
      const testPayload = {
        party_id: partyId,
        price_name: 'Test',
        quantity: 1
      };
      
      console.log('4. Test payload:', testPayload);
      const generateTest = await makeRequest('/codes/generate', 'POST', testPayload);
      console.log('5. Generate test result:', generateTest);
    }
  } catch (error) {
    console.error('6. Test error:', error);
  }
  
  console.log('=== END CODES API TEST ===');
};

console.log('Codes API test function available: window.testCodesAPI()');