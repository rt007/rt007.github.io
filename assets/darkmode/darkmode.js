(function () {
  var STORAGE_KEY = 'rt-theme';
  var root = document.documentElement;

  // Apply saved/system theme immediately — runs before paint to prevent flash
  var saved = localStorage.getItem(STORAGE_KEY);
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    root.setAttribute('data-theme', 'dark');
  }

  function isDark() {
    return root.getAttribute('data-theme') === 'dark';
  }

  function moonIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  function sunIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }

  function insertToggle() {
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('theme-toggle')) return;

    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.setAttribute('title', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = isDark() ? sunIcon() : moonIcon();

    btn.addEventListener('click', function () {
      var goingDark = !isDark();
      if (goingDark) {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem(STORAGE_KEY, 'dark');
      } else {
        root.removeAttribute('data-theme');
        localStorage.setItem(STORAGE_KEY, 'light');
      }
      btn.innerHTML = goingDark ? sunIcon() : moonIcon();
      btn.setAttribute('title', goingDark ? 'Switch to light mode' : 'Switch to dark mode');
    });

    navLinks.appendChild(btn);
  }

  // Enable CSS transitions only after the initial theme is applied,
  // so the page doesn't animate in on load.
  function enableTransitions() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('theme-ready');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      insertToggle();
      enableTransitions();
    });
  } else {
    insertToggle();
    enableTransitions();
  }
})();
