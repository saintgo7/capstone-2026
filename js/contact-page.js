(function () {
  function renderContactInfo() {
    var contact = DataStore.getObject('contact');
    if (!contact || !contact.phone) return;

    var phoneEl = document.getElementById('contact-phone');
    var emailEl = document.getElementById('contact-email');
    var addressEl = document.getElementById('contact-address');
    var hoursEl = document.getElementById('contact-hours');
    var mapContainer = document.getElementById('map-container');

    if (phoneEl) phoneEl.textContent = contact.phone;
    if (emailEl) emailEl.textContent = contact.email;
    if (addressEl) addressEl.textContent = contact.address;
    if (hoursEl) hoursEl.textContent = contact.officeHours;

    if (mapContainer && contact.mapEmbedUrl) {
      var iframe = document.createElement('iframe');
      iframe.src = contact.mapEmbedUrl;
      iframe.width = '100%';
      iframe.height = '400';
      iframe.style.border = '0';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      mapContainer.appendChild(iframe);
    }
  }

  // Contact form
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('inquiry-name').value.trim();
      var email = document.getElementById('inquiry-email').value.trim();
      var subject = document.getElementById('inquiry-subject').value.trim();
      var message = document.getElementById('inquiry-message').value.trim();

      if (!name || !email || !subject || !message) {
        RenderUtils.showToast('모든 필드를 입력해주세요.', 'error');
        return;
      }

      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        RenderUtils.showToast('올바른 이메일 주소를 입력해주세요.', 'error');
        return;
      }

      RenderUtils.showToast('문의가 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.', 'success');
      form.reset();
    });
  }

  renderContactInfo();
})();
