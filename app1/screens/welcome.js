import { navigateTo, isUserLoggedIn } from "../app.js";

export default function renderWelcome() {
  // Check if user is already logged in
  if (isUserLoggedIn()) {
    navigateTo("/member-dashboard");
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
          <button id="member-btn" class="role-button member-button">
            Member
          </button>
          <button id="admin-btn" class="role-button admin-button">
            Administrator
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("member-btn").addEventListener("click", () => {
    navigateTo("/login", { userType: "member" });
  });

  document.getElementById("admin-btn").addEventListener("click", () => {
    // Redirect to app2 for admin login
    window.location.href = '/app2/admin-login';
  });
}
