const express = require('express');
const router = express.Router();
const { testConnection, generateCodes, getPartyCodes, validateCode, useCode, verifyAndAddParty, getQRCode, scanQRCode, diagnoseQRCodes } = require('../controllers/codes.controller');

// Routes for entry codes management
// Test database connection
router.get('/test', testConnection);

// Generate entry codes for a party
router.post('/generate', generateCodes);

// Get all codes for a specific party
router.get('/party/:partyId', getPartyCodes);

// Validate an entry code
router.post('/validate', validateCode);

// Mark a code as used
router.post('/use', useCode);

// Verify code and add party to user's history
router.post('/verify-and-add', verifyAndAddParty);

// Get QR code for a specific user and party
router.get('/qr-code/:userId/:partyId', getQRCode);

// Scan/validate a QR code (mark as scanned)
router.post('/scan-qr-code', scanQRCode);
router.get('/scan-qr-code', scanQRCode);

// Diagnostic endpoint to check qr_codes table structure
router.get('/diagnose-qr-codes', diagnoseQRCodes);

module.exports = router;
