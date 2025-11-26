import { makeRequest, navigateTo } from "../app.js";

// Configuration for data source
const CONFIG = {
  USE_MOCK_DATA: false, // Fetch from database
  API_ENDPOINTS: {
    EVENT_DETAILS: "/parties",
    PARTY_DESCRIPTION: "/parties"
  }
};

const FALLBACK_ORGANIZER_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='24' r='16' fill='%23C4B5FD'/><path d='M8 60c0-13.255 10.745-24 24-24s24 10.745 24 24' fill='%23A78BFA'/></svg>";

export default function renderEventDetails(eventData) {
  const app = document.getElementById("app");
  if (app) {
    app.classList.add("full-bleed");
  }

  function renderPriceListHTML(evt) {
    const pricesList = Array.isArray(evt?.prices) && evt.prices.length
      ? evt.prices
      : (evt?.price ? [{ price_name: "Ticket", price: evt.price }] : []);
    if (!pricesList.length) return `<div class="price-item"><span class="price-name">No tickets</span></div>`;
    return pricesList.map(p => `
      <div class="price-item">
        <span class="price-name">${p.price_name}</span>
        <span class="price-amount">${p.price}</span>
      </div>
    `).join("");
  }

  app.innerHTML = `
    <div id="event-details">
      <!-- Event Header -->
      <header class="event-header">
        <button class="back-btn" id="backBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="event-title-header">Party Details</h1>
        <span class="attendees-count">${eventData.attendees}</span>
      </header>

      <!-- Event Overview -->
      <div class="event-overview">
        <h2 class="main-event-title">${eventData.title}</h2>
        
        <div class="organizer-info">
          <div class="organizer-avatar">
            <img src="${FALLBACK_ORGANIZER_IMAGE}" alt="Organizer" id="organizerImage" />
          </div>
          <div class="organizer-details">
            <div class="organizer-name">${eventData.administrator || 'Organizer'}</div>
            <div class="organizer-phone" id="organizerPhone">${eventData.number ? `+57 ${eventData.number}` : 'Contact TBA'}</div>
          </div>
        </div>

        <div class="event-tags">
          ${(eventData.tags && Array.isArray(eventData.tags) ? eventData.tags : []).map((tag, index) => `
            <div class="event-tag">
              ${index === 0 ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'}
              ${tag}
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Event Image -->
      <div class="event-image-section">
        <div class="event-image">
          <img src="${eventData.image}" alt="${eventData.title}" />
        </div>
      </div>

      <!-- Tickets and Location -->
      <div class="price-location">
        <div class="prices-list">
          ${renderPriceListHTML(eventData)}
        </div>
        <div class="location-info">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>${eventData.location || 'Location TBA'}</span>
        </div>
        <p class="event-description" id="eventDescription">${eventData.description || 'Loading description...'}</p>
      </div>

      <!-- Address Section -->
      <div class="address-section">
        <h3 class="section-title">Address</h3>
        <div class="address-info">
          <div class="address-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span id="eventAddress">${eventData.location || 'Location TBA'}</span>
          </div>
          <div class="map-container">
            <div class="map-placeholder" id="eventMapPlaceholder">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <p>Map View</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Opening Hours -->
      <div class="opening-hours">
        <h3 class="opening-title">Opening Hour</h3>
        <div class="time-display">
          <div class="time-box">
            <span class="time-number">9</span>
            <span class="time-label">Hour</span>
          </div>
          <span class="time-separator">:</span>
          <div class="time-box">
            <span class="time-number">30</span>
            <span class="time-label">Minute</span>
          </div>
          <div class="time-box">
            <span class="time-number">PM</span>
          </div>
        </div>
      </div>

      <!-- Calendar -->
      <div class="calendar-section">
        <div class="calendar">
          <div class="calendar-header">
            <h3>November 2021</h3>
          </div>
          <div class="calendar-grid">
            <div class="calendar-weekdays">
              <div class="weekday">S</div>
              <div class="weekday">M</div>
              <div class="weekday">T</div>
              <div class="weekday">W</div>
              <div class="weekday">T</div>
              <div class="weekday">F</div>
              <div class="weekday">S</div>
            </div>
            <div class="calendar-days" id="calendarDays">
              <!-- Calendar days will be generated dynamically -->
            </div>
          </div>
        </div>
      </div>

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

  // Initialize event details functionality
  initializeEventDetails(eventData);
}

async function initializeEventDetails(eventData) {
  // Setup back button
  setupBackButton();
  
  // Update organizer phone if available (already set in render, but ensure it's correct)
  if (eventData && eventData.number) {
    const phoneElement = document.getElementById('organizerPhone');
    if (phoneElement) {
      phoneElement.textContent = `+57 ${eventData.number}`;
    }
  }
  
  // Load additional party data from database (descriptions, inclusions, dress code)
  if (eventData && eventData.id) {
    await loadAdditionalPartyData(eventData.id);
  }
  
  // Setup calendar with actual party date
  setupCalendar(eventData?.date);
  
  // Setup opening hour display
  updateOpeningHour(eventData);
  
  // Load Google Maps
  if (eventData && eventData.location) {
    loadGoogleMap(eventData.location);
  }
  
  // Setup bottom navigation
  setupBottomNavigation();
}

async function loadAdditionalPartyData(partyId) {
  try {
    // Fetch party description
    const descriptionResponse = await makeRequest(`/parties/${partyId}/description`, "GET");
    
    if (descriptionResponse && descriptionResponse.success) {
      // Update description
      const descriptionElement = document.getElementById('eventDescription');
      if (descriptionElement && descriptionResponse.description) {
        descriptionElement.textContent = descriptionResponse.description;
      }
    }

    // Fetch full party details to resolve organizer image
    const partyResponse = await makeRequest(`/parties/${partyId}`, "GET");
    if (partyResponse && partyResponse.success && partyResponse.party) {
      const organizerImgEl = document.getElementById('organizerImage');
      if (organizerImgEl) {
        const resolvedUrl = partyResponse.party.administrator_image;
        if (resolvedUrl) {
          organizerImgEl.src = resolvedUrl;
          organizerImgEl.onerror = () => { organizerImgEl.src = FALLBACK_ORGANIZER_IMAGE; };
        } else {
          organizerImgEl.src = FALLBACK_ORGANIZER_IMAGE;
        }
      }
    }
  } catch (error) {
    console.error("Error loading additional party data:", error);
    // Keep default/mocked content if API call fails
  }
}

function updateOpeningHour(eventData) {
  if (!eventData || !eventData.date) return;
  
  try {
    // Parse date string like "22/11/21 • 21:30-05:00" or extract hour
    const dateStr = eventData.date;
    const hourMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
    
    if (hourMatch) {
      const hours = parseInt(hourMatch[1], 10);
      const minutes = parseInt(hourMatch[2], 10);
      const isPM = hours >= 12;
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      
      const hourBox = document.querySelector('.time-box:first-of-type .time-number');
      const minuteBox = document.querySelector('.time-box:nth-of-type(2) .time-number');
      const periodBox = document.querySelector('.time-box:last-of-type .time-number');
      
      if (hourBox) hourBox.textContent = displayHours.toString();
      if (minuteBox) minuteBox.textContent = minutes.toString().padStart(2, '0');
      if (periodBox) periodBox.textContent = isPM ? 'PM' : 'AM';
    }
  } catch (error) {
    console.error("Error parsing opening hour:", error);
  }
}

function setupBackButton() {
  const backBtn = document.getElementById("backBtn");
  backBtn.addEventListener("click", () => {
    navigateTo("/parties");
  });
}

function loadGoogleMap(address) {
  const mapContainer = document.getElementById("eventMapPlaceholder");
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

function setupCalendar(partyDate) {
  const calendarDays = document.getElementById("calendarDays");
  const calendarHeader = document.querySelector('.calendar-header h3');
  
  let eventDate = null;
  let eventDay = null;
  let monthYear = "November 2021";
  
  // Try to parse party date
  if (partyDate) {
    try {
      // Parse date string like "22/11/21 • 21:30-05:00"
      const dateMatch = partyDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);
        const fullYear = year < 100 ? 2000 + year : year;
        
        eventDate = new Date(fullYear, month - 1, day);
        eventDay = day;
        
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        monthYear = `${monthNames[month - 1]} ${fullYear}`;
      }
    } catch (error) {
      console.error("Error parsing party date:", error);
    }
  }
  
  if (calendarHeader) {
    calendarHeader.textContent = monthYear;
  }
  
  if (!eventDate) {
    // Fallback: use current month
    eventDate = new Date();
    monthYear = eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (calendarHeader) {
      calendarHeader.textContent = monthYear;
    }
  }
  
  // Get first day of month and number of days
  const firstDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
  const lastDay = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const days = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push('<div class="calendar-day empty"></div>');
  }
  
  // Add days 1 to last day of month
  for (let day = 1; day <= daysInMonth; day++) {
    const isEventDay = day === eventDay;
    days.push(`
      <div class="calendar-day ${isEventDay ? 'event-day' : ''}">
        ${day}
      </div>
    `);
  }
  
  calendarDays.innerHTML = days.join("");
}

function setupBottomNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove("active"));
      
      // Add active class to clicked item
      item.classList.add("active");
      
      // Handle navigation
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

// Data Service for Event Details
class EventDetailsService {
  static async getEventDetails(eventId) {
    if (CONFIG.USE_MOCK_DATA) {
      return this.getMockEventDetails(eventId);
    }
    
    try {
      const response = await makeRequest(`${CONFIG.API_ENDPOINTS.EVENT_DETAILS}/${eventId}`, "GET");
      // Extract party from response structure { success: true, party: {...} }
      if (response && response.success && response.party) {
        return response.party;
      }
      // Fallback if response structure is different
      return response;
    } catch (error) {
      console.error("Error fetching event details:", error);
      return this.getMockEventDetails(eventId);
    }
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
        prices: [
          { price_name: "Normal Ticket", price: "$65.000" },
          { price_name: "VIP", price: "$90.000" }
        ],
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
        prices: [
          { price_name: "General", price: "$45.000" },
          { price_name: "Premium", price: "$65.000" }
        ],
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
        prices: [
          { price_name: "Normal", price: "$80.000" },
          { price_name: "VIP", price: "$120.000" }
        ],
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
        prices: [
          { price_name: "General", price: "$55.000" },
          { price_name: "Front Row", price: "$70.000" }
        ],
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

// Export the service for use in other components
export { EventDetailsService };
