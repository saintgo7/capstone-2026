// Initialize seed data
SeedData.initAll();

// Mobile menu toggle
document.querySelector('.menu-toggle').addEventListener('click', function () {
  document.querySelector('.nav-links').classList.toggle('open');
});

// Render stats on index page
function renderStats() {
  var grid = document.getElementById('stat-grid');
  if (!grid) return;

  var stats = DataStore.getAll('stats');
  RenderUtils.clearElement(grid);

  stats.forEach(function (stat) {
    var item = RenderUtils.createElement('div', { className: 'stat-item' });
    var number = RenderUtils.createElement('span', {
      className: 'stat-number',
      'data-target': stat.value.toString(),
      'data-suffix': stat.suffix || ''
    }, '0');
    var label = RenderUtils.createElement('span', { className: 'stat-label' }, stat.label);
    item.appendChild(number);
    item.appendChild(label);
    grid.appendChild(item);
  });
}

// Stat counter animation
function animateCounters() {
  var counters = document.querySelectorAll('.stat-number');
  counters.forEach(function (counter) {
    var target = parseInt(counter.getAttribute('data-target'), 10);
    var suffix = counter.getAttribute('data-suffix') || '';
    var current = 0;
    var increment = Math.ceil(target / 60);
    var timer = setInterval(function () {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = current + suffix;
    }, 20);
  });
}

// Run counter animation when stats section is visible
var statsSection = document.querySelector('.stats');
if (statsSection) {
  renderStats();
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

// Render professors on program page
function renderProfessors() {
  var grid = document.getElementById('prof-grid');
  if (!grid) return;

  var professors = DataStore.getAll('professors');
  professors.sort(function (a, b) { return a.order - b.order; });
  RenderUtils.clearElement(grid);

  professors.forEach(function (prof, index) {
    var card = RenderUtils.createElement('div', { className: 'prof-card' });
    var avatar = RenderUtils.createElement('div', { className: 'prof-avatar' },
      prof.avatar || RenderUtils.getProfessorAvatar(index));
    var name = RenderUtils.createElement('h3', {}, prof.name + ' 교수');
    var field = RenderUtils.createElement('p', { className: 'prof-field' }, prof.field);
    var desc = RenderUtils.createElement('p', { className: 'prof-desc' }, prof.description);
    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(field);
    card.appendChild(desc);
    grid.appendChild(card);
  });
}

// Render curriculum on program page
function renderCurriculum() {
  var container = document.getElementById('curriculum-content');
  if (!container) return;

  var curriculum = DataStore.getAll('curriculum');
  RenderUtils.clearElement(container);

  [1, 2, 3, 4].forEach(function (year) {
    var yearCourses = curriculum.filter(function (c) { return c.year === year; });
    yearCourses.sort(function (a, b) { return a.order - b.order; });

    var div = RenderUtils.createElement('div', {
      className: 'tab-content' + (year === 1 ? ' active' : ''),
      'data-year': year.toString()
    });

    var table = RenderUtils.createElement('table');
    var thead = RenderUtils.createElement('thead');
    var headerRow = RenderUtils.createElement('tr');
    ['구분', '과목명', '학점'].forEach(function (text) {
      headerRow.appendChild(RenderUtils.createElement('th', {}, text));
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = RenderUtils.createElement('tbody');
    yearCourses.forEach(function (course) {
      var row = RenderUtils.createElement('tr');
      row.appendChild(RenderUtils.createElement('td', {}, course.category));
      row.appendChild(RenderUtils.createElement('td', {}, course.name));
      row.appendChild(RenderUtils.createElement('td', {}, course.credits.toString()));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    div.appendChild(table);
    container.appendChild(div);
  });
}

// Tab switching
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

// Initialize program page
renderProfessors();
renderCurriculum();
