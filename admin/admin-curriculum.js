(function () {
  var editingId = null;
  var currentYear = 1;

  function renderCurriculum() {
    var tbody = document.getElementById('curriculum-tbody');
    if (!tbody) return;

    var curriculum = DataStore.getAll('curriculum');
    var filtered = curriculum.filter(function (c) { return c.year === currentYear; });
    filtered.sort(function (a, b) { return a.order - b.order; });

    tbody.innerHTML = '';
    filtered.forEach(function (course) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + course.order + '</td>' +
        '<td><span class="badge badge-primary">' + RenderUtils.escapeHtml(course.category) + '</span></td>' +
        '<td>' + RenderUtils.escapeHtml(course.name) + '</td>' +
        '<td>' + course.credits + '</td>' +
        '<td class="actions"></td>';

      var actions = tr.querySelector('.actions');

      var editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.textContent = '수정';
      editBtn.addEventListener('click', function () { openEdit(course); });
      actions.appendChild(editBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.addEventListener('click', function () { deleteCourse(course.id); });
      actions.appendChild(deleteBtn);

      tbody.appendChild(tr);
    });
  }

  function openModal(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('course-modal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('course-modal').classList.remove('active');
    clearForm();
  }

  function clearForm() {
    editingId = null;
    document.getElementById('course-id').value = '';
    document.getElementById('course-name').value = '';
    document.getElementById('course-year').value = currentYear.toString();
    document.getElementById('course-category').value = '전공기초';
    document.getElementById('course-credits').value = '3';
    document.getElementById('course-order').value = '1';
  }

  function openEdit(course) {
    editingId = course.id;
    document.getElementById('course-id').value = course.id;
    document.getElementById('course-name').value = course.name;
    document.getElementById('course-year').value = course.year.toString();
    document.getElementById('course-category').value = course.category;
    document.getElementById('course-credits').value = course.credits.toString();
    document.getElementById('course-order').value = (course.order || 1).toString();
    openModal('과목 수정');
  }

  function saveCourse() {
    var name = document.getElementById('course-name').value.trim();
    var year = parseInt(document.getElementById('course-year').value, 10);
    var category = document.getElementById('course-category').value;
    var credits = parseInt(document.getElementById('course-credits').value, 10) || 3;
    var order = parseInt(document.getElementById('course-order').value, 10) || 1;

    if (!name) {
      RenderUtils.showToast('과목명을 입력해주세요.', 'error');
      return;
    }

    var data = {
      name: name,
      year: year,
      category: category,
      credits: credits,
      order: order
    };

    if (editingId) {
      DataStore.update('curriculum', editingId, data);
      RenderUtils.showToast('과목이 수정되었습니다.', 'success');
    } else {
      DataStore.create('curriculum', data);
      RenderUtils.showToast('과목이 추가되었습니다.', 'success');
    }

    closeModal();
    currentYear = year;
    updateTabActive();
    renderCurriculum();
  }

  function deleteCourse(id) {
    if (!RenderUtils.confirmDialog('이 과목을 삭제하시겠습니까?')) return;
    DataStore.remove('curriculum', id);
    RenderUtils.showToast('과목이 삭제되었습니다.', 'success');
    renderCurriculum();
  }

  function updateTabActive() {
    document.querySelectorAll('.admin-tab').forEach(function (tab) {
      tab.classList.remove('active');
      if (parseInt(tab.getAttribute('data-year'), 10) === currentYear) {
        tab.classList.add('active');
      }
    });
  }

  // Year tabs
  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      currentYear = parseInt(this.getAttribute('data-year'), 10);
      updateTabActive();
      renderCurriculum();
    });
  });

  document.getElementById('add-course-btn').addEventListener('click', function () {
    clearForm();
    openModal('과목 추가');
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveCourse);
  document.getElementById('course-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  renderCurriculum();
})();
