(function () {
  var currentCategory = 'all';
  var currentIndex = 0;
  var filteredItems = [];

  function getFilteredGallery() {
    var gallery = DataStore.getAll('gallery');

    if (currentCategory !== 'all') {
      gallery = gallery.filter(function (g) {
        return g.category === currentCategory;
      });
    }

    gallery.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return gallery;
  }

  function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;

    filteredItems = getFilteredGallery();
    RenderUtils.clearElement(grid);

    if (filteredItems.length === 0) {
      grid.appendChild(RenderUtils.createElement('div', { className: 'empty-state' }, '등록된 사진이 없습니다.'));
      return;
    }

    filteredItems.forEach(function (item, index) {
      var card = RenderUtils.createElement('div', {
        className: 'gallery-item',
        onClick: function () { openLightbox(index); }
      });

      var imgWrap = RenderUtils.createElement('div', { className: 'gallery-img-wrap' });
      var img = RenderUtils.createElement('img', {
        src: item.imageUrl,
        alt: item.title,
        loading: 'lazy'
      });
      imgWrap.appendChild(img);

      var info = RenderUtils.createElement('div', { className: 'gallery-item-info' });
      info.appendChild(RenderUtils.createElement('h3', {}, item.title));
      info.appendChild(RenderUtils.createElement('p', {}, item.description));
      info.appendChild(RenderUtils.createElement('span', {
        className: 'gallery-item-date'
      }, RenderUtils.formatDate(item.createdAt)));

      card.appendChild(imgWrap);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  function openLightbox(index) {
    currentIndex = index;
    var item = filteredItems[currentIndex];
    if (!item) return;

    document.getElementById('lightbox-img').src = item.imageUrl;
    document.getElementById('lightbox-img').alt = item.title;
    document.getElementById('lightbox-title').textContent = item.title;
    document.getElementById('lightbox-desc').textContent = item.description;
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = filteredItems.length - 1;
    if (currentIndex >= filteredItems.length) currentIndex = 0;
    var item = filteredItems[currentIndex];
    document.getElementById('lightbox-img').src = item.imageUrl;
    document.getElementById('lightbox-img').alt = item.title;
    document.getElementById('lightbox-title').textContent = item.title;
    document.getElementById('lightbox-desc').textContent = item.description;
  }

  // Filter buttons
  document.querySelectorAll('.gallery-filters .filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.gallery-filters .filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
      currentCategory = this.getAttribute('data-category');
      renderGallery();
    });
  });

  // Lightbox controls
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', function () {
    navigateLightbox(-1);
  });
  document.getElementById('lightbox-next').addEventListener('click', function () {
    navigateLightbox(1);
  });
  document.getElementById('lightbox').addEventListener('click', function (e) {
    if (e.target === this) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  renderGallery();
})();
