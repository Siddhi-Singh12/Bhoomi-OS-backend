const env = require('../config/env');

/**
 * Authentication Middleware for Bhoomi OS
 * Supports Bearer token inspection (MVP mock compatible) and session attachment.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // For MVP demonstration, if no token is passed, allow public flow but flag as unauthenticated
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    // MVP Token validation: Accept simulated AgriStack / session tokens
    req.user = {
      token,
      authenticated: true,
    };
    return next();
  }

  return res.status(401).json({ success: false, error: 'Invalid Authorization header format. Expected Bearer <token>' });
}

function requireAuth(req, res, next) {
  if (!req.user || !req.user.authenticated) {
    return res.status(401).json({ success: false, error: 'Authentication required to access this resource.' });
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAuth,
};
