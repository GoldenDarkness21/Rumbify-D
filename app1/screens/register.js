import { navigateTo, setLoggedInUser, makeRequest } from "../app.js";

export default function renderRegister(data = {}) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="register-screen">
      <div class="register-content">
        <!-- Logo Section -->
        <div class="logo-section">
          <div class="logo-container">
            <!-- Replaceable Logo -->
            <img src="assets/Llogowhite.png" alt="Rumbify Logo" class="register-logo" />
          </div>
        </div>

        <!-- Register Form -->
        <div class="register-form">
          <h1 class="register-title">Register</h1>
          <p class="register-subtitle">Access the most anticipated events.</p>
          
          <form class="form-container">
            <div class="input-group">
              <input 
                type="text" 
                id="name-input" 
                class="form-input" 
                placeholder="Enter Full Name"
                required
              />
            </div>
            
            <div class="input-group">
              <input 
                type="email" 
                id="email-input" 
                class="form-input" 
                placeholder="Enter Email"
                required
              />
            </div>
            
            <div class="input-group">
              <input 
                type="password" 
                id="password-input" 
                class="form-input" 
                placeholder="Enter Password"
                required
              />
            </div>
            
            <div class="input-group">
              <input 
                type="password" 
                id="repeat-password-input" 
                class="form-input" 
                placeholder="Repeat password"
                required
              />
            </div>
            
            <button type="submit" class="register-btn">
              Sign Up
            </button>
          </form>
        </div>

        <!-- Back to Login Link -->
        <div class="login-section">
          <p class="login-text">
            Already have an account? 
            <a href="#" class="login-link">Log In</a>
          </p>
        </div>

        <!-- Back Button -->
        <div class="back-section">
          <button class="back-btn">
            ← Back to Welcome
          </button>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  const registerForm = document.querySelector('.form-container');
  const loginLink = document.querySelector('.login-link');
  const backBtn = document.querySelector('.back-btn');

  registerForm.addEventListener('submit', handleRegister);
  loginLink.addEventListener('click', handleBackToLogin);
  backBtn.addEventListener('click', handleBackToWelcome);

  function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name-input').value;
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const repeatPassword = document.getElementById('repeat-password-input').value;
    const userType = "member"; // Automatically set as member for app1
    
    // Validate passwords match
    if (password !== repeatPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    // Validate required fields
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('Please fill in all fields!');
      return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.register-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    // Call backend API with user type
    makeRequest('/users', 'POST', { name, email, password, userType })
      .then(response => {
        if (response.success) {
          // Set logged in user and redirect to dashboard
          setLoggedInUser(response.user);
          navigateTo("/parties", { userType, email });
        } else {
          alert(response.message || 'Registration failed. Please try again.');
        }
      })
      .catch(error => {
        console.error('Registration error:', error);
        alert('Registration failed. Please check your connection and try again.');
      })
      .finally(() => {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  }

  function handleBackToLogin(e) {
    e.preventDefault();
    navigateTo("/login");
  }

  function handleBackToWelcome(e) {
    e.preventDefault();
    navigateTo("/welcome");
  }
}
