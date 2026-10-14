// SupOps website. No dependencies. Without JavaScript (or with reduced motion) every
// section shows its finished state; scripting only adds motion and the small tools.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---- reveal on scroll -------------------------------------------------------
  const reveals = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('seen'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  // ---- screenshot tabs --------------------------------------------------------
  const tabs = $$('.tab');
  const img = $('#shot-img');
  const cap = $('#shot-cap');
  const select = (t) => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    img.src = t.dataset.src;
    img.alt = t.dataset.cap;
    cap.textContent = t.dataset.cap;
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next);
    });
  });
  // Warm the other screenshots once the page has settled.
  window.addEventListener('load', () => setTimeout(() => tabs.forEach((t) => { const i = new Image(); i.src = t.dataset.src; }), 1500));

  // ---- copy -------------------------------------------------------------------
  $$('.copy').forEach((b) => b.addEventListener('click', async () => {
    const label = $('span', b);
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      label.textContent = 'Copied';
    } catch {
      label.textContent = 'Select and copy';
    }
    setTimeout(() => { label.textContent = 'Copy'; }, 1800);
  }));

  // ---- the hero run -----------------------------------------------------------
  const demo = $('#demo');
  const steps = $$('.step', demo);
  const ap = $('#approval');
  const apTag = $('#ap-tag');
  const apWhy = $('#ap-why');
  const apBtns = $('#ap-btns');
  let timers = [];

  const waiting = () => {
    ap.classList.remove('ok', 'pressed');
    ap.classList.add('pulse');
    apTag.className = 'tag tag-wait';
    apTag.textContent = 'changes something · waits for you';
    apWhy.textContent = 'Deletes 31 rotated archives (19 GB). The live log is untouched.';
    apBtns.hidden = false;
  };
  const approved = () => {
    ap.classList.remove('pulse', 'pressed');
    ap.classList.add('ok');
    apTag.className = 'tag tag-run';
    apTag.textContent = 'approved by you · ran';
    apWhy.textContent = 'Approved by you. Only rotated archives; the live log is untouched.';
    apBtns.hidden = true;
  };

  const play = () => {
    timers.forEach(clearTimeout);
    timers = [];
    steps.forEach((s) => s.classList.remove('in'));
    waiting();
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    for (const s of steps) at(Number(s.dataset.t), () => s.classList.add('in'));
    const t = Number(ap.dataset.t);
    at(t + 2300, () => ap.classList.add('pressed'));
    at(t + 2600, approved);
  };

  if (!reduce && 'IntersectionObserver' in window) {
    let played = false;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !played) { played = true; play(); io.disconnect(); }
    }, { threshold: 0.2 });
    // Hide the steps until it is in view, so it plays from the start.
    steps.forEach((s) => s.classList.remove('in'));
    waiting();
    io.observe(demo);
  }
  $('#replay').addEventListener('click', () => {
    if (reduce) return;
    play();
  });

  // ---- the forecast chart -----------------------------------------------------
  // Three days of memory use with a daily rhythm and a slow leak, then the forecast:
  // the same rhythm carried forward, a likely range around it, and where it first
  // reaches 100%. Deterministic, drawn as SVG.
  const host = $('#forecast');
  if (host) {
    const W = 560, H = 250, L = 42, R = 8, T = 26, B = 28;
    const HOUR = 3600e3, DAY = 24 * HOUR;
    const now = Date.now();
    const start = now - 3 * DAY, end = now + 7 * DAY;
    const daily = (t) => Math.cos(((((t % DAY) / HOUR) - 14) / 24) * 2 * Math.PI);
    const level = (t) => 72 + 10 * daily(t) + 3.4 * ((t - now) / DAY);
    const noise = (t) => Math.sin(t / 2.3e6) * 1.1 + Math.sin(t / 0.9e6 + 1) * 0.7;
    const x = (t) => L + ((t - start) / (end - start)) * (W - L - R);
    const lo = 40, hi = 108;
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const pts = (rows) => rows.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const hist = [];
    for (let t = start; t <= now; t += HOUR) hist.push([t, level(t) + noise(t)]);
    const fc = [], up = [], down = [];
    let hit = null;
    for (let t = now; t <= end; t += HOUR) {
      const k = (t - now) / DAY;
      const v = level(t);
      const spread = 1.6 + 1.3 * k;
      if (hit === null && v >= 100) hit = t;
      if (hit !== null && t > hit) break;
      fc.push([t, v]); up.push([t, v + spread]); down.push([t, v - spread]);
    }
    if (hit) fc.push([hit, 100]);
    const band = pts(up) + ' ' + pts(down.reverse());
    const area = `${x(start)},${y(lo)} ${pts(hist)} ${x(now)},${y(lo)}`;
    const when = hit ? new Date(hit).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    const ticks = [50, 75, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#242833"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" fill="#98989f" class="ax" font-family="JetBrains Mono, monospace">${v}%</text>`).join('');
    const days = [[start, '−3 days'], [now, 'now'], [end, '+7 days']]
      .map(([t, s], i, a) => `<text x="${x(t)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}" class="day" fill="#98989f" font-family="Outfit, sans-serif">${s}</text>`).join('');

    const pill = $('.eta');
    if (pill && hit) pill.textContent = `Full in about ${Math.round((hit - now) / DAY)} days`;
    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Memory use over the last three days, rising a little each day with a daily rhythm, forecast to reach 100% at a daily peak in about five days">
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a84ff" stop-opacity="0.35"/><stop offset="1" stop-color="#0a84ff" stop-opacity="0"/></linearGradient>
        </defs>
        ${ticks}
        <rect x="${x(now)}" y="${T}" width="${W - R - x(now)}" height="${H - T - B}" fill="#0a84ff" fill-opacity="0.05"/>
        <line x1="${L}" x2="${W - R}" y1="${y(100)}" y2="${y(100)}" stroke="#ff453a" stroke-opacity="0.85" stroke-dasharray="6 5"/>
        <polygon points="${area}" fill="url(#fill)"/>
        <polyline class="hist" points="${pts(hist)}" fill="none" stroke="#0a84ff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>
        <line x1="${x(now)}" x2="${x(now)}" y1="${T}" y2="${H - B}" stroke="#f5f5f7" stroke-opacity="0.35" stroke-dasharray="3 4"/>
        <g class="fc">
          <polygon points="${band}" fill="#64a9ff" fill-opacity="0.13"/>
          <polyline points="${pts(fc)}" fill="none" stroke="#64a9ff" stroke-width="2.2" stroke-dasharray="6 5" stroke-linejoin="round"/>
          ${hit ? `<circle cx="${x(hit)}" cy="${y(100)}" r="6" fill="#ff9f0a"/><circle class="ring" cx="${x(hit)}" cy="${y(100)}" r="11" fill="none" stroke="#ff9f0a" stroke-opacity="0.6"/>
          <text x="${Math.min(x(hit), W - R - 4)}" y="${y(100) - 14}" text-anchor="end" fill="#ff9f0a" class="hit" font-weight="600" font-family="Outfit, sans-serif">Full ${when}, at the daily peak</text>` : ''}
        </g>
        ${days}
      </svg>
      <div class="legend">
        <span><i style="border-color:#0a84ff"></i>Last 3 days</span>
        <span><i style="border-color:#64a9ff;border-top-style:dashed"></i>Forecast (daily pattern)</span>
        <span><i style="border-color:#64a9ff;border-top-width:8px;opacity:.35"></i>Likely range</span>
        <span><i style="border-color:#ff453a;border-top-style:dashed"></i>Limit 100%</span>
      </div>`;

    if (!reduce && 'IntersectionObserver' in window) {
      const line = $('.hist', host), fcg = $('.fc', host);
      line.style.strokeDasharray = '1';
      line.style.strokeDashoffset = '1';
      fcg.style.opacity = '0';
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        line.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.3,1)';
        line.style.strokeDashoffset = '0';
        fcg.style.transition = 'opacity .8s ease 1.4s';
        fcg.style.opacity = '1';
      }, { threshold: 0.4 });
      io.observe(host);
    }
  }
})();
