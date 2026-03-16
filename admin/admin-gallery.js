(function () {
  var editingId = null;
  var uploadedImageData = '';

  function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;

    var gallery = DataStore.getAll('gallery');
    gallery.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    grid.innerHTML = '';
    gallery.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'admin-gallery-card';
      card.innerHTML = '<img src="' + RenderUtils.escapeHtml(item.imageUrl) + '" alt="' +
        RenderUtils.escapeHtml(item.title) + '" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22180%22><rect fill=%22%23ddd%22 width=%22300%22 height=%22180%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2214%22>No Image</text></svg>\'">' +
        '<div class="card-body">' +
        '<h3>' + RenderUtils.escapeHtml(item.title) + '</h3>' +
        '<p>' + RenderUtils.escapeHtml(item.description || '') + '</p>' +
        '<div class="card-actions"></div>' +
        '</div>';

      var actions = card.querySelector('.card-actions');

      var editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = '수정';
      editBtn.addEventListener('click', function () { openEdit(item); });
      actions.appendChild(editBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.addEventListener('click', function () { deleteItem(item.id); });
      actions.appendChild(deleteBtn);

      grid.appendChild(card);
    });
  }

  function openModal(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('gallery-modal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('gallery-modal').classList.remove('active');
    clearForm();
  }

  function clearForm() {
    editingId = null;
    uploadedImageData = '';
    document.getElementById('gallery-id').value = '';
    document.getElementById('gallery-title').value = '';
    document.getElementById('gallery-desc').value = '';
    document.getElementById('gallery-category').value = '행사';
    document.getElementById('gallery-url').value = '';
    document.getElementById('gallery-file').value = '';
    var preview = document.getElementById('image-preview');
    preview.src = '';
    preview.classList.remove('show');
  }

  function openEdit(item) {
    editingId = item.id;
    document.getElementById('gallery-id').value = item.id;
    document.getElementById('gallery-title').value = item.title;
    document.getElementById('gallery-desc').value = item.description || '';
    document.getElementById('gallery-category').value = item.category;
    document.getElementById('gallery-url').value = item.imageUrl || '';

    var preview = document.getElementById('image-preview');
    if (item.imageUrl) {
      preview.src = item.imageUrl;
      preview.classList.add('show');
    }

    openModal('사진 수정');
  }

  function saveItem() {
    var title = document.getElementById('gallery-title').value.trim();
    var desc = document.getElementById('gallery-desc').value.trim();
    var category = document.getElementById('gallery-category').value;
    var url = document.getElementById('gallery-url').value.trim();

    if (!title) {
      RenderUtils.showToast('제목을 입력해주세요.', 'error');
      return;
    }

    var imageUrl = uploadedImageData || url;
    if (!imageUrl && !editingId) {
      RenderUtils.showToast('이미지 URL 또는 파일을 입력해주세요.', 'error');
      return;
    }

    var data = {
      title: title,
      description: desc,
      category: category
    };

    if (imageUrl) {
      data.imageUrl = imageUrl;
    }

    if (editingId) {
      DataStore.update('gallery', editingId, data);
      RenderUtils.showToast('사진이 수정되었습니다.', 'success');
    } else {
      data.createdAt = new Date().toISOString().slice(0, 10);
      DataStore.create('gallery', data);
      RenderUtils.showToast('사진이 추가되었습니다.', 'success');
    }

    closeModal();
    renderGallery();
  }

  function deleteItem(id) {
    if (!RenderUtils.confirmDialog('이 사진을 삭제하시겠습니까?')) return;
    DataStore.remove('gallery', id);
    RenderUtils.showToast('사진이 삭제되었습니다.', 'success');
    renderGallery();
  }

  // File upload handling
  document.getElementById('gallery-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      RenderUtils.showToast('이미지 크기는 500KB 이하만 가능합니다.', 'error');
      e.target.value = '';
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      uploadedImageData = ev.target.result;
      var preview = document.getElementById('image-preview');
      preview.src = uploadedImageData;
      preview.classList.add('show');
      document.getElementById('gallery-url').value = '';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('add-gallery-btn').addEventListener('click', function () {
    clearForm();
    openModal('사진 추가');
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveItem);
  document.getElementById('gallery-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  renderGallery();
})();
