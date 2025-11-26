import { navigateTo, setLoggedInUser, makeRequest } from "../app.js";

export default function renderLogin(data = {}) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="login-screen">
      <div class="login-content">
        <!-- Logo Section -->
        <div class="logo-section">
          <div class="logo-container">
            <!-- Replaceable Logo -->
            <img src="/assets/Llogowhite.png" alt="Rumbify Logo" class="login-logo" />
          </div>
        </div>

        <!-- Login Form -->
        <div class="login-form">
          <h1 class="login-title">Log in</h1>
          <p class="login-subtitle">Access the most anticipated events.</p>
          
          <form class="form-container">
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
            
            <div class="forgot-password">
              <a href="#" class="forgot-link">Forgot Password?</a>
            </div>
            
            <button type="submit" class="login-btn">
              Sign In
            </button>
          </form>
        </div>

        <!-- Sign Up Link -->
        <div class="signup-section">
          <p class="signup-text">
            Don't have an account? 
            <a href="#" class="signup-link">Sign Up</a>
          </p>
        </div>

        <!-- Back Button -->
        <div class="back-section">
          <button class="back-btn">
            ↁEBack to Welcome
          </button>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  const loginForm = document.querySelector('.form-container');
  const forgotLink = document.querySelector('.forgot-link');
  const signupLink = document.querySelector('.signup-link');
  const backBtn = document.querySelector('.back-btn');

  loginForm.addEventListener('submit', handleLogin);
  forgotLink.addEventListener('click', handleForgotPassword);
  signupLink.addEventListener('click', handleSignUp);
  backBtn.addEventListener('click', handleBackToWelcome);

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    
    // Validate required fields
    if (!email.trim() || !password.trim()) {
      alert('Please fill in all fields!');
      return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.login-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing In...';
    submitBtn.disabled = true;
    
    // Call backend API
    makeRequest('/users/login', 'POST', { email, password })
      .then(response => {
        if (response.success) {
          // Set logged in user and redirect to dashboard
          setLoggedInUser(response.user);
          navigateTo("/parties", { userType: "member", email });
        } else {
          alert(response.message || 'Login failed. Please check your credentials.');
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        alert('Login failed. Please check your connection and try again.');
      })
      .finally(() => {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  }

  function handleForgotPassword(e) {
    e.preventDefault();
    // TODO: Implement forgot password logic
    console.log('Forgot password clicked');
  }

  function handleSignUp(e) {
    e.preventDefault();
    navigateTo("/register");
  }

  function handleBackToWelcome(e) {
    e.preventDefault();
    navigateTo("/welcome");
  }
}
