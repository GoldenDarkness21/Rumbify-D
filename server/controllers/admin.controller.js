const {
  getAllUsers,
  createUserInDB,
  updateUserInDb,
  deleteUserInDb,
} = require("../db/users.db");
const supabase = require("../services/supabase.service");

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validar que se proporcionen email y password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }
    
    console.log(`Attempting admin login for email: ${email}`);
    
    // Buscar usuario admin en la tabla users (autenticación local)
    const { data: adminData, error: adminError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("is_admin", true)
      .single();
    
    if (adminError || !adminData) {
      console.error("Admin not found:", adminError);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or user is not an administrator"
      });
    }
    
    console.log(`Admin login successful for user: ${adminData.id}`);
    
    const response = {
      success: true,
      message: "Login successful",
      user: {
        id: adminData.id,
        name: adminData.name,
        email: adminData.email,
        phone: adminData.phone || null,
        role: "admin",
        is_admin: adminData.is_admin,
        profile_image: adminData.profile_image,
        created_at: adminData.created_at
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const adminRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Validar campos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }
    
    console.log(`Attempting admin registration for email: ${email}`);
    
    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, email, name")
      .or(`email.eq.${email},name.eq.${name}`)
      .limit(1);

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
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
    
    // Crear nuevo usuario admin en la tabla users
    const newAdminData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      phone: phone ? phone.trim() : null,
      is_admin: true,
      profile_image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      interests: [],
      created_at: new Date().toISOString()
    };
    
    const { data: newAdmin, error: createError } = await supabase
      .from("users")
      .insert([newAdminData])
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating admin profile:", createError);
      return res.status(500).json({
        success: false,
        message: "Error creating admin profile",
        error: createError.message
      });
    }
    
    console.log(`Admin registration successful for user: ${newAdmin.id}`);
    
    const response = {
      success: true,
      message: "Admin account created successfully",
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: "admin",
        is_admin: newAdmin.is_admin,
        profile_image: newAdmin.profile_image,
        created_at: newAdmin.created_at
      }
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Admin register error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const { data: admin, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", adminId)
      .eq("is_admin", true)
      .single();
    
    if (error || !admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    
    const response = {
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: "admin",
        is_admin: admin.is_admin,
        created_at: admin.created_at
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  adminLogin,
  adminRegister,
  getAdminProfile,
};
