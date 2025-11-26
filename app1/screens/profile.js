import { makeRequest, navigateTo, getCurrentUser, logout } from "../app.js";

export default function renderProfile() {
  const app = document.getElementById("app");
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
        <h1 class="profile-name" id="profileName">KC Lember</h1>
        <p class="profile-email" id="profileEmail">DJKC@hotmail.com</p>
        <div class="user-type-badge" id="userTypeBadge">
          <span class="user-type-text">Member</span>
        </div>
        
        <!-- Stats -->
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-number" id="attendedCount">12</span>
            <span class="stat-label">Attended</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="favoritesCount">5</span>
            <span class="stat-label">Favorites</span>
          </div>
        </div>
      </div>

      <!-- My Interests Section -->
      <div class="interests-section">
        <div class="section-header">
          <h2 class="section-title">My interests</h2>
          <button class="edit-btn" id="editInterestsBtn">Edit</button>
        </div>
        <div class="interests-tags" id="interestsTags">
          <!-- Interests will be loaded dynamically -->
        </div>
      </div>

      <!-- History Section -->
      <div class="history-section">
        <div class="section-header">
          <h2 class="section-title">History</h2>
        </div>
        <div class="history-list" id="historyList">
          <!-- History items will be loaded dynamically -->
        </div>
      </div>

      <!-- Settings Menu -->
      <div class="settings-section">
        <div class="settings-list">
          <div class="settings-item" id="editProfileBtn">
            <img src="/assets/edit.svg" alt="Edit Profile" class="settings-icon" />
            <span class="settings-text">Edit profile</span>
            <img src="/assets/arrow.svg" alt="Arrow" class="arrow-icon" />
          </div>
          <div class="settings-item" id="logoutBtn">
            <img src="/assets/logOut.svg" alt="Logout" class="settings-icon" />
            <span class="settings-text">Logout</span>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav">
        <div class="nav-item" data-nav="parties">
          <span class="nav-icon icon-party"></span>
          <span>Parties</span>
        </div>
        <div class="nav-item" data-nav="home">
          <span class="nav-icon icon-home"></span>
          <span>Home</span>
        </div>
        <div class="nav-item active" data-nav="profile">
          <span class="nav-icon icon-user"></span>
          <span>Profile</span>
        </div>
      </nav>
    </div>
  `;

  // Initialize profile functionality
  initializeProfile();
}

async function initializeProfile() {
  // Load user profile data
  await loadUserProfile();
  
  // Load user history
  await loadUserHistory();
  
  // Setup event listeners
  setupProfileEventListeners();
  
  // Setup bottom navigation
  setupBottomNavigation();
}

async function loadUserProfile() {
  try {
    // Get current logged-in user data
    const currentUser = getCurrentUser();
    
    // Load favorites count
    await loadFavoritesCount();
    
    if (currentUser) {
      // Use logged-in user data
      document.getElementById("profileName").textContent = currentUser.name || "User";
      document.getElementById("profileEmail").textContent = currentUser.email || "user@example.com";
      document.getElementById("attendedCount").textContent = currentUser.attended_count || 0;
      
      // Update user type badge
      const userTypeBadge = document.getElementById("userTypeBadge");
      const userTypeText = document.querySelector(".user-type-text");
      if (currentUser.is_admin) {
        userTypeBadge.className = "user-type-badge admin";
        userTypeText.textContent = "Admin";
      } else {
        userTypeBadge.className = "user-type-badge member";
        userTypeText.textContent = "Member";
      }
      
      // Update profile picture
      const profilePicture = document.querySelector(".profile-picture");
      if (profilePicture && currentUser.profile_image) {
        profilePicture.src = currentUser.profile_image;
      }
      
      // Load user interests (normalize to array)
      loadUserInterests(normalizeInterests(currentUser.interests));
      
      console.log("Profile loaded from logged-in user:", currentUser);
      return;
    }
    
    // Fallback: Try to fetch from Supabase API
    const userId = localStorage.getItem("currentUserId") || "1";
    
    try {
      const response = await makeRequest(`/users/${userId}/profile`, "GET");
      
      // Update profile information with real data
      document.getElementById("profileName").textContent = response.name || "User";
      document.getElementById("profileEmail").textContent = response.email || "user@example.com";
      document.getElementById("attendedCount").textContent = response.attended_count || 0;
      
      // Update user type badge
      const userTypeBadge = document.getElementById("userTypeBadge");
      const userTypeText = document.querySelector(".user-type-text");
      if (response.is_admin) {
        userTypeBadge.className = "user-type-badge admin";
        userTypeText.textContent = "Admin";
      } else {
        userTypeBadge.className = "user-type-badge member";
        userTypeText.textContent = "Member";
      }
      
      // Update profile picture
      const profilePicture = document.querySelector(".profile-picture");
      if (profilePicture && response.profile_image) {
        profilePicture.src = response.profile_image;
      }

      // Load user interests (normalize to array)
      loadUserInterests(normalizeInterests(response.interests));

      // Store user data for later use
      localStorage.setItem("currentUser", JSON.stringify(response));
      
      console.log("Profile loaded from Supabase:", response);
      
    } catch (apiError) {
      console.warn("API call failed, using fallback data:", apiError);
      
      // Fallback to mock data if API fails
      const mockUser = {
        id: 1,
        name: "KC Lember",
        email: "DJKC@hotmail.com",
        profile_image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        attended_count: 12,
        favorites_count: 5,
        interests: ["Disco Music", "Elegant", "Cocktailing"]
      };

      // Update profile information
      document.getElementById("profileName").textContent = mockUser.name;
      document.getElementById("profileEmail").textContent = mockUser.email;
      document.getElementById("attendedCount").textContent = mockUser.attended_count;
      // Favorites count will be loaded by loadFavoritesCount()
      
      // Update profile picture
      const profilePicture = document.querySelector(".profile-picture");
      if (profilePicture) {
        profilePicture.src = mockUser.profile_image;
      }

      // Load user interests
      loadUserInterests(mockUser.interests || []);

      // Store user data for later use
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
    }
    
  } catch (error) {
    console.error("Error loading user profile:", error);
    // Show error message or fallback data
  }
}

async function loadUserHistory() {
  try {
    const currentUser = getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
      console.warn("No current user found");
      showNoHistoryMessage();
      return;
    }

    console.log("Loading party history for user:", currentUser.id);
    
    // Get party history from the API
    const response = await makeRequest(`/users/${currentUser.id}/party-history`, "GET");
    
    if (response && response.success && response.party_history) {
      console.log("Party history loaded:", response.party_history.length, "parties");
      console.log("Party history data:", response.party_history);
      
      const historyList = document.getElementById("historyList");
      
      if (response.party_history.length === 0) {
        showNoHistoryMessage();
      } else {
        historyList.innerHTML = response.party_history.map(item => {
          console.log("Creating history item for:", item.title, "party_id:", item.party_id);
          // Determine status text based on attendance
          // If status is "attended" or the party date has passed, show "Attended", otherwise "Not Attended"
          let statusText = "Not Attended";
          if (item.status === "attended" || item.status === "Attended") {
            statusText = "Attended";
          } else if (item.date_iso) {
            const partyDate = new Date(item.date_iso);
            const now = new Date();
            if (partyDate < now) {
              statusText = "Attended";
            }
          }
          
          // Format date (assuming it's in format like "22/11/21" or ISO format)
          let formattedDate = item.date || item.date_display || "";
          if (item.date_iso) {
            const dateObj = new Date(item.date_iso);
            formattedDate = dateObj.toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: '2-digit', 
              year: '2-digit' 
            });
          } else if (item.date && item.date.includes('/')) {
            // Already in the format we want
            formattedDate = item.date.split(' ')[0]; // Take only the date part if there's time
          }
          
          return `
            <div class="history-item" data-party-id="${item.party_id || item.id}" style="cursor: pointer;">
              <img src="${item.image || item.image_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop'}" alt="${item.title}" class="history-image" />
              <div class="history-content">
                <h3 class="history-title">${item.title}</h3>
                <p class="history-date">${formattedDate} • ${statusText}</p>
              </div>
            </div>
          `;
        }).join("");
      }
      
      // Update attended count with real data
      const attendedCountElement = document.getElementById("attendedCount");
      if (attendedCountElement) {
        attendedCountElement.textContent = response.count || 0;
      }
      
    } else {
      console.warn("No history data from API");
      showNoHistoryMessage();
    }
    
  } catch (error) {
    console.error("Error loading party history:", error);
    showNoHistoryMessage();
  }
}

function showNoHistoryMessage() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = `
    <div class="no-history">
      <p>No tienes fiestas en tu historial aún</p>
      <p class="no-history-subtitle">Usa códigos de fiestas para agregarlas a tu historial</p>
    </div>
  `;
}

// Ensure interests is always an array of strings
function normalizeInterests(interests) {
  try {
    if (!interests) return [];
    if (Array.isArray(interests)) return interests.filter(Boolean).map(i => String(i).trim());
    if (typeof interests === 'string') {
      const trimmed = interests.trim();
      // Try JSON first
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(i => String(i).trim());
      } catch (_) {}
      // Fallback: comma-separated list
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof interests === 'object') {
      // Possible map/object of flags: { Disco: true, Techno: false }
      return Object.keys(interests).filter(k => interests[k]).map(k => String(k).trim());
    }
    return [];
  } catch (_) {
    return [];
  }
}

function loadUserInterests(interests) {
  const interestsContainer = document.getElementById("interestsTags");
  const safeInterests = normalizeInterests(interests);
  
  if (!safeInterests || safeInterests.length === 0) {
    interestsContainer.innerHTML = `
      <div class="no-interests">
        <p>No interests selected yet</p>
      </div>
    `;
    return;
  }

  // Map interest names to their corresponding CSS classes and icons
  const interestConfig = {
    "Disco Music": { class: "disco", icon: "/assets/partyIcon.svg" },
    "Elegant": { class: "elegant", icon: "/assets/edit.svg" },
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

  interestsContainer.innerHTML = safeInterests.map(interest => {
    const config = interestConfig[interest] || { class: "default", icon: "/assets/partyIcon.svg" };
    return `
      <div class="interest-tag ${config.class}">
        <img src="${config.icon}" alt="${interest}" class="tag-icon" />
        <span>${interest}</span>
      </div>
    `;
  }).join("");

  console.log("Interests loaded:", safeInterests);
}

function setupProfileEventListeners() {
  // Edit interests button
  document.getElementById("editInterestsBtn").addEventListener("click", () => {
    console.log("Edit interests clicked");
    navigateTo("/edit-profile");
  });

  // See more history button
  // Removed "See more" button for History per request

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
  document.querySelector(".camera-btn").addEventListener("click", () => {
    console.log("Camera button clicked  Enavigating to Edit Profile");
    navigateTo("/edit-profile");
  });

  // History item clicks
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.history-item')) {
      const historyItem = e.target.closest('.history-item');
      const partyId = historyItem.dataset.partyId;
      
      if (partyId) {
        // Check if user has QR code for this party
        try {
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.id) {
            const qrResponse = await makeRequest(`/codes/qr-code/${currentUser.id}/${partyId}`, "GET");
            
            if (qrResponse && qrResponse.success && qrResponse.qr_code) {
              // User has QR code, navigate to party-details
              console.log('User has QR code, navigating to party details from history:', partyId);
              navigateTo(`/party-details/${partyId}`);
            } else {
              // User doesn't have QR code, navigate to event-details
              console.log('User has no QR code, navigating to event details from history:', partyId);
              try {
                const eventResponse = await makeRequest(`/parties/${partyId}`, "GET");
                const eventData = eventResponse?.party || eventResponse;
                navigateTo("/event-details", eventData);
              } catch (error) {
                console.error('Error fetching event details:', error);
                navigateTo("/event-details", { id: partyId });
              }
            }
          } else {
            // No user, navigate to event-details
            try {
              const eventResponse = await makeRequest(`/parties/${partyId}`, "GET");
              const eventData = eventResponse?.party || eventResponse;
              navigateTo("/event-details", eventData);
            } catch (error) {
              navigateTo("/event-details", { id: partyId });
            }
          }
        } catch (error) {
          console.error('Error checking QR code:', error);
          // On error, default to event-details
          try {
            const eventResponse = await makeRequest(`/parties/${partyId}`, "GET");
            const eventData = eventResponse?.party || eventResponse;
            navigateTo("/event-details", eventData);
          } catch (err) {
            navigateTo("/event-details", { id: partyId });
          }
        }
      }
    }
  });
}

function handleLogout() {
  // Use the global logout function
  logout();
  // Redirect to welcome after clearing session
  navigateTo("/welcome");
}

function setupBottomNavigation() {
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  
  navItems.forEach(item => {
    item.style.touchAction = "manipulation";
    item.addEventListener("click", () => {
      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove("active"));
      
      // Add active class to clicked item
      item.classList.add("active");
      
      // Handle navigation
      const target = item.dataset.nav;
      switch (target) {
        case "parties":
        case "My Parties":
-         navigateTo("/parties");
+         navigateTo("/parties");
          break;
        case "home":
        case "Home":
          navigateTo("/member-dashboard");
          break;
        case "profile":
        case "Profile":
          // Already on profile page
          break;
      }
    });
  });
}

async function loadFavoritesCount() {
  try {
    const userId = getCurrentUser()?.id;
    if (!userId) {
      document.getElementById("favoritesCount").textContent = "0";
      return;
    }

    // Fetch all parties and count liked ones
    const response = await makeRequest("/parties", "GET");
    const allParties = Array.isArray(response) ? response : [];
    const likedCount = allParties.filter(party => party.liked === true).length;
    
    document.getElementById("favoritesCount").textContent = likedCount;
  } catch (error) {
    console.error("Error loading favorites count:", error);
    document.getElementById("favoritesCount").textContent = "0";
  }
}
