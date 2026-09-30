const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Check both 'x-auth-token' and standard 'Authorization: Bearer <token>'
  let token = req.header('x-auth-token');

  if (!token && req.header('authorization')) {
    const authHeader = req.header('authorization');
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  // Check if no token provided
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied', code: 'NO_TOKEN' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY WARNING] JWT_SECRET environment variable is not defined in production!');
    }
  }
  const jwtSecret = secret || 'supersecret_jwt_key_communication_app_2026_dev';

  // Verify token
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded || !decoded.user) {
      return res.status(401).json({ msg: 'Invalid token payload', code: 'INVALID_TOKEN' });
    }
    req.user = decoded.user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ msg: 'Token is not valid', code: 'INVALID_TOKEN' });
  }
};
