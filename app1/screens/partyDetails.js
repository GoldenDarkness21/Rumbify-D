import { makeRequest, navigateTo, getCurrentUser, getLastMainScreen } from "../app.js";

// Track if the screen is still mounted
let isScreenMounted = false;
let imageLoadTimeout = null;
let preloadImage = null;
let objectUrls = []; // Track object URLs for cleanup
const FALLBACK_ADMIN_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='24' r='16' fill='%23C4B5FD'/><path d='M8 60c0-13.255 10.745-24 24-24s24 10.745 24 24' fill='%23A78BFA'/></svg>";
const NAV_LABELS = {
  "/parties": "Parties",
  "/member-dashboard": "Dashboard",
  "/profile": "Profile"
};
let lastMainScreenPath = "/member-dashboard";

export default function renderPartyDetails(partyId) {
  // Mark screen as mounted FIRST, before any cleanup
  isScreenMounted = true;
  lastMainScreenPath = getLastMainScreen() || "/member-dashboard";
  const lastScreenLabel = NAV_LABELS[lastMainScreenPath] || "Dashboard";
  
  // Cleanup previous instance (but don't reset the flag we just set)
  const wasMounted = isScreenMounted;
  cleanupPartyDetails();
  isScreenMounted = wasMounted;
  
  const app = document.getElementById("app");
  if (app) {
    app.classList.add("full-bleed");
  }
  app.innerHTML = `
    <div id="party-details-screen">
      <!-- Header -->
      <div class="party-details-header">
        <button class="back-btn" id="backBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="party-details-title">Party QR</h1>
      </div>

      <!-- Party Content -->
      <div class="party-details-content">
        <!-- Party Title -->
        <h2 class="party-main-title" id="partyTitle">Loading...</h2>

        <!-- Administrator Info -->
        <div class="administrator-section">
          <div class="administrator-info">
            <img src="" alt="Administrator" class="administrator-image" id="administratorImage" />
            <div class="administrator-details">
              <h3 class="administrator-name" id="administratorName">Loading...</h3>
              <div class="party-tags" id="partyTags">
                <!-- Tags will be loaded dynamically -->
              </div>
            </div>
          </div>
        </div>

        <!-- Active QR Section -->
        <div class="qr-section">
          <h3 class="section-title">Active QR</h3>
          <div class="qr-container">
            <div class="qr-code" id="qrCode">
              <!-- QR Code will be implemented later -->
              <div class="qr-placeholder">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
                </svg>
                <p>QR Code</p>
              </div>
            </div>
            <div class="qr-status">
              <span class="status-badge valid">Valid</span>
            </div>
            <div class="qr-info">
              <p class="qr-time" id="qrTime">Loading...</p>
              <p class="qr-validity">Valid until • Date</p>
            </div>
          </div>
        </div>

        

        <!-- Address Section -->
        <div class="address-section">
          <h3 class="section-title">Address</h3>
          <div class="address-info">
            <div class="address-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span id="partyAddress">Loading...</span>
            </div>
            <div class="map-container">
              <div class="map-placeholder" id="mapPlaceholder">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <p>Map View</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Party Description -->
        <div class="description-section">
          <h3 class="section-title">About this party</h3>
          <div class="description-content" id="partyDescription">
            <p>Loading description...</p>
          </div>
        </div>
      </div>
      
      <div class="last-screen-indicator">
        Last visited: <strong>${lastScreenLabel}</strong>
      </div>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav" id="partyDetailsNav">
        <div class="nav-item ${lastMainScreenPath === "/parties" ? "active" : ""}" data-path="/parties">
          <span class="nav-icon icon-party"></span>
          <span>Parties</span>
        </div>
        <div class="nav-item ${lastMainScreenPath === "/member-dashboard" ? "active" : ""}" data-path="/member-dashboard">
          <span class="nav-icon icon-home"></span>
          <span>Home</span>
        </div>
        <div class="nav-item ${lastMainScreenPath === "/profile" ? "active" : ""}" data-path="/profile">
          <span class="nav-icon icon-user"></span>
          <span>Profile</span>
        </div>
      </nav>
    </div>
  `;

  // Initialize party details
  initializePartyDetails(partyId);
  setupPartyDetailsNavigation();
}

async function initializePartyDetails(partyId) {
  try {
    console.log("=== INITIALIZING PARTY DETAILS ===");
    console.log("Party ID:", partyId);
    
    // Load party data
    console.log("Step 1: Loading party details...");
    await loadPartyDetails(partyId);
    
    // Only check mount status before setting up listeners
    if (!isMounted()) {
      console.log("=== INITIALIZATION ABORTED: Screen unmounted during load ===");
      return;
    }
    
    console.log("Step 1: ✁EParty details loaded");
    
    // Setup event listeners
    console.log("Step 2: Setting up event listeners...");
    setupPartyDetailsEventListeners();
    console.log("Step 2: ✁EEvent listeners setup");
    
    console.log("=== INITIALIZATION COMPLETE ===");
    
  } catch (error) {
    // Only show error if screen is still mounted
    if (isMounted()) {
      console.error("=== ERROR IN INITIALIZATION ===");
      console.error("Error initializing party details:", error);
      showError("Error loading party details");
    } else {
      console.log("=== ERROR IN INITIALIZATION (screen unmounted, ignoring) ===");
    }
  }
}

// Helper function to check if screen is still mounted
function isMounted() {
  // Only check DOM element, not the flag (flag might be reset during cleanup)
  const screen = document.getElementById("party-details-screen");
  return screen !== null;
}

// Helper function to load QR code image with retry logic
// Uses fetch with blob to prevent console errors
async function loadQRCodeImage(imageUrl, containerElement, retryCount = 0) {
  if (!isMounted() || !containerElement || !document.getElementById("qrCode")) {
    return;
  }
  
  const maxRetries = 2;
  const retryDelay = 1500;
  
  try {
    // Use fetch to load image as blob - this prevents browser console errors
    const response = await Promise.race([
      fetch(imageUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    objectUrls.push(objectUrl); // Track for cleanup
    
    // Create image element with blob URL
    if (isMounted() && containerElement && document.getElementById("qrCode")) {
      const img = new Image();
      
      img.onload = function() {
        if (isMounted() && containerElement && document.getElementById("qrCode")) {
          containerElement.innerHTML = `
            <img src="${objectUrl}" alt="QR Code" class="qr-code-image" />
          `;
          console.log('[loadQRCodeImage] QR code image loaded successfully');
        }
      };
      
      img.onerror = function() {
        URL.revokeObjectURL(objectUrl);
        objectUrls = objectUrls.filter(url => url !== objectUrl);
        if (retryCount < maxRetries) {
          setTimeout(() => {
            if (isMounted() && containerElement && document.getElementById("qrCode")) {
              loadQRCodeImage(imageUrl, containerElement, retryCount + 1);
            }
          }, retryDelay * (retryCount + 1));
        } else {
          if (isMounted() && containerElement) {
            showQRCodePlaceholder('QR code image could not be loaded');
          }
        }
      };
      
      img.src = objectUrl;
    } else {
      URL.revokeObjectURL(objectUrl);
      objectUrls = objectUrls.filter(url => url !== objectUrl);
    }
    
  } catch (error) {
    // Silently retry or show placeholder
    if (retryCount < maxRetries) {
      setTimeout(() => {
        if (isMounted() && containerElement && document.getElementById("qrCode")) {
          loadQRCodeImage(imageUrl, containerElement, retryCount + 1);
        }
      }, retryDelay * (retryCount + 1));
    } else {
      if (isMounted() && containerElement) {
        showQRCodePlaceholder('QR code image could not be loaded');
      }
    }
  }
}

async function loadPartyDetails(partyId) {
  try {
    console.log('[loadPartyDetails] === STARTING PARTY DATA LOAD ===');
    console.log('[loadPartyDetails] Party ID:', partyId);
    
    // Get party information
    console.log('[loadPartyDetails] Making request to /parties/' + partyId);
    const partyResponse = await makeRequest(`/parties/${partyId}`, "GET");
    
    // Only check mount status before updating DOM, not before async operations
    if (!isMounted()) {
      console.log('[loadPartyDetails] Screen unmounted during request, aborting DOM updates');
      return;
    }
    
    console.log('[loadPartyDetails] === PARTY RESPONSE RECEIVED ===');
    console.log('[loadPartyDetails] Party response:', partyResponse);
    console.log('[loadPartyDetails] Response success:', partyResponse?.success);
    console.log('[loadPartyDetails] Response data:', partyResponse?.party);
    
    if (!partyResponse) {
      throw new Error("No response received from server");
    }
    
    if (!partyResponse.success) {
      throw new Error(`Server error: ${partyResponse.message || 'Unknown error'}`);
    }

    const party = partyResponse.party || partyResponse;
    console.log('[loadPartyDetails] === PARTY DATA EXTRACTED ===');
    console.log('[loadPartyDetails] Party data:', party);
    
    if (!party) {
      throw new Error("No party data received");
    }
    
    console.log('[loadPartyDetails] === UPDATING UI ELEMENTS ===');
    
    // Update party title
    console.log('[loadPartyDetails] Updating party title:', party.title);
    const partyTitleEl = document.getElementById("partyTitle");
    if (partyTitleEl && isMounted()) {
      partyTitleEl.textContent = party.title;
    }
    
    // Update administrator info
    console.log('[loadPartyDetails] Updating administrator name:', party.administrator);
    const administratorNameEl = document.getElementById("administratorName");
    if (administratorNameEl && isMounted()) {
      administratorNameEl.textContent = party.administrator;
    }
    
    // Debug administrator image
    console.log('[loadPartyDetails] Administrator image field:', party.administrator_image);
    console.log('[loadPartyDetails] Party image field:', party.image);
    console.log('[loadPartyDetails] All party fields:', Object.keys(party));
    
    // Preload administrator image and set only if it loads; otherwise keep fallback
    const adminImageElement = document.getElementById("administratorImage");
    if (!adminImageElement || !isMounted()) {
      if (!adminImageElement) {
        console.warn('[loadPartyDetails] Administrator image element not found');
      }
    } else {
      // Always use inline fallback to avoid loading remote URLs
      adminImageElement.src = FALLBACK_ADMIN_IMAGE;
      // Try to use creator image from server when available, fallback on error
      try {
        if (party && party.administrator_image) {
          adminImageElement.src = party.administrator_image;
          adminImageElement.onerror = () => { adminImageElement.src = FALLBACK_ADMIN_IMAGE; };
        }
      } catch (_) {}
    }
    
    // Update party tags
    const tagsContainer = document.getElementById("partyTags");
    if (tagsContainer && isMounted()) {
      if (party.tags && party.tags.length > 0) {
        tagsContainer.innerHTML = party.tags.map(tag => `
          <span class="tag">${tag}</span>
        `).join("");
      } else {
        tagsContainer.innerHTML = '<span class="tag">General</span>';
      }
    }
    
    // Update QR time
    const qrTimeEl = document.getElementById("qrTime");
    if (qrTimeEl && isMounted()) {
      qrTimeEl.textContent = party.date;
    }
    
    // Update address
    const partyAddressEl = document.getElementById("partyAddress");
    if (partyAddressEl && isMounted()) {
      partyAddressEl.textContent = party.location;
    }
    
    // Load Google Maps (non-blocking)
    console.log('[loadPartyDetails] Loading Google Maps...');
    loadGoogleMap(party.location);
    console.log('[loadPartyDetails] ✁EGoogle Maps loaded');
    
    // Dress code section removed per request
    
    // Load party description
    console.log('[loadPartyDetails] Loading party description...');
    await loadPartyDescription(partyId);
    console.log('[loadPartyDetails] ✁EParty description loaded');
    
    // Load QR code
    console.log('[loadPartyDetails] Loading QR code...');
    await loadQRCode(partyId);
    console.log('[loadPartyDetails] ✁EQR code loaded');
    
    console.log('[loadPartyDetails] === PARTY DATA LOAD COMPLETE ===');
    
  } catch (error) {
    // Only show error if screen is still mounted
    if (isMounted()) {
      console.error('[loadPartyDetails] === ERROR IN PARTY DATA LOAD ===');
      console.error("Error loading party details:", error);
      showError("Error loading party details");
    } else {
      console.log('[loadPartyDetails] Error occurred but screen is unmounted, ignoring');
    }
  }
}

async function loadPartyDescription(partyId) {
  try {
    console.log('[loadPartyDescription] Loading description for party:', partyId);
    
    // Get party description
    const descriptionResponse = await makeRequest(`/parties/${partyId}/description`, "GET");
    
    // Only check mount status before updating DOM
    if (!isMounted()) {
      console.log('[loadPartyDescription] Screen unmounted during request, aborting DOM update');
      return;
    }
    
    console.log('[loadPartyDescription] Description response:', descriptionResponse);
    
    const descriptionElement = document.getElementById("partyDescription");
    if (!descriptionElement || !isMounted()) {
      console.log('[loadPartyDescription] Description element not found or screen unmounted');
      return;
    }
    
    if (descriptionResponse && descriptionResponse.success && descriptionResponse.description) {
      console.log('[loadPartyDescription] Description found:', descriptionResponse.description);
      descriptionElement.innerHTML = `
        <p>${descriptionResponse.description}</p>
      `;
    } else {
      console.log('[loadPartyDescription] No description available');
      descriptionElement.innerHTML = `
        <p>No description available for this party.</p>
      `;
    }
    
  } catch (error) {
    console.error('[loadPartyDescription] Error loading party description:', error);
    if (isMounted()) {
      const descriptionElement = document.getElementById("partyDescription");
      if (descriptionElement) {
        descriptionElement.innerHTML = `
          <p>No description available for this party.</p>
        `;
      }
    }
  }
}

async function loadQRCode(partyId) {
  try {
    console.log('[loadQRCode] Loading QR code for party:', partyId);
    
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
      console.log('[loadQRCode] No user logged in, cannot load QR code');
      if (isMounted()) {
        showQRCodePlaceholder('Please log in to view your QR code');
      }
      return;
    }
    
    // Get QR code for this user and party
    const qrResponse = await makeRequest(`/codes/qr-code/${currentUser.id}/${partyId}`, "GET");
    
    // Only check mount status before updating DOM
    if (!isMounted()) {
      console.log('[loadQRCode] Screen unmounted during request, aborting DOM update');
      return;
    }
    
    console.log('[loadQRCode] QR code response:', qrResponse);
    
    if (qrResponse && qrResponse.success && qrResponse.qr_code) {
      const qrCode = qrResponse.qr_code;
      console.log('[loadQRCode] QR code found:', qrCode.id);
      
      // Display QR code image using qr_image URL
      const qrCodeElement = document.getElementById("qrCode");
      if (!qrCodeElement || !isMounted()) {
        console.log('[loadQRCode] QR code element not found or screen unmounted');
        return;
      }
      
      if (qrCode.qr_image) {
        // Small delay to avoid race conditions, then load QR code image with error handling
        setTimeout(() => {
          if (isMounted() && qrCodeElement && document.getElementById("qrCode")) {
            loadQRCodeImage(qrCode.qr_image, qrCodeElement);
          }
        }, 100);
      } else {
        if (isMounted()) {
          showQRCodePlaceholder('QR code image not available');
        }
      }
      
      // Update QR status
      if (isMounted()) {
        const statusBadge = document.querySelector(".status-badge");
        if (statusBadge) {
          if (qrCode.status === 'used') {
            statusBadge.textContent = "Used";
            statusBadge.className = "status-badge scanned";
          } else {
            statusBadge.textContent = "Valid";
            statusBadge.className = "status-badge valid";
          }
        }
        
        // Update QR time and validity
        const qrTimeElement = document.getElementById("qrTime");
        if (qrTimeElement && qrCode.created_at) {
          const createdDate = new Date(qrCode.created_at);
          const formattedDate = createdDate.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit' 
          });
          const formattedTime = createdDate.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
          qrTimeElement.textContent = `${formattedDate} • ${formattedTime}`;
        }
        
        // Update validity text
        const validityElement = document.querySelector(".qr-validity");
        if (validityElement) {
          if (qrCode.status === 'used' && qrCode.used_at) {
            const scannedDate = new Date(qrCode.used_at);
            const formattedScanned = scannedDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              year: '2-digit' 
            });
            validityElement.textContent = `Used on • ${formattedScanned}`;
          } else if (qrCode.valid_until) {
            const validDate = new Date(qrCode.valid_until);
            const formattedValid = validDate.toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              year: '2-digit' 
            });
            validityElement.textContent = `Valid until • ${formattedValid}`;
          } else {
            // Get party date for validity
            const partyResponse = await makeRequest(`/parties/${partyId}`, "GET");
            if (!isMounted()) {
              console.log('[loadQRCode] Screen unmounted during party request, aborting');
              return;
            }
            if (partyResponse && partyResponse.success && partyResponse.party) {
              validityElement.textContent = `Valid until • ${partyResponse.party.date}`;
            } else {
              validityElement.textContent = "Valid until • Date";
            }
          }
        }
      }
    } else {
      console.log('[loadQRCode] No QR code found');
      if (isMounted()) {
        showQRCodePlaceholder('No QR code available. Please register for this party first.');
      }
    }
    
  } catch (error) {
    console.error('[loadQRCode] Error loading QR code:', error);
    if (isMounted()) {
      showQRCodePlaceholder('Error loading QR code');
    }
  }
}

function showQRCodePlaceholder(message) {
  if (!isMounted()) {
    return;
  }
  
  const qrCodeElement = document.getElementById("qrCode");
  if (!qrCodeElement) {
    return;
  }
  
  qrCodeElement.innerHTML = `
    <div class="qr-placeholder">
      <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
      </svg>
      <p>${message || 'QR Code'}</p>
    </div>
  `;
  
  // Update status to show no QR code
  const statusBadge = document.querySelector(".status-badge");
  if (statusBadge && isMounted()) {
    statusBadge.textContent = "Not Available";
    statusBadge.className = "status-badge invalid";
  }
}

function loadGoogleMap(address) {
  const mapContainer = document.getElementById("mapPlaceholder");
  if (!mapContainer || !address) {
    console.log('[loadGoogleMap] Map container or address not found');
    return;
  }
  
  try {
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Use Google Maps embed URL (works without API key for basic embedding)
    // Using the search parameter with output=embed
    const mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
    
    // Only check mount status right before DOM update
    if (!isMounted()) {
      console.log('[loadGoogleMap] Screen unmounted, aborting DOM update');
      return;
    }
    
    // Replace placeholder with iframe
    mapContainer.innerHTML = `
      <iframe
        width="100%"
        height="100%"
        style="border:0; border-radius: 12px;"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
        src="${mapUrl}">
      </iframe>
    `;
    
    // Remove placeholder styling classes if any
    mapContainer.classList.remove('map-placeholder');
    mapContainer.style.background = 'transparent';
    mapContainer.style.display = 'block';
    
    console.log('[loadGoogleMap] Google Maps iframe created successfully for address:', address);
  } catch (error) {
    console.error('[loadGoogleMap] Error loading Google Maps:', error);
    // Keep placeholder on error
    mapContainer.innerHTML = `
      <div class="map-placeholder">
        <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <p>Map View</p>
      </div>
    `;
  }
}

// Dress code logic removed per request

function setupPartyDetailsEventListeners() {
  // Back button
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo(lastMainScreenPath);
    });
  }
}

function setupPartyDetailsNavigation() {
  const nav = document.getElementById("partyDetailsNav");
  if (!nav) {
    return;
  }
  
  const navItems = nav.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.style.touchAction = "manipulation";
    item.addEventListener("click", () => {
      const targetPath = item.dataset.path;
      if (!targetPath) {
        return;
      }
      if (targetPath === lastMainScreenPath) {
        navItems.forEach(navItem => navItem.classList.toggle("active", navItem === item));
      }
      navigateTo(targetPath);
    });
  });
}

function showError(message) {
  const app = document.getElementById("app");
  if (!app) return;
  
  app.innerHTML = `
    <div class="error-screen">
      <h2>Error</h2>
      <p>${message}</p>
      <button id="errorBackBtn" class="retry-btn">Go Back</button>
    </div>
  `;
  
  // Add event listener for back button
  const backBtn = document.getElementById("errorBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo(lastMainScreenPath);
    });
  }
}

export function cleanupPartyDetails() {
  // Mark screen as unmounted
  isScreenMounted = false;
  
  const app = document.getElementById("app");
  if (app) {
    app.classList.remove("full-bleed");
  }
  
  // Clear image loading timeout
  if (imageLoadTimeout) {
    clearTimeout(imageLoadTimeout);
    imageLoadTimeout = null;
  }
  
  // Abort image preloading
  if (preloadImage) {
    preloadImage.onload = null;
    preloadImage.onerror = null;
    preloadImage.src = '';
    preloadImage = null;
  }
  
  // Clean up all object URLs to prevent memory leaks
  objectUrls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignore errors when revoking
    }
  });
  objectUrls = [];
  
  console.log('[cleanupPartyDetails] Cleanup completed');
}
