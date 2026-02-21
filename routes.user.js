const express = require('express');
const pool = require('./db');
const { isAuthenticated } = require('./authMiddleware');
const upload = require('./uploadMiddleware');
const router = express.Router();

// Dashboard – show admin posts & files
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const admin = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
    if (admin.rows.length === 0) {
      return res.render('views.user-dashboard', { posts: [], files: [], mustFollow: false });
    }
    const adminId = admin.rows[0].id;

    // Check if user follows admin
    const followCheck = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, adminId]
    );
    if (followCheck.rows.length === 0) {
      return res.render('views.user-dashboard', { posts: [], files: [], mustFollow: true, adminId });
    }

    const posts = await pool.query(
      'SELECT p.*, u.name, u.profile_pic_url FROM posts p JOIN users u ON p.user_id = u.id WHERE u.role = $1 ORDER BY p.created_at DESC',
      ['admin']
    );
    const files = await pool.query(
      'SELECT f.*, u.name FROM files f JOIN users u ON f.user_id = u.id WHERE u.role = $1 ORDER BY f.created_at DESC',
      ['admin']
    );
    res.render('views.user-dashboard', { posts: posts.rows, files: files.rows, mustFollow: false });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/');
  }
});

// Follow admin (POST)
router.post('/follow-admin/:adminId', isAuthenticated, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.adminId]
    );
    req.flash('success', 'You are now following admin!');
    res.redirect('/user/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not follow admin.');
    res.redirect('/user/dashboard');
  }
});

// Own profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const followers = await pool.query('SELECT COUNT(*) FROM follows WHERE followed_id = $1', [req.user.id]);
    const following = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [req.user.id]);
    res.render('views.user-profile', {
      user: req.user,
      followersCount: followers.rows[0].count,
      followingCount: following.rows[0].count
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading profile.');
    res.redirect('/user/dashboard');
  }
});

// Update profile
router.post('/profile/update', isAuthenticated, upload.single('profile_pic'), async (req, res) => {
  try {
    const { name, email, bio } = req.body;
    let profilePicUrl = req.user.profile_pic_url;
    if (req.file) profilePicUrl = req.file.path;
    await pool.query(
      'UPDATE users SET name = $1, email = $2, bio = $3, profile_pic_url = $4 WHERE id = $5',
      [name, email, bio, profilePicUrl, req.user.id]
    );
    req.flash('success', 'Profile updated.');
    res.redirect('/user/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Update failed.');
    res.redirect('/user/profile');
  }
});

// View another user's profile
router.get('/profile/:id', isAuthenticated, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (userResult.rows.length === 0) {
      req.flash('error', 'User not found.');
      return res.redirect('/user/dashboard');
    }
    const profileUser = userResult.rows[0];

    const followCheck = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, profileUser.id]
    );
    const isFollowing = followCheck.rows.length > 0;

    const followers = await pool.query('SELECT COUNT(*) FROM follows WHERE followed_id = $1', [profileUser.id]);
    const following = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [profileUser.id]);

    res.render('views.user-profile-view', {
      profileUser,
      isFollowing,
      followersCount: followers.rows[0].count,
      followingCount: following.rows[0].count
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading profile.');
    res.redirect('/user/dashboard');
  }
});

// Follow/unfollow
router.post('/follow/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    // Check if already following
    const existing = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, id]
    );
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2', [req.user.id, id]);
    } else {
      await pool.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)', [req.user.id, id]);
    }
    res.redirect(`/user/profile/${id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Action failed.');
    res.redirect('/user/dashboard');
  }
});

module.exports = router;
