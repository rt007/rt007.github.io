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

    #egg-card {
      display: none;
      margin-top: 14px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 18px;
      font-size: 0.87rem;
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 320px;
      box-shadow: 0 4px 20px var(--shadow);
      animation: egg-slide-in 0.3s ease;
    }
    @keyframes egg-slide-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #egg-card strong { color: var(--text); }
    #egg-dismiss {
      margin-top: 10px; display: inline-block;
      font-size: 0.75rem; color: var(--accent);
      cursor: pointer; text-decoration: underline;
      background: none; border: none; padding: 0;
      font-family: inherit;
    }

    .egg-confetti-dot {
      position: fixed; border-radius: 50%;
      pointer-events: none; z-index: 9999;
      animation: egg-fall linear forwards;
    }
    @keyframes egg-fall {
      0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
      100% { opacity: 0; transform: translateY(55px) rotate(540deg); }
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

    // Reveal card
    const card = document.createElement('div');
    card.id = 'egg-card';
    card.innerHTML = `
      <strong>You clicked 5 times.</strong><br>
      Impressive patience. Or curiosity. Either way — hi. 👋<br><br>
      <span style="font-size:0.81rem;">Most people just scroll past. You clicked a photo five times. That's either dedication or boredom — both qualities I respect.</span>
      <br><button id="egg-dismiss">okay, cool 👌</button>
    `;
    photoWrap.appendChild(card);

    document.getElementById('egg-dismiss').addEventListener('click', () => {
      card.style.display = 'none';
      pips.querySelectorAll('span').forEach(p => p.classList.remove('lit'));
      clicks = 0;
    });

    photoEl.addEventListener('click', () => {
      clearTimeout(resetTimer);
      clicks = Math.min(clicks + 1, CLICKS_NEEDED);

      // Light pips
      pips.querySelectorAll('span').forEach((p, i) => p.classList.toggle('lit', i < clicks));

      if (clicks < CLICKS_NEEDED) {
        // Subtle nudge
        photoEl.style.transform = 'scale(1.07)';
        setTimeout(() => { photoEl.style.transform = ''; }, 110);
        // Idle reset
        resetTimer = setTimeout(() => {
          clicks = 0;
          pips.querySelectorAll('span').forEach(p => p.classList.remove('lit'));
        }, RESET_MS);
        return;
      }

      // 5th click — fire!
      photoEl.classList.add('egg-popping');
      photoEl.addEventListener('animationend', () => photoEl.classList.remove('egg-popping'), { once: true });
      card.style.display = 'block';
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
