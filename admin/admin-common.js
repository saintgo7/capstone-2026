(function () {
  // Auth guard
  if (sessionStorage.getItem('aiDept_auth') !== 'true') {
    window.location.href = 'login.html';
    return;
  }

  // Build sidebar
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';

  var navItems = [
    { href: 'index.html', icon: '📊', label: '대시보드' },
    { href: 'notices.html', icon: '📋', label: '공지사항 관리' },
    { href: 'professors.html', icon: '👨‍🏫', label: '교수진 관리' },
    { href: 'curriculum.html', icon: '📚', label: '교육과정 관리' },
    { href: 'gallery.html', icon: '🖼️', label: '갤러리 관리' }
  ];

  var sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';

  var header = '<div class="sidebar-header">' +
    '<div class="sidebar-logo">AI융합학과</div>' +
    '<div class="sidebar-subtitle">관리자 패널</div>' +
    '</div>';

  var nav = '<nav class="sidebar-nav">';
  navItems.forEach(function (item) {
    var active = item.href === currentPage ? ' active' : '';
    nav += '<a href="' + item.href + '" class="' + active + '">' +
      '<span class="nav-icon">' + item.icon + '</span>' +
      '<span>' + item.label + '</span></a>';
  });
  nav += '</nav>';

  var footer = '<div class="sidebar-footer">' +
    '<a href="../index.html"><span>🌐</span> 사이트 보기</a>' +
    '<a href="#" id="logout-btn" style="margin-top:8px"><span>🚪</span> 로그아웃</a>' +
    '</div>';

  sidebar.innerHTML = header + nav + footer;
  document.body.insertBefore(sidebar, document.body.firstChild);

  // Mobile sidebar toggle
  var toggle = document.createElement('button');
  toggle.className = 'sidebar-toggle';
  toggle.textContent = '☰';
  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
  });
  document.body.appendChild(toggle);

  // Logout
  document.getElementById('logout-btn').addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.removeItem('aiDept_auth');
    window.location.href = 'login.html';
  });
})();
