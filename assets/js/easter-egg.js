// assets/js/easter-egg.js
(function () {
  const CLICKS_NEEDED = 5;
  const RESET_MS = 3000;
  let clicks = 0;
  let resetTimer = null;

  const style = document.createElement('style');
  style.textContent = `
    .hero-photo img { cursor: pointer; }

    #egg-pips {
      display: flex; gap: 5px; justify-content: center;
      margin-top: 8px; height: 10px;
    }
    #egg-pips span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--accent); opacity: 0; transform: scale(0);
      transition: opacity 0.2s, transform 0.25s cubic-bezier(.34,1.56,.64,1);
    }
    #egg-pips span.lit { opacity: 0.75; transform: scale(1); }

    @keyframes egg-spin-pop {
      0%   { transform: rotate(0deg) scale(1); }
      40%  { transform: rotate(360deg) scale(1.18); }
      70%  { transform: rotate(360deg) scale(0.93); }
      100% { transform: rotate(360deg) scale(1); }
    }
    .egg-popping { animation: egg-spin-pop 0.55s ease forwards !important; }

    .egg-confetti-dot {
      position: fixed; border-radius: 50%;
      pointer-events: none; z-index: 9999;
      animation: egg-fall linear forwards;
    }
    @keyframes egg-fall {
      from { opacity: 1; transform: translateY(0) rotate(0deg); }
      to   { opacity: 0; transform: translateY(55px) rotate(540deg); }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    const photoEl = document.querySelector('.hero-photo img');
    const photoWrap = document.querySelector('.hero-photo');
    if (!photoEl || !photoWrap) return;

    // Pip dots
    const pips = document.createElement('div');
    pips.id = 'egg-pips';
    for (let i = 0; i < CLICKS_NEEDED; i++) pips.appendChild(document.createElement('span'));
    photoWrap.appendChild(pips);

    const pipSpans = pips.querySelectorAll('span');

    function reset() {
      clicks = 0;
      pipSpans.forEach(p => p.classList.remove('lit'));
    }

    photoEl.addEventListener('click', () => {
      clearTimeout(resetTimer);
      clicks = Math.min(clicks + 1, CLICKS_NEEDED);
      pipSpans.forEach((p, i) => p.classList.toggle('lit', i < clicks));

      if (clicks < CLICKS_NEEDED) {
        photoEl.style.transform = 'scale(1.07)';
        setTimeout(() => { photoEl.style.transform = ''; }, 110);
        resetTimer = setTimeout(reset, RESET_MS);
        return;
      }

      // 5th click — spin, confetti, reset
      photoEl.classList.add('egg-popping');
      photoEl.addEventListener('animationend', () => {
        photoEl.classList.remove('egg-popping');
        reset();
      }, { once: true });
      spawnConfetti(photoEl);
    });
  });

  function spawnConfetti(anchor) {
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#c45d3e', '#a78bfa', '#f59e0b', '#10b981', '#3b82f6', '#f472b6'];
    for (let i = 0; i < 30; i++) {
      const dot = document.createElement('div');
      dot.className = 'egg-confetti-dot';
      const size = 5 + Math.random() * 6;
      const angle = Math.random() * 2 * Math.PI;
      const dist = 40 + Math.random() * 65;
      const dur = 0.45 + Math.random() * 0.5;
      dot.style.cssText = `
        width:${size}px; height:${size}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${cx + Math.cos(angle) * dist}px;
        top:${cy + Math.sin(angle) * dist + window.scrollY}px;
        animation-duration:${dur}s;
      `;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), dur * 1000 + 50);
    }
  }
})();
