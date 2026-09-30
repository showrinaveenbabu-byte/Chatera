const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!email || !email.trim() || !message || !message.trim()) {
    return res.status(400).json({ msg: 'Email and message are required.' });
  }

  console.log('[Support Request Received]:', {
    name: name || 'Anonymous',
    email: email.trim(),
    subject: subject || 'General Inquiry',
    message: message.trim(),
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    msg: 'Thank you! Your message has been received. Our support team will get back to you shortly.'
  });
});

module.exports = router;
