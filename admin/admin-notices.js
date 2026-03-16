(function () {
  var editingId = null;

  function renderNotices() {
    var tbody = document.getElementById('notices-tbody');
    if (!tbody) return;

    var notices = DataStore.getAll('notices');
    notices.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    tbody.innerHTML = '';
    notices.forEach(function (notice) {
      var tr = document.createElement('tr');
      var categoryClass = 'badge-primary';
      if (notice.category === '행사') categoryClass = 'badge-warning';
      if (notice.category === '취업') categoryClass = 'badge-success';
      if (notice.category === '일반') categoryClass = 'badge-info';

      tr.innerHTML = '<td>' + RenderUtils.escapeHtml(notice.title) + '</td>' +
        '<td><span class="badge ' + categoryClass + '">' + RenderUtils.escapeHtml(notice.category) + '</span></td>' +
        '<td>' + (notice.pinned ? '📌' : '-') + '</td>' +
        '<td>' + RenderUtils.formatDate(notice.createdAt) + '</td>' +
        '<td class="actions"></td>';

      var actions = tr.querySelector('.actions');

      var editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = '수정';
      editBtn.addEventListener('click', function () { openEdit(notice); });
      actions.appendChild(editBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.addEventListener('click', function () { deleteNotice(notice.id); });
      actions.appendChild(deleteBtn);

      tbody.appendChild(tr);
    });
  }

  function openModal(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('notice-modal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('notice-modal').classList.remove('active');
    clearForm();
  }

  function clearForm() {
    editingId = null;
    document.getElementById('notice-id').value = '';
    document.getElementById('notice-title').value = '';
    document.getElementById('notice-category').value = '학사';
    document.getElementById('notice-pinned').value = 'false';
    document.getElementById('notice-content').value = '';
  }

  function openEdit(notice) {
    editingId = notice.id;
    document.getElementById('notice-id').value = notice.id;
    document.getElementById('notice-title').value = notice.title;
    document.getElementById('notice-category').value = notice.category;
    document.getElementById('notice-pinned').value = notice.pinned ? 'true' : 'false';
    document.getElementById('notice-content').value = notice.content;
    openModal('공지사항 수정');
  }

  function saveNotice() {
    var title = document.getElementById('notice-title').value.trim();
    var content = document.getElementById('notice-content').value.trim();
    var category = document.getElementById('notice-category').value;
    var pinned = document.getElementById('notice-pinned').value === 'true';

    if (!title) {
      RenderUtils.showToast('제목을 입력해주세요.', 'error');
      return;
    }
    if (!content) {
      RenderUtils.showToast('내용을 입력해주세요.', 'error');
      return;
    }

    if (editingId) {
      DataStore.update('notices', editingId, {
        title: title,
        content: content,
        category: category,
        pinned: pinned
      });
      RenderUtils.showToast('공지사항이 수정되었습니다.', 'success');
    } else {
      DataStore.create('notices', {
        title: title,
        content: content,
        category: category,
        pinned: pinned,
        createdAt: new Date().toISOString().slice(0, 10)
      });
      RenderUtils.showToast('공지사항이 추가되었습니다.', 'success');
    }

    closeModal();
    renderNotices();
  }

  function deleteNotice(id) {
    if (!RenderUtils.confirmDialog('이 공지사항을 삭제하시겠습니까?')) return;
    DataStore.remove('notices', id);
    RenderUtils.showToast('공지사항이 삭제되었습니다.', 'success');
    renderNotices();
  }

  document.getElementById('add-notice-btn').addEventListener('click', function () {
    clearForm();
    openModal('공지사항 추가');
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveNotice);
  document.getElementById('notice-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  renderNotices();
})();
