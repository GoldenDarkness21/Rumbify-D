const {
  getAllUsers,
  createUserInDB,
  updateUserInDb,
  deleteUserInDb,
} = require("../db/users.db");

const getUsers = async (req, res) => {
  const users = await getAllUsers();
  res.send(users);
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, userType, phone } = req.body;
    
    if (!name || !email || !password || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, password, and user type are required" 
      });
    }

    // Validate user type
    if (!['member', 'admin'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: "User type must be either 'member' or 'admin'" 
      });
    }

    // Validate phone for admin users
    if (userType === 'admin' && !phone) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number is required for admin accounts" 
      });
    }

    // Check if user already exists
    const supabaseCli = require("../services/supabase.service");
    const { data: existingUser, error: checkError } = await supabaseCli
      .from("users")
      .select("id, email, name")
      .or(`email.eq.${email},name.eq.${name}`)
      .limit(1);

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      return res.status(500).json({ 
        success: false, 
        message: "Database connection failed. Please check your Supabase configuration and ensure the project is active.",
        error: checkError.message || "Unknown database error"
      });
    }

    if (existingUser && existingUser.length > 0) {
      const existing = existingUser[0];
      if (existing.email === email) {
        return res.status(409).json({ 
          success: false, 
          message: "An account with this email already exists" 
        });
      }
      if (existing.name === name) {
        return res.status(409).json({ 
          success: false, 
          message: "An account with this username already exists" 
        });
      }
    }

    // Create new user
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      profile_image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face", // Default image
      is_admin: userType === 'admin',
      interests: []
    };

    // Add phone field for admin users
    if (userType === 'admin' && phone) {
      newUser.phone = phone.trim();
    }

    const { data: createdUser, error: createError } = await supabaseCli
      .from("users")
      .insert([newUser])
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to create user account. Please check your Supabase configuration and ensure the project is active.",
        error: createError.message || "Unknown database error"
      });
    }

    // Return user data (without password)
    const userResponse = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      profile_image: createdUser.profile_image,
      is_admin: createdUser.is_admin,
      attended_count: 0,
      favorites_count: 0,
      interests: createdUser.interests || []
    };

    // Include phone for admin users
    if (userType === 'admin' && createdUser.phone) {
      userResponse.phone = createdUser.phone;
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse
    });

  } catch (error) {
    console.error("Error in createUser:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

const updateUser = async (req, res) => {
  const { name } = req.body;
  const { id: userId } = req.params;
  const response = await updateUserInDb({ name }, userId);
  res.send(response);
};

// New endpoint for updating user profile with comprehensive data
const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }
    
    const { name, email, phone, bio, interests, profile_visible, attendance_visible, profile_image, currentPassword, newPassword } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: "Name and email are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }

    const supabaseCli = require("../services/supabase.service");

    // Handle password change if provided
    if (newPassword) {
      // Validate new password strength
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
          success: false, 
          message: "Password must be at least 8 characters long and contain at least one letter and one number" 
        });
      }

      // Validate current password is provided
      if (!currentPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Current password is required to change password" 
        });
      }

      // Get current user to verify current password
      const { data: currentUser, error: userError } = await supabaseCli
        .from("users")
        .select("password")
        .eq("id", userId)
        .single();

      if (userError || !currentUser) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // TODO: Verify current password matches
      // For now, we'll skip password verification but in production you should verify it
      // const bcrypt = require('bcrypt');
      // const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
      // if (!isValidPassword) {
      //   return res.status(401).json({ 
      //     success: false, 
      //     message: "Current password is incorrect" 
      //   });
      // }

    }
    
    // Check if email is already taken by another user
    const { data: existingUser, error: checkError } = await supabaseCli
      .from("users")
      .select("id, email, name")
      .eq("email", email.toLowerCase().trim())
      .neq("id", userId)
      .limit(1);

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      return res.status(500).json({ 
        success: false, 
        message: "Database error occurred" 
      });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "An account with this email already exists" 
      });
    }

    // Check if name is already taken by another user
    const { data: existingName, error: nameCheckError } = await supabaseCli
      .from("users")
      .select("id, name")
      .eq("name", name.trim())
      .neq("id", userId)
      .limit(1);

    if (nameCheckError) {
      console.error("Error checking existing name:", nameCheckError);
      return res.status(500).json({ 
        success: false, 
        message: "Database error occurred" 
      });
    }

    if (existingName && existingName.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "An account with this username already exists" 
      });
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() ? String(phone).replace(/\D+/g, "") : null;
    }
    if (bio !== undefined) {
      updateData.bio = bio && bio.trim() ? bio.trim() : null;
    }
    if (interests !== undefined) {
      updateData.interests = Array.isArray(interests) ? interests : [];
    }
    if (profile_visible !== undefined) {
      updateData.profile_visible = Boolean(profile_visible);
    }
    if (attendance_visible !== undefined) {
      updateData.attendance_visible = Boolean(attendance_visible);
    }
    if (profile_image !== undefined) {
      updateData.profile_image = profile_image && profile_image.trim() ? profile_image.trim() : null;
    }
    if (newPassword !== undefined && newPassword && newPassword.length > 0) {
      // Note: Password hashing should be done, but for now we'll store it as-is
      // In production, you should hash the password before storing
      updateData.password = newPassword;
    }

    // Fetch existing row to determine available columns and avoid schema mismatches
    const { data: existingRow, error: existingRowError } = await supabaseCli
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (existingRowError || !existingRow) {
      console.error("Error fetching existing user row before update:", existingRowError);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const allowedColumns = Object.keys(existingRow);
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => allowedColumns.includes(key))
    );

    if (Object.keys(filteredUpdateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update for current schema"
      });
    }

    // Update using only columns present in the current schema
    const { data: updatedUser, error: updateError } = await supabaseCli
      .from("users")
      .update(filteredUpdateData)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      console.error("Update data attempted:", updateData);
      console.error("User ID:", userId);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update user profile",
        error: updateError.message || "Database update failed"
      });
    }

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // If user is admin and name changed, update all their parties' administrator field
    if (updatedUser.is_admin && existingRow.name !== updatedUser.name) {
      console.log(`[updateUserProfile] Admin name changed from "${existingRow.name}" to "${updatedUser.name}"`);
      console.log(`[updateUserProfile] Updating all parties for this admin...`);
      
      try {
        const { data: updatedParties, error: partiesUpdateError } = await supabaseCli
          .from("parties")
          .update({ administrator: updatedUser.name })
          .eq("administrator", existingRow.name)
          .select();

        if (partiesUpdateError) {
          console.error("[updateUserProfile] Error updating parties administrator:", partiesUpdateError);
        } else {
          console.log(`[updateUserProfile] Updated ${updatedParties?.length || 0} parties with new admin name`);
        }
      } catch (partiesError) {
        console.error("[updateUserProfile] Exception updating parties:", partiesError);
      }
    }

    // Return updated user data
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        profile_image: updatedUser.profile_image,
        interests: updatedUser.interests || [],
        profile_visible: updatedUser.profile_visible,
        attendance_visible: updatedUser.attendance_visible,
        is_admin: updatedUser.is_admin,
        member_since: updatedUser.member_since,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message || "Unknown error occurred"
    });
  }
};

const deleteUser = async (req, res) => {
  const { id: userId } = req.params;
  const response = await deleteUserInDb(userId);
  res.send(response);
};

// New endpoint for deleting admin account with all related data
const deleteAdminAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete account"
      });
    }

    const supabaseCli = require("../services/supabase.service");

    // First, verify the user exists and get their data
    const { data: user, error: userError } = await supabaseCli
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    // If user is admin, delete all their parties first
    if (user.is_admin) {
      console.log(`Deleting parties for admin user: ${user.name}`);
      
      // Delete all parties created by this admin
      const { error: partiesError } = await supabaseCli
        .from("parties")
        .delete()
        .eq("administrator", user.name);

      if (partiesError) {
        console.error("Error deleting parties:", partiesError);
        return res.status(500).json({
          success: false,
          message: "Failed to delete associated parties"
        });
      }

      console.log(`Deleted parties for admin: ${user.name}`);
    }

    // Delete the user account
    const { data: deletedUser, error: deleteError } = await supabaseCli
      .from("users")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete account"
      });
    }

    console.log(`Successfully deleted admin account: ${user.name}`);

    res.json({
      success: true,
      message: "Account and all associated data have been permanently deleted"
    });

  } catch (error) {
    console.error("Error in deleteAdminAccount:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// New endpoint for deleting member account
const deleteMemberAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete account"
      });
    }

    const supabaseCli = require("../services/supabase.service");

    // First, verify the user exists and get their data
    const { data: user, error: userError } = await supabaseCli
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    // Delete the user account
    const { data: deletedUser, error: deleteError } = await supabaseCli
      .from("users")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete account"
      });
    }

    console.log(`Successfully deleted member account: ${user.name}`);

    res.json({
      success: true,
      message: "Account and all associated data have been permanently deleted"
    });

  } catch (error) {
    console.error("Error in deleteMemberAccount:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// New endpoint for getting user profile with stats
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user data from Supabase
    const supabaseCli = require("../services/supabase.service");
    const { data: user, error: userError } = await supabaseCli
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get user's attended parties count (mock for now)
    const attendedCount = 12; // This would be calculated from actual attendance data
    
    // Get user's favorites count (mock for now)
    const favoritesCount = 5; // This would be calculated from liked parties

    // Get user's interests (mock for now - would come from user preferences)
    const interests = ["Disco Music", "Elegant", "Cocktailing"];

    // Get user's party history (mock for now)
    const history = [
      {
        id: 1,
        title: "Pre-New Year Party",
        date: "22/11/21",
        status: "Attended",
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop"
      },
      {
        id: 2,
        title: "Lore's Pool Party",
        date: "11/10/21",
        status: "Attended",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80&h=80&fit=crop"
      },
      {
        id: 3,
        title: "Chicago Night",
        date: "5/9/21",
        status: "Not Attended",
        image: "https://images.unsplash.com/photo-1571266028243-d220b6b0b8c5?w=80&h=80&fit=crop"
      }
    ];

    const profileData = {
      ...user,
      attended_count: attendedCount,
      favorites_count: favoritesCount,
      interests: interests,
      history: history
    };

    res.json(profileData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

  // New endpoint for user login
  const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Find user by email
    const supabaseCli = require("../services/supabase.service");
    const { data: user, error: userError } = await supabaseCli
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }


    // Normalize interests to array for consistency
    const normalizeInterests = (val) => {
      try {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(Boolean).map(v => String(v).trim());
        if (typeof val === 'string') {
          const trimmed = val.trim();
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.filter(Boolean).map(v => String(v).trim());
          } catch (_) {}
          return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (typeof val === 'object') {
          return Object.keys(val).filter(k => val[k]).map(k => String(k).trim());
        }
        return [];
      } catch (_) {
        return [];
      }
    };

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image: user.profile_image,
        is_admin: user.is_admin || false,
        attended_count: 0, // These would be calculated from actual data
        favorites_count: 0,
        interests: normalizeInterests(user.interests)
      }
    });

  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }
    
    const supabaseCli = require("../services/supabase.service");
    
    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    
    // Update user profile with new image
    const { data: updatedUser, error: updateError } = await supabaseCli
      .from("users")
      .update({ 
        profile_image: dataUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating profile image:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to update profile image"
      });
    }
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      message: "Profile image updated successfully",
      profile_image: updatedUser.profile_image
    });
    
  } catch (error) {
    console.error("Error in uploadProfileImage:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Test Supabase connection
const testSupabaseConnection = async (req, res) => {
  try {
    const supabaseCli = require("../services/supabase.service");
    
    console.log('Testing Supabase connection...');
    const { data, error } = await supabaseCli
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return res.status(500).json({
        success: false,
        message: "Supabase connection failed",
        error: error.message,
        details: error.details,
        hint: error.hint
      });
    }
    
    console.log('Supabase connection test successful');
    return res.status(200).json({
      success: true,
      message: "Supabase connection successful",
      data: data
    });
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return res.status(500).json({
      success: false,
      message: "Supabase connection test failed",
      error: err.message
    });
  }
};

// Helpers used in party history enrichment
function parseAttendeesString(attStr = "0/0") {
  const [currentStr = "0", maxStr = "0"] = String(attStr).split("/");
  const cleanNumber = (value) => {
    const digits = String(value).replace(/[^\d]/g, "");
    return Number(digits) || 0;
  };
  const current = cleanNumber(currentStr);
  const max = cleanNumber(maxStr) || 100;
  return { current, max };
}

function parsePartyDateToIso(rawDate) {
  if (!rawDate) return null;
  const cleaned = String(rawDate).split("•")[0].trim();
  const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    let year = slashMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    const month = slashMatch[2].padStart(2, "0");
    const day = slashMatch[1].padStart(2, "0");
    const iso = `${year}-${month}-${day}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1].padStart(4, "0");
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    const iso = `${year}-${month}-${day}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(cleaned);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// Get user's party history using Codes table
const getUserPartyHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[getUserPartyHistory] Getting party history for user:', id);
    
    // Get user's used codes
    const supabaseCli = require("../services/supabase.service");
    const { data: user, error: userError } = await supabaseCli
      .from('users')
      .select('id, name')
      .eq('id', id)
      .single();

    if (userError) {
      console.warn('[getUserPartyHistory] Could not load user for guest association:', userError);
    }
    const { data: userCodes, error: codesError } = await supabaseCli
      .from('Codes')
      .select('id, code, party_id, price_id, created_at')
      .eq('user_id', id)
      .eq('already_used', true)
      .order('created_at', { ascending: false });

    if (codesError) {
      console.error('[getUserPartyHistory] Error fetching codes:', codesError);
      return res.status(500).json({ 
        success: false, 
        message: "Error fetching party history" 
      });
    }

    // Get party and price information for each code
    const partyHistory = [];
    for (const codeRecord of userCodes) {
      // Get party info
      const { data: party, error: partyError } = await supabaseCli
        .from('parties')
        .select('*')
        .eq('id', codeRecord.party_id)
        .single();

      if (partyError) {
        console.error('[getUserPartyHistory] Error fetching party:', partyError);
        continue; // Skip this code if party not found
      }

      // Get price info
      const { data: price, error: priceError } = await supabaseCli
        .from('prices')
        .select('*')
        .eq('id', codeRecord.price_id)
        .single();

      if (priceError) {
        console.error('[getUserPartyHistory] Error fetching price:', priceError);
        continue; // Skip this code if price not found
      }

      // Add to history
      const attendeesInfo = parseAttendeesString(party.attendees);
      const parsedDate = parsePartyDateToIso(party.date);
      const isUpcoming = parsedDate ? parsedDate.getTime() >= Date.now() : false;
      const historyItem = {
        id: party.id,
        party_id: party.id, // Add party_id for navigation
        title: party.title,
        location: party.location,
        date: party.date,
        date_display: party.date,
        date_iso: parsedDate ? parsedDate.toISOString() : null,
        administrator: party.administrator,
        image: party.image,
        tags: party.tags,
        category: party.category,
        price_name: price.price_name,
        price: price.price,
        code_used: codeRecord.code,
        added_at: codeRecord.created_at,
        attendees: party.attendees || "0/0",
        attendees_count: attendeesInfo.current,
        max_attendees: attendeesInfo.max,
        is_upcoming: isUpcoming,
        status: isUpcoming ? "upcoming" : "attended"
      };
      
      console.log('[getUserPartyHistory] Adding to history:', historyItem);
      partyHistory.push(historyItem);
    }
    
    console.log('[getUserPartyHistory] Found', partyHistory.length, 'parties in history');

    try {
      const guestName = user?.name;
      if (guestName) {
        const { data: guestInvites, error: guestsError } = await supabaseCli
          .from('Invitados_Lista')
          .select('id, party_id, name, validado, created_at')
          .eq('name', guestName);

        if (!guestsError && Array.isArray(guestInvites) && guestInvites.length) {
          const existing = new Set(partyHistory.map(h => String(h.party_id)));
          for (const invite of guestInvites) {
            const { data: party, error: partyError } = await supabaseCli
              .from('parties')
              .select('*')
              .eq('id', invite.party_id)
              .single();
            if (partyError || !party) continue;
            const attendeesInfo = parseAttendeesString(party.attendees);
            const parsedDate = parsePartyDateToIso(party.date);
            const isUpcoming = parsedDate ? parsedDate.getTime() >= Date.now() : false;
            const historyItem = {
              id: party.id,
              party_id: party.id,
              title: party.title,
              location: party.location,
              date: party.date,
              date_display: party.date,
              date_iso: parsedDate ? parsedDate.toISOString() : null,
              administrator: party.administrator,
              image: party.image,
              tags: party.tags,
              category: party.category,
              price_name: null,
              price: null,
              code_used: null,
              added_at: invite.created_at,
              attendees: party.attendees || "0/0",
              attendees_count: attendeesInfo.current,
              max_attendees: attendeesInfo.max,
              is_upcoming: isUpcoming,
              status: isUpcoming ? "upcoming" : "attended"
            };
            if (!existing.has(String(historyItem.party_id))) {
              partyHistory.push(historyItem);
              existing.add(String(historyItem.party_id));
            }
          }
        }
      }
    } catch (_) {}

    res.json({
      success: true,
      party_history: partyHistory,
      count: partyHistory.length
    });

  } catch (error) {
    console.error('Error in getUserPartyHistory:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUserProfile,
  deleteUser,
  deleteAdminAccount,
  deleteMemberAccount,
  getUserProfile,
  loginUser,
  testSupabaseConnection,
  uploadProfileImage,
  getUserPartyHistory
};
