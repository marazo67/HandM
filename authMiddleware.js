module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.flash('error', 'Please log in first.');
    res.redirect('/login');
  },
  isAdmin: (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    req.flash('error', 'Access denied. Admins only.');
    res.redirect('/user/dashboard');
  }
};
