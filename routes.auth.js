const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const pool = require('./db');
const { isAuthenticated } = require('./authMiddleware');
const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/user/dashboard');
  res.render('views.login', { title: 'Login' });
});

// Login post
router.post('/login', passport.authenticate('local', {
  successRedirect: '/user/dashboard',
  failureRedirect: '/login',
  failureFlash: true
}));

// Register page
router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/user/dashboard');
  res.render('views.register', { title: 'Register' });
});

// Register post
router.post('/register', async (req, res) => {
  const { username, email, name, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, name, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, name, hashed, 'user']
    );
    const userId = result.rows[0].id;

    // Find admin (by username '0075' or role admin)
    const admin = await pool.query('SELECT id FROM users WHERE username = $1 OR role = $2', ['0075', 'admin']);
    if (admin.rows.length > 0) {
      await pool.query(
        'INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, admin.rows[0].id]
      );
    }

    req.flash('success', 'Registration successful. Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Username or email may already exist.');
    res.redirect('/register');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

module.exports = router;
