(function () {
  function renderDashboard() {
    var grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    var cards = [
      { icon: '📋', label: '공지사항', value: DataStore.count('notices') },
      { icon: '👨‍🏫', label: '교수진', value: DataStore.count('professors') },
      { icon: '📚', label: '교육과정 과목', value: DataStore.count('curriculum') },
      { icon: '🖼️', label: '갤러리', value: DataStore.count('gallery') }
    ];

    grid.innerHTML = '';
    cards.forEach(function (card) {
      var el = document.createElement('div');
      el.className = 'dashboard-card';
      el.innerHTML = '<div class="card-icon">' + card.icon + '</div>' +
        '<div class="card-value">' + card.value + '</div>' +
        '<div class="card-label">' + card.label + '</div>';
      grid.appendChild(el);
    });
  }

  function renderStorageInfo() {
    var container = document.getElementById('storage-info');
    if (!container) return;

    var size = DataStore.getStorageSize();
    var maxSize = 5 * 1024 * 1024;
    var percent = Math.min((size / maxSize) * 100, 100).toFixed(1);
    var sizeKB = (size / 1024).toFixed(1);
    var maxKB = (maxSize / 1024).toFixed(0);

    container.innerHTML = '<h3>💾 저장소 사용량</h3>' +
      '<div class="storage-bar"><div class="storage-bar-fill" style="width:' + percent + '%"></div></div>' +
      '<div class="storage-text">' + sizeKB + 'KB / ' + maxKB + 'KB (' + percent + '%)</div>';
  }

  // Export
  document.getElementById('export-btn').addEventListener('click', function () {
    var data = DataStore.exportAll();
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'aiDept_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    RenderUtils.showToast('데이터를 내보냈습니다.', 'success');
  });

  // Import
  document.getElementById('import-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;

    if (!RenderUtils.confirmDialog('기존 데이터를 덮어씁니다. 계속하시겠습니까?')) {
      e.target.value = '';
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);
        DataStore.importAll(data);
        RenderUtils.showToast('데이터를 가져왔습니다.', 'success');
        renderDashboard();
        renderStorageInfo();
      } catch (err) {
        RenderUtils.showToast('올바른 JSON 파일이 아닙니다.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Password change
  function hashPassword(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode(password);
    return crypto.subtle.digest('SHA-256', data).then(function (buffer) {
      var hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  document.getElementById('change-pw-btn').addEventListener('click', function () {
    var currentPw = document.getElementById('current-pw').value;
    var newPw = document.getElementById('new-pw').value;
    var confirmPw = document.getElementById('confirm-pw').value;

    if (!currentPw || !newPw || !confirmPw) {
      RenderUtils.showToast('모든 필드를 입력해주세요.', 'error');
      return;
    }

    if (newPw.length < 4) {
      RenderUtils.showToast('새 비밀번호는 4자 이상이어야 합니다.', 'error');
      return;
    }

    if (newPw !== confirmPw) {
      RenderUtils.showToast('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    var admin = DataStore.getObject('admin');
    hashPassword(currentPw).then(function (currentHash) {
      if (currentHash !== admin.passwordHash) {
        RenderUtils.showToast('현재 비밀번호가 올바르지 않습니다.', 'error');
        return;
      }

      hashPassword(newPw).then(function (newHash) {
        DataStore.setObject('admin', { passwordHash: newHash });
        document.getElementById('current-pw').value = '';
        document.getElementById('new-pw').value = '';
        document.getElementById('confirm-pw').value = '';
        RenderUtils.showToast('비밀번호가 변경되었습니다.', 'success');
      });
    });
  });

  renderDashboard();
  renderStorageInfo();
})();
