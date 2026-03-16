// Mobile menu toggle
document.querySelector('.menu-toggle').addEventListener('click', function () {
  document.querySelector('.nav-links').classList.toggle('open');
});

// Stat counter animation
function animateCounters() {
  var counters = document.querySelectorAll('.stat-number');
  counters.forEach(function (counter) {
    var target = parseInt(counter.getAttribute('data-target'), 10);
    var current = 0;
    var increment = Math.ceil(target / 60);
    var timer = setInterval(function () {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = current;
    }, 20);
  });
}

// Run counter animation when stats section is visible
var statsSection = document.querySelector('.stats');
if (statsSection) {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  observer.observe(statsSection);
}

// Curriculum tab switching
var tabs = document.querySelectorAll('.tab');
tabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    var year = this.getAttribute('data-year');

    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.remove('active');
    });
    this.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(function (content) {
      content.classList.remove('active');
    });
    var target = document.querySelector('.tab-content[data-year="' + year + '"]');
    if (target) {
      target.classList.add('active');
    }
  });
});
