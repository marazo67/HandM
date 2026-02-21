const express = require('express');
const pool = require('./db');
const { isAdmin } = require('./authMiddleware');
const upload = require('./uploadMiddleware');
const router = express.Router();

// Admin dashboard (list posts/files)
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const posts = await pool.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    const files = await pool.query('SELECT * FROM files WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.render('views.admin-dashboard', { posts: posts.rows, files: files.rows });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading dashboard.');
    res.redirect('/');
  }
});

// Upload file page
router.get('/upload', isAdmin, (req, res) => {
  res.render('views.admin-upload');
});

// Upload file (POST)
router.post('/upload', isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const fileUrl = req.file.path; // Cloudinary URL
    await pool.query(
      'INSERT INTO files (user_id, title, description, file_url) VALUES ($1, $2, $3, $4)',
      [req.user.id, title, description, fileUrl]
    );
    req.flash('success', 'File uploaded.');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Upload failed.');
    res.redirect('/admin/upload');
  }
});

// Create post page
router.get('/posts/new', isAdmin, (req, res) => {
  res.render('views.admin-posts', { post: null });
});

// Create post (POST)
router.post('/posts', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    let imageUrl = null;
    if (req.file) imageUrl = req.file.path;
    await pool.query(
      'INSERT INTO posts (user_id, content, image_url) VALUES ($1, $2, $3)',
      [req.user.id, content, imageUrl]
    );
    req.flash('success', 'Post created.');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Post creation failed.');
    res.redirect('/admin/posts/new');
  }
});

// Edit post
router.get('/posts/edit/:id', isAdmin, async (req, res) => {
  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (post.rows.length === 0) {
      req.flash('error', 'Post not found.');
      return res.redirect('/admin/dashboard');
    }
    res.render('views.admin-posts', { post: post.rows[0] });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading post.');
    res.redirect('/admin/dashboard');
  }
});

// Update post
router.post('/posts/update/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    let imageUrl = req.body.existing_image; // hidden field
    if (req.file) imageUrl = req.file.path;
    await pool.query(
      'UPDATE posts SET content = $1, image_url = $2 WHERE id = $3 AND user_id = $4',
      [content, imageUrl, req.params.id, req.user.id]
    );
    req.flash('success', 'Post updated.');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Update failed.');
    res.redirect(`/admin/posts/edit/${req.params.id}`);
  }
});

// Delete post
router.post('/posts/delete/:id', isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    req.flash('success', 'Post deleted.');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Delete failed.');
    res.redirect('/admin/dashboard');
  }
});

// Stats
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalPosts = await pool.query('SELECT COUNT(*) FROM posts');
    const totalFiles = await pool.query('SELECT COUNT(*) FROM files');
    const totalMessages = await pool.query('SELECT COUNT(*) FROM messages');

    // Active today (last_seen within 24h)
    const activeToday = await pool.query(
      "SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '24 hours'"
    );
    // Active this week
    const activeWeek = await pool.query(
      "SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '7 days'"
    );
    // Active this month
    const activeMonth = await pool.query(
      "SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '30 days'"
    );

    res.render('views.admin-stats', {
      totalUsers: totalUsers.rows[0].count,
      totalPosts: totalPosts.rows[0].count,
      totalFiles: totalFiles.rows[0].count,
      totalMessages: totalMessages.rows[0].count,
      activeToday: activeToday.rows[0].count,
      activeWeek: activeWeek.rows[0].count,
      activeMonth: activeMonth.rows[0].count
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading stats.');
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;
