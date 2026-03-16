(function () {
  var editingId = null;

  function renderProfessors() {
    var grid = document.getElementById('prof-grid');
    if (!grid) return;

    var professors = DataStore.getAll('professors');
    professors.sort(function (a, b) { return a.order - b.order; });
    grid.innerHTML = '';

    professors.forEach(function (prof, index) {
      var card = document.createElement('div');
      card.className = 'admin-prof-card';
      card.innerHTML = '<div class="prof-avatar">' +
        (prof.avatar || RenderUtils.getProfessorAvatar(index)) + '</div>' +
        '<h3>' + RenderUtils.escapeHtml(prof.name) + ' 교수</h3>' +
        '<div class="prof-field">' + RenderUtils.escapeHtml(prof.field) + '</div>' +
        '<div class="prof-desc">' + RenderUtils.escapeHtml(prof.description) + '</div>' +
        '<div class="prof-email">' + RenderUtils.escapeHtml(prof.email || '') + '</div>' +
        '<div class="card-actions"></div>';

      var actions = card.querySelector('.card-actions');

      var editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = '수정';
      editBtn.addEventListener('click', function () { openEdit(prof); });
      actions.appendChild(editBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.addEventListener('click', function () { deleteProf(prof.id); });
      actions.appendChild(deleteBtn);

      grid.appendChild(card);
    });
  }

  function openModal(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('prof-modal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('prof-modal').classList.remove('active');
    clearForm();
  }

  function clearForm() {
    editingId = null;
    document.getElementById('prof-id').value = '';
    document.getElementById('prof-name').value = '';
    document.getElementById('prof-field').value = '';
    document.getElementById('prof-desc').value = '';
    document.getElementById('prof-email').value = '';
    document.getElementById('prof-order').value = '1';
  }

  function openEdit(prof) {
    editingId = prof.id;
    document.getElementById('prof-id').value = prof.id;
    document.getElementById('prof-name').value = prof.name;
    document.getElementById('prof-field').value = prof.field;
    document.getElementById('prof-desc').value = prof.description;
    document.getElementById('prof-email').value = prof.email || '';
    document.getElementById('prof-order').value = prof.order || 1;
    openModal('교수 정보 수정');
  }

  function saveProf() {
    var name = document.getElementById('prof-name').value.trim();
    var field = document.getElementById('prof-field').value.trim();
    var desc = document.getElementById('prof-desc').value.trim();
    var email = document.getElementById('prof-email').value.trim();
    var order = parseInt(document.getElementById('prof-order').value, 10) || 1;

    if (!name) {
      RenderUtils.showToast('이름을 입력해주세요.', 'error');
      return;
    }
    if (!field) {
      RenderUtils.showToast('전공 분야를 입력해주세요.', 'error');
      return;
    }
    if (!desc) {
      RenderUtils.showToast('소개를 입력해주세요.', 'error');
      return;
    }

    var data = {
      name: name,
      field: field,
      description: desc,
      email: email,
      order: order,
      avatar: ''
    };

    if (editingId) {
      DataStore.update('professors', editingId, data);
      RenderUtils.showToast('교수 정보가 수정되었습니다.', 'success');
    } else {
      DataStore.create('professors', data);
      RenderUtils.showToast('교수가 추가되었습니다.', 'success');
    }

    closeModal();
    renderProfessors();
  }

  function deleteProf(id) {
    if (!RenderUtils.confirmDialog('이 교수 정보를 삭제하시겠습니까?')) return;
    DataStore.remove('professors', id);
    RenderUtils.showToast('교수 정보가 삭제되었습니다.', 'success');
    renderProfessors();
  }

  document.getElementById('add-prof-btn').addEventListener('click', function () {
    clearForm();
    openModal('교수 추가');
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveProf);
  document.getElementById('prof-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  renderProfessors();
})();
