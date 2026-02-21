require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const pool = require('./db');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
    if (result.rows.length === 0) return done(null, false, { message: 'Incorrect username or email.' });
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// View engine – all templates in root
app.set('view engine', 'ejs');
app.set('views', __dirname);

// Routes (flat files)
app.use('/', require('./routes.auth'));
app.use('/user', require('./routes.user'));
app.use('/admin', require('./routes.admin'));
app.use('/messages', require('./routes.messages'));

// Home
app.get('/', (req, res) => {
  if (req.user) return res.redirect('/user/dashboard');
  res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
