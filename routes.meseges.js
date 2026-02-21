const express = require('express');
const pool = require('./db');
const { isAuthenticated } = require('./authMiddleware');
const router = express.Router();

// Simple "encryption" – base64 encoding (just for show; replace with real crypto later)
function encrypt(text) {
  return Buffer.from(text).toString('base64');
}
function decrypt(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

// List conversations
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get all users the current user has exchanged messages with
    const conversations = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.username, u.profile_pic_url,
        (SELECT content FROM messages WHERE (sender_id = $1 AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE (sender_id = $1 AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1) as last_time
       FROM users u
       WHERE u.id IN (
         SELECT DISTINCT sender_id FROM messages WHERE receiver_id = $1
         UNION
         SELECT DISTINCT receiver_id FROM messages WHERE sender_id = $1
       )
       ORDER BY last_time DESC NULLS LAST`,
      [req.user.id]
    );
    res.render('views.user-messages', { conversations: conversations.rows, currentUserId: req.user.id, decrypt });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading messages.');
    res.redirect('/user/dashboard');
  }
});

// View conversation with a specific user
router.get('/:userId', isAuthenticated, async (req, res) => {
  try {
    const otherUser = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.userId]);
    if (otherUser.rows.length === 0) {
      req.flash('error', 'User not found.');
      return res.redirect('/messages');
    }

    // Mark messages as read
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2',
      [req.params.userId, req.user.id]
    );

    // Get messages between the two
    const messages = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [req.user.id, req.params.userId]
    );

    res.render('views.user-messages-conversation', {
      otherUser: otherUser.rows[0],
      messages: messages.rows,
      decrypt
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading conversation.');
    res.redirect('/messages');
  }
});

// Send a message
router.post('/send/:receiverId', isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content.trim()) {
      req.flash('error', 'Message cannot be empty.');
      return res.redirect(`/messages/${req.params.receiverId}`);
    }
    const encrypted = encrypt(content);
    await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)',
      [req.user.id, req.params.receiverId, encrypted]
    );
    res.redirect(`/messages/${req.params.receiverId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to send message.');
    res.redirect('/messages');
  }
});

module.exports = router;
