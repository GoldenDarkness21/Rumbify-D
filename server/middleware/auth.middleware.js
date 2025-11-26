const supabase = require("../services/supabase.service");

/**
 * Middleware para verificar que el usuario es administrador
 * Verifica que el usuario existe en la base de datos y tiene is_admin = true
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Permitir email por body (POST), query (GET) o header (GET)
    const bodyEmail = req.body?.email;
    const queryEmail = req.query?.email;
    const headerEmail = req.headers["x-admin-email"];
    const email = bodyEmail || queryEmail || headerEmail;
    
    console.log("[requireAdmin] Request body:", req.body);
    console.log("[requireAdmin] Email from request:", email);
    
    if (!email) {
      console.log("[requireAdmin] No email provided");
      return res.status(400).json({
        success: false,
        message: "Email is required for authentication"
      });
    }

    // Buscar usuario en la base de datos
    console.log("[requireAdmin] Looking up user with email:", String(email).toLowerCase().trim());
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, is_admin")
      .eq("email", String(email).toLowerCase().trim())
      .single();

    console.log("[requireAdmin] User lookup result:", { user, error });

    if (error || !user) {
      console.log("[requireAdmin] User not found or error:", error);
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Verificar que el usuario es administrador
    if (!user.is_admin) {
      console.log("[requireAdmin] User is not admin:", user);
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator privileges required."
      });
    }

    console.log("[requireAdmin] Admin user authenticated:", user.email);
    // Agregar información del usuario a la request para uso posterior
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin
    };

    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Middleware para verificar que el usuario NO es administrador
 * Para endpoints que solo deben ser accesibles por usuarios regulares
 */
const requireMember = async (req, res, next) => {
  try {
    // Permitir email por body (POST), query (GET) o header (GET)
    const bodyEmail = req.body?.email;
    const queryEmail = req.query?.email;
    const headerEmail = req.headers["x-user-email"];
    const email = bodyEmail || queryEmail || headerEmail;
    
    console.log("[requireMember] Request body:", req.body);
    console.log("[requireMember] Email from request:", email);
    
    if (!email) {
      console.log("[requireMember] No email provided");
      return res.status(400).json({
        success: false,
        message: "Email is required for authentication"
      });
    }

    // Buscar usuario en la base de datos
    console.log("[requireMember] Looking up user with email:", String(email).toLowerCase().trim());
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, is_admin")
      .eq("email", String(email).toLowerCase().trim())
      .single();

    console.log("[requireMember] User lookup result:", { user, error });

    if (error || !user) {
      console.log("[requireMember] User not found or error:", error);
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Verificar que el usuario NO es administrador
    if (user.is_admin) {
      console.log("[requireMember] User is admin:", user);
      return res.status(403).json({
        success: false,
        message: "Access denied. This endpoint is only for regular members."
      });
    }

    console.log("[requireMember] Member user authenticated:", user.email);
    // Agregar información del usuario a la request para uso posterior
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin
    };

    next();
  } catch (error) {
    console.error("Error in requireMember middleware:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Middleware para verificar que el usuario existe (admin o miembro)
 * Útil para endpoints que requieren autenticación pero no restricción de rol
 */
const requireAuth = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for authentication"
      });
    }

    // Buscar usuario en la base de datos
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, is_admin")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Agregar información del usuario a la request para uso posterior
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin
    };

    next();
  } catch (error) {
    console.error("Error in requireAuth middleware:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  requireAdmin,
  requireMember,
  requireAuth
};
