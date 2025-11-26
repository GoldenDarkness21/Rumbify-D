import { navigateTo, makeRequest } from "../app.js";
import { authManager } from "../auth.js";

export default function renderMyParties(data = {}) {
  if (!authManager.isUserAdmin()) {
    if (authManager.isUserMember()) {
      window.location.href = 'https://app1-rumbify.vercel.app/screen1';
    } else {
      window.location.href = '/admin-login';
    }
    return;
  }

  // Protection: ensure admin never accesses app1
  if (window.location.href.includes('/app1')) {
    console.log('Admin detected on app1, redirecting to my-parties');
    window.location.href = '/my-parties';
    return;
  }

  let adminUser = data.user || authManager.getCurrentUser();
  
  const email = adminUser?.email || 'admin@rumbify.com';
  const name = adminUser?.name || 'Administrator';
  
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="my-parties-screen">
      <div class="my-parties-content">
        <!-- Header -->
        <div class="admin-header">
          <div class="admin-profile-section">
            <div class="admin-profile-pic">
              <img src="${adminUser?.profile_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face'}" alt="Profile" class="profile-picture" />
          </div>
          <div class="admin-user-info">
            <h2 class="admin-welcome">Welcome, ${name}</h2>
              <p class="admin-role">Administrator</p>
            </div>
          </div>
        </div>

        <!-- Quick Metrics -->
        <div class="quick-metrics-card">
          <div class="metrics-left">
            <h3 class="metrics-title">Quick Metrics</h3>
            <div class="metric-item">
              <span class="metric-number" id="totalAttendees">0</span>
              <span class="metric-label">Total Attendees</span>
            </div>
          </div>
          <div class="metrics-right">
            <h3 class="metrics-event-name" id="metricsEventName">Chicago Night</h3>
            <div class="metric-item">
              <span class="metric-number" id="totalRevenue">$0</span>
              <span class="metric-label">Revenue</span>
            </div>
          </div>
        </div>

        <!-- My Events Section -->
        <div class="my-events-section">
          <h2 class="section-title">My events</h2>
          <div class="events-list" id="eventsList">
            <!-- Events will be loaded dynamically -->
            <div class="loading-events">Loading events...</div>
          </div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
          <div class="nav-item active" id="nav-parties" data-nav="parties">
            <span class="nav-icon icon-party" aria-hidden="true"></span>
            <span class="nav-label">My Parties</span>
          </div>
          <div class="nav-item" id="nav-new" data-nav="new">
            <span class="nav-icon icon-plus" aria-hidden="true"></span>
            <span class="nav-label">New Party</span>
          </div>
          <div class="nav-item" id="nav-profile" data-nav="profile">
            <span class="nav-icon icon-user" aria-hidden="true"></span>
            <span class="nav-label">Profile</span>
          </div>
        </nav>
      </div>
    </div>
  `;

  // Make functions globally available for onclick handlers
  window.handleLogout = handleLogout;
  window.handleManageParty = handleManageParty;
  window.handleEditParty = handleEditParty;
  window.handleDeleteParty = handleDeleteParty;

  // Load admin parties and metrics
  loadAdminParties();
  loadQuickMetrics();
  
  // Add test function for debugging
  window.testPartyRetrieval = async function() {
    console.log('=== TESTING PARTY RETRIEVAL ===');
    
    // Check localStorage
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    console.log('1. Admin user in localStorage:', adminUser);
    
    if (!adminUser.email) {
      console.error('❌ No admin email found in localStorage');
      return;
    }
    
    console.log('2. Admin email:', adminUser.email);
    
    // Test API call directly
    try {
      console.log('3. Making direct API call...');
      const response = await makeRequest('/admin/parties', 'POST', { email: adminUser.email });
      console.log('4. API Response:', response);
      
      if (response.success) {
        console.log('✅ API call successful');
        console.log('5. Number of parties returned:', response.parties?.length || 0);
        if (response.parties && response.parties.length > 0) {
          console.log('6. First party:', response.parties[0]);
        }
      } else {
        console.error('❌ API call failed:', response.message);
      }
    } catch (error) {
      console.error('❌ API call error:', error);
    }
    
    console.log('=== END TEST ===');
  };
  
  // Add function to test database directly
  window.testDatabaseDirectly = async function() {
    console.log('=== TESTING DATABASE DIRECTLY ===');
    
    try {
      // Test getting all parties
      console.log('1. Testing getAllParties endpoint...');
      const allPartiesResponse = await makeRequest('/parties', 'GET');
      console.log('2. All parties response:', allPartiesResponse);
      
      if (allPartiesResponse && allPartiesResponse.length > 0) {
        console.log('✅ Found parties in database:', allPartiesResponse.length);
        console.log('3. First party:', allPartiesResponse[0]);
        console.log('4. Administrator field:', allPartiesResponse[0].administrator);
      } else {
        console.log('❌ No parties found in database');
      }
    } catch (error) {
      console.error('❌ Database test error:', error);
    }
    
    console.log('=== END DATABASE TEST ===');
  };
  
  console.log('Database test function available: window.testDatabaseDirectly()');

  function handleLogout() {
    authManager.clearAuth();
    navigateTo("/admin-login");
  }

  function handleManageParty(partyId) {
    console.log('Managing party:', partyId);
    navigateTo("/manage-party", { partyId: partyId });
  }

  function handleEditParty(partyId) {
    console.log('Editing party:', partyId);
    // Redirect to Create Party in edit mode, passing the partyId
    navigateTo("/create-party", { partyId: partyId, edit: true });
  }

  function handleDeleteParty(partyId) {
    console.log('Deleting party:', partyId);
    if (confirm('Are you sure you want to delete this party?')) {
      deleteParty(partyId);
    }
  }

  function showToast(message, type = 'info') {
    const existing = document.getElementById('toast-notice');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'toast-notice';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    toast.style.color = '#fff';
    toast.style.fontSize = '14px';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease';
    const bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
    toast.style.background = bg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  async function deleteParty(partyId) {
    try {
      const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      const response = await makeRequest(`/parties/${partyId}`, 'DELETE', { email: adminUser.email });
      
      if (response.success) {
        console.log('Party deleted successfully');
        showToast('Event deleted successfully', 'success');
        // Reload the parties list
        loadAdminParties();
      } else {
        console.error('Failed to delete party:', response.message);
        showToast('Failed to delete party', 'error');
      }
    } catch (error) {
      console.error('Error deleting party:', error);
      showToast('Error deleting party', 'error');
    }
  }

  // Setup bottom navigation
  const bottomNav = document.querySelector('.bottom-nav');
  const navItems = bottomNav ? Array.from(bottomNav.querySelectorAll('.nav-item')) : [];
  
  navItems.forEach((item) => {
    item.style.touchAction = 'manipulation';
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const target = item.dataset.nav;
      if (target === 'parties') {
        navigateTo('/my-parties');
      } else if (target === 'new') {
        navigateTo('/create-party');
      } else if (target === 'profile') {
        navigateTo('/profile');
      }
    });
  });

}

async function loadAdminParties() {
  try {
    console.log('Loading admin parties from Supabase...');
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminEmail = adminUser.email;
    
    console.log('Admin user from localStorage:', adminUser);
    console.log('Admin email:', adminEmail);
    
    if (!adminEmail) {
      console.warn('No admin email found for authentication');
      document.getElementById('eventsList').innerHTML = '<div class="no-events">No events found</div>';
      return;
    }

    console.log('Making API request to /admin/parties with email:', adminEmail);
    const response = await makeRequest('/admin/parties', 'POST', { email: adminEmail });
    console.log('Parties response:', response);
    
    if (response.success && response.parties) {
      console.log('Successfully loaded parties:', response.parties.length);
      displayParties(response.parties);
    } else {
      console.warn('Failed to load parties from API:', response.message || 'Unknown error');
      
      // TEMPORARY FIX: Try to load all parties if admin-specific query fails
      console.log('Attempting to load all parties as fallback...');
      try {
        const allPartiesResponse = await makeRequest('/parties', 'GET');
        console.log('All parties response:', allPartiesResponse);
        
        if (allPartiesResponse && allPartiesResponse.length > 0) {
          console.log('Found parties in fallback query:', allPartiesResponse.length);
          // Filter to show only parties created by this admin (if administrator field matches)
          const adminParties = allPartiesResponse.filter(party => 
            party.administrator === adminEmail || 
            party.administrator === adminUser.name ||
            party.administrator === adminUser.email
          );
          
          if (adminParties.length > 0) {
            console.log('Found admin parties in fallback:', adminParties.length);
            displayParties(adminParties);
          } else {
            console.log('No parties found for this admin in fallback');
            document.getElementById('eventsList').innerHTML = '<div class="no-events">No events found</div>';
          }
        } else {
          document.getElementById('eventsList').innerHTML = '<div class="no-events">No events found</div>';
        }
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        document.getElementById('eventsList').innerHTML = '<div class="no-events">No events found</div>';
      }
    }
  } catch (error) {
    console.error('Error loading admin parties:', error);
    document.getElementById('eventsList').innerHTML = '<div class="no-events">Error loading events</div>';
  }
}

function displayParties(parties) {
  const eventsList = document.getElementById('eventsList');
  
  if (!parties || parties.length === 0) {
    eventsList.innerHTML = '<div class="no-events">No events found</div>';
    return;
  }

  eventsList.innerHTML = parties.map(party => `
    <div class="event-card">
      <div class="event-image">
        <img src="${party.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop'}" alt="${party.title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop';" />
      </div>
      <div class="event-content">
        <h3 class="event-title">${party.title}</h3>
        <p class="event-location">${party.location}</p>
        <p class="event-date">${party.date}</p>
        <p class="event-attendees">${party.attendees} attendees</p>
        <div class="event-actions">
          <button class="status-btn ${getStatusClass(party.status)}">${getStatusText(party.status)}</button>
          <button class="manage-btn" onclick="handleManageParty(${party.id})">Manage</button>
        </div>
      </div>
      <div class="event-controls">
        <button class="edit-btn" onclick="handleEditParty(${party.id})">
          <img src="assets/edit.svg" alt="Edit" />
        </button>
        <button class="delete-btn" onclick="handleDeleteParty(${party.id})">
          <img src="assets/deleteButton.svg" alt="Delete" />
        </button>
      </div>
    </div>
  `).join('');
  
  // Update metrics event name with first party if available
  if (parties && parties.length > 0) {
    const firstParty = parties[0];
    const eventNameEl = document.getElementById('metricsEventName');
    if (eventNameEl) {
      eventNameEl.textContent = firstParty.title || 'Chicago Night';
    }
  }
}

function displayMockParties() {
  const mockParties = [
    {
      id: 1,
      title: "Pre-New Year Party",
      location: "Cra 51#39-26",
      date: "5/9/21 • 21:30-06:00",
      attendees: "123/220",
      status: "active",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop"
    },
    {
      id: 2,
      title: "Joshua's BD",
      location: "Cra 57#29-346",
      date: "6/9/21 • 23:00-06:00",
      attendees: "156/300",
      status: "inactive",
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80&h=80&fit=crop"
    }
  ];
  
  displayParties(mockParties);
}

function getStatusClass(status) {
  switch (status) {
    case 'active':
      return 'active';
    case 'inactive':
      return 'inactive';
    case 'finished':
      return 'finished';
    default:
      return 'active';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'finished':
      return 'Finished';
    default:
      return 'Active';
  }
}

async function loadQuickMetrics() {
  try {
    console.log('Loading quick metrics from Supabase...');
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminEmail = adminUser.email;
    
    if (!adminEmail) {
      console.warn('No admin email found for authentication');
      document.getElementById('totalAttendees').textContent = '0';
      document.getElementById('totalRevenue').textContent = '$0';
      return;
    }

    console.log('Loading metrics from API...');
    const response = await makeRequest('/admin/metrics', 'POST', { email: adminEmail });
    console.log('Metrics response:', response);
    
    if (response.success && response.metrics) {
      const metrics = response.metrics;
      document.getElementById('totalAttendees').textContent = metrics.totalAttendees || '0';
      document.getElementById('totalRevenue').textContent = metrics.totalRevenue || '$0';
    } else {
      console.warn('Failed to load metrics from API:', response.message || 'Unknown error');
      document.getElementById('totalAttendees').textContent = '0';
      document.getElementById('totalRevenue').textContent = '$0';
    }
  } catch (error) {
    console.error('Error loading metrics:', error);
    document.getElementById('totalAttendees').textContent = '0';
    document.getElementById('totalRevenue').textContent = '$0';
  }
}
