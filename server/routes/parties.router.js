const express = require("express");
const {
  getHotTopicParties,
  getUpcomingParties,
  getAllParties,
  searchParties,
  toggleLike,
  getEventDetails,
  updateAttendance,
  createParty,
  getAdminStatistics,
  getAdminParties,
  getAdminMetrics,
  deleteParty,
  uploadPartyImage,
  updateParty,
  getPartyDescription,
} = require("../controllers/parties.controller");
const guestsController = require("../controllers/guests.controller");
const { requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

// Public/Member routes
router.get("/parties/hot-topic", getHotTopicParties);
router.get("/parties/upcoming", getUpcomingParties);
router.get("/parties", getAllParties);
router.get("/parties/search", searchParties);
router.patch("/parties/:id/like", toggleLike);
router.get("/parties/:id", getEventDetails);
router.get("/parties/:partyId/description", getPartyDescription);
// Attendance actions for members
router.post("/parties/:id/attendance", updateAttendance);

// Admin-only routes
router.patch("/parties/:id", requireAdmin, updateParty);
router.delete("/parties/:id", requireAdmin, deleteParty);
router.post("/parties/upload-image", requireAdmin, uploadPartyImage);

// Guests endpoints (Admin only)
router.get("/parties/:id/guests", requireAdmin, guestsController.getPartyGuests);
router.get("/parties/:id/guests/summary", requireAdmin, guestsController.getGuestsSummary);
router.patch("/parties/:id/guests/:guestId/status", requireAdmin, guestsController.updateGuestStatus);

// Admin management endpoints
router.post("/newParty", requireAdmin, createParty);
router.post("/create-party", requireAdmin, createParty);
router.post("/admin/statistics", requireAdmin, getAdminStatistics);
router.post("/admin/parties", requireAdmin, getAdminParties);
router.post("/admin/metrics", requireAdmin, getAdminMetrics);

module.exports = router;
