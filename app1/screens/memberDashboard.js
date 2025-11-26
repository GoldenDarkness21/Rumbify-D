import { makeRequest, navigateTo, getCurrentUser } from "../app.js";

// Configuration for data source
const CONFIG = {
  USE_MOCK_DATA: false,
  API_ENDPOINTS: {
    UPCOMING_FOR_YOU: "/users",
    LIKE: "/parties"
  }
};

let memberDashboardController = {
  isActive: false,
  abortController: null,
  isLoading: false
};

function parseEventDate(rawValue) {
  if (!rawValue) return null;

  if (rawValue instanceof Date) {
    return rawValue;
  }

  const normalized = String(rawValue).split("•")[0].trim();

  const slashMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    let year = slashMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    const month = slashMatch[2].padStart(2, "0");
    const day = slashMatch[1].padStart(2, "0");
    const iso = `${year}-${month}-${day}T00:00:00`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const isoMatch = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1].padStart(4, "0");
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    const iso = `${year}-${month}-${day}T00:00:00`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseAttendeesFromString(attStr = "0/0") {
  const [currentRaw = "0", maxRaw = "0"] = String(attStr).split("/");
  const toNumber = (value) => {
    const digits = String(value).replace(/[^\d]/g, "");
    const parsed = Number(digits);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const current = toNumber(currentRaw);
  const max = toNumber(maxRaw) || 100;
  return { current, max };
}

export default function renderMemberDashboard() {
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || "User";
  
  memberDashboardController.isActive = true;
  if (memberDashboardController.abortController) {
    memberDashboardController.abortController.abort();
  }
  memberDashboardController.abortController = new AbortController();
  
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="member-dashboard">
      <!-- Header Section -->
      <header class="dashboard-header">
        <div class="profile-section" id="headerProfileBtn">
          <div class="profile-pic">
            <img src="${currentUser?.profile_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face'}" alt="Profile" />
          </div>
          <div class="profile-info">
            <h3>Welcome, ${userName}</h3>
            <span class="member-badge">Member</span>
          </div>
        </div>
      </header>

      <!-- Welcome Message -->
      <div class="welcome-message">
        <h2>Hi ${userName}, ready for the weekend?</h2>
        <button class="add-party-btn" id="addPartyBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
          Add Party
        </button>
      </div>

      <!-- Upcoming For You Section -->
      <section class="upcoming-for-you-section">
        <h2 class="section-title">Upcoming For You</h2>
        <div class="upcoming-carousel" id="upcomingCarousel">
          <!-- Upcoming events will be loaded here -->
        </div>
        <div class="upcoming-carousel-footer" id="upcomingCarouselFooter" style="display: none;">
          <div class="carousel-dots" id="upcomingCarouselDots"></div>
        </div>
      </section>

      <!-- Favorites Section -->
      <section class="favorites-section">
        <div class="section-header">
          <h2 class="section-title">Favorites</h2>
        </div>
        <div class="favorites-grid" id="favoritesGrid">
          <!-- Favorite parties will be loaded here -->
        </div>
        <div class="favorites-carousel-footer" id="favoritesCarouselFooter" style="display: none;">
          <div class="carousel-dots" id="favoritesCarouselDots"></div>
        </div>
        <div class="no-favorites" id="noFavorites" style="display: none;">
          <p>No tienes eventos favoritos aún</p>
        </div>
      </section>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav">
        <div class="nav-item" data-nav="Parties">
          <span class="nav-icon icon-party"></span>
          <span>Parties</span>
        </div>
        <div class="nav-item active" data-nav="Home">
          <span class="nav-icon icon-home"></span>
          <span>Home</span>
        </div>
        <div class="nav-item" data-nav="Profile">
          <span class="nav-icon icon-user"></span>
          <span>Profile</span>
        </div>
      </nav>
    </div>
  `;

  initializeMemberDashboard();
}

function initializeMemberDashboard() {
  // Load upcoming events for user
  loadUpcomingForYou();
  
  // Load favorite parties
  loadFavorites();
  
  setupUpcomingCarousel();
  
  setupActionButtons();
  
  setupBottomNavigation();
  
  setupHeaderProfileButton();
  
  setupAddPartyButton();
}

// Data Service Layer
class MemberDataService {
  static async getUpcomingForYou(userId) {
    if (CONFIG.USE_MOCK_DATA) {
      return this.getMockUpcomingForYou();
    }

    if (!userId) {
      return [];
    }
    
    try {
      const response = await makeRequest(
        `${CONFIG.API_ENDPOINTS.UPCOMING_FOR_YOU}/${userId}/party-history`,
        "GET"
      );
      
      const history = Array.isArray(response?.party_history) ? response.party_history : [];
      const nowDate = new Date();
      nowDate.setHours(0, 0, 0, 0);
      const now = nowDate.getTime();
      
      const upcomingEvents = history
        .map((event) => {
          const parsedDate = parseEventDate(event.date_iso || event.date);
          const attendeesInfo = parseAttendeesFromString(event.attendees);
          return {
            ...event,
            date: parsedDate ? parsedDate.toISOString() : (event.date_iso || event.date || new Date().toISOString()),
            attendees_count: attendeesInfo.current,
            max_attendees: attendeesInfo.max
          };
        })
        .filter((event) => {
          if (typeof event.is_upcoming === 'boolean') {
            return event.is_upcoming;
          }
          return true;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (upcomingEvents.length === 0 && history.length > 0) {
        return history.map((event) => {
          const parsedDate = parseEventDate(event.date_iso || event.date);
          const attendeesInfo = parseAttendeesFromString(event.attendees);
          return {
            ...event,
            date: parsedDate ? parsedDate.toISOString() : (event.date_iso || event.date || new Date().toISOString()),
            attendees_count: attendeesInfo.current,
            max_attendees: attendeesInfo.max
          };
        });
      }
      
      return upcomingEvents;
    } catch (error) {
      console.error("Error fetching upcoming for you:", error);
      return [];
    }
  }


  static getMockUpcomingForYou() {
    return [
      {
        id: 1,
        title: "Neon Night",
        attendees: "89/120",
        location: "Club Downtown",
        date: "15/12/24 • 22:00-06:00",
        administrator: "DJ Neon",
        price: "$35.000",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
        tags: ["Neon", "Electronic"],
        liked: false,
        category: "upcoming"
      },
      {
        id: 2,
        title: "Summer Vibes",
        attendees: "45/100",
        location: "Calle 15#45-12",
        date: "20/12/24 • 20:00-04:00",
        administrator: "DJ Summer",
        price: "$45.000",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop",
        tags: ["Summer", "Outdoor"],
        liked: true,
        category: "upcoming"
      },
      {
        id: 3,
        title: "New Year Party",
        attendees: "67/150",
        location: "Rooftop Bar",
        date: "31/12/24 • 21:00-05:00",
        administrator: "Event Organizer",
        price: "$60.000",
        image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=300&fit=crop",
        tags: ["New Year", "Celebration"],
        liked: false,
        category: "upcoming"
      }
    ];
  }

  static async getLikedParties(userId) {
    if (CONFIG.USE_MOCK_DATA) {
      return this.getMockLikedParties();
    }

    if (!userId) {
      return [];
    }
    
    try {
      // Fetch all parties and filter by liked
      const response = await makeRequest("/parties", "GET");
      const allParties = Array.isArray(response) ? response : [];
      
      // Filter parties that are liked
      // Note: This assumes liked is a boolean on the party
      // If there's a user_likes table, we'd need a different endpoint
      const likedParties = allParties.filter(party => party.liked === true);
      
      return likedParties.map(party => {
        const attendeesInfo = parseAttendeesFromString(party.attendees || "0/0");
        const parsedDate = parseEventDate(party.date_iso || party.date);
        return {
          ...party,
          date: parsedDate ? parsedDate.toISOString() : (party.date_iso || party.date || new Date().toISOString()),
          attendees_count: attendeesInfo.current,
          max_attendees: attendeesInfo.max
        };
      });
    } catch (error) {
      console.error("Error fetching liked parties:", error);
      return [];
    }
  }

  static getMockLikedParties() {
    return [
      {
        id: 2,
        title: "Summer Vibes",
        attendees: "45/100",
        location: "Calle 15#45-12",
        date: "20/12/24 • 20:00-04:00",
        administrator: "DJ Summer",
        price: "$45.000",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop",
        tags: ["Summer", "Outdoor"],
        liked: true,
        category: "upcoming"
      },
      {
        id: 4,
        title: "Chicago Night",
        attendees: "23/96",
        location: "Calle 23#32-26",
        date: "5/9/21 • 23:00-06:00",
        administrator: "Loco Foroko",
        price: "$65.000",
        image: "https://images.unsplash.com/photo-1571266028243-d220b6b0b8c5?w=400&h=200&fit=crop",
        tags: ["Elegant", "Cocktailing"],
        liked: true,
        category: "hot-topic"
      }
    ];
  }

}

async function loadUpcomingForYou() {
  if (!memberDashboardController.isActive || memberDashboardController.isLoading) {
    console.log("Member dashboard no longer active or already loading, skipping data load");
    return;
  }

  memberDashboardController.isLoading = true;
  showUpcomingLoadingState();

  try {
    const userId = getCurrentUser()?.id;
    if (!userId) {
      console.warn("[loadUpcomingForYou] No current user found, skipping registered parties");
      renderUpcomingCarousel([]);
      return;
    }

    const allEvents = await MemberDataService.getUpcomingForYou(userId);
    
    if (!memberDashboardController.isActive) {
      console.log("Member dashboard no longer active, skipping render");
      return;
    }
    
    // Get 5 random parties
    const shuffled = [...allEvents].sort(() => 0.5 - Math.random());
    const randomEvents = shuffled.slice(0, 5);
    
    renderUpcomingCarousel(randomEvents);
  } catch (error) {
    console.error("Error loading upcoming for you:", error);
  } finally {
    memberDashboardController.isLoading = false;
  }
}

function showUpcomingLoadingState() {
  const carousel = document.getElementById("upcomingCarousel");
  const dots = document.getElementById("upcomingDots");
  
  if (carousel) {
    carousel.innerHTML = '<div class="loading-spinner">Cargando eventos para ti...</div>';
  }
  
  if (dots) {
    dots.innerHTML = '';
  }
}

function renderUpcomingCarousel(events) {
  const carousel = document.getElementById("upcomingCarousel");
  const carouselFooter = document.getElementById("upcomingCarouselFooter");
  const carouselDots = document.getElementById("upcomingCarouselDots");
  
  if (!carousel || !carouselFooter || !carouselDots) {
    console.warn("Upcoming carousel elements not found, skipping render");
    return;
  }
  
  if (!events || events.length === 0) {
    carousel.innerHTML = '<p>No hay eventos próximos</p>';
    carouselFooter.style.display = 'none';
    return;
  }

  // Map tags to icons
  const tagIcons = {
    "Elegant": "assets/edit.svg",
    "Cocktailing": "assets/partyIcon.svg",
    "Disco Music": "assets/partyIcon.svg",
    "Outdoor": "assets/partyIcon.svg"
  };
  
  const eventsHTML = events.map(event => {
    // Format date for display
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
    const formattedTime = eventDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Format attendees count
    const attendeesInfo = parseAttendeesFromString(event.attendees || "0/0");
    const attendeesCount = attendeesInfo.current;
    const maxAttendees = attendeesInfo.max;
    const attendeesDisplay = `${attendeesCount}/${maxAttendees}`;
    
    return `
      <div class="upcoming-card" data-party-id="${event.id}">
        <div class="event-image">
          <img src="${event.image_url || event.image || 'https://images.unsplash.com/photo-1571266028243-e68f952df624?w=400&h=300&fit=crop'}" alt="${event.title}" />
        </div>
        <div class="event-info">
          <h3 class="event-title">${event.title} ${attendeesDisplay}</h3>
          <div class="event-details">
            <div class="event-detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>${event.location}</span>
            </div>
            <div class="event-detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <span>${formattedDate} • ${formattedTime}</span>
            </div>
            <div class="event-detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="margin-left: 2px;">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>${event.organizer_name || event.administrator || 'Organizador'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  carousel.innerHTML = eventsHTML;
  
  // Setup carousel footer and scroll tracking
  setupUpcomingCarousel();
}


function setupUpcomingCarousel() {
  const carousel = document.getElementById("upcomingCarousel");
  const carouselFooter = document.getElementById("upcomingCarouselFooter");
  const carouselDots = document.getElementById("upcomingCarouselDots");
  
  if (!carousel || !carouselFooter || !carouselDots) return;
  
  const cards = carousel.querySelectorAll('.upcoming-card');
  const totalCards = cards.length;
  
  if (totalCards === 0) {
    carouselFooter.style.display = 'none';
    return;
  }
  
  carouselFooter.style.display = 'flex';
  
  // Create dots
  carouselDots.innerHTML = '';
  for (let i = 0; i < totalCards; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot';
    if (i === 0) {
      dot.classList.add('active');
    }
    carouselDots.appendChild(dot);
  }
  
  // Track scroll position
  let scrollTimeout;
  carousel.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cardWidth = cards[0]?.offsetWidth || 320;
      const scrollLeft = carousel.scrollLeft;
      const currentIndex = Math.round(scrollLeft / cardWidth);
      const clampedIndex = Math.min(Math.max(0, currentIndex), totalCards - 1);
      updateUpcomingCarouselDots(clampedIndex);
    }, 100);
  });
  
  // Initial calculation
  const cardWidth = cards[0]?.offsetWidth || 320;
  const scrollLeft = carousel.scrollLeft;
  const currentIndex = Math.round(scrollLeft / cardWidth);
  updateUpcomingCarouselDots(Math.min(Math.max(0, currentIndex), totalCards - 1));
}

function updateUpcomingCarouselDots(activeIndex) {
  const carouselDots = document.getElementById("upcomingCarouselDots");
  if (!carouselDots) return;
  
  const dots = carouselDots.querySelectorAll('.carousel-dot');
  dots.forEach((dot, index) => {
    if (index === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}


// Helper function to check if user has QR code for a party
async function checkUserHasQRCode(partyId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
      return false;
    }
    
    const qrResponse = await makeRequest(`/codes/qr-code/${currentUser.id}/${partyId}`, "GET");
    
    if (qrResponse && qrResponse.success && qrResponse.qr_code) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('No QR code found for party:', partyId);
    return false;
  }
}

// Helper function to get event details and navigate
async function navigateToPartyOrEvent(partyId) {
  try {
    // Check if user has QR code
    const hasQRCode = await checkUserHasQRCode(partyId);
    
    if (hasQRCode) {
      // User has QR code, navigate to party-details
      console.log('User has QR code, navigating to party details:', partyId);
      navigateTo(`/party-details/${partyId}`);
    } else {
      // User doesn't have QR code, navigate to event-details
      console.log('User has no QR code, navigating to event details:', partyId);
      try {
        const eventResponse = await makeRequest(`/parties/${partyId}`, "GET");
        const eventData = eventResponse?.party || eventResponse;
        navigateTo("/event-details", eventData);
      } catch (error) {
        console.error('Error fetching event details:', error);
        // Fallback: still navigate to event-details with just the ID
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

function setupActionButtons() {
  document.addEventListener('click', async (e) => {
    // Handle party card clicks
    if (e.target.closest('.upcoming-card') && !e.target.closest('.action-btn') && !e.target.closest('.upcoming-like-btn')) {
      const card = e.target.closest('.upcoming-card');
      const partyId = card.dataset.partyId;
      
      if (partyId) {
        await navigateToPartyOrEvent(partyId);
        return;
      }
    }
    
    // Handle favorite card clicks
    if (e.target.closest('.favorite-card') && !e.target.closest('.favorite-heart')) {
      const card = e.target.closest('.favorite-card');
      const partyId = card.dataset.partyId;
      
      if (partyId) {
        await navigateToPartyOrEvent(partyId);
        return;
      }
    }
    
    // Handle action button clicks
    if (e.target.closest('.action-btn')) {
      e.stopPropagation(); // Prevent card click
      
      const button = e.target.closest('.action-btn');
      const eventId = button.dataset.eventId;
      const action = button.classList.contains('going') ? 'going' : 
                    button.classList.contains('maybe') ? 'maybe' : 'not-going';
      
      // Remove active class from all buttons in the same card
      const card = button.closest('.upcoming-card');
      const allButtons = card.querySelectorAll('.action-btn');
      allButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      try {
        await makeRequest(`${CONFIG.API_ENDPOINTS.LIKE}/${eventId}/attendance`, "POST", {
          action: action
        });
        
      } catch (error) {
        console.error("Error updating attendance:", error);
      }
    }
  });
}

function setupAddPartyButton() {
  const addPartyBtn = document.getElementById("addPartyBtn");
  if (addPartyBtn) {
    addPartyBtn.addEventListener("click", () => {
      showAddPartyModal();
    });
  }
}

function setupBottomNavigation() {
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  
  navItems.forEach(item => {
    item.style.touchAction = "manipulation";
    item.addEventListener("click", () => {
      navItems.forEach(nav => nav.classList.remove("active"));
      
      item.classList.add("active");
      
      const target = item.dataset.nav;
      switch (target) {
        case "Parties":
-         navigateTo("/parties");
+         navigateTo("/parties");
          break;
        case "Home":
          break;
        case "Profile":
          navigateTo("/profile");
          break;
      }
    });
  });
}

function setupHeaderProfileButton() {
  const profileBtn = document.getElementById("headerProfileBtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      navigateTo("/profile");
    });
  }
}

// Modal functions
function showAddPartyModal() {
  const modalHTML = `
    <div id="addPartyModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Add Party</h2>
          <button class="modal-close" id="closeModalBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-instruction">Enter your code</p>
          <div class="input-container">
            <input 
              type="text" 
              id="partyCodeInput" 
              placeholder="Party's code" 
              maxlength="8"
              autocomplete="off"
            />
          </div>
          <button class="add-party-submit-btn" id="submitCodeBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
            </svg>
            Add Party
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Setup modal event listeners
  setupModalEventListeners();
  
  // Focus on input
  setTimeout(() => {
    const input = document.getElementById('partyCodeInput');
    if (input) input.focus();
  }, 100);
}

function setupModalEventListeners() {
  const modal = document.getElementById('addPartyModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const submitBtn = document.getElementById('submitCodeBtn');
  const input = document.getElementById('partyCodeInput');
  
  // Close modal events
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Submit code
  submitBtn.addEventListener('click', handleCodeSubmission);
  
  // Enter key to submit
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleCodeSubmission();
    }
  });
  
  // Format input (uppercase, alphanumeric only)
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
}

function closeModal() {
  const modal = document.getElementById('addPartyModal');
  if (modal) {
    modal.remove();
  }
}

async function handleCodeSubmission() {
  const input = document.getElementById('partyCodeInput');
  const submitBtn = document.getElementById('submitCodeBtn');
  const code = input.value.trim();
  
  if (!code) {
    showModalError('Please enter a code');
    return;
  }
  
  if (code.length < 4) {
    showModalError('Code must be at least 4 characters');
    return;
  }
  
  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="loading-spinner-small"></div>
    Verifying...
  `;
  
  try {
    const currentUser = getCurrentUser();
    
    // Verify code and get party info
    const response = await makeRequest('/codes/verify-and-add', 'POST', {
      code: code,
      user_id: currentUser?.id || null
    });
    
    if (response.success) {
      showModalSuccess('Party added successfully!');
      
      // Close modal after delay
      setTimeout(() => {
        closeModal();
        // Refresh the dashboard to show updated data
        loadUpcomingForYou();
      }, 1500);
    } else {
      showModalError(response.message || 'Invalid code');
      // Si falta login, sugerir iniciar sesión
      if ((response.message || '').toLowerCase().includes('user')) {
        setTimeout(() => navigateTo('/app1/welcome'), 1500);
      }
    }
    
  } catch (error) {
    console.error('Error verifying code:', error);
    showModalError(error.message || 'Error verifying code. Please try again.');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
      </svg>
      Add Party
    `;
  }
}

function showModalError(message) {
  const modalBody = document.querySelector('.modal-body');
  let errorDiv = modalBody.querySelector('.modal-error');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'modal-error';
    modalBody.appendChild(errorDiv);
  }
  
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  // Remove error after 3 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 3000);
}

function showModalSuccess(message) {
  const modalBody = document.querySelector('.modal-body');
  let successDiv = modalBody.querySelector('.modal-success');
  
  if (!successDiv) {
    successDiv = document.createElement('div');
    successDiv.className = 'modal-success';
    modalBody.appendChild(successDiv);
  }
  
  successDiv.textContent = message;
  successDiv.style.display = 'block';
  
  // Remove success message after 2 seconds
  setTimeout(() => {
    successDiv.style.display = 'none';
  }, 2000);
}

export function cleanupMemberDashboard() {
  memberDashboardController.isActive = false;
  memberDashboardController.isLoading = false;
  if (memberDashboardController.abortController) {
    memberDashboardController.abortController.abort();
  }
  
  // Clean up modal if it exists
  const modal = document.getElementById('addPartyModal');
  if (modal) {
    modal.remove();
  }
}

async function loadFavorites() {
  if (!memberDashboardController.isActive) {
    return;
  }

  try {
    const userId = getCurrentUser()?.id;
    if (!userId) {
      renderFavorites([]);
      return;
    }

    const likedParties = await MemberDataService.getLikedParties(userId);
    
    if (!memberDashboardController.isActive) {
      return;
    }
    
    renderFavorites(likedParties);
  } catch (error) {
    console.error("Error loading favorites:", error);
    renderFavorites([]);
  }
}

function renderFavorites(events) {
  const favoritesGrid = document.getElementById("favoritesGrid");
  const noFavorites = document.getElementById("noFavorites");
  
  if (!favoritesGrid || !noFavorites) {
    console.warn("Favorites elements not found, skipping render");
    return;
  }
  
  if (!events || events.length === 0) {
    favoritesGrid.style.display = "none";
    noFavorites.style.display = "block";
    return;
  }

  favoritesGrid.style.display = "flex";
  noFavorites.style.display = "none";
  
  const eventsHTML = events.map(event => {
    // Format date for display
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
    const formattedTime = eventDate.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const attendeesInfo = parseAttendeesFromString(event.attendees || "0/0");
    const attendeesCount = attendeesInfo.current;
    const maxAttendees = attendeesInfo.max;
    const attendeesDisplay = `${attendeesCount}/${maxAttendees}`;
    
    return `
      <div class="favorite-card" data-party-id="${event.id}">
        <div class="event-image">
          <img src="${event.image_url || event.image || 'https://images.unsplash.com/photo-1571266028243-e68f952df624?w=400&h=300&fit=crop'}" alt="${event.title}" />
          <div class="favorite-heart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>
        <div class="event-info">
          <h3 class="event-title">
            ${event.title}
            <span>${attendeesDisplay}</span>
          </h3>
          <div class="event-details">
            <div class="event-detail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>${event.location}</span>
            </div>
            <div class="event-detail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <span>${formattedDate} • ${formattedTime}</span>
            </div>
            <div class="event-detail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span>${event.organizer_name || event.administrator || 'Organizador'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  favoritesGrid.innerHTML = eventsHTML;
  
  // Setup carousel footer and scroll tracking
  setupFavoritesCarousel();
}

function setupFavoritesCarousel() {
  const favoritesGrid = document.getElementById("favoritesGrid");
  const carouselFooter = document.getElementById("favoritesCarouselFooter");
  const carouselDots = document.getElementById("favoritesCarouselDots");
  
  if (!favoritesGrid || !carouselFooter || !carouselDots) return;
  
  const cards = favoritesGrid.querySelectorAll('.favorite-card');
  const totalCards = cards.length;
  
  if (totalCards === 0) {
    carouselFooter.style.display = 'none';
    return;
  }
  
  carouselFooter.style.display = 'flex';
  
  // Create dots
  carouselDots.innerHTML = '';
  for (let i = 0; i < totalCards; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot';
    if (i === 0) {
      dot.classList.add('active');
    }
    carouselDots.appendChild(dot);
  }
  
  // Track scroll position
  let scrollTimeout;
  favoritesGrid.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cardWidth = cards[0]?.offsetWidth || 320;
      const scrollLeft = favoritesGrid.scrollLeft;
      const currentIndex = Math.round(scrollLeft / cardWidth);
      const clampedIndex = Math.min(Math.max(0, currentIndex), totalCards - 1);
      updateCarouselDots(clampedIndex);
    }, 100);
  });
  
  // Initial calculation
  const cardWidth = cards[0]?.offsetWidth || 320;
  const scrollLeft = favoritesGrid.scrollLeft;
  const currentIndex = Math.round(scrollLeft / cardWidth);
  updateCarouselDots(Math.min(Math.max(0, currentIndex), totalCards - 1));
}

function updateCarouselDots(activeIndex) {
  const carouselDots = document.getElementById("favoritesCarouselDots");
  if (!carouselDots) return;
  
  const dots = carouselDots.querySelectorAll('.carousel-dot');
  dots.forEach((dot, index) => {
    if (index === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

