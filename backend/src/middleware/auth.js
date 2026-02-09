
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const raw = req.header('Authorization');
  if (!raw) return res.status(401).json({ msg: 'No token, authorization denied' });

  // Strip "Bearer " prefix if present
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};