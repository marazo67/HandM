<nav class="Header Header--dark px-3 px-md-4 px-lg-5" style="position: fixed; top: 0; width: 100%; z-index: 100;">
  <div class="Header-item">
    <a href="/" class="Header-link f4 d-flex flex-items-center">
      <span>H&M HOLDERS</span>
    </a>
  </div>
  <div class="Header-item Header-item--full"></div>
  <% if (user) { %>
    <div class="Header-item mr-2">
      <a href="/user/dashboard" class="Header-link">Dashboard</a>
    </div>
    <div class="Header-item mr-2">
      <a href="/messages" class="Header-link">Messages</a>
    </div>
    <div class="Header-item mr-2">
      <a href="/user/profile" class="Header-link">
        <% if (user.profile_pic_url) { %>
          <img src="<%= user.profile_pic_url %>" class="avatar" alt="avatar">
        <% } else { %>
          <span class="avatar"><%= user.name ? user.name[0].toUpperCase() : 'U' %></span>
        <% } %>
      </a>
    </div>
    <div class="Header-item">
      <a href="/logout" class="Header-link">Sign out</a>
    </div>
  <% } else { %>
    <div class="Header-item mr-2">
      <a href="/login" class="Header-link">Login</a>
    </div>
    <div class="Header-item">
      <a href="/register" class="Header-link">Register</a>
    </div>
  <% } %>
</nav>
