var RenderUtils = (function () {
  function createElement(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') {
          el.className = attrs[key];
        } else if (key === 'textContent') {
          el.textContent = attrs[key];
        } else if (key === 'innerHTML') {
          el.innerHTML = attrs[key];
        } else if (key.startsWith('on')) {
          el.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
        } else {
          el.setAttribute(key, attrs[key]);
        }
      });
    }
    if (children) {
      if (typeof children === 'string') {
        el.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach(function (child) {
          if (child) el.appendChild(child);
        });
      }
    }
    return el;
  }

  function clearElement(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    return parts[0] + '.' + parts[1] + '.' + parts[2];
  }

  function nl2br(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function truncate(text, maxLen) {
    if (!text || text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  }

  function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = createElement('div', {
      className: 'toast toast-' + (type || 'success')
    });
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast-show');
    });

    setTimeout(function () {
      toast.classList.remove('toast-show');
      setTimeout(function () {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  }

  function confirmDialog(message) {
    return window.confirm(message);
  }

  function getProfessorAvatar(index) {
    var avatars = ['👨‍🏫', '👩‍🏫'];
    return avatars[index % 2];
  }

  return {
    createElement: createElement,
    clearElement: clearElement,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    nl2br: nl2br,
    truncate: truncate,
    showToast: showToast,
    confirmDialog: confirmDialog,
    getProfessorAvatar: getProfessorAvatar
  };
})();
