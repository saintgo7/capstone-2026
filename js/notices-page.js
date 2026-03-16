(function () {
  var ITEMS_PER_PAGE = 5;
  var currentCategory = 'all';
  var currentSearch = '';
  var currentPage = 1;

  function getFilteredNotices() {
    var notices = DataStore.getAll('notices');

    if (currentCategory !== 'all') {
      notices = notices.filter(function (n) {
        return n.category === currentCategory;
      });
    }

    if (currentSearch) {
      var q = currentSearch.toLowerCase();
      notices = notices.filter(function (n) {
        return n.title.toLowerCase().indexOf(q) !== -1 ||
               n.content.toLowerCase().indexOf(q) !== -1;
      });
    }

    notices.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return notices;
  }

  function renderNotices() {
    var list = document.getElementById('notices-list');
    if (!list) return;

    var filtered = getFilteredNotices();
    var totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * ITEMS_PER_PAGE;
    var pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    RenderUtils.clearElement(list);

    if (pageItems.length === 0) {
      list.appendChild(RenderUtils.createElement('div', { className: 'empty-state' }, '등록된 공지사항이 없습니다.'));
      renderPagination(0);
      return;
    }

    pageItems.forEach(function (notice) {
      var item = RenderUtils.createElement('div', {
        className: 'notice-item' + (notice.pinned ? ' pinned' : ''),
        onClick: function () { openModal(notice); }
      });

      var badge = RenderUtils.createElement('span', {
        className: 'notice-category category-' + notice.category
      }, notice.category);

      var title = RenderUtils.createElement('h3', { className: 'notice-title' });
      if (notice.pinned) {
        title.appendChild(RenderUtils.createElement('span', { className: 'pin-icon' }, '📌 '));
      }
      title.appendChild(document.createTextNode(notice.title));

      var date = RenderUtils.createElement('span', { className: 'notice-date' },
        RenderUtils.formatDate(notice.createdAt));

      var meta = RenderUtils.createElement('div', { className: 'notice-meta' }, [badge, date]);
      var preview = RenderUtils.createElement('p', { className: 'notice-preview' },
        RenderUtils.truncate(notice.content, 100));

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(preview);
      list.appendChild(item);
    });

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    var container = document.getElementById('notices-pagination');
    if (!container) return;
    RenderUtils.clearElement(container);

    if (totalPages <= 1) return;

    if (currentPage > 1) {
      container.appendChild(RenderUtils.createElement('button', {
        className: 'page-btn',
        onClick: function () { currentPage--; renderNotices(); }
      }, '이전'));
    }

    for (var i = 1; i <= totalPages; i++) {
      (function (page) {
        container.appendChild(RenderUtils.createElement('button', {
          className: 'page-btn' + (page === currentPage ? ' active' : ''),
          onClick: function () { currentPage = page; renderNotices(); }
        }, page.toString()));
      })(i);
    }

    if (currentPage < totalPages) {
      container.appendChild(RenderUtils.createElement('button', {
        className: 'page-btn',
        onClick: function () { currentPage++; renderNotices(); }
      }, '다음'));
    }
  }

  function openModal(notice) {
    var modal = document.getElementById('notice-modal');
    document.getElementById('modal-title').textContent = notice.title;
    document.getElementById('modal-meta').innerHTML =
      '<span class="notice-category category-' + notice.category + '">' +
      RenderUtils.escapeHtml(notice.category) + '</span>' +
      '<span>' + RenderUtils.formatDate(notice.createdAt) + '</span>';
    document.getElementById('modal-body').innerHTML = RenderUtils.nl2br(notice.content);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('notice-modal').classList.remove('active');
    document.body.style.overflow = '';
  }

  // Filter buttons
  document.querySelectorAll('.notices-filters .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.notices-filters .filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
      currentCategory = this.getAttribute('data-category');
      currentPage = 1;
      renderNotices();
    });
  });

  // Search
  var searchInput = document.getElementById('notice-search');
  if (searchInput) {
    var debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var val = this.value;
      debounceTimer = setTimeout(function () {
        currentSearch = val;
        currentPage = 1;
        renderNotices();
      }, 300);
    });
  }

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('notice-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  renderNotices();
})();
