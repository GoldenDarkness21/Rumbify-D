const express = require("express");
const {
  adminLogin,
  adminRegister,
  getAdminProfile,
} = require("../controllers/admin.controller");
const { requireAdmin } = require("../middleware/auth.middleware");
const router = express.Router();

// Admin authentication routes
router.post("/admin/login", adminLogin);
router.post("/admin/register", adminRegister);
router.get("/admin/profile/:adminId", requireAdmin, getAdminProfile);

module.exports = router;
