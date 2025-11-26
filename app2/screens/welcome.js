import { navigateTo } from "../app.js";
import { authManager } from "../auth.js";

export default function renderWelcome(data = {}) {
  // Si ya está autenticado como admin, redirigir a my-parties
  if (authManager.isAuthenticated() && authManager.isUserAdmin()) {
    window.location.href = '/my-parties';
    return;
  }

  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="welcome-screen">
      <div class="welcome-content">
        <div class="logo-container">
          <img src="/assets/Llogowhite.png" alt="Rumbify Logo" class="logo-image" />
        </div>
        
        <div class="button-container">
          <button id="admin-btn" class="role-button admin-button">
            Administrator
          </button>
        </div>

        <p class="welcome-subtitle">Access as administrator to manage your events</p>
      </div>
    </div>
  `;

  // Add event listener for admin button
  const adminBtn = document.getElementById("admin-btn");
  adminBtn.addEventListener("click", () => {
    navigateTo("/admin-login");
  });
}
