import { makeRequest, navigateTo } from "../app.js";

export default function renderProfile() {
  console.log('renderProfile called in app2');
  const app = document.getElementById("app");
  
  // Force reload CSS to ensure latest styles are applied
  const existingLink = document.querySelector('link[href*="styles.css"]');
  if (existingLink) {
    const newLink = existingLink.cloneNode(true);
    newLink.href = existingLink.href + '?v=' + Date.now();
    existingLink.parentNode.replaceChild(newLink, existingLink);
  }
  app.innerHTML = `
    <div id="profile-screen">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-picture-container">
          <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face" alt="Profile" class="profile-picture" />
          <button class="camera-btn">
            <img src="/assets/edit.svg" alt="Edit" class="camera-icon" />
          </button>
        </div>
        <h1 class="profile-name" id="profileName">DJ KC</h1>
        <p class="profile-email" id="profileEmail">DJKC@hotmail.com</p>
        
        <!-- Stats -->
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-number" id="attendedCount">13</span>
            <span class="stat-label">Parties</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="favoritesCount">3.2k</span>
            <span class="stat-label">Attendents</span>
          </div>
        </div>
      </div>

      <!-- My Interests Section -->
      <div class="interests-section">
        <div class="section-header">
          <h2 class="section-title">My usual thematics</h2>
          <button class="edit-btn" id="editInterestsBtn">Edit</button>
        </div>
        <div class="interests-tags" id="interestsTags">
          <!-- Interests will be loaded dynamically -->
        </div>
      </div>

      <!-- My Parties Section -->
      <div class="parties-section">
        <div class="section-header">
          <h2 class="section-title">My Parties</h2>
          <button class="see-more-btn" id="seeMorePartiesBtn">See more</button>
        </div>
        <div class="parties-list" id="partiesList">
          <!-- Parties will be loaded dynamically -->
        </div>
      </div>

      <!-- Settings Menu -->
      <div class="settings-section">
        <div class="settings-list">
          <div class="settings-item" id="editProfileBtn">
            <img src="/assets/edit.svg" alt="Edit Profile" class="settings-icon" />
            <span class="settings-text">Edit profile</span>
            <img src="/assets/backIcon.svg" alt="Arrow" class="arrow-icon" />
          </div>
          <div class="settings-item" id="logoutBtn">
            <svg class="settings-icon logout-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>
              <path d="M15 8l4 4-4 4"/>
              <path d="M9 12h10"/>
            </svg>
            <span class="settings-text">Logout</span>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav">
        <div class="nav-item" id="nav-parties" data-nav="parties">
          <span class="nav-icon icon-party" aria-hidden="true"></span>
          <span class="nav-label">My Parties</span>
        </div>
        <div class="nav-item" id="nav-new" data-nav="new">
          <span class="nav-icon icon-plus" aria-hidden="true"></span>
          <span class="nav-label">New Party</span>
        </div>
        <div class="nav-item active" id="nav-profile" data-nav="profile">
          <span class="nav-icon icon-user" aria-hidden="true"></span>
          <span class="nav-label">Profile</span>
        </div>
      </nav>
    </div>
  `;

  // Initialize profile functionality
  initializeProfile();
  
  // Add test function for debugging profile statistics
  window.testProfileStats = function() {
    const createdParties = JSON.parse(localStorage.getItem('createdParties') || '[]');
    console.log('=== PROFILE STATS TEST ===');
    console.log('Created parties in localStorage:', createdParties);
    console.log('Parties count:', createdParties.length);
    
    let totalAttendees = 0;
    createdParties.forEach(party => {
      const [current] = party.attendees.split('/');
      totalAttendees += parseInt(current) || 0;
    });
    console.log('Total attendees:', totalAttendees);
    
    // Update the display
    document.getElementById("attendedCount").textContent = createdParties.length;
    document.getElementById("favoritesCount").textContent = totalAttendees.toLocaleString();
    
    console.log('Profile stats updated!');
    console.log('=== END TEST ===');
  };
  
  console.log('Profile test function available: window.testProfileStats()');
}

async function initializeProfile() {
  // Load user profile data
  await loadUserProfile();
  
  // Load user parties
  await loadUserParties();
  
  // Setup event listeners
  setupProfileEventListeners();
  
  // Setup bottom navigation
  setupBottomNavigation();
  
  // Add test function for debugging
  window.testProfileParties = async function() {
    console.log('=== TESTING PROFILE PARTIES ===');
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    console.log('1. Admin user:', adminUser);
    console.log('2. Admin name:', adminUser.name);
    console.log('3. Admin email:', adminUser.email);
    
    try {
      console.log('4. Testing /admin/parties endpoint...');
      const response = await makeRequest('/admin/parties', 'POST', { email: adminUser.email });
      console.log('5. API Response:', response);
      
      if (response.success && response.parties) {
        console.log('6. Number of parties returned:', response.parties.length);
        console.log('7. First few parties:', response.parties.slice(0, 3));
        
        // Check administrator field
        response.parties.forEach((party, index) => {
          console.log(`8. Party ${index + 1}:`, {
            title: party.title,
            administrator: party.administrator,
            matches: party.administrator === adminUser.name
          });
        });
      }
    } catch (error) {
      console.error('9. Error:', error);
    }
    
    console.log('=== END TEST ===');
  };
  
  console.log('Profile test function available: window.testProfileParties()');
}

async function loadUserProfile() {
  try {
    // Get current logged-in admin user data
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    
        console.log('Loading profile statistics from Supabase...');
    
    if (adminUser && Object.keys(adminUser).length > 0) {
      // Use logged-in admin user data
      document.getElementById("profileName").textContent = adminUser.name || "Admin";
      document.getElementById("profileEmail").textContent = adminUser.email || "admin@example.com";
      document.getElementById("attendedCount").textContent = adminUser.parties_count || 0;
      document.getElementById("favoritesCount").textContent = adminUser.attendees_count || "0";
      
      // Update profile picture
      const profilePicture = document.querySelector(".profile-picture");
      if (profilePicture && adminUser.profile_image) {
        profilePicture.src = adminUser.profile_image;
      }
      
      // Load user interests
      loadUserInterests(adminUser.interests || []);
      
      // Load correct metrics for this admin
      await loadProfileMetrics(adminUser.email);
      
      console.log("Profile loaded from logged-in admin user:", adminUser);
      return;
    }
    
    // Fallback: Try to fetch from Supabase API
    const userId = localStorage.getItem("currentUserId") || "1";
    
    try {
      const response = await makeRequest(`/users/${userId}/profile`, "GET");
      
      // Update profile information with real data
      document.getElementById("profileName").textContent = response.name || "Admin";
      document.getElementById("profileEmail").textContent = response.email || "admin@example.com";
      document.getElementById("attendedCount").textContent = response.parties_count || 13;
      document.getElementById("favoritesCount").textContent = response.attendees_count || "3.2k";
      
      // Update profile picture
      const profilePicture = document.querySelector(".profile-picture");
      if (profilePicture && response.profile_image) {
        profilePicture.src = response.profile_image;
      }

      // Load user interests
      loadUserInterests(response.interests || []);

      // Store user data for later use
      localStorage.setItem("adminUser", JSON.stringify(response));
      
      console.log("Profile loaded from Supabase:", response);
      
    } catch (apiError) {
      console.warn("API call failed, using fallback data:", apiError);
      
      // Fallback to mock data if API fails
      const mockUser = {
        id: 1,
        name: "DJ KC",
        email: "DJKC@hotmail.com",
        profile_image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        parties_count: 13,
        attendees_count: "3.2k",
        interests: ["Disco Music", "Elegant", "Cocktailing"],
        is_admin: true
      };

      // Update profile information with calculated data
      document.getElementById("profileName").textContent = mockUser.name;
      document.getElementById("profileEmail").textContent = mockUser.email;
      document.getElementById("attendedCount").textContent = mockUser.parties_count;
      document.getElementById("favoritesCount").textContent = mockUser.attendees_count;
      
      // Update profile picture
      const profilePicture = document.querySelector(".profile-picture");
      if (profilePicture) {
        profilePicture.src = mockUser.profile_image;
      }

      // Load user interests
      loadUserInterests(mockUser.interests || []);

      // Store user data for later use
      localStorage.setItem("adminUser", JSON.stringify(mockUser));
    }
    
  } catch (error) {
    console.error("Error loading user profile:", error);
    // Show error message or fallback data
  }
}

async function loadUserParties() {
  try {
    console.log('Loading user parties from Supabase...');
    
    // Get current admin user email for authentication
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminEmail = adminUser.email;

    console.log('Profile - Admin user from localStorage:', adminUser);
    console.log('Profile - Admin email:', adminEmail);

    if (!adminEmail) {
      console.warn('No admin email found for authentication');
      document.getElementById("partiesList").innerHTML = '<div class="no-parties">No parties found</div>';
      return;
    }

    // Fetch parties from API (this now uses name-based filtering)
    console.log('Profile - Making API request to /admin/parties with email:', adminEmail);
    const response = await makeRequest('/admin/parties', 'POST', { email: adminEmail });
    console.log('Profile - Parties response:', response);

    let partiesToShow = [];

    if (response.success && response.parties && response.parties.length > 0) {
      console.log('Profile - Successfully loaded parties:', response.parties.length);
      
      // FRONTEND FILTERING: Filter parties by administrator name as fallback
      const adminName = adminUser.name;
      console.log('Profile - Filtering parties by admin name:', adminName);
      
      const filteredParties = response.parties.filter(party => {
        const matches = party.administrator === adminName;
        console.log(`Profile - Party "${party.title}" administrator: "${party.administrator}" matches: ${matches}`);
        return matches;
      });
      
      console.log('Profile - Filtered parties count:', filteredParties.length);
      
      // Convert filtered parties to the format expected by profile screen
      partiesToShow = filteredParties.slice(0, 3).map((party, index) => {
        let status = 'In progress';
        let buttonText = 'Manage';
        let buttonClass = 'manage-btn';
        
        if (party.status === 'inactive') {
          status = 'Inactive';
          buttonText = 'Statistics';
          buttonClass = 'statistics-btn';
        } else if (party.status === 'finished' || index === 2) {
          status = 'Finished';
          buttonText = 'Statistics';
          buttonClass = 'statistics-btn';
        }
        
        return {
        id: party.id,
        title: party.title,
        date: party.date.split(' • ')[0], // Just the date part
          status: status,
        image: party.image || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop",
          buttonText: buttonText,
          buttonClass: buttonClass
        };
      });
    } else {
      console.warn('Profile - No parties found in API response');
      partiesToShow = [];
    }

    console.log('Profile - Parties to show:', partiesToShow.length);

    const partiesList = document.getElementById("partiesList");
    partiesList.innerHTML = partiesToShow.map(party => `
      <div class="party-item">
        <img src="${party.image}" alt="${party.title}" class="party-image" />
        <div class="party-content">
          <h3 class="party-title">${party.title}</h3>
          <p class="party-date">${party.date} • ${party.status}</p>
        </div>
        <div class="party-action">
          <button class="party-btn ${party.buttonClass}" onclick="handlePartyAction(${party.id}, '${party.buttonText}')">${party.buttonText}</button>
        </div>
      </div>
    `).join("");
    
    // Make handlePartyAction available globally
    window.handlePartyAction = function(partyId, action) {
      if (action === 'Manage') {
        navigateTo("/manage-party", { partyId: partyId });
      } else if (action === 'Statistics') {
        // TODO: Navigate to statistics
        console.log('Statistics for party:', partyId);
      }
    };

  } catch (error) {
    console.error("Error loading user parties:", error);
    document.getElementById("partiesList").innerHTML = '<div class="no-parties">Error loading parties</div>';
  }
}

async function loadProfileMetrics(adminEmail) {
  try {
    console.log('Profile - Loading metrics for admin:', adminEmail);
    const response = await makeRequest('/admin/metrics', 'POST', { email: adminEmail });
    console.log('Profile - Metrics response:', response);
    
    if (response.success && response.metrics) {
      const metrics = response.metrics;
      document.getElementById("attendedCount").textContent = metrics.totalAttendees || "0";
      document.getElementById("favoritesCount").textContent = metrics.totalRevenue || "$0";
      console.log('Profile - Updated metrics:', metrics);
    } else {
      console.warn('Profile - Failed to load metrics:', response.message);
    }
  } catch (error) {
    console.error('Profile - Error loading metrics:', error);
  }
}

function loadUserInterests(interests) {
  const interestsContainer = document.getElementById("interestsTags");
  
  // Ensure interests is always an array
  const interestsArray = Array.isArray(interests) ? interests : [];
  
  if (interestsArray.length === 0) {
    interestsContainer.innerHTML = `
      <p class="no-interests-message">No interests selected yet</p>
    `;
    return;
  }

  // Map interest names to their corresponding CSS classes and icons
  const interestConfig = {
    "Disco Music": { class: "disco", icon: "/assets/partyIcon.svg" },
    "Elegant": { class: "elegant", icon: "/assets/partyIcon.svg" },
    "Cocktailing": { class: "cocktail", icon: "/assets/partyIcon.svg" },
    "House Music": { class: "house", icon: "/assets/partyIcon.svg" },
    "Techno": { class: "techno", icon: "/assets/partyIcon.svg" },
    "Jazz": { class: "jazz", icon: "/assets/partyIcon.svg" },
    "Rock": { class: "rock", icon: "/assets/partyIcon.svg" },
    "Pop": { class: "pop", icon: "/assets/partyIcon.svg" },
    "Electronic": { class: "electronic", icon: "/assets/partyIcon.svg" },
    "Classical": { class: "classical", icon: "/assets/partyIcon.svg" },
    "Hip Hop": { class: "hiphop", icon: "/assets/partyIcon.svg" },
    "R&B": { class: "rnb", icon: "/assets/partyIcon.svg" },
    "Reggae": { class: "reggae", icon: "/assets/partyIcon.svg" },
    "Country": { class: "country", icon: "/assets/partyIcon.svg" },
    "Blues": { class: "blues", icon: "/assets/partyIcon.svg" },
    "Folk": { class: "folk", icon: "/assets/partyIcon.svg" },
    "Indie": { class: "indie", icon: "/assets/partyIcon.svg" },
    "Alternative": { class: "alternative", icon: "/assets/partyIcon.svg" }
  };

  interestsContainer.innerHTML = interestsArray.map(interest => {
    const config = interestConfig[interest] || { class: "default", icon: "/assets/partyIcon.svg" };
    return `
      <div class="interest-tag ${config.class}">
        <img src="${config.icon}" alt="${interest}" class="tag-icon" />
        <span>${interest}</span>
      </div>
    `;
  }).join("");

  console.log("Interests loaded:", interestsArray);
}

function setupProfileEventListeners() {
  // Edit interests button
  document.getElementById("editInterestsBtn").addEventListener("click", () => {
    console.log("Edit interests clicked");
    navigateTo("/edit-profile");
  });

  // See more parties button
  document.getElementById("seeMorePartiesBtn").addEventListener("click", () => {
    console.log("See more parties clicked");
    navigateTo("/my-parties");
  });

  // Settings menu items
  document.getElementById("editProfileBtn").addEventListener("click", () => {
    console.log("Edit profile clicked");
    navigateTo("/edit-profile");
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    console.log("Logout clicked");
    handleLogout();
  });

  // Camera button for profile picture
  const cameraBtn = document.querySelector(".camera-btn");
  if (cameraBtn) {
    cameraBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Change profile picture clicked - navigating to edit profile");
      navigateTo("/edit-profile");
  });
  }
}

function handleLogout() {
  // Clear admin user data
  localStorage.removeItem('adminUser');
  localStorage.removeItem('currentUserId');
  
  // Redirect to admin login
  navigateTo("/admin-login");
}

function setupBottomNavigation() {
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
        // Already on profile page - do nothing
        return;
      }
    });
  });
}
