const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.method');

router.post('/generate', authController.generateToken);
router.post('/verify', authController.verifyToken);
router.post('/decode', authController.decodeToken);

module.exports = router;