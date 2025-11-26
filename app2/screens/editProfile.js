import { makeRequest, navigateTo } from "../app.js";

export default function renderEditProfile() {
  // Get current admin user data
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="edit-profile-screen">
      <div class="edit-profile-header">
        <button class="back-btn" id="backBtn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="edit-profile-title">Edit Profile</h1>
        <button class="save-btn" id="saveBtn">Save</button>
      </div>

      <!-- Profile Picture Section -->
      <div class="profile-picture-edit-section">
        <div class="profile-picture-container">
          <img src="${adminUser?.profile_image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'}" alt="Profile" class="profile-picture" id="profilePicture" />
          <button class="camera-btn" id="changePictureBtn">
            <img src="/assets/edit.svg" alt="Edit" class="camera-icon" />
          </button>
        </div>
        <p class="profile-picture-hint">Tap to change profile picture</p>
      </div>

      <!-- Form Section -->
      <div class="edit-profile-form">
        <div class="form-group">
          <label for="nameInput" class="form-label">Full Name</label>
          <input 
            type="text" 
            id="nameInput" 
            class="form-input" 
            value="${adminUser?.name || ''}" 
            placeholder="Enter your full name"
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label for="emailInput" class="form-label">Email</label>
          <input 
            type="email" 
            id="emailInput" 
            class="form-input" 
            value="${adminUser?.email || ''}" 
            placeholder="Enter your email"
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label for="phoneInput" class="form-label">Phone Number</label>
          <input 
            type="tel" 
            id="phoneInput" 
            class="form-input" 
            value="${adminUser?.phone || ''}" 
            placeholder="Enter your phone number"
            maxlength="20"
          />
        </div>

        <div class="form-group">
          <label for="bioInput" class="form-label">Bio (Optional)</label> 
          <textarea 
            id="bioInput" 
            class="form-textarea" 
            placeholder="Tell us about yourself..."
            maxlength="200"
            rows="3"
          >${adminUser?.bio || ''}</textarea>
          <div class="char-count" id="bioCharCount">0/200</div>
        </div>

        <!-- Password Change Section -->
        <div class="form-group">
          <label class="form-label">Change Password</label>
          <div class="password-change-container">
            <div class="password-input-group">
              <input 
                type="password" 
                id="currentPasswordInput" 
                class="form-input" 
                placeholder="Current Password"
                maxlength="100"
              />
            </div>
            <div class="password-input-group">
              <input 
                type="password" 
                id="newPasswordInput" 
                class="form-input" 
                placeholder="New Password"
                maxlength="100"
              />
            </div>
            <div class="password-input-group">
              <input 
                type="password" 
                id="confirmPasswordInput" 
                class="form-input" 
                placeholder="Confirm New Password"
                maxlength="100"
              />
            </div>
            <div class="password-requirements">
              <small>Password must be at least 8 characters long and contain at least one letter and one number.</small>
            </div>
          </div>
        </div>

        <!-- Interests Section -->
        <div class="form-group">
          <label class="form-label">Interests</label>
          <div class="interests-edit-container">
            <div class="selected-interests" id="selectedInterests">
              <!-- Selected interests will be displayed here -->
            </div>
            <div class="available-interests" id="availableInterests">
              <!-- Available interests will be displayed here -->
            </div>
          </div>
        </div>

        <!-- Privacy Settings -->
        <div class="form-group">
          <label class="form-label">Privacy Settings</label>
          <div class="privacy-options">
            <div class="privacy-option">
              <span class="privacy-label">Show profile to other users</span>
              <label class="toggle-switch">
                <input type="checkbox" id="profileVisibility" ${adminUser?.profile_visible !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="privacy-option">
              <span class="privacy-label">Show attendance history</span>
              <label class="toggle-switch">
                <input type="checkbox" id="attendanceVisibility" ${adminUser?.attendance_visible !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Account Section -->
      <div class="danger-zone">
        <h3 class="danger-zone-title">Danger Zone</h3>
        <button class="delete-account-btn" id="deleteAccountBtn">
          Delete Account
        </button>
        <p class="danger-zone-warning">This action cannot be undone</p>
      </div>
    </div>
  `;

  // Initialize edit profile functionality
  initializeEditProfile();
}

async function initializeEditProfile() {
  // Load current user data
  await loadCurrentUserData();
  
  // Setup event listeners
  setupEditProfileEventListeners();
  
  // Setup form validation
  setupFormValidation();
  
  // Load interests
  loadInterests();
}

async function loadCurrentUserData() {
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  
  if (adminUser && Object.keys(adminUser).length > 0) {
    // Populate form with current admin user data
    document.getElementById("nameInput").value = adminUser.name || "";
    document.getElementById("emailInput").value = adminUser.email || "";
    document.getElementById("phoneInput").value = adminUser.phone || "";
    document.getElementById("bioInput").value = adminUser.bio || "";
    
    // Update character count for bio
    updateBioCharCount();
    
    // Load interests
    if (adminUser.interests && Array.isArray(adminUser.interests)) {
      loadSelectedInterests(adminUser.interests);
    }
  }
}

function loadInterests() {
  // Available interests that users can select from
  const availableInterests = [
    "Disco Music", "Elegant", "Cocktailing", "House Music", "Techno", 
    "Jazz", "Rock", "Pop", "Electronic", "Classical", "Hip Hop", 
    "R&B", "Reggae", "Country", "Blues", "Folk", "Indie", "Alternative"
  ];

  const availableContainer = document.getElementById("availableInterests");
  availableContainer.innerHTML = availableInterests.map(interest => `
    <div class="interest-chip" data-interest="${interest}">
      <span>${interest}</span>
    </div>
  `).join("");

  // Add click listeners to interest chips
  availableContainer.querySelectorAll(".interest-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      toggleInterest(chip.dataset.interest);
    });
  });
}

function loadSelectedInterests(interests) {
  const selectedContainer = document.getElementById("selectedInterests");
  selectedContainer.innerHTML = interests.map(interest => `
    <div class="selected-interest-chip" data-interest="${interest}">
      <span>${interest}</span>
      <button class="remove-interest-btn" data-interest="${interest}">ÁE/button>
    </div>
  `).join("");

  // Add click listeners to remove buttons
  selectedContainer.querySelectorAll(".remove-interest-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleInterest(btn.dataset.interest);
    });
  });
}

function toggleInterest(interest) {
  const selectedContainer = document.getElementById("selectedInterests");
  const availableContainer = document.getElementById("availableInterests");
  
  // Check if interest is already selected
  const isSelected = selectedContainer.querySelector(`[data-interest="${interest}"]`);
  
  if (isSelected) {
    // Remove from selected
    isSelected.remove();
    
    // Add back to available
    const availableChip = availableContainer.querySelector(`[data-interest="${interest}"]`);
    if (availableChip) {
      availableChip.style.display = "block";
    }
  } else {
    // Add to selected (limit to 5 interests)
    const selectedCount = selectedContainer.children.length;
    if (selectedCount >= 5) {
      alert("You can select up to 5 interests");
      return;
    }
    
    // Remove from available
    const availableChip = availableContainer.querySelector(`[data-interest="${interest}"]`);
    if (availableChip) {
      availableChip.style.display = "none";
    }
    
    // Add to selected
    const selectedChip = document.createElement("div");
    selectedChip.className = "selected-interest-chip";
    selectedChip.dataset.interest = interest;
    selectedChip.innerHTML = `
      <span>${interest}</span>
      <button class="remove-interest-btn" data-interest="${interest}">ÁE/button>
    `;
    
    // Add click listener to remove button
    selectedChip.querySelector(".remove-interest-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleInterest(interest);
    });
    
    selectedContainer.appendChild(selectedChip);
  }
}

function setupEditProfileEventListeners() {
  // Back button
  document.getElementById("backBtn").addEventListener("click", () => {
    navigateTo("/profile");
  });

  // Save button
  document.getElementById("saveBtn").addEventListener("click", handleSaveProfile);

  // Change profile picture button
  document.getElementById("changePictureBtn").addEventListener("click", handleChangeProfilePicture);

  // Delete account button
  document.getElementById("deleteAccountBtn").addEventListener("click", handleDeleteAccount);

  // Bio character count
  document.getElementById("bioInput").addEventListener("input", updateBioCharCount);
}

function setupFormValidation() {
  const nameInput = document.getElementById("nameInput");
  const emailInput = document.getElementById("emailInput");
  const phoneInput = document.getElementById("phoneInput");
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  
  // Real-time validation
  nameInput.addEventListener("input", validateName);
  emailInput.addEventListener("input", validateEmail);
  phoneInput.addEventListener("input", validatePhone);
  currentPasswordInput.addEventListener("input", validateCurrentPassword);
  newPasswordInput.addEventListener("input", validatePassword);
  confirmPasswordInput.addEventListener("input", validatePassword);
}

function validateName() {
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();
  
  if (name.length < 2) {
    nameInput.classList.add("error");
    return false;
  } else {
    nameInput.classList.remove("error");
    return true;
  }
}

function validateEmail() {
  const emailInput = document.getElementById("emailInput");
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    emailInput.classList.add("error");
    return false;
  } else {
    emailInput.classList.remove("error");
    return true;
  }
}

function validatePhone() {
  const phoneInput = document.getElementById("phoneInput");
  const phone = phoneInput.value.trim();
  
  // Basic phone validation (at least 10 digits)
  const phoneRegex = /^\d{10,}$/;
  if (phone.length > 0 && !phoneRegex.test(phone.replace(/\D/g, ''))) {
    phoneInput.classList.add("error");
    return false;
  } else {
    phoneInput.classList.remove("error");
    return true;
  }
}

function validatePassword() {
  const newPasswordInput = document.getElementById("newPasswordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Check if password fields are filled
  const isNewPasswordFilled = newPassword.length > 0;
  const isConfirmPasswordFilled = confirmPassword.length > 0;
  
  // If no password fields are filled, it's valid (optional change)
  if (!isNewPasswordFilled && !isConfirmPasswordFilled) {
    newPasswordInput.classList.remove("error");
    confirmPasswordInput.classList.remove("error");
    return true;
  }
  
  // If only one field is filled, it's invalid
  if (isNewPasswordFilled !== isConfirmPasswordFilled) {
    newPasswordInput.classList.add("error");
    confirmPasswordInput.classList.add("error");
    return false;
  }
  
  // Check password strength
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    newPasswordInput.classList.add("error");
    return false;
  }
  
  // Check if passwords match
  if (newPassword !== confirmPassword) {
    confirmPasswordInput.classList.add("error");
    return false;
  }
  
  // All validations passed
  newPasswordInput.classList.remove("error");
  confirmPasswordInput.classList.remove("error");
  return true;
}

function validateCurrentPassword() {
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  
  // If no new password is provided, current password is not required
  if (newPassword.length === 0) {
    currentPasswordInput.classList.remove("error");
    return true;
  }
  
  // If new password is provided, current password is required
  if (currentPassword.length === 0) {
    currentPasswordInput.classList.add("error");
    return false;
  }
  
  currentPasswordInput.classList.remove("error");
  return true;
}

function updateBioCharCount() {
  const bioInput = document.getElementById("bioInput");
  const charCount = document.getElementById("bioCharCount");
  const count = bioInput.value.length;
  
  charCount.textContent = `${count}/200`;
  
  if (count > 200) {
    charCount.classList.add("over-limit");
  } else {
    charCount.classList.remove("over-limit");
  }
}

async function handleSaveProfile() {
  const saveBtn = document.getElementById("saveBtn");
  const originalText = saveBtn.textContent;
  
  try {
    // Show loading state
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;
    
    // Validate form
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isPasswordValid = validatePassword();
    const isCurrentPasswordValid = validateCurrentPassword();
    
    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isCurrentPasswordValid) {
      alert("Please fix the errors in the form before saving");
      return;
    }
    
    // Get form data
    const name = document.getElementById("nameInput").value.trim();
    const email = document.getElementById("emailInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const bio = document.getElementById("bioInput").value.trim();
    const profileVisible = document.getElementById("profileVisibility").checked;
    const attendanceVisible = document.getElementById("attendanceVisibility").checked;
    const currentPassword = document.getElementById("currentPasswordInput").value;
    const newPassword = document.getElementById("newPasswordInput").value;
    
    // Get selected interests
    const selectedInterests = Array.from(document.querySelectorAll(".selected-interest-chip"))
      .map(chip => chip.dataset.interest);
    
    // Prepare update data
    const updateData = {
      name,
      email,
      phone,
      bio,
      interests: selectedInterests,
      profile_visible: profileVisible,
      attendance_visible: attendanceVisible
    };
    
    // Add password data if provided
    if (newPassword.length > 0) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }
    
    // Get current admin user
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    if (!adminUser || Object.keys(adminUser).length === 0) {
      alert("User not found. Please log in again.");
      navigateTo("/admin-login");
      return;
    }
    
    // Update user profile via API
    try {
      const response = await makeRequest(`/users/${adminUser.id}`, "PUT", updateData);
      
      if (response.success) {
        // Trust server response and avoid local-only persistence
        const serverUser = response.user || adminUser;
        localStorage.setItem('adminUser', JSON.stringify(serverUser));
        
        alert("Profile updated successfully!");
        navigateTo("/profile");
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (apiError) {
      console.error("API error:", apiError);
      const msg = apiError?.message || "Failed to update user profile";
      alert(`Server update failed: ${msg}`);
      // Do not save locally; keep user on Edit Profile to correct issues
    }
    
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Failed to save profile. Please try again.");
  } finally {
    // Reset button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

function handleChangeProfilePicture() {
  // Create file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }
      
      // Show loading state
      const profilePicture = document.getElementById("profilePicture");
      const originalSrc = profilePicture.src;
      profilePicture.style.opacity = "0.5";
      
      try {
        // Create preview first
        const reader = new FileReader();
        reader.onload = (e) => {
          profilePicture.src = e.target.result;
          profilePicture.style.opacity = "1";
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        await uploadProfileImage(file);
        
      } catch (error) {
        console.error("Error uploading image:", error);
        // Revert to original image on error
        profilePicture.src = originalSrc;
        profilePicture.style.opacity = "1";
        alert("Failed to upload image. Please try again.");
      }
    }
  });
  
  // Trigger file selection
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

async function uploadProfileImage(file) {
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  if (!adminUser || Object.keys(adminUser).length === 0) {
    throw new Error("User not found");
  }
  
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('profile_image', file);
  
  // Upload image to server with admin email in header
  const response = await fetch(`/users/${adminUser.id}/admin/profile-image`, {
    method: 'POST',
    headers: {
      'x-admin-email': adminUser.email
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload image');
  }
  
  const result = await response.json();
  
  if (result.success) {
    // Update local storage with new profile image
    const updatedUser = { ...adminUser, profile_image: result.profile_image };
    localStorage.setItem('adminUser', JSON.stringify(updatedUser));
    
    // Update the profile picture in the UI
    const profilePicture = document.getElementById("profilePicture");
    profilePicture.src = result.profile_image;
    
    console.log("Profile image updated successfully");
  } else {
    throw new Error(result.message || 'Failed to update profile image');
  }
}

async function handleDeleteAccount() {
  // First confirmation
  const confirmed = confirm(
    "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y todos tus datos serán eliminados permanentemente."
  );
  
  if (!confirmed) return;
  
  // Second confirmation
  const doubleConfirmed = confirm(
    "Esta es tu advertencia final. Tu cuenta y todos los datos asociados serán eliminados permanentemente. ¿Estás absolutamente seguro?"
  );
  
  if (!doubleConfirmed) return;
  
  // Ask for password confirmation
  const password = prompt(
    "Para confirmar la eliminación de tu cuenta, por favor ingresa tu contraseña:"
  );
  
  if (!password) {
    alert("La contraseña es requerida para eliminar la cuenta.");
    return;
  }
  
  // Final confirmation
  const finalConfirmed = confirm(
    "ÚLTIMA CONFIRMACIÓN: Tu cuenta y todas las fiestas que hayas creado serán eliminadas permanentemente. ¿Estás seguro de que quieres continuar?"
  );
  
  if (!finalConfirmed) return;
  
  try {
    // Get current admin user
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    if (!adminUser || Object.keys(adminUser).length === 0) {
      alert("Error: No se encontró información de usuario. Por favor, inicia sesión nuevamente.");
      return;
    }
    
    // Show loading state
    const deleteBtn = document.getElementById("deleteAccountBtn");
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = "Eliminando cuenta...";
    deleteBtn.disabled = true;
    
    // Call API to delete account
    const response = await fetch(`/users/${adminUser.id}/admin/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminUser.email
      },
      body: JSON.stringify({ password })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Clear all authentication data
      localStorage.removeItem('adminUser');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('isLoggedIn');
      
      // Show success message
      alert("Tu cuenta ha sido eliminada exitosamente. Serás redirigido al inicio de sesión.");
      
      // Force redirect to admin login page
      window.location.href = '/admin-login';
    } else {
      throw new Error(result.message || 'Error al eliminar la cuenta');
    }
    
  } catch (error) {
    console.error("Error deleting account:", error);
    alert(`Error al eliminar la cuenta: ${error.message}`);
    
    // Reset button state
    const deleteBtn = document.getElementById("deleteAccountBtn");
    deleteBtn.textContent = "Delete Account";
    deleteBtn.disabled = false;
  }
}
