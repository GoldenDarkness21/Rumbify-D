import { makeRequest, navigateTo, getCurrentUser } from "../app.js";

// Configuration for data source
const CONFIG = {
  USE_MOCK_DATA: false, 
  API_ENDPOINTS: {
    HOT_TOPIC: "/parties/hot-topic",
    UPCOMING: "/parties/upcoming",
    SEARCH: "/parties/search",
    LIKE: "/parties"
  }
};

let dashboardController = {
  isActive: false,
  abortController: null,
  isLoading: false
};

export default function renderDashboard() {
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || "User";
  
  dashboardController.isActive = true;
  if (dashboardController.abortController) {
    dashboardController.abortController.abort();
  }
  dashboardController.abortController = new AbortController();
  
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="dashboard">
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

      <!-- Search Section -->
      <div class="search-section">
        <div class="search-bar">
          <span class="search-icon">Buscar</span>
          <input type="text" placeholder="Search Party..." id="searchInput" />
        </div>

        <!-- Tags Row -->
        <div class="filter-bar tags" id="tagsBar">
          <!-- Tag pills will be injected dynamically on load -->
        </div>
      </div>

      <!-- Hot Topic Section -->
      <section class="hot-topic-section">
        <h2 class="section-title">Hot Topic</h2>
        <div class="hot-topic-carousel" id="hotTopicCarousel">
          <!-- Hot topic cards will be dynamically loaded here -->
        </div>
        <div class="carousel-dots" id="hotTopicDots">
          <!-- Dots will be dynamically generated -->
        </div>
      </section>

      <!-- Upcoming Section -->
      <section class="upcoming-section">
        <div class="section-header">
          <h2 class="section-title">Upcoming</h2>
        </div>
        <div class="upcoming-events" id="upcomingEvents">
          <!-- Upcoming event cards will be dynamically loaded here -->
        </div>
        <div class="carousel-dots" id="upcomingDots">
          <!-- Dots will be dynamically generated -->
        </div>
      </section>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav">
        <div class="nav-item active" data-nav="Parties">
          <span class="nav-icon icon-party"></span>
          <span>Parties</span>
        </div>
        <div class="nav-item" data-nav="Home">
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

  initializeDashboard();
}

function initializeDashboard() {
  // Load party data
  loadPartyData();
  
  setupSearch();
  setupFilters();
  
  setupCarousel();
  
  setupLikeButtons();
  
  setupEventDetailsNavigation();
  
  setupBottomNavigation();
  
  setupHeaderProfileButton();
}

// Data Service Layer
class PartyDataService {
  static async getHotTopicParties() {
    console.log("getHotTopicParties - USE_MOCK_DATA:", CONFIG.USE_MOCK_DATA);
    
    if (CONFIG.USE_MOCK_DATA) {
      console.log("Using mock data for hot topic parties");
      return this.getMockHotTopicParties();
    }
    
    try {
      console.log("Making API request to:", CONFIG.API_ENDPOINTS.HOT_TOPIC);
      const response = await makeRequest(CONFIG.API_ENDPOINTS.HOT_TOPIC, "GET");
      console.log("API response received:", response.length, "parties");
      return response;
    } catch (error) {
      console.error("Error fetching hot topic parties:", error);
      throw new Error("No se pudo conectar con la base de datos. Verifica que Supabase esté configurado correctamente.");
    }
  }

  static async getUpcomingParties() {
    console.log("getUpcomingParties - USE_MOCK_DATA:", CONFIG.USE_MOCK_DATA);
    
    if (CONFIG.USE_MOCK_DATA) {
      console.log("Using mock data for upcoming parties");
      return this.getMockUpcomingParties();
    }
    
    try {
      console.log("Making API request to:", CONFIG.API_ENDPOINTS.UPCOMING);
      const response = await makeRequest(CONFIG.API_ENDPOINTS.UPCOMING, "GET");
      console.log("API response received:", response.length, "parties");
      return response;
    } catch (error) {
      console.error("Error fetching upcoming parties:", error);
      throw new Error("No se pudo conectar con la base de datos. Verifica que Supabase esté configurado correctamente.");
    }
  }

  static async searchParties(query) {
    // Overloaded: can receive object or string
    if (typeof query === "object") {
      const { q = "", tags = [], category = "" } = query || {};
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (Array.isArray(tags) && tags.length) params.set("tags", tags.join(","));
        if (category) params.set("category", category);
        const response = await makeRequest(`${CONFIG.API_ENDPOINTS.SEARCH}?${params.toString()}`, "GET");
        return response;
      } catch (error) {
        console.error("Error searching parties with filters:", error);
        throw error;
      }
    }
    if (CONFIG.USE_MOCK_DATA) {
      return this.searchMockParties(query);
    }
    
    try {
      const response = await makeRequest(`${CONFIG.API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`, "GET");
      return response;
    } catch (error) {
      console.error("Error searching parties:", error);
      throw new Error("No se pudo realizar la búsqueda. Verifica que Supabase esté configurado correctamente.");
    }
  }

  static async toggleLike(partyId, liked) {
    if (CONFIG.USE_MOCK_DATA) {
      return { success: true, liked };
    }
    
    try {
      const response = await makeRequest(`${CONFIG.API_ENDPOINTS.LIKE}/${partyId}/like`, "PATCH", { liked });
      return response;
    } catch (error) {
      console.error("Error toggling like:", error);
      throw new Error("No se pudo actualizar el like. Verifica que Supabase esté configurado correctamente.");
    }
  }

  static async getEventDetails(eventId) {
    if (CONFIG.USE_MOCK_DATA) {
      return this.getMockEventDetails(eventId);
    }
    
    try {
      const response = await makeRequest(`${CONFIG.API_ENDPOINTS.LIKE}/${eventId}`, "GET");
      // Extract party from response structure { success: true, party: {...} }
      if (response && response.success && response.party) {
        return response.party;
      }
      // Fallback if response structure is different
      return response;
    } catch (error) {
      console.error("Error fetching event details:", error);
      throw new Error("No se pudo obtener los detalles del evento. Verifica que Supabase esté configurado correctamente.");
    }
  }

  // Mock data methods
  static getMockHotTopicParties() {
    return [
      {
        id: 1,
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
      },
      {
        id: 2,
        title: "Summer Vibes",
        attendees: "45/100",
        location: "Calle 15#45-12",
        date: "12/9/21 • 20:00-04:00",
        administrator: "DJ Summer",
        price: "$45.000",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop",
        tags: ["Summer", "Outdoor"],
        liked: false,
        category: "hot-topic"
      }
    ];
  }

  static getMockUpcomingParties() {
    return [
      {
        id: 3,
        title: "Pre-New Year Pa...",
        attendees: "67/150",
        location: "Cra 51#39-26",
        date: "22/11/21 • 21:30-05:00",
        administrator: "DJ KC",
        price: "$80.000",
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=150&fit=crop",
        tags: ["Disco Music", "Elegant"],
        liked: false,
        category: "upcoming"
      },
      {
        id: 4,
        title: "Neon Dreams",
        attendees: "89/120",
        location: "Calle 80#12-45",
        date: "15/9/21 • 22:00-05:00",
        administrator: "Neon DJ",
        price: "$55.000",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=150&fit=crop",
        tags: ["Electronic", "Neon"],
        liked: true,
        category: "upcoming"
      }
    ];
  }

  static searchMockParties(query) {
    const allParties = [...this.getMockHotTopicParties(), ...this.getMockUpcomingParties()];
    // Support string or object
    if (typeof query === "object") {
      const { q = "", tags = [], category = "" } = query || {};
      return allParties.filter(party => {
        const matchesText = !q || party.title.toLowerCase().includes(q.toLowerCase()) ||
          party.administrator.toLowerCase().includes(q.toLowerCase()) ||
          party.location.toLowerCase().includes(q.toLowerCase());
        const matchesCategory = !category || party.category === category;
        const matchesTags = !tags?.length || tags.every(t => party.tags?.includes(t));
        return matchesText && matchesCategory && matchesTags;
      });
    }
    const q = String(query || "");
    return allParties.filter(party => 
      party.title.toLowerCase().includes(q.toLowerCase()) ||
      party.administrator.toLowerCase().includes(q.toLowerCase()) ||
      party.location.toLowerCase().includes(q.toLowerCase())
    );
  }

  static getMockEventDetails(eventId) {
    // Mock data for event details
    const mockEvents = {
      1: {
        id: 1,
        title: "Chicago Night",
        attendees: "23/96",
        location: "Calle 23#32-26",
        date: "5/9/21 • 23:00-06:00",
        administrator: "Loco Foroko",
        price: "$65.000",
        image: "https://images.unsplash.com/photo-1571266028243-d220b6b0b8c5?w=400&h=300&fit=crop",
        tags: ["Elegant", "Cocktailing"],
        liked: true,
        category: "hot-topic",
        description: "Experience the best of Chicago nightlife with our exclusive party featuring top DJs and premium cocktails.",
        inclusions: ["Drink of courtesy", "After midnight kiss dinamic", "Premium sound system"],
        dressCode: ["Elegant attire", "Cocktail dresses", "Dress shoes"],
        openingHour: "21:30"
      },
      2: {
        id: 2,
        title: "Summer Vibes",
        attendees: "45/100",
        location: "Calle 15#45-12",
        date: "12/9/21 • 20:00-04:00",
        administrator: "DJ Summer",
        price: "$45.000",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop",
        tags: ["Summer", "Outdoor"],
        liked: false,
        category: "hot-topic",
        description: "Celebrate summer with our outdoor party featuring tropical vibes and refreshing drinks.",
        inclusions: ["Welcome drink", "Tropical decorations", "Outdoor seating"],
        dressCode: ["Summer casual", "Bright colors", "Comfortable shoes"],
        openingHour: "20:00"
      },
      3: {
        id: 3,
        title: "Pre-New Year Pa...",
        attendees: "67/150",
        location: "Cra 51#39-26",
        date: "22/11/21 • 21:30-05:00",
        administrator: "DJ KC",
        price: "$80.000",
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop",
        tags: ["Disco Music", "Elegant"],
        liked: false,
        category: "upcoming",
        description: "We do not need to be in the 31st of December to party as God intended.",
        inclusions: ["Drink of courtesy", "After midnight kiss dinamic", "New Year decorations"],
        dressCode: ["Neon Colors", "No formal attire required", "Comfortable dancing shoes"],
        openingHour: "21:30"
      },
      4: {
        id: 4,
        title: "Neon Dreams",
        attendees: "89/120",
        location: "Calle 80#12-45",
        date: "15/9/21 • 22:00-05:00",
        administrator: "Neon DJ",
        price: "$55.000",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
        tags: ["Electronic", "Neon"],
        liked: true,
        category: "upcoming",
        description: "Immerse yourself in a neon-lit electronic music experience like no other.",
        inclusions: ["Neon accessories", "Electronic music", "Light show"],
        dressCode: ["Neon colors", "Glow-in-the-dark items", "Comfortable shoes"],
        openingHour: "22:00"
      }
    };

    return mockEvents[eventId] || mockEvents[3]; // Default to Pre-New Year party
  }
}

async function loadPartyData() {
  if (!dashboardController.isActive || dashboardController.isLoading) {
    console.log("Dashboard no longer active or already loading, skipping data load");
    return;
  }

  dashboardController.isLoading = true;
  showLoadingState();

  try {
    const hotTopicEvents = await PartyDataService.getHotTopicParties();
    
    if (!dashboardController.isActive) {
      console.log("Dashboard no longer active, skipping hot topic render");
      return;
    }
    renderHotTopicEvents(hotTopicEvents);
    
    const upcomingEvents = await PartyDataService.getUpcomingParties();
    
    if (!dashboardController.isActive) {
      console.log("Dashboard no longer active, skipping upcoming render");
      return;
    }
    renderUpcomingEvents(upcomingEvents);
    
    hideLoadingState();
  } catch (error) {
    console.error("Error loading party data:", error);
    
    if (dashboardController.isActive) {
      hideLoadingState();
      showDatabaseError(error.message);
    }
  } finally {
    dashboardController.isLoading = false;
  }
}

function showDatabaseError(message) {
  if (!dashboardController.isActive) {
    return;
  }

  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div id="error-container" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      padding: 20px;
      text-align: center;
      background: #f5f5f5;
      color: #333;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 500px;
        width: 100%;
      ">
        <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #e74c3c;">Error de Conexión</h2>
        <p style="margin: 0 0 20px 0; line-height: 1.5; color: #666;">
          ${message || 'No se pudo conectar con la base de datos.'}
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">
          Verifica tu conexión a internet y que el servidor esté funcionando correctamente.
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="retryConnection()" style="
            background: #3498db;
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          ">
            Reintentar
          </button>
          <button onclick="navigateTo('/member-dashboard')" style="
            background: #95a5a6;
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          ">
            Ir a Inicio
          </button>
        </div>
      </div>
    </div>
  `;
}

window.retryConnection = function() {
  if (dashboardController.isActive) {
    loadPartyData();
  }
};

function showLoadingState() {
  const hotTopicCarousel = document.getElementById("hotTopicCarousel");
  const upcomingEvents = document.getElementById("upcomingEvents");
  
  if (hotTopicCarousel) {
    hotTopicCarousel.innerHTML = '<div class="loading-spinner">Cargando eventos...</div>';
  }
  
  if (upcomingEvents) {
    upcomingEvents.innerHTML = '<div class="loading-spinner">Cargando eventos próximos...</div>';
  }
}

function hideLoadingState() {
}

function renderHotTopicEvents(events) {
  const carousel = document.getElementById("hotTopicCarousel");
  const dots = document.getElementById("hotTopicDots");
  
  if (!carousel || !dots) {
    console.warn("Hot topic elements not found, skipping render");
    return;
  }
  
  if (!events || !Array.isArray(events)) {
    carousel.innerHTML = "";
    dots.innerHTML = "";
    return;
  }
  
  carousel.innerHTML = events.map(event => createHotTopicCard(event)).join("");
  dots.innerHTML = events.map((_, index) => 
    `<div class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`
  ).join("");
}

function renderUpcomingEvents(events) {
  const container = document.getElementById("upcomingEvents");
  const dots = document.getElementById("upcomingDots");
  
  if (!container) {
    console.warn("Element 'upcomingEvents' not found, skipping render");
    return;
  }
  
  if (!events || !Array.isArray(events)) {
    container.innerHTML = "";
    if (dots) dots.innerHTML = "";
    return;
  }
  
  container.innerHTML = events.map(event => createUpcomingCard(event)).join("");
  
  // Generate dots for carousel
  if (dots) {
    dots.innerHTML = events.map((_, index) => 
      `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`
    ).join("");
  }
  
  // Setup carousel functionality
  setupUpcomingCarousel();
}

function createHotTopicCard(event) {
  const displayPrice = event.price || (Array.isArray(event.prices) && event.prices.length ? event.prices[0].price : "");
  const isLiked = event.liked || false;
  const attendeesDisplay = event.attendees || `${event.attendees_count || 0}/${event.max_attendees || 0}`;
  
  // Map tags to icons (similar to member dashboard)
  const tagIcons = {
    "Elegant": "assets/edit.svg",
    "Cocktailing": "assets/partyIcon.svg",
    "Disco Music": "assets/partyIcon.svg"
  };
  
  return `
    <div class="hot-topic-card" data-party-id="${event.id}">
      <div class="hot-topic-image-container">
        <img src="${event.image}" alt="${event.title}" class="hot-topic-image" />
        <button class="hot-topic-like-btn ${isLiked ? 'liked' : ''}" data-event-id="${event.id}" aria-label="Like">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${isLiked ? '#22c55e' : 'none'}" stroke="white" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="hot-topic-details">
        <div class="hot-topic-header">
          <h3 class="hot-topic-title">${event.title}</h3>
          <span class="hot-topic-count">${attendeesDisplay}</span>
        </div>
        <div class="hot-topic-info-row">
          <div class="hot-topic-info">
            <div class="hot-topic-detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>${event.location}</span>
            </div>
            <div class="hot-topic-detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <span>${event.date}</span>
            </div>
            <div class="hot-topic-detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span>${event.administrator}</span>
            </div>
          </div>
          <div class="hot-topic-price">${displayPrice}</div>
        </div>
        <div class="hot-topic-footer">
          <div class="hot-topic-tags">
            ${(event.tags || []).slice(0, 2).map(tag => {
              const tagClass = tag.toLowerCase().includes('elegant') ? 'tag-elegant' : 
                              tag.toLowerCase().includes('cocktailing') ? 'tag-cocktailing' : 
                              'tag-default';
              return `
              <div class="hot-topic-tag ${tagClass}">
                <img src="${tagIcons[tag] || 'assets/partyIcon.svg'}" alt="${tag}" class="tag-icon" />
                <span>${tag}</span>
              </div>
            `;
            }).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function createUpcomingCard(event) {
  const displayPrice = event.price || (Array.isArray(event.prices) && event.prices.length ? event.prices[0].price : "");
  const isLiked = event.liked || false;
  const attendeesDisplay = event.attendees || `${event.attendees_count || 0}/${event.max_attendees || 0}`;
  
  // Map tags to icons
  const tagIcons = {
    "Elegant": "assets/edit.svg",
    "Cocktailing": "assets/partyIcon.svg",
    "Disco Music": "assets/partyIcon.svg",
    "Outdoor": "assets/partyIcon.svg"
  };
  
  // Get tags (limit to 2 for display)
  const eventTags = (event.tags || []).slice(0, 2);
  
  // Format date if needed
  let formattedDate = event.date;
  let formattedTime = "";
  if (event.date && event.date.includes('•')) {
    const parts = event.date.split('•');
    formattedDate = parts[0].trim();
    formattedTime = parts[1] ? parts[1].trim() : "";
  }
  
  return `
    <div class="upcoming-card" data-party-id="${event.id}">
      <div class="event-image">
        <img src="${event.image}" alt="${event.title}" />
        <button class="upcoming-like-btn ${isLiked ? 'liked' : ''}" data-event-id="${event.id}" aria-label="Like">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? '#22c55e' : 'none'}" stroke="white" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="event-info">
        <div class="event-title-row">
          <h3 class="event-title">${event.title}</h3>
          <span class="event-attendees">${attendeesDisplay}</span>
        </div>
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
            <span>${formattedDate}${formattedTime ? ' • ' + formattedTime : ''}</span>
          </div>
          <div class="event-detail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span>${event.administrator}</span>
          </div>
        </div>
        <div class="event-footer-row">
          <div class="event-price">${displayPrice}</div>
          <div class="event-tags">
            ${eventTags.map(tag => {
              const tagClass = tag.toLowerCase().includes('elegant') ? 'tag-elegant' : 
                              tag.toLowerCase().includes('cocktailing') || tag.toLowerCase().includes('disco') ? 'tag-cocktailing' : 
                              'tag-default';
              return `
              <div class="upcoming-tag ${tagClass}">
                <img src="${tagIcons[tag] || 'assets/partyIcon.svg'}" alt="${tag}" class="tag-icon" />
                <span>${tag}</span>
              </div>
            `;
            }).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  let selectedCategory = "";
  let selectedTags = [];
  let searchTimeout;
  
  const tagsBar = document.getElementById("tagsBar");
  
  // Show tags bar when search bar is clicked or focused
  const showTagsBar = () => {
    if (tagsBar) {
      tagsBar.classList.add("show");
    }
  };
  
  const hideTagsBar = () => {
    if (tagsBar) {
      tagsBar.classList.remove("show");
    }
  };
  
  searchInput.addEventListener("focus", showTagsBar);
  searchInput.addEventListener("click", showTagsBar);
  
  // Hide tags bar when search is cleared and user clicks outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !tagsBar?.contains(e.target)) {
      const searchTerm = searchInput.value.trim();
      if (searchTerm.length === 0 && !selectedCategory && selectedTags.length === 0) {
        hideTagsBar();
      }
    }
  });
  
  searchInput.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim();
    
    // Show/hide category bar based on search term
    showCategoryBarIfNeeded();
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    if (searchTerm.length === 0 && !selectedCategory && selectedTags.length === 0) {
      // If search is empty, reload all data
      loadPartyData();
      return;
    }
    
    // Debounce search to avoid too many API calls
    searchTimeout = setTimeout(async () => {
      try {
        if (!dashboardController.isActive) {
          return;
        }
        
        const searchResults = await PartyDataService.searchParties({ q: searchTerm, tags: selectedTags, category: selectedCategory });
        
        if (!dashboardController.isActive) {
          return;
        }
        
        displaySearchResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        
        if (dashboardController.isActive) {
          filterEventsLocally(searchTerm, selectedTags, selectedCategory);
        }
      }
    }, 300);
  });

  // Show tags bar when search has text or filters are active
  const showTagsBarIfNeeded = () => {
    if (selectedCategory || selectedTags.length > 0 || searchInput.value.trim().length > 0) {
      showTagsBar();
    }
  };

  setupSearch._setSelectedTags = (tags) => {
    selectedTags = tags;
    showTagsBarIfNeeded();
    triggerSearch();
  };
  
  setupSearch._showFilterBarsIfNeeded = showTagsBarIfNeeded;

  function triggerSearch() {
    const q = searchInput.value.trim();
    if (!q && !selectedCategory && selectedTags.length === 0) {
      loadPartyData();
      return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      try {
        const results = await PartyDataService.searchParties({ q, tags: selectedTags, category: selectedCategory });
        displaySearchResults(results);
      } catch (err) {
        console.error('Search with filters failed:', err);
        filterEventsLocally(q, selectedTags, selectedCategory);
      }
    }, 150);
  }
}

function displaySearchResults(results) {
  // Sort results by attendees count for hot topic (most attendees first)
  const sortedResults = results
    .map(party => {
      const attendeesStr = party.attendees || "0/0";
      const [current] = attendeesStr.split("/").map(n => parseInt(n, 10) || 0);
      return { ...party, attendees_count: current };
    })
    .sort((a, b) => b.attendees_count - a.attendees_count);
  
  // Separate results: hot topic (top attendees) and upcoming
  const hotTopicResults = sortedResults.filter(party => {
    // Show parties with most attendees as hot topic
    return sortedResults.indexOf(party) < Math.min(5, sortedResults.length);
  });
  const upcomingResults = results.filter(party => party.category === "upcoming");
  
  // Render filtered results
  renderHotTopicEvents(hotTopicResults);
  renderUpcomingEvents(upcomingResults);
}

function filterEventsLocally(searchTerm, tags = [], category = "") {
  // Fallback client-side filtering
  const hotTopicCards = document.querySelectorAll(".hot-topic-card");
  hotTopicCards.forEach(card => {
    const titleEl = card.querySelector(".hot-topic-title");
    const detailEls = card.querySelectorAll(".hot-topic-detail span");
    const tagEls = card.querySelectorAll('.hot-topic-tag span');
    
    if (!titleEl) return;
    
    const title = titleEl.textContent.toLowerCase();
    const location = detailEls[0]?.textContent.toLowerCase() || "";
    const administrator = detailEls[2]?.textContent.toLowerCase() || "";
    const tagTexts = Array.from(tagEls).map(t => t.textContent.trim());
    
    const matchesText = !searchTerm || 
      title.includes(searchTerm.toLowerCase()) ||
      location.includes(searchTerm.toLowerCase()) ||
      administrator.includes(searchTerm.toLowerCase());
    const matchesTags = !tags?.length || tags.every(t => tagTexts.includes(t));
    const matchesCategory = !category || category === "" || category === "upcoming";
    const matches = matchesText && matchesTags && matchesCategory;
    card.style.display = matches ? "block" : "none";
  });

  const upcomingCards = document.querySelectorAll(".upcoming-card");
  upcomingCards.forEach(card => {
    const title = card.querySelector(".event-title").textContent.toLowerCase();
    const location = card.querySelector(".detail-item span").textContent.toLowerCase();
    const administrator = card.querySelectorAll(".detail-item span")[2].textContent.toLowerCase();
    const tagTexts = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent.trim());
    
    const matchesText = !searchTerm || title.includes(searchTerm) || location.includes(searchTerm) || administrator.includes(searchTerm);
    const matchesTags = !tags?.length || tags.every(t => tagTexts.includes(t));
    const matches = matchesText && matchesTags && (!category || category === 'upcoming');
    card.style.display = matches ? "block" : "none";
  });
}

function setupCarousel() {
  const carousel = document.getElementById("hotTopicCarousel");
  if (!carousel) return;
  
  const dots = document.querySelectorAll(".dot");
  let currentIndex = 0;
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  // Setup dot navigation
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentIndex = index;
      updateCarousel();
    });
  });

  function updateCarousel() {
    if (!carousel || dots.length === 0) return;
    const cardWidth = carousel.querySelector(".hot-topic-card")?.offsetWidth || carousel.offsetWidth;
    carousel.scrollTo({
      left: currentIndex * cardWidth,
      behavior: 'smooth'
    });
    
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  }

  // Touch/Mouse drag support
  // Mouse events
  carousel.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
    carousel.style.cursor = 'grabbing';
    carousel.style.scrollBehavior = 'auto';
  });

  carousel.addEventListener('mouseleave', () => {
    isDragging = false;
    carousel.style.cursor = 'grab';
    carousel.style.scrollBehavior = 'smooth';
  });

  carousel.addEventListener('mouseup', () => {
    isDragging = false;
    carousel.style.cursor = 'grab';
    carousel.style.scrollBehavior = 'smooth';
    updateCurrentIndex();
  });

  carousel.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 2;
    carousel.scrollLeft = scrollLeft - walk;
  });

  // Touch events
  let touchStartX = 0;
  let touchScrollLeft = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].pageX - carousel.offsetLeft;
    touchScrollLeft = carousel.scrollLeft;
  });

  carousel.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX - carousel.offsetLeft;
    const walk = (x - touchStartX) * 2;
    carousel.scrollLeft = touchScrollLeft - walk;
  });

  carousel.addEventListener('touchend', () => {
    updateCurrentIndex();
  });

  // Scroll event to update index
  carousel.addEventListener('scroll', () => {
    updateCurrentIndex();
  });

  function updateCurrentIndex() {
    if (!carousel) return;
    const cardWidth = carousel.querySelector(".hot-topic-card")?.offsetWidth || carousel.offsetWidth;
    const newIndex = Math.round(carousel.scrollLeft / cardWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < dots.length) {
      currentIndex = newIndex;
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentIndex);
      });
    }
  }

  carousel.style.cursor = 'grab';

  // Auto-advance carousel (only if not dragging)
  setInterval(() => {
    if (!isDragging && carousel) {
      currentIndex = (currentIndex + 1) % dots.length;
      updateCarousel();
    }
  }, 5000);
}

function setupUpcomingCarousel() {
  const carousel = document.getElementById("upcomingEvents");
  if (!carousel) return;
  
  const dots = document.querySelectorAll("#upcomingDots .carousel-dot");
  if (dots.length === 0) return;
  
  let currentIndex = 0;
  
  // Setup dot navigation
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentIndex = index;
      updateCarousel();
    });
  });

  function updateCarousel() {
    if (!carousel || dots.length === 0) return;
    const cardWidth = carousel.querySelector(".upcoming-card")?.offsetWidth || 280;
    carousel.scrollTo({
      left: currentIndex * cardWidth,
      behavior: 'smooth'
    });
    
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  }

  // Scroll event to update index
  carousel.addEventListener('scroll', () => {
    updateCurrentIndex();
  });

  function updateCurrentIndex() {
    if (!carousel) return;
    const cardWidth = carousel.querySelector(".upcoming-card")?.offsetWidth || 280;
    const newIndex = Math.round(carousel.scrollLeft / cardWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < dots.length) {
      currentIndex = newIndex;
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentIndex);
      });
    }
  }
}

function setupLikeButtons() {
  // Use event delegation for dynamically added like buttons
  document.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.like-btn') || e.target.closest('.hot-topic-like-btn') || e.target.closest('.upcoming-like-btn');
    if (likeBtn) {
      const eventId = likeBtn.dataset.eventId;
      const isLiked = likeBtn.classList.contains('liked');
      
      try {
        const response = await PartyDataService.toggleLike(eventId, !isLiked);
        
        if (response.success) {
          likeBtn.classList.toggle('liked', !isLiked);
          // Update the heart icon fill color
          const heartSvg = likeBtn.querySelector('svg');
          if (heartSvg) {
            heartSvg.setAttribute('fill', !isLiked ? '#22c55e' : 'none');
          }
        }
      } catch (error) {
        console.error('Error toggling like:', error);
        // Still toggle the visual state for better UX
        likeBtn.classList.toggle('liked', !isLiked);
        const heartSvg = likeBtn.querySelector('svg');
        if (heartSvg) {
          heartSvg.setAttribute('fill', !isLiked ? '#22c55e' : 'none');
        }
      }
    }
  });
}

function setupEventDetailsNavigation() {
  // Use event delegation for dynamically added elements
  document.addEventListener('click', async (e) => {
    if (!dashboardController.isActive) {
      return;
    }

    const hotTopicCard = e.target.closest('.hot-topic-card');
    if (hotTopicCard && !e.target.closest('.hot-topic-like-btn')) {
      const partyId = hotTopicCard.dataset.partyId;
      if (partyId) {
        e.preventDefault();
        await navigateToPartyOrEvent(partyId);
        return;
      }
    }
    
    const upcomingCard = e.target.closest('.upcoming-card');
    if (upcomingCard && !e.target.closest('.upcoming-like-btn')) {
      const partyId = upcomingCard.dataset.partyId;
      if (partyId) {
        e.preventDefault();
        await navigateToPartyOrEvent(partyId);
      }
    }
  });
}

function setupBottomNavigation() {
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  
  navItems.forEach(item => {
    // Mejor respuesta táctil en móviles
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
          navigateTo("/member-dashboard");
          break;
        case "Profile":
          navigateTo("/profile");
          break;
      }
    });
  });
}

function setupHeaderProfileButton() {
  const headerProfileBtn = document.getElementById('headerProfileBtn');
  if (headerProfileBtn) {
    headerProfileBtn.style.cursor = 'pointer';
    headerProfileBtn.addEventListener('click', () => {
      navigateTo("/profile");
    });
  }
}

function setupFilters() {
  const tagsBar = document.getElementById('tagsBar');
  const DEFAULT_TAGS = [
    "Disco Music", "Elegant", "Cocktailing", "Electronic", "Neon", "Summer", "Outdoor", "House", "Techno"
  ];
  tagsBar.innerHTML = DEFAULT_TAGS.map(t => `<button class="filter-pill" data-tag="${t}">${t}</button>`).join("");

  const activeTags = new Set();

  tagsBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    const tag = pill.dataset.tag;
    if (pill.classList.contains('active')) {
      pill.classList.remove('active');
      activeTags.delete(tag);
    } else {
      pill.classList.add('active');
      activeTags.add(tag);
    }
    if (typeof setupSearch._setSelectedTags === 'function') {
      setupSearch._setSelectedTags(Array.from(activeTags));
    }
    
    // Show filter bars when tags are selected
    if (typeof setupSearch._showFilterBarsIfNeeded === 'function') {
      setupSearch._showFilterBarsIfNeeded();
    }
  });
}

export function cleanupDashboard() {
  dashboardController.isActive = false;
  dashboardController.isLoading = false;
  if (dashboardController.abortController) {
    dashboardController.abortController.abort();
  }
}

async function checkUserHasQRCode(partyId) {
  const currentUser = getCurrentUser();
  if (!currentUser?.id) {
    return false;
  }
  
  try {
    const qrResponse = await makeRequest(`/codes/qr-code/${currentUser.id}/${partyId}`, "GET");
    return Boolean(qrResponse?.success && qrResponse.qr_code);
  } catch (error) {
    console.error('[checkUserHasQRCode] Failed to verify QR code:', error);
    return false;
  }
}

async function navigateToPartyOrEvent(partyId) {
  try {
    const hasQRCode = await checkUserHasQRCode(partyId);
    if (hasQRCode) {
      navigateTo(`/party-details/${partyId}`);
      return;
    }
    
    try {
      const eventResponse = await makeRequest(`/parties/${partyId}`, "GET");
      const eventData = eventResponse?.party || eventResponse;
      navigateTo("/event-details", eventData);
    } catch (error) {
      console.error('[navigateToPartyOrEvent] Error fetching event details, falling back to mock:', error);
      const mockEvent = PartyDataService.getMockEventDetails(Number(partyId));
      navigateTo("/event-details", mockEvent || { id: partyId });
    }
  } catch (error) {
    console.error('[navigateToPartyOrEvent] Unexpected error:', error);
    const fallbackEvent = PartyDataService.getMockEventDetails(Number(partyId)) || { id: partyId };
    navigateTo("/event-details", fallbackEvent);
  }
}
