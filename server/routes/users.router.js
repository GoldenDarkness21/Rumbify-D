const express = require("express");
const multer = require("multer");
const {
  createUser,
  getUsers,
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
} = require("../controllers/users.controller");
const { requireMember, requireAdmin } = require("../middleware/auth.middleware");
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get("/users", getUsers);

router.post("/users", createUser);

router.post("/users/login", requireMember, loginUser);

router.patch("/users/:id", updateUser);

router.put("/users/:id", updateUserProfile);

router.delete("/users/:id", deleteUser);

router.get("/users/:id/profile", getUserProfile);

// Get user's party history
router.get("/users/:id/party-history", getUserPartyHistory);

// Upload profile image endpoints
router.post("/users/:id/profile-image", requireMember, upload.single('profile_image'), uploadProfileImage);
router.post("/users/:id/admin/profile-image", requireAdmin, upload.single('profile_image'), uploadProfileImage);

// Delete admin account endpoint
router.delete("/users/:id/admin/delete-account", requireAdmin, deleteAdminAccount);

// Delete member account endpoint
router.delete("/users/:id/delete-account", requireMember, deleteMemberAccount);

// Test Supabase connection endpoint
router.get("/test-supabase", testSupabaseConnection);

module.exports = router;
