import { navigateTo, makeRequest } from "../app.js";
import { authManager } from "../auth.js";

export default function renderAdminDashboard(data = {}) {
  if (!authManager.isUserAdmin()) {
    if (authManager.isUserMember()) {
      window.location.href = 'https://app1-rumbify.vercel.app/screen1';
    } else {
      window.location.href = '/admin-login';
    }
    return;
  }

  // Protección adicional: asegurar que el admin nunca pueda acceder a app1
  if (window.location.href.includes('/app1')) {
    console.log('Admin detected on app1, redirecting to admin-dashboard');
    window.location.href = '/admin-dashboard';
    return;
  }

  let adminUser = data.user || authManager.getCurrentUser();
  
  const email = adminUser?.email || 'admin@rumbify.com';
  const name = adminUser?.name || 'Administrator';
  const phone = adminUser?.phone || 'N/A';
  
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="admin-dashboard-screen">
      <div class="admin-dashboard-content">
        <!-- Header -->
        <div class="admin-header">
          <div class="admin-logo">
            <img src="assets/Llogowhite.png" alt="Rumbify Admin" class="admin-logo-img" />
          </div>
          <div class="admin-user-info">
            <h2 class="admin-welcome">Welcome, ${name}</h2>
            <p class="admin-email">${email}</p>
            <p class="admin-phone">${phone}</p>
          </div>
          <div class="admin-header-actions">
            <button class="admin-profile-btn" id="profileBtn">
              <img src="assets/person.svg" alt="Profile" class="profile-icon" />
            </button>
            <button class="admin-logout-btn" onclick="handleLogout()">Logout</button>
          </div>
        </div>

        <!-- Admin Dashboard Content -->
        <div class="admin-dashboard-body">
          <h1 class="admin-dashboard-title">Admin Dashboard</h1>
          
          <div class="admin-stats-grid">
            <div class="stat-card">
              <h3>Total Events</h3>
              <p class="stat-number" id="totalEvents">0</p>
            </div>
            <div class="stat-card">
              <h3>Active Users</h3>
              <p class="stat-number" id="activeUsers">0</p>
            </div>
            <div class="stat-card">
              <h3>Pending Approvals</h3>
              <p class="stat-number" id="pendingApprovals">0</p>
            </div>
            <div class="stat-card">
              <h3>Revenue</h3>
              <p class="stat-number" id="revenue">$0</p>
            </div>
          </div>
        </div>
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

  // Load statistics only (parties are accessed via My Parties navigation)
  loadUserStatistics();
  
  // Add test function for debugging admin statistics
  window.testAdminStats = function() {
    const createdParties = JSON.parse(localStorage.getItem('createdParties') || '[]');
    console.log('=== ADMIN STATS TEST ===');
    console.log('Created parties in localStorage:', createdParties);
    console.log('Parties count:', createdParties.length);
    
    let totalAttendees = 0;
    let totalRevenue = 0;
    
    createdParties.forEach(party => {
      const [current, max] = party.attendees.split('/');
      totalAttendees += parseInt(current) || 0;
      const maxAttendees = parseInt(max) || 0;
      totalRevenue += maxAttendees * 50; // Estimate $50 per ticket
    });
    
    console.log('Total attendees:', totalAttendees);
    console.log('Estimated revenue:', totalRevenue);
    
    // Update the display
    document.getElementById('totalEvents').textContent = createdParties.length;
    document.getElementById('activeUsers').textContent = totalAttendees || '0';
    document.getElementById('pendingApprovals').textContent = createdParties.length || '0';
    document.getElementById('revenue').textContent = totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '$0';
    
    console.log('Admin stats updated!');
    console.log('=== END TEST ===');
  };
  
  console.log('Admin test function available: window.testAdminStats()');

  function handleLogout() {
    authManager.clearAuth();
    navigateTo("/admin-login");
  }

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      navigateTo('/profile');
    });
  }
  
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

async function loadAdminStatistics() {
  // This function is now only used as a fallback
  // The main statistics are loaded from party data in loadUserParties()
  console.log('loadAdminStatistics called - this should only run as fallback');
  
  // Set default values
  document.getElementById('totalEvents').textContent = '0';
  document.getElementById('activeUsers').textContent = '0';
  document.getElementById('pendingApprovals').textContent = '0';
  document.getElementById('revenue').textContent = '$0';
}

async function loadUserStatistics() {
  try {
    console.log('Loading user statistics from Supabase...');
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminEmail = adminUser.email;
    
    console.log('Admin user from localStorage:', adminUser);
    console.log('Admin email:', adminEmail);
    
    if (!adminEmail) {
      console.warn('No admin email found for authentication');
      // Set default values
      document.getElementById('totalEvents').textContent = '0';
      document.getElementById('activeUsers').textContent = '0';
      document.getElementById('pendingApprovals').textContent = '0';
      document.getElementById('revenue').textContent = '$0';
      return;
    }

    console.log('Making API request to /admin/parties with email:', adminEmail);
    const response = await makeRequest('/admin/parties', 'POST', { email: adminEmail });
    console.log('Parties response:', response);
    
    if (response.success && response.parties) {
      console.log('Successfully loaded parties:', response.parties.length);
      
      // Update statistics with actual party data
      updateStatisticsFromParties(response.parties);
    } else {
      console.warn('Failed to load parties from API:', response.message || 'Unknown error');
      // Load fallback statistics if no parties found
      loadAdminStatistics();
    }
  } catch (error) {
    console.error('Error loading user statistics:', error);
    // Load fallback statistics if error occurs
    loadAdminStatistics();
  }
}


function updateStatisticsFromParties(parties) {
  // Calculate statistics from the user's parties
  const totalEvents = parties.length;
  let totalAttendees = 0;
  let totalRevenue = 0;
  
  parties.forEach(party => {
    if (party.attendees) {
      const [current, max] = party.attendees.split('/');
      totalAttendees += parseInt(current) || 0;
      const maxAttendees = parseInt(max) || 0;
      totalRevenue += maxAttendees * 50; // Estimate $50 per ticket
    }
  });
  
  // Update the statistics display
  document.getElementById('totalEvents').textContent = totalEvents;
  document.getElementById('activeUsers').textContent = totalAttendees;
  document.getElementById('pendingApprovals').textContent = totalEvents; // Use total events as pending
  document.getElementById('revenue').textContent = totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '$0';
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

