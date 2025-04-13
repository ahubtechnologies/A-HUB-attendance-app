// backend/controllers/authController.js
const admin = require('../config/firebaseConfig.js');
const db = admin.firestore();
const axios = require('axios');
require('dotenv').config();

// authController.js

// Check if the user is an admin
exports.checkIfAdmin = async (req, res) => {
  // Get the token from the Authorization header
  const token = req.headers.authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if the user is an admin in Firestore
    const adminSessionRef = db.collection('admin-sessions').doc(uid);
    const adminSessionSnap = await adminSessionRef.get();

    if (!adminSessionSnap.exists || !adminSessionSnap.data().isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, message: 'User is an admin' });
  } catch (error) {
    console.error('Admin check error:', error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during admin check' 
    });
  }
};

// Firebase REST API endpoint for email/password authentication
const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

// Admin login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(FIREBASE_AUTH_URL, {
      email,
      password,
      returnSecureToken: true,
    });

    const { localId: uid, idToken, expiresIn } = response.data;

    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Update session data in Firestore
    const sessionData = {
      adminId: uid,
      isLoggedIn: true,
      isAdmin: true,
      token: idToken, // Store the token in Firestore
    };

    await db.collection('admin-sessions').doc(uid).set(sessionData);

    // Return the token in the response
    res.json({
      success: true,
      message: 'Login successful',
      token: idToken,
      expiresIn: expiresIn, // Return the expiration time in seconds
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Log out the user
exports.logout = async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  try {
    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    // Delete the admin session document from Firestore
    await db.collection('admin-sessions').doc(uid).delete();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error logging out', error });
  }
};