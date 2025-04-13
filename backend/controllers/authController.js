// backend/controllers/authController.js
const admin = require('../config/firebaseConfig.js');
const db = admin.firestore();
const axios = require('axios');
require('dotenv').config();

// authController.js

exports.checkIfAdmin = async (req, res) => {
  // 1. Validate Authorization header structure first
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authorization header missing or malformed' 
    });
  }

  // 2. Extract token safely
  const token = req.headers.authorization.split(' ')[1];
  if (!token || token.length < 50) { // Basic token length validation
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token format' 
    });
  }

  try {
    // 3. Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Decoded token:', decodedToken); // Debug log
    
    // 4. Validate UID exists
    if (!decodedToken.uid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token missing required fields' 
      });
    }

    // 5. Check Firestore for admin status
    const adminSessionRef = db.collection('admin-sessions').doc(decodedToken.uid);
    const adminSessionSnap = await adminSessionRef.get();
    
    if (!adminSessionSnap.exists) {
      console.log('No admin record found for UID:', decodedToken.uid);
      return res.status(403).json({ 
        success: false, 
        message: 'Admin account not found' 
      });
    }

    if (!adminSessionSnap.data().isAdmin) {
      console.log('User is not an admin:', decodedToken.uid);
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient privileges' 
      });
    }

    // 6. Success response
    return res.json({ 
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email || null 
    });

  } catch (error) {
    console.error('Admin check error:', {
      message: error.message,
      code: error.code,
      stack: error.stack // Full stack trace for debugging
    });

    // Handle specific Firebase errors
    switch (error.code) {
      case 'auth/id-token-expired':
        return res.status(401).json({ 
          success: false, 
          message: 'Session expired. Please login again.' 
        });
      
      case 'auth/argument-error':
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid authentication token' 
        });
        
      case 'auth/network-request-failed':
        return res.status(503).json({ 
          success: false, 
          message: 'Authentication service unavailable' 
        });
        
      default:
        return res.status(500).json({ 
          success: false, 
          message: 'Internal server error',
          // Only include details in development
          ...(process.env.NODE_ENV === 'development' && { 
            error: error.message 
          })
        });
    }
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