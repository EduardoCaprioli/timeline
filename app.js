/* ════════════════════════════════════════════════════════════
   TIMELINE SYSTEM — App Logic v2
   Router · Multi-view · AI · Share · Story · Constellation
   ════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════
  const state = {
    events: EVENTS.slice(),
    idx: 0,
    view: 'linear',
    theme: 'tech',
    playing: false,
    playTimer: null,
    preloadedImgs: {},
    storyPicks: new Set(),
    storyAbort: null,
    aiAbort: null,
    aiMode: 'deep',
    aiHistory: {},
    wikiCache: {},
    constell: null,
    settings: { ai_images_enabled: true, ai_images_model: 'flux' },
  };

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => (root || document).querySelectorAll(sel);
  const byId = (id) => state.events.find((e) => e.id === id);
  const trackOf = (tid) => TRACKS.find((t) => t.id === tid);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const toast = (msg, ms) => {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms || 2200);
  };
  const sortedEvents = () => state.events.slice().sort((a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m));
  const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ══════════════════════════════════════════════════════════
  // ROUTER (hash-based)
  // ══════════════════════════════════════════════════════════
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    if (!h) return { view: 'home' };
    const parts = h.split('/');
    if (parts[0] === 'e' && parts[1]) return { view: 'event', id: parts[1] };
    return { view: 'home' };
  }
  function setHash(path) {
    history.replaceState(null, '', '#/' + path);
  }
  function onHashChange() {
    const r = parseHash();
    if (r.view === 'event') {
      const ev = byId(r.id);
      if (ev) {
        state.idx = state.events.indexOf(ev);
        if (!$('tl').classList.contains('on')) enterTimeline(false);
        else renderEvent();
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════════════
  function enterTimeline(animate) {
    $('home').classList.add('gone');
    const delay = animate === false ? 0 : 350;
    setTimeout(() => {
      $('tl').classList.add('on');
      buildYearAxis();
      buildScrubber();
      buildMobileYear();
      renderEvent();
    }, delay);
  }

  function goHome() {
    if (state.playing) togglePlay();
    $('tl').classList.remove('on');
    setTimeout(() => $('home').classList.remove('gone'), 250);
    closeAI();
    setHash('');
  }

  // ══════════════════════════════════════════════════════════
  // YEAR AXIS + MOBILE YEAR
  // ══════════════════════════════════════════════════════════
  function buildYearAxis() {
    const ax = $('yaxis');
    ax.innerHTML = '';
    const total = state.events.length;
    const start = Math.max(0, Math.min(state.idx - 3, total - 7));
    const end = Math.min(total, start + 7);
    for (let i = start; i < end; i++) {
      const ev = state.events[i];
      const div = document.createElement('div');
      div.className = 'ya' + (i === state.idx ? ' active' : '');
      div.innerHTML = `<span class="ya-num">${ev.y}</span>`;
      div.onclick = () => { state.idx = i; renderEvent(); };
      ax.appendChild(div);
    }
  }

  function buildMobileYear() {
    const my = $('mobile-year');
    my.innerHTML = '';
    state.events.forEach((ev, i) => {
      const d = document.createElement('div');
      d.className = 'my-item' + (i === state.idx ? ' active' : '');
      d.textContent = ev.y;
      d.onclick = () => { state.idx = i; renderEvent(); };
      my.appendChild(d);
    });
    setTimeout(() => {
      const act = my.querySelector('.active');
      if (act) act.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  }

  // ══════════════════════════════════════════════════════════
  // SCRUBBER
  // ══════════════════════════════════════════════════════════
  function buildScrubber() {
    const tr = $('scrub-track');
    tr.querySelectorAll('.sn').forEach((n) => n.remove());
    state.events.forEach((ev, i) => {
      const pct = (i / (state.events.length - 1)) * 100;
      const sn = document.createElement('div');
      sn.className = 'sn' + (i === state.idx ? ' active' : i < state.idx ? ' passed' : '');
      sn.style.left = pct + '%';
      const lbl = document.createElement('div');
      lbl.className = 'sn-yr';
      lbl.textContent = ev.y;
      sn.appendChild(lbl);
      sn.onclick = () => { state.idx = i; renderEvent(); };
      tr.appendChild(sn);
    });
    $('scrub-fill').style.width = ((state.idx / (state.events.length - 1)) * 100) + '%';
    $('scrub-info').textContent = (state.idx + 1) + ' / ' + state.events.length;
  }

  // ══════════════════════════════════════════════════════════
  // HERO IMAGE
  // ══════════════════════════════════════════════════════════
  function preloadNearby() {
    [state.idx - 1, state.idx + 1, state.idx + 2].forEach((i) => {
      if (i < 0 || i >= state.events.length) return;
      const ev = state.events[i];
      if (state.preloadedImgs[ev.id]) return;
      const img = new Image();
      img.onload = () => { state.preloadedImgs[ev.id] = true; };
      img.src = ev.img;
    });
  }

  function loadHeroImage() {
    const ev = state.events[state.idx];
    const hero = $('hero-img');
    hero.classList.remove('loaded', 'kb');

    // Quando IA ativa: gera imagem para todos os eventos (substitui img_url)
    if (state.settings.ai_images_enabled) {
      $('img-loading').classList.remove('show');
      generateHeroImage(ev);
      return;
    }

    // IA desativada: usa img_url existente ou gradiente
    if (!ev.img) {
      $('img-loading').classList.remove('show');
      showHeroGradient(ev);
      return;
    }

    $('img-loading').classList.add('show');
    const img = new Image();
    img.onload = () => {
      hero.style.backgroundImage = `url(${ev.img})`;
      hero.classList.add('loaded');
      $('img-loading').classList.remove('show');
      requestAnimationFrame(() => hero.classList.add('kb'));
      preloadNearby();
    };
    img.onerror = () => showHeroGradient(ev);
    img.src = ev.img;

    $('img-credit-text').textContent = ev.imgCredit || '';
    $('img-credit-icon').textContent = ev.imgType === 'ai' ? 'IA' : '◆';
    $('img-credit').style.color = ev.imgType === 'ai' ? 'rgba(244,114,182,0.7)' : 'rgba(255,255,255,0.5)';
  }

  function showHeroGradient(ev) {
    const hero = $('hero-img');
    const color = TAG_COLORS[(ev.tg && ev.tg[0])] || '#5cc8b8';
    hero.style.backgroundImage = '';
    hero.style.background = `radial-gradient(circle at 70% 40%, ${color}40 0%, transparent 60%), radial-gradient(circle at 30% 80%, ${color}30 0%, transparent 70%)`;
    hero.classList.add('loaded');
    $('img-loading').classList.remove('show');
  }

  function buildImagePrompt(ev) {
    const parts = [ev.t];
    if (ev.y) parts.push(String(ev.y));
    if (ev.era) parts.push(ev.era);
    parts.push('historical scene', 'cinematic lighting', 'photorealistic', 'detailed', 'no text', 'no watermark', 'no logos');
    return parts.join(', ');
  }

  function imageHashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  async function generateHeroImage(ev) {
    const cacheKey = 'tl_ai_img_' + ev.id;
    const cached = sessionStorage.getItem(cacheKey);
    const hero = $('hero-img');
    const loader = $('img-loading');

    const model = state.settings.ai_images_model || 'flux';
    const src = cached || `https://image.pollinations.ai/prompt/${encodeURIComponent(buildImagePrompt(ev))}?width=900&height=500&model=${model}&nologo=true&seed=${imageHashSeed(ev.id)}`;

    loader.classList.add('show');
    $('img-credit-text').textContent = cached ? 'Pollinations.ai' : 'Gerando com IA...';
    $('img-credit-icon').textContent = 'IA';
    $('img-credit').style.color = 'rgba(244,114,182,0.7)';

    const img = new Image();
    img.onload = () => {
      if (!cached) sessionStorage.setItem(cacheKey, src);
      hero.style.backgroundImage = `url(${src})`;
      hero.classList.add('loaded');
      loader.classList.remove('show');
      requestAnimationFrame(() => hero.classList.add('kb'));
      $('img-credit-text').textContent = 'Pollinations.ai';
    };
    img.onerror = () => showHeroGradient(ev);
    img.src = src;
  }

  // ══════════════════════════════════════════════════════════
  // RENDER EVENT
  // ══════════════════════════════════════════════════════════
  function renderEvent() {
    const ev = state.events[state.idx];
    setHash('e/' + ev.id);
    // Tracking silencioso (não bloqueia render)
    if (window.TL_DB && window.TL_DB.available) window.TL_DB.trackView(ev.id);
    const fades = ['stamp', 'title', 'desc', 'tags', 'img-credit', 'quote-box', 'parents-box'];
    fades.forEach((id) => $(id).classList.add('out'));

    setTimeout(() => {
      $('stamp').textContent = 'Timeline · ' + ev.d + ' · ' + ev.era;
      $('title').textContent = ev.t;
      $('desc').textContent = ev.x;
      $('tags').innerHTML = ev.tg.map((tag) => {
        const c = TAG_COLORS[tag] || '#999';
        return `<span class="tg" style="color:${c};border-color:${c}40;background:${c}10">${tag}</span>`;
      }).join('');

      const qb = $('quote-box');
      if (ev.quote) {
        qb.innerHTML = `<div class="q-text">"${escapeHtml(ev.quote.text)}"</div><div class="q-by">— ${escapeHtml(ev.quote.by)}</div>`;
        qb.classList.remove('empty');
      } else { qb.innerHTML = ''; qb.classList.add('empty'); }

      const pb = $('parents-box');
      if (ev.parents && ev.parents.length) {
        const parents = ev.parents.map(byId).filter(Boolean);
        pb.innerHTML = '<span class="p-label">Causado por →</span>' + parents.map((p) =>
          `<span class="p-chip" data-id="${p.id}">${p.y} · ${p.t}</span>`
        ).join('');
        pb.classList.remove('empty');
        pb.querySelectorAll('.p-chip').forEach((el) => {
          el.onclick = () => {
            const p = byId(el.dataset.id);
            if (p) { state.idx = state.events.indexOf(p); renderEvent(); }
          };
        });
      } else { pb.innerHTML = ''; pb.classList.add('empty'); }

      const vb = $('btn-video');
      if (ev.video) { vb.style.display = ''; vb.onclick = () => openVideo(ev.video); }
      else vb.style.display = 'none';

      fades.forEach((id) => $(id).classList.remove('out'));
      loadHeroImage();
      buildYearAxis();
      buildScrubber();
      buildMobileYear();

      if ($('ai-panel').classList.contains('open')) refreshAIPanel(true);
    }, 220);
  }

  function openVideo(id) {
    const w = window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener');
    if (!w) toast('Bloqueado pelo navegador');
  }

  function navigate(d) {
    state.idx = (state.idx + d + state.events.length) % state.events.length;
    renderEvent();
  }

  function togglePlay() {
    state.playing = !state.playing;
    const btn = $('play-btn');
    if (state.playing) {
      btn.textContent = '⏸'; btn.classList.add('playing');
      state.playTimer = setInterval(() => { state.idx = (state.idx + 1) % state.events.length; renderEvent(); }, 6000);
    } else {
      btn.textContent = '▶'; btn.classList.remove('playing');
      clearInterval(state.playTimer);
    }
  }

  // ══════════════════════════════════════════════════════════
  // VIEW SWITCHER
  // ══════════════════════════════════════════════════════════
  function setView(v) {
    // Guard: se a view requisitada não existe no DOM atual, ignora silenciosamente
    if (!$(v + '-view')) return;
    state.view = v;
    $$('.vs-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    $$('.view').forEach((el) => el.classList.toggle('active', el.id === v + '-view'));
    const scrubVisible = v === 'linear';
    if ($('scrub')) $('scrub').style.display = scrubVisible ? '' : 'none';
    if ($('img-credit')) $('img-credit').style.display = scrubVisible ? '' : 'none';
    if (v === 'tracks' && $('tracks-inner')) renderTracks();
    if (v === 'constellation' && $('constellation-canvas')) renderConstellation();
  }

  // ══════════════════════════════════════════════════════════
  // MULTI-TRACK VIEW
  // ══════════════════════════════════════════════════════════
  function renderTracks() {
    const inner = $('tracks-inner');
    inner.innerHTML = '';
    const evs = sortedEvents();
    const minY = evs[0].y;
    const maxY = evs[evs.length - 1].y + 1;
    const span = maxY - minY;

    const rowH = 68;
    const padTop = 40;
    const laneLeftPx = 180;

    // SVG layer (behind nodes)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'tracks-svg';
    inner.appendChild(svg);

    const rows = {};
    TRACKS.forEach((tr, idx) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.style.top = (padTop + idx * rowH) + 'px';
      row.style.setProperty('--lane-color', tr.color);

      const label = document.createElement('div');
      label.className = 'track-label';
      label.innerHTML = `<span class="tl-icon" style="color:${tr.color}">${tr.icon}</span>${tr.label}`;
      row.appendChild(label);

      const lane = document.createElement('div');
      lane.className = 'track-lane';
      lane.style.setProperty('--lane-color', tr.color);
      row.appendChild(lane);

      inner.appendChild(row);
      rows[tr.id] = row;
    });

    const laneW = () => (inner.clientWidth || 2200) - laneLeftPx - 20;
    const posForEv = (ev) => laneLeftPx + (((ev.y - minY) + (ev.m - 1) / 12) / span) * laneW();

    const nodeMap = {};
    evs.forEach((ev) => {
      const tr = trackOf(ev.track);
      if (!tr || !rows[ev.track]) return;
      const row = rows[ev.track];
      const node = document.createElement('div');
      node.className = 'track-node';
      node.style.left = posForEv(ev) + 'px';
      node.style.setProperty('--node-color', tr.color);
      node.dataset.id = ev.id;
      node.title = ev.t + ' (' + ev.d + ')';

      const tip = document.createElement('div');
      tip.className = 'track-tip';
      tip.textContent = ev.y + ' · ' + ev.t;
      tip.style.left = posForEv(ev) + 'px';
      tip.style.top = '50%';
      tip.style.transform = 'translate(-50%, 10px)';

      node.onmouseenter = () => { tip.style.opacity = '1'; highlightCausal(ev, nodeMap, svg); };
      node.onmouseleave = () => { tip.style.opacity = '0'; clearCausal(nodeMap, svg); };
      node.onclick = () => {
        state.idx = state.events.indexOf(ev);
        setView('linear');
        renderEvent();
      };

      row.appendChild(node);
      row.appendChild(tip);
      nodeMap[ev.id] = { node, ev, x: posForEv(ev), trackIdx: TRACKS.findIndex((t) => t.id === ev.track) };
    });

    // Axis
    const axis = document.createElement('div');
    axis.id = 'tracks-axis';
    axis.style.left = laneLeftPx + 'px';
    const decades = [];
    let dec = Math.ceil(minY / 10) * 10;
    while (dec <= maxY) { decades.push(dec); dec += 10; }
    decades.forEach((y) => {
      const t = document.createElement('div');
      t.className = 'ta-tick';
      const frac = (y - minY) / span;
      t.style.left = (frac * laneW()) + 'px';
      t.textContent = y;
      axis.appendChild(t);
    });
    inner.appendChild(axis);
  }

  function highlightCausal(ev, nodeMap, svg) {
    const visited = new Set();
    const edges = [];
    (function walk(eid) {
      if (visited.has(eid)) return;
      visited.add(eid);
      const e = byId(eid);
      if (!e) return;
      (e.parents || []).forEach((pid) => {
        if (nodeMap[pid]) edges.push([eid, pid]);
        walk(pid);
      });
    })(ev.id);

    Object.values(nodeMap).forEach(({ node, ev: e }) => {
      if (visited.has(e.id)) { node.classList.add('highlight'); node.classList.remove('dim'); }
      else node.classList.add('dim');
    });

    svg.innerHTML = '';
    const rowH = 68, padTop = 40;
    const cellY = (t) => padTop + t * rowH + rowH / 2;

    edges.forEach(([a, b]) => {
      const aN = nodeMap[a], bN = nodeMap[b];
      if (!aN || !bN) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x1 = aN.x - 180, y1 = cellY(aN.trackIdx);
      const x2 = bN.x - 180, y2 = cellY(bN.trackIdx);
      const mx = (x1 + x2) / 2;
      path.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
      svg.appendChild(path);
    });
    svg.classList.add('show');
  }

  function clearCausal(nodeMap, svg) {
    Object.values(nodeMap).forEach(({ node }) => node.classList.remove('highlight', 'dim'));
    svg.classList.remove('show');
    svg.innerHTML = '';
  }

  // ══════════════════════════════════════════════════════════
  // CONSTELLATION VIEW (CANVAS)
  // ══════════════════════════════════════════════════════════
  function renderConstellation() {
    const cv = $('constellation-canvas');
    const hover = $('constellation-hover');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    cv.width = rect.width * dpr;
    cv.height = rect.height * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width, H = rect.height;
    const cx = W / 2, cy = H / 2 + 10;

    const evs = sortedEvents();
    const minY = evs[0].y;
    const maxY = evs[evs.length - 1].y;
    const span = maxY - minY;

    const maxR = Math.min(W, H) * 0.42;
    const nodes = evs.map((ev) => {
      const t = (ev.y - minY + (ev.m - 1) / 12) / span;
      const r = lerp(40, maxR, t);
      const angle = -Math.PI / 2 + t * Math.PI * 2.3;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const tr = trackOf(ev.track);
      return {
        ev, x, y, r,
        size: (ev.importance || 3) * 1.1 + 2,
        color: (tr && tr.color) || '#fff',
      };
    });

    const stars = [];
    for (let i = 0; i < 220; i++) {
      stars.push({
        x: Math.random() * W - W / 2,
        y: Math.random() * H - H / 2,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random() * 0.6 + 0.1
      });
    }

    const cs = state.constell = {
      nodes, stars, cv, ctx, W, H, cx, cy,
      scale: 1, tx: 0, ty: 0,
      hoverIdx: -1, ancestors: new Set(), drag: null,
    };

    function draw() {
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.translate(cx + cs.tx, cy + cs.ty);
      for (const s of cs.stars) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(s.x * 0.7, s.y * 0.7, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(cx + cs.tx, cy + cs.ty);
      ctx.scale(cs.scale, cs.scale);

      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.003) {
        const rr = lerp(40, maxR, t);
        const a = -Math.PI / 2 + t * Math.PI * 2.3;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1 / cs.scale;
      ctx.stroke();

      ctx.lineWidth = 1 / cs.scale;
      for (const n of nodes) {
        const ev = n.ev;
        if (!ev.parents) continue;
        for (const pid of ev.parents) {
          const p = nodes.find((nn) => nn.ev.id === pid);
          if (!p) continue;
          const isHighlight = cs.hoverIdx >= 0 && cs.ancestors.has(ev.id) && cs.ancestors.has(pid);
          ctx.globalAlpha = isHighlight ? 0.7 : 0.08;
          ctx.strokeStyle = isHighlight ? n.color : '#5cc8b8';
          ctx.beginPath();
          const mx = (n.x + p.x) / 2, my = (n.y + p.y) / 2 - 20;
          ctx.moveTo(n.x, n.y);
          ctx.quadraticCurveTo(mx, my, p.x, p.y);
          ctx.stroke();
        }
      }

      nodes.forEach((n, i) => {
        const highlight = cs.hoverIdx === i || cs.ancestors.has(n.ev.id);
        const dim = cs.hoverIdx >= 0 && !highlight;
        ctx.globalAlpha = dim ? 0.25 : 1;

        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 4);
        grd.addColorStop(0, n.color + 'cc');
        grd.addColorStop(1, n.color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = highlight ? '#fff' : n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();

        if (highlight) {
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 1 / cs.scale;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.size + 4 / cs.scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 0.5;
      ctx.font = '10px Sora';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'center';
      [1876, 1947, 1976, 1989, 2007, 2012, 2022].forEach((y) => {
        if (y < minY || y > maxY) return;
        const t = (y - minY) / span;
        const rr = lerp(40, maxR, t);
        const a = -Math.PI / 2 + t * Math.PI * 2.3;
        ctx.fillText(y, Math.cos(a) * (rr + 18), Math.sin(a) * (rr + 18));
      });

      ctx.restore();
    }

    cs.draw = draw;
    draw();

    function screenToWorld(sx, sy) {
      return { x: (sx - cx - cs.tx) / cs.scale, y: (sy - cy - cs.ty) / cs.scale };
    }
    function hitTest(sx, sy) {
      const p = screenToWorld(sx, sy);
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = p.x - n.x, dy = p.y - n.y;
        if (Math.sqrt(dx * dx + dy * dy) <= n.size + 4) return i;
      }
      return -1;
    }
    function collectAncestors(id, s) {
      if (s.has(id)) return;
      s.add(id);
      const ev = byId(id);
      if (!ev || !ev.parents) return;
      ev.parents.forEach((pid) => collectAncestors(pid, s));
    }

    cv.onmousemove = (e) => {
      const r = cv.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (cs.drag) {
        cs.tx = cs.dragStartTx + (sx - cs.drag.x);
        cs.ty = cs.dragStartTy + (sy - cs.drag.y);
        draw();
        return;
      }
      const hit = hitTest(sx, sy);
      if (hit !== cs.hoverIdx) {
        cs.hoverIdx = hit;
        cs.ancestors.clear();
        if (hit >= 0) collectAncestors(nodes[hit].ev.id, cs.ancestors);
        draw();
      }
      if (hit >= 0) {
        const ev = nodes[hit].ev;
        const tr = trackOf(ev.track);
        hover.querySelector('.ch-year').textContent = ev.d + ' · ' + ev.era;
        hover.querySelector('.ch-title').textContent = ev.t;
        hover.querySelector('.ch-track').textContent = tr ? tr.label : '';
        hover.style.left = e.clientX + 'px';
        hover.style.top = e.clientY + 'px';
        hover.classList.add('show');
      } else hover.classList.remove('show');
    };
    cv.onmouseleave = () => {
      cs.hoverIdx = -1;
      cs.ancestors.clear();
      hover.classList.remove('show');
      draw();
    };
    cv.onmousedown = (e) => {
      const r = cv.getBoundingClientRect();
      cs.drag = { x: e.clientX - r.left, y: e.clientY - r.top };
      cs.dragStartTx = cs.tx;
      cs.dragStartTy = cs.ty;
    };
    window.addEventListener('mouseup', () => { cs.drag = null; });
    cv.onclick = (e) => {
      if (cs.drag && (Math.abs(cs.tx - cs.dragStartTx) > 3 || Math.abs(cs.ty - cs.dragStartTy) > 3)) return;
      const r = cv.getBoundingClientRect();
      const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (hit >= 0) {
        state.idx = state.events.indexOf(nodes[hit].ev);
        setView('linear');
        renderEvent();
      }
    };
    cv.onwheel = (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 0.92 : 1.08;
      cs.scale = clamp(cs.scale * f, 0.4, 4);
      draw();
    };
  }

  window.addEventListener('resize', () => {
    if (state.view === 'constellation') renderConstellation();
    if (state.view === 'tracks') renderTracks();
  });

  // ══════════════════════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════════════════════
  async function searchTerm(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) { enterTimeline(); return; }

    const found = state.events.findIndex((ev) =>
      ev.t.toLowerCase().includes(q) ||
      ev.x.toLowerCase().includes(q) ||
      ev.tg.some((t) => t.toLowerCase().includes(q)) ||
      ev.y.toString().includes(q) ||
      ev.era.toLowerCase().includes(q) ||
      ev.id.includes(q.replace(/\s+/g, '-'))
    );

    // Tracking de busca
    if (window.TL_DB && window.TL_DB.available) {
      window.TL_DB.trackSearch(q, found >= 0 ? 1 : 0, false);
    }

    if (found >= 0) {
      state.idx = found;
      enterTimeline();
      return;
    }

    // Não encontrou localmente — tentar gerar com IA se houver provedor
    const pid = getActiveProvider();
    const prov = PROVIDERS.find((p) => p.id === pid);
    if (!prov || !getProviderKey(pid)) {
      enterTimeline();
      toast('Sem resultado para "' + query + '". Configure um provedor de IA para gerar dinamicamente.', 3500);
      return;
    }

    toast('Buscando com IA...', 4000);
    try {
      const generated = await aiGenerateEvent(query, prov);
      if (!generated || generated.error) {
        enterTimeline();
        toast('Nenhum evento histórico encontrado para esta busca.', 3000);
        return;
      }

      // Marcar como gerado por IA e adicionar à frente do array (não persistido)
      generated.aiGenerated = true;
      state.events = [generated].concat(state.events);
      state.idx = 0;

      // Enviar para fila de moderação no Supabase (silencioso)
      if (window.TL_DB && window.TL_DB.available) {
        try {
          await window.TL_DB.submitContribution({
            eventId: generated.id,
            contributionType: 'new_event',
            valueAfter: generated.t,
            fullEventJson: aiEventToDbRow(generated),
            source: 'ai',
            aiModel: prov.model,
          });
          window.TL_DB.trackSearch(q, 1, true);
        } catch (e) { /* silencioso */ }
      }

      enterTimeline();
      toast('Evento gerado pela IA · aguarda curadoria', 3800);
    } catch (err) {
      enterTimeline();
      toast('Erro na busca IA: ' + err.message, 3500);
    }
  }

  async function aiGenerateEvent(query, prov) {
    const prompt = `O usuário buscou: "${query}" em uma timeline de história da tecnologia.

Gere um evento histórico REAL e VERIFICÁVEL relacionado a esta busca, no formato JSON abaixo. Responda APENAS com o JSON, sem qualquer texto antes ou depois.

{
  "id": "slug-unico-ano",
  "y": 1991,
  "m": 8,
  "d": "AGO · 1991",
  "era": "Era da Computação",
  "track": "software",
  "t": "Título curto e impactante",
  "x": "Descrição de 2-3 frases no estilo jornalístico cinematográfico. Use fatos REAIS e verificáveis.",
  "tg": ["software", "cultura"],
  "parents": [],
  "importance": 4,
  "img": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80",
  "imgCredit": "Gerada por IA · Descrição",
  "imgType": "ai",
  "quote": { "text": "Citação real se existir", "by": "Pessoa, contexto" }
}

Regras:
- track DEVE ser um destes valores: hardware, software, ia, rede, cultura
- importance é de 1 a 5
- Se não houver evento histórico real relacionado a "${query}", retorne: {"error":"sem_evento_real"}
- Use uma URL real de imagem do Unsplash (formato images.unsplash.com/photo-XXXXXX). Se não souber, omita o campo "img".`;

    const text = await callProviderOnce({ provider: prov, sys: '', messages: [{ role: 'user', content: prompt }] });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('resposta sem JSON');
    return JSON.parse(m[0]);
  }

  function aiEventToDbRow(ev) {
    return {
      id: ev.id, year: ev.y, month: ev.m, date_display: ev.d, era: ev.era,
      track: ev.track, title: ev.t, description: ev.x,
      tags: ev.tg || [], parents: ev.parents || [],
      importance: ev.importance || 3,
      img_url: ev.img || null, img_credit: ev.imgCredit || null,
      img_type: ev.imgType || 'ai',
      quote_text: (ev.quote && ev.quote.text) || null,
      quote_by: (ev.quote && ev.quote.by) || null,
      video_id: ev.video || null,
      is_published: false,
    };
  }

  // ══════════════════════════════════════════════════════════
  // AI PROVIDERS
  // ══════════════════════════════════════════════════════════
  const PROVIDERS = [
    { id: 'gemini', name: 'Gemini 1.5 Flash', vendor: 'Google', model: 'gemini-1.5-flash', free: true,
      placeholder: 'AIza...', keyUrl: 'https://aistudio.google.com/apikey' },
    { id: 'groq', name: 'Groq', vendor: 'Meta · Groq', model: 'llama-3.3-70b-versatile', free: true,
      placeholder: 'gsk_...', keyUrl: 'https://console.groq.com/keys' },
    { id: 'claude', name: 'Claude Sonnet', vendor: 'Anthropic', model: 'claude-sonnet-4-6', free: false,
      placeholder: 'sk-ant-...', keyUrl: 'https://console.anthropic.com/' },
    { id: 'openai', name: 'GPT-4o mini', vendor: 'OpenAI', model: 'gpt-4o-mini', free: false,
      placeholder: 'sk-...', keyUrl: 'https://platform.openai.com/api-keys' },
  ];
  const PROVIDER_LS = 'tl_provider';
  const KEY_LS = (id) => 'tl_key_' + id;

  function getActiveProvider() { return localStorage.getItem(PROVIDER_LS) || ''; }
  function setActiveProvider(id) { localStorage.setItem(PROVIDER_LS, id); }
  function getProviderKey(id) { return localStorage.getItem(KEY_LS(id)) || ''; }
  function setProviderKey(id, key) { localStorage.setItem(KEY_LS(id), key); }

  function migrateOldKey() {
    const old = localStorage.getItem('tl_anthropic_key');
    if (old && !getProviderKey('claude')) {
      setProviderKey('claude', old);
      if (!getActiveProvider()) setActiveProvider('claude');
    }
  }

  function openAI(mode) {
    state.aiMode = mode || 'deep';
    $$('.ai-tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === state.aiMode));
    $('ai-panel').classList.add('open');
    refreshAIPanel(true);
  }
  function closeAI() {
    $('ai-panel').classList.remove('open');
    if (state.aiAbort) { try { state.aiAbort.abort(); } catch (e) {} state.aiAbort = null; }
  }

  function refreshAIPanel(auto) {
    const ev = state.events[state.idx];
    const titles = { deep: 'Aprofundar', counterfactual: 'E se não tivesse acontecido?', chat: 'Pergunte', wiki: 'Wikipedia' };
    $('ai-title').textContent = titles[state.aiMode] || 'Aprofundar';
    $('ai-subtitle').textContent = ev.y + ' · ' + ev.t;

    const body = $('ai-body');
    const inputWrap = $('ai-input-wrap');
    const keyNotice = $('ai-key-notice');

    if (state.aiMode === 'wiki') {
      inputWrap.style.display = 'none';
      if (keyNotice) keyNotice.style.display = 'none';
      loadWiki(ev);
      return;
    }

    if (keyNotice) keyNotice.style.display = '';

    if (state.aiMode === 'chat') {
      inputWrap.style.display = '';
      const hist = state.aiHistory[ev.id] || [];
      if (hist.length === 0) {
        body.innerHTML = '<div class="empty">Pergunte algo sobre este momento — contexto, pessoas, consequências, paralelos históricos...</div>';
      } else {
        body.innerHTML = hist.map((m) =>
          m.role === 'user'
            ? `<div class="msg-user">${escapeHtml(m.content)}</div>`
            : `<div class="msg-ai"><p>${escapeHtml(m.content).replace(/\n\n+/g, '</p><p>')}</p></div>`
        ).join('');
      }
      body.scrollTop = body.scrollHeight;
      return;
    }

    inputWrap.style.display = 'none';
    if (auto) {
      body.innerHTML = '<div class="msg-ai typing"></div>';
      runAIStream(state.aiMode, ev);
    }
  }

  async function runAIStream(mode, ev) {
    if (state.aiAbort) { try { state.aiAbort.abort(); } catch (e) {} }
    const abort = new AbortController();
    state.aiAbort = abort;

    const body = $('ai-body');
    const target = body.querySelector('.msg-ai.typing') || (() => {
      const d = document.createElement('div');
      d.className = 'msg-ai typing';
      body.appendChild(d);
      return d;
    })();

    const sys = buildSystemPrompt();
    const userPrompt = buildUserPrompt(mode, ev);

    const activeProv = PROVIDERS.find((p) => p.id === getActiveProvider());
    const hasKey = activeProv && getProviderKey(activeProv.id);
    try {
      if (activeProv && hasKey) {
        await streamFromProvider({
          provider: activeProv, sys, messages: [{ role: 'user', content: userPrompt }],
          onDelta: (t) => { appendText(target, t); body.scrollTop = body.scrollHeight; },
          signal: abort.signal,
        });
      } else {
        await demoStream(mode, ev, (t) => { appendText(target, t); body.scrollTop = body.scrollHeight; }, abort.signal);
      }
      target.classList.remove('typing');
    } catch (err) {
      if (err.name !== 'AbortError') {
        appendText(target, `\n\n[erro: ${err.message}. Configure um provedor de IA ou use modo demo.]`);
        target.classList.remove('typing');
      }
    }
  }

  function appendText(el, t) {
    const cur = el.dataset.raw || '';
    const next = cur + t;
    el.dataset.raw = next;
    // Convert markdown-ish **bold** and paragraphs
    const html = escapeHtml(next)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n+/g, '</p><p>');
    el.innerHTML = '<p>' + html + '</p>';
  }

  function buildSystemPrompt() {
    return 'Você é um historiador da tecnologia escrevendo para o Timeline System — um app visual que conta a história da computação e da internet. Sua voz é concisa, evocativa, informada. Escreva em português do Brasil. Prefira parágrafos curtos (2-4 frases). Use negrito markdown **assim** para nomes, datas e conceitos importantes. Seja factual mas cinematográfico. Evite listas com bullets.';
  }

  function buildUserPrompt(mode, ev) {
    const ctx = `CONTEXTO DO EVENTO:\n- Data: ${ev.d}\n- Era: ${ev.era}\n- Título: ${ev.t}\n- Descrição curta: ${ev.x}\n- Tags: ${ev.tg.join(', ')}${ev.parents && ev.parents.length ? '\n- Causado por: ' + ev.parents.map((p) => { const pe = byId(p); return pe ? `${pe.y} ${pe.t}` : p; }).join(' · ') : ''}`;

    if (mode === 'deep') {
      return `${ctx}\n\nAprofunde este momento em 3 parágrafos curtos:\n1. Contexto histórico imediato (o que estava acontecendo no mundo)\n2. Personagens e detalhes menos conhecidos\n3. Impacto duradouro que ainda sentimos hoje\n\nComece direto, sem preâmbulo.`;
    }
    if (mode === 'counterfactual') {
      return `${ctx}\n\nImagine um mundo onde este evento NÃO aconteceu — ou aconteceu muito diferente. Em 3 parágrafos curtos, especule de forma fundamentada:\n1. O que teria acontecido no lugar?\n2. Como a história da tecnologia seria alterada?\n3. O que não existiria hoje?\n\nSeja ousado mas plausível.`;
    }
    return ctx;
  }

  function httpErrorMsg(provider, status) {
    if (status === 429) return provider + ': limite de requisições atingido — aguarde alguns segundos e tente novamente.';
    if (status === 401) return provider + ': chave inválida — verifique a chave no modal de provedor.';
    if (status === 403) return provider + ': acesso negado — verifique as permissões da chave.';
    return provider + ': erro ' + status + ' — verifique a chave e tente novamente.';
  }

  // ── Provider dispatch ────────────────────────────────────
  async function streamFromProvider({ provider, sys, messages, onDelta, signal }) {
    const key = getProviderKey(provider.id);
    if (!key) throw new Error('Chave não configurada para ' + provider.name);
    switch (provider.id) {
      case 'gemini':  return streamFromGemini({ key, model: provider.model, sys, messages, onDelta, signal });
      case 'groq':    return streamFromOpenAICompat({ endpoint: 'https://api.groq.com/openai/v1/chat/completions', key, model: provider.model, sys, messages, onDelta, signal });
      case 'openai':  return streamFromOpenAICompat({ endpoint: 'https://api.openai.com/v1/chat/completions', key, model: provider.model, sys, messages, onDelta, signal });
      case 'claude':  return streamFromAnthropic({ key, sys, messages, onDelta, signal });
      default: throw new Error('Provedor desconhecido: ' + provider.id);
    }
  }

  async function streamFromGemini({ key, model, sys, messages, onDelta, signal }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(key)}&alt=sse`;
    const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const body = { contents, generationConfig: { maxOutputTokens: 1200 } };
    if (sys) body.system_instruction = { parts: [{ text: sys }] };
    const resp = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { throw new Error(httpErrorMsg('Gemini', resp.status)); }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try { const d = JSON.parse(payload); const t = d?.candidates?.[0]?.content?.parts?.[0]?.text; if (t) onDelta(t); } catch (e) {}
      }
    }
  }

  async function streamFromOpenAICompat({ endpoint, key, model, sys, messages, onDelta, signal }) {
    const resp = await fetch(endpoint, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, max_tokens: 1200, stream: true, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    if (!resp.ok) { throw new Error(httpErrorMsg(provider.id === 'groq' ? 'Groq' : 'OpenAI', resp.status)); }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try { const d = JSON.parse(payload); const t = d?.choices?.[0]?.delta?.content; if (t) onDelta(t); } catch (e) {}
      }
    }
  }

  async function callProviderOnce({ provider, sys, messages }) {
    const key = getProviderKey(provider.id);
    if (!key) throw new Error('Chave não configurada para ' + provider.name);
    switch (provider.id) {
      case 'gemini': {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${encodeURIComponent(key)}`;
        const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const b = { contents, generationConfig: { maxOutputTokens: 800 } };
        if (sys) b.system_instruction = { parts: [{ text: sys }] };
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
        if (!resp.ok) throw new Error(httpErrorMsg('Gemini', resp.status));
        const data = await resp.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      case 'groq':
      case 'openai': {
        const ep = provider.id === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
        const resp = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: provider.model, max_tokens: 800, messages: [{ role: 'system', content: sys }, ...messages] }),
        });
        if (!resp.ok) throw new Error(httpErrorMsg(provider.id === 'groq' ? 'Groq' : 'OpenAI', resp.status));
        const data = await resp.json();
        return data?.choices?.[0]?.message?.content || '';
      }
      case 'claude': {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: provider.model, max_tokens: 800, system: sys, messages }),
        });
        if (!resp.ok) throw new Error(httpErrorMsg('Claude', resp.status));
        const data = await resp.json();
        return (data.content && data.content[0] && data.content[0].text) || '';
      }
    }
    return '';
  }

  async function streamFromAnthropic({ key, sys, messages, onDelta, signal }) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, system: sys, messages, stream: true }),
    });
    if (!resp.ok) { throw new Error(httpErrorMsg('Claude', resp.status)); }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') onDelta(evt.delta.text);
        } catch (e) {}
      }
    }
  }

  async function demoStream(mode, ev, onDelta, signal) {
    const text = buildDemoText(mode, ev);
    for (let i = 0; i < text.length; i++) {
      if (signal.aborted) throw new DOMException('abort', 'AbortError');
      onDelta(text[i]);
      await new Promise((r) => setTimeout(r, 6 + Math.random() * 10));
    }
  }

  function buildDemoText(mode, ev) {
    const parents = (ev.parents || []).map(byId).filter(Boolean);
    const parentsStr = parents.map((p) => p.t).join(', ');
    if (mode === 'deep') {
      return `Em **${ev.d}**, ${ev.t.toLowerCase()}. ${ev.x}\n\nEste momento não surgiu do vazio — foi possibilitado por **${parentsStr || 'décadas de trabalho coletivo'}**. Quem viveu esse período raramente percebeu que estava presenciando algo tão definitivo. A distância temporal é o que torna óbvio o que na época era apenas mais uma notícia.\n\nO impacto duradouro: cada tecnologia que usamos hoje carrega, de alguma forma, o DNA desse acontecimento. Sua influência continua ativa em dispositivos, protocolos e rotinas que damos como naturais.\n\n**[Modo demo · configure um provedor de IA para respostas reais.]**`;
    }
    if (mode === 'counterfactual') {
      return `Sem **${ev.t.toLowerCase()}**, o caminho da tecnologia teria sido outro. ${parentsStr ? `As bases já estavam lá — ${parentsStr} —, ` : ''}mas o momento crítico teria chegado mais tarde, talvez em outro país, com outros protagonistas.\n\nA cultura digital como conhecemos seria atrasada em uma década ou se moldaria em torno de outros centros de poder. Algumas empresas gigantes que dependem deste marco simplesmente **não existiriam**.\n\nO mais provável: outra tecnologia preencheria o vácuo, mas com prioridades, valores e limitações diferentes. A internet que você está usando agora seria estranha para seus olhos.\n\n**[Modo demo · configure um provedor de IA para um cenário contrafactual detalhado.]**`;
    }
    return '[Modo demo]';
  }

  // ══════════════════════════════════════════════════════════
  // WIKIPEDIA
  // ══════════════════════════════════════════════════════════
  async function fetchWikiSummary(title) {
    const encoded = encodeURIComponent(title);
    for (const lang of ['pt', 'en']) {
      try {
        const resp = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
          headers: { Accept: 'application/json; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/Summary/1.0.0"' },
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') continue;
        if (!data.extract || data.extract.length < 30) continue;
        return Object.assign(data, { lang });
      } catch (e) { /* tenta próximo */ }
    }
    return null;
  }

  async function loadWiki(ev) {
    const body = $('ai-body');
    if (ev.id in state.wikiCache) {
      renderWikiResult(body, state.wikiCache[ev.id]);
      return;
    }
    body.innerHTML = '<div class="msg-ai typing"></div>';
    const result = await fetchWikiSummary(ev.t);
    state.wikiCache[ev.id] = result;
    renderWikiResult(body, result);
  }

  function renderWikiResult(body, data) {
    if (!data) {
      body.innerHTML = '<div class="empty">Nenhum artigo encontrado na Wikipedia para este evento.</div>';
      return;
    }
    const langNote = data.lang === 'en' ? ' <span class="wiki-lang">em inglês</span>' : '';
    const thumb = (data.thumbnail && data.thumbnail.source)
      ? `<img class="wiki-thumb" src="${escapeHtml(data.thumbnail.source)}" alt="" />`
      : '';
    const paras = (data.extract || '').split(/\n+/).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    const pageUrl = data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page;
    const link = pageUrl ? `<a class="wiki-link" href="${escapeHtml(pageUrl)}" target="_blank" rel="noopener">Ler artigo completo na Wikipedia →</a>` : '';
    body.innerHTML = `
      <div class="wiki-block">
        ${thumb}
        <div class="wiki-body">
          <div class="wiki-title">${escapeHtml(data.title)}${langNote}</div>
          <div class="wiki-extract">${paras}</div>
          ${link}
        </div>
      </div>
      <div class="wiki-attr">Fonte: Wikipedia · Licença CC BY-SA 3.0</div>`;
  }

  async function sendChatMessage(text) {
    const ev = state.events[state.idx];
    const hist = state.aiHistory[ev.id] = state.aiHistory[ev.id] || [];
    hist.push({ role: 'user', content: text });
    refreshAIPanel(false);

    const body = $('ai-body');
    const ai = document.createElement('div');
    ai.className = 'msg-ai typing';
    body.appendChild(ai);
    body.scrollTop = body.scrollHeight;

    const abort = new AbortController();
    state.aiAbort = abort;

    const sys = buildSystemPrompt();
    const msgs = [
      { role: 'user', content: buildUserPrompt('deep', ev) },
      ...hist.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const chatProv = PROVIDERS.find((p) => p.id === getActiveProvider());
      const chatKey = chatProv && getProviderKey(chatProv.id);
      if (chatProv && chatKey) {
        await streamFromProvider({ provider: chatProv, sys, messages: msgs,
          onDelta: (t) => { appendText(ai, t); body.scrollTop = body.scrollHeight; },
          signal: abort.signal });
      } else {
        const reply = `Sobre "${text}" em relação a **${ev.t}**: uma resposta profunda e contextualizada exige um provedor de IA. Configure um provedor no painel acima para investigar qualquer ângulo deste momento histórico.`;
        for (let i = 0; i < reply.length; i++) {
          if (abort.signal.aborted) throw new DOMException('abort', 'AbortError');
          appendText(ai, reply[i]);
          await new Promise((r) => setTimeout(r, 10));
        }
      }
      ai.classList.remove('typing');
      hist.push({ role: 'assistant', content: ai.dataset.raw || '' });
    } catch (err) {
      if (err.name !== 'AbortError') {
        appendText(ai, `\n\n[erro: ${err.message}]`);
        ai.classList.remove('typing');
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // SHARE + CANVAS OG
  // ══════════════════════════════════════════════════════════
  function openShare() {
    const ev = state.events[state.idx];
    const url = location.origin + location.pathname + '#/e/' + ev.id;
    $('share-url-input').value = url;
    const canvas = buildShareCanvas(ev);
    const preview = $('share-preview');
    preview.innerHTML = '';
    preview.appendChild(canvas);

    $('share-twitter').href = 'https://twitter.com/intent/tweet?text=' +
      encodeURIComponent(`${ev.y} — ${ev.t} · via Timeline ${url}`);

    $('share-download').onclick = () => {
      const link = document.createElement('a');
      link.download = 'timeline-' + ev.id + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    $('share-copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copiado');
      } catch (e) {
        $('share-url-input').select();
        document.execCommand('copy');
        toast('Link copiado');
      }
    };
    openModal('share-modal');
  }

  function buildShareCanvas(ev) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, 1200, 630);
    grd.addColorStop(0, '#1a1f2e');
    grd.addColorStop(1, '#0a0d14');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1200, 630);

    const tr = trackOf(ev.track);
    const accent = (tr && tr.color) || '#5cc8b8';

    const paintOverlay = () => {
      const gx = ctx.createLinearGradient(0, 0, 1200, 0);
      gx.addColorStop(0, 'rgba(10,13,20,0.98)');
      gx.addColorStop(0.55, 'rgba(10,13,20,0.7)');
      gx.addColorStop(1, 'rgba(10,13,20,0.3)');
      ctx.fillStyle = gx;
      ctx.fillRect(0, 0, 1200, 630);

      ctx.fillStyle = accent;
      ctx.font = '500 14px Sora, sans-serif';
      ctx.fillText('TIMELINE · ' + ev.era.toUpperCase(), 60, 80);
      ctx.fillRect(60, 92, 54, 1);

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '200 220px Sora, sans-serif';
      ctx.fillText(ev.y, 60, 340);

      ctx.fillStyle = '#fff';
      ctx.font = '600 44px Sora, sans-serif';
      wrapText(ctx, ev.t, 60, 400, 640, 54);

      ctx.fillStyle = accent;
      ctx.font = '400 14px Sora, sans-serif';
      ctx.fillText(ev.d, 60, 540);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '300 12px Sora, sans-serif';
      ctx.fillText('Powered by AI · Curated by Community', 60, 580);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        ctx.save();
        ctx.globalAlpha = 0.4;
        const w = 700, h = 630;
        const ar = img.width / img.height;
        let iw = w, ih = w / ar;
        if (ih < h) { ih = h; iw = h * ar; }
        const ix = 1200 - w + (w - iw) / 2;
        const iy = (h - ih) / 2;
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.restore();
      } catch (e) {}
      paintOverlay();
    };
    img.onerror = paintOverlay;
    img.src = ev.img;

    // Paint overlay immediately for preview, image will paint on load
    paintOverlay();
    return canvas;
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), x, yy);
        line = w + ' ';
        yy += lh;
      } else line = test;
    }
    if (line) ctx.fillText(line.trim(), x, yy);
  }

  // ══════════════════════════════════════════════════════════
  // STORY MODE
  // ══════════════════════════════════════════════════════════
  function openStory() {
    const picker = $('story-picker');
    picker.innerHTML = '';
    state.storyPicks.clear();
    updateStoryCount();
    state.events.forEach((ev) => {
      const item = document.createElement('div');
      item.className = 'sp-item';
      item.innerHTML = `<div class="sp-year">${ev.y}</div><div class="sp-title">${ev.t}</div>`;
      item.onclick = () => {
        if (state.storyPicks.has(ev.id)) { state.storyPicks.delete(ev.id); item.classList.remove('on'); }
        else {
          if (state.storyPicks.size >= 5) { toast('Máximo 5 momentos'); return; }
          state.storyPicks.add(ev.id); item.classList.add('on');
        }
        updateStoryCount();
      };
      picker.appendChild(item);
    });
    $('story-start').onclick = startStory;
    openModal('story-modal');
  }

  function updateStoryCount() {
    const n = state.storyPicks.size;
    $('story-count').textContent = n + ' selecionado' + (n === 1 ? '' : 's');
    $('story-start').disabled = n < 2;
  }

  async function startStory() {
    const ids = Array.from(state.storyPicks);
    const picks = ids.map(byId).filter(Boolean).sort((a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m));
    if (picks.length < 2) return;
    closeModal('story-modal');

    $('story-play').classList.add('on');
    const text = $('story-play-text');
    text.textContent = '';
    text.dataset.raw = '';
    text.classList.remove('done');

    let cur = 0;
    function showFrame(i) {
      const ev = picks[i];
      $('story-play-era').textContent = ev.d + ' · ' + ev.era + ' · ' + ev.t;
      const bg = $('story-play-bg');
      bg.classList.remove('loaded');
      const img = new Image();
      img.onload = () => { bg.style.backgroundImage = `url(${ev.img})`; bg.classList.add('loaded'); };
      img.src = ev.img;
      $('story-play-progress').textContent = (i + 1) + ' / ' + picks.length;
    }
    showFrame(0);

    const sys = buildSystemPrompt() + ' Você está narrando uma história que conecta múltiplos eventos em sequência cronológica. Escreva um ÚNICO fluxo narrativo coeso, de 4-6 parágrafos curtos, que amarra os eventos em uma única jornada. Separe parágrafos com dupla quebra de linha (\\n\\n). Cite datas e nomes com naturalidade.';
    const ctx = 'EVENTOS SELECIONADOS (em ordem cronológica):\n\n' + picks.map((p, i) =>
      `${i + 1}. ${p.d} · ${p.t}\n   ${p.x}`
    ).join('\n\n') + '\n\nAgora, conte a história que os conecta — um arco narrativo único, não resumos separados.';

    const abort = new AbortController();
    state.storyAbort = abort;
    let paraCount = 0;

    const onDelta = (t) => {
      const before = text.dataset.raw || '';
      const after = before + t;
      text.dataset.raw = after;
      text.innerHTML = escapeHtml(after)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n+/g, '<br/><br/>');

      const paras = after.split(/\n\n+/).length;
      if (paras > paraCount + 1 && cur < picks.length - 1) {
        paraCount = paras - 1;
        cur++;
        showFrame(Math.min(cur, picks.length - 1));
      }
    };

    try {
      const storyProv = PROVIDERS.find((p) => p.id === getActiveProvider());
      const storyKey = storyProv && getProviderKey(storyProv.id);
      if (storyProv && storyKey) {
        await streamFromProvider({ provider: storyProv, sys, messages: [{ role: 'user', content: ctx }], onDelta, signal: abort.signal });
      } else {
        const fallback = buildStoryDemo(picks);
        for (let i = 0; i < fallback.length; i++) {
          if (abort.signal.aborted) throw new DOMException('abort', 'AbortError');
          onDelta(fallback[i]);
          await new Promise((r) => setTimeout(r, 16));
        }
      }
      text.classList.add('done');
      showFrame(picks.length - 1);
    } catch (err) {
      if (err.name !== 'AbortError') toast('Erro: ' + err.message, 3500);
    }
  }

  function buildStoryDemo(picks) {
    const parts = picks.map((p, i) => {
      const prefix = i === 0 ? 'A história começa em' : (i === picks.length - 1 ? 'E finalmente, em' : 'Anos depois, em');
      return `${prefix} **${p.d}**. ${p.t}. ${p.x}`;
    });
    return parts.join('\n\n') + '\n\n**[Modo demo — configure um provedor de IA para uma narrativa real com muito mais densidade.]**';
  }

  function closeStory() {
    $('story-play').classList.remove('on');
    if (state.storyAbort) { try { state.storyAbort.abort(); } catch (e) {} }
  }

  // ══════════════════════════════════════════════════════════
  // MODALS
  // ══════════════════════════════════════════════════════════
  function openModal(id) { $(id).classList.add('show'); }
  function closeModal(id) { $(id).classList.remove('show'); }

  // ══════════════════════════════════════════════════════════
  // THEMES
  // ══════════════════════════════════════════════════════════
  function applyTheme(id) {
    state.theme = id;
    const th = THEMES[id];
    if (!th) return;
    state.events = EVENTS.filter(th.filter || (() => true));
    state.idx = 0;
    $('home-sub').textContent = th.subtitle;
    $('home-mark').innerHTML = `<span>Timeline</span> · ${th.label}`;
    $$('.ht-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === id));
    document.documentElement.style.setProperty('--accent', th.accent || '#5cc8b8');
    if ($('tl').classList.contains('on')) {
      buildYearAxis(); buildScrubber(); buildMobileYear(); renderEvent();
    }
  }

  // ══════════════════════════════════════════════════════════
  // GESTURES
  // ══════════════════════════════════════════════════════════
  function bindSwipe() {
    let sx = 0, sy = 0, moving = false;
    const area = $('tl');
    area.addEventListener('touchstart', (e) => {
      if (e.target.closest('#ai-panel') || e.target.closest('.modal')) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; moving = true;
    }, { passive: true });
    area.addEventListener('touchend', (e) => {
      if (!moving) return;
      moving = false;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 60) {
        if (dx < 0) navigate(1); else navigate(-1);
      }
    }, { passive: true });
  }

  // ══════════════════════════════════════════════════════════
  // CONTRIBUTE
  // ══════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════
  // CONTRIBUTE — modal de sugestão da comunidade (vai para Supabase)
  // ══════════════════════════════════════════════════════════
  function openContribute() {
    if (!window.TL_DB || !window.TL_DB.available) {
      toast('Backend não configurado — contribuições precisam do Supabase ativo.', 3800);
      return;
    }
    const ev = state.events[state.idx];
    const nameEl = $('contribute-event-name');
    if (nameEl) nameEl.textContent = ev.y + ' · ' + ev.t;

    // Reset estado dos pickers e campos
    $$('.ctype-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === 'edit_text'));
    const ta = $('contribute-text');
    if (ta) {
      ta.value = '';
      ta.placeholder = 'Cole aqui o texto corrigido...';
    }

    openModal('contribute-modal');
  }

  async function submitContributeForm() {
    if (!window.TL_DB || !window.TL_DB.available) {
      toast('Backend indisponível.', 3000);
      return;
    }
    const ev = state.events[state.idx];
    const text = ($('contribute-text').value || '').trim();
    if (!text) { toast('Descreva sua sugestão'); return; }

    const activeBtn = document.querySelector('.ctype-btn.active');
    const type = (activeBtn && activeBtn.dataset.type) || 'edit_text';
    const field = (activeBtn && activeBtn.dataset.field) || 'description';
    const before = field === 'description' ? ev.x
                  : field === 'date_display' ? ev.d
                  : field === 'img_url' ? ev.img
                  : field === 'quote_text' ? (ev.quote && ev.quote.text) || ''
                  : '';

    const submitBtn = $('contribute-submit');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await window.TL_DB.submitContribution({
        eventId: ev.id,
        contributionType: type,
        fieldChanged: field,
        valueBefore: before || null,
        valueAfter: text,
        contributorName: ($('contribute-name').value || '').trim() || null,
        contributorEmail: ($('contribute-email').value || '').trim() || null,
        source: 'community',
      });
      toast('Sugestão enviada — obrigado!', 3000);
      closeModal('contribute-modal');
    } catch (err) {
      toast('Erro ao enviar: ' + err.message, 3500);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // ══════════════════════════════════════════════════════════
  // PROVIDER MODAL
  // ══════════════════════════════════════════════════════════
  function openProviderModal() {
    renderProviderCards();
    openModal('provider-modal');
  }

  function renderProviderCards() {
    const list = $('provider-list');
    if (!list) return;
    list.innerHTML = '';
    const currentId = getActiveProvider();
    PROVIDERS.forEach((prov) => {
      const savedKey = getProviderKey(prov.id);
      const card = document.createElement('div');
      card.className = 'provider-card' + (prov.id === currentId ? ' active' : '');
      card.dataset.id = prov.id;
      card.innerHTML = `
        <div class="pcard-head">
          <div class="pcard-name">${escapeHtml(prov.name)}${prov.free ? ' <span class="pcard-badge free">Grátis</span>' : ''}</div>
          <div class="pcard-vendor">${escapeHtml(prov.vendor)} · ${escapeHtml(prov.model)}</div>
        </div>
        <input class="pcard-key" type="password" placeholder="${escapeHtml(prov.placeholder)}" value="${escapeHtml(savedKey)}" autocomplete="off" spellcheck="false" />
        <div class="pcard-foot">
          <a class="pcard-getkey" href="${escapeHtml(prov.keyUrl)}" target="_blank" rel="noopener">Obter chave →</a>
          <button class="pcard-use">Usar este</button>
        </div>`;
      card.querySelector('.pcard-use').addEventListener('click', () => {
        const k = card.querySelector('.pcard-key').value.trim();
        if (k) setProviderKey(prov.id, k);
        setActiveProvider(prov.id);
        list.querySelectorAll('.provider-card').forEach((c) => c.classList.toggle('active', c.dataset.id === prov.id));
        updateKeyNotice();
        toast('Provedor: ' + prov.name);
        closeModal('provider-modal');
      });
      list.appendChild(card);
    });
  }

  function updateKeyNotice() {
    const pid = getActiveProvider();
    const prov = PROVIDERS.find((p) => p.id === pid);
    const hasKey = prov && getProviderKey(pid);
    const noticeText = $('notice-text');
    const keyLink = $('ai-key-link');
    if (noticeText) noticeText.textContent = hasKey ? 'Provedor: ' + prov.name + '. ' : 'Configure um provedor de IA. ';
    if (keyLink) keyLink.textContent = hasKey ? 'Trocar' : 'Selecionar →';
  }

  // ══════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════
  async function loadSettings() {
    if (!window.TL_DB || !window.TL_DB.available) return;
    try {
      const s = await window.TL_DB.fetchSettings();
      if (typeof s.ai_images_enabled === 'boolean') state.settings.ai_images_enabled = s.ai_images_enabled;
      if (s.ai_images_model) state.settings.ai_images_model = s.ai_images_model;
    } catch (e) { /* silencioso — usa defaults */ }
  }

  async function loadEventsFromBackend() {
    if (!window.TL_DB || !window.TL_DB.available) {
      // Sem backend — mantém EVENTS local
      return false;
    }
    try {
      const events = await window.TL_DB.fetchEvents();
      if (Array.isArray(events) && events.length) {
        state.events = events;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Supabase indisponível, usando data.js local:', err && err.message);
      return false;
    }
  }

  async function init() {
    // Tenta carregar do backend (Supabase). Fallback silencioso para data.js.
    const [usedBackend] = await Promise.all([loadEventsFromBackend(), loadSettings()]);
    if (usedBackend) console.info('Timeline · ' + state.events.length + ' eventos carregados do Supabase');

    // Home
    $('search-arrow').addEventListener('click', () => searchTerm($('search-i').value));
    $('search-i').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchTerm($('search-i').value); });
    $$('.sug').forEach((el) => {
      el.addEventListener('click', () => {
        const q = el.dataset.q;
        if (q) { $('search-i').value = q; searchTerm(q); }
        else enterTimeline();
      });
    });
    $$('.ht-btn').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.theme)));

    // Topbar
    $('tb-logo').addEventListener('click', goHome);
    $('btn-contribute').addEventListener('click', openContribute);
    $('btn-explore').addEventListener('click', () => openAI('deep'));
    $('btn-next').addEventListener('click', () => navigate(1));
    $('play-btn').addEventListener('click', togglePlay);
    $('btn-share').addEventListener('click', openShare);
    $('btn-help').addEventListener('click', () => openModal('help-modal'));
    $('btn-story').addEventListener('click', openStory);

    // View switch

    // AI panel
    $('ai-close').addEventListener('click', closeAI);
    $$('.ai-tab').forEach((t) => t.addEventListener('click', () => openAI(t.dataset.mode)));
    $('ai-key-link').addEventListener('click', (e) => { e.preventDefault(); openProviderModal(); });
    $('ai-send').addEventListener('click', () => {
      const t = $('ai-input').value.trim();
      if (!t) return;
      $('ai-input').value = '';
      sendChatMessage(t);
    });
    $('ai-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ai-send').click(); });

    // Provider modal
    const demoBtn = $('btn-use-demo');
    if (demoBtn) demoBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal('provider-modal'); toast('Modo demo ativo'); });

    // Migrate old Anthropic key + init key notice
    migrateOldKey();
    updateKeyNotice();

    // Modal close handlers
    $$('.modal').forEach((m) => { m.querySelector('.modal-bg').addEventListener('click', () => m.classList.remove('show')); });
    $$('.modal-close').forEach((b) => { b.addEventListener('click', () => closeModal(b.dataset.close)); });

    $('story-play-close').addEventListener('click', closeStory);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }
      const onTl = $('tl').classList.contains('on');
      if (e.key === '/' && !onTl) { e.preventDefault(); $('search-i').focus(); return; }
      if (!onTl) return;
      if (e.key === 'ArrowRight') navigate(1);
      else if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'Escape') {
        const openM = document.querySelector('.modal.show');
        if (openM) { openM.classList.remove('show'); return; }
        if ($('story-play').classList.contains('on')) { closeStory(); return; }
        if ($('ai-panel').classList.contains('open')) { closeAI(); return; }
        goHome();
      }
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }

      else if (e.key === 'a' || e.key === 'A') openAI('deep');
      else if (e.key === 's' || e.key === 'S') openShare();
      else if (e.key === '?' || (e.shiftKey && e.key === '/')) openModal('help-modal');
    });

    window.addEventListener('hashchange', onHashChange);

    // Contribute modal — picker de tipo + submit
    $$('.ctype-btn').forEach((b) => {
      b.addEventListener('click', () => {
        $$('.ctype-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        const ph = {
          edit_text: 'Cole aqui o texto corrigido (descrição completa do evento)...',
          edit_image: 'Cole a URL da imagem sugerida (ex: https://images.unsplash.com/...)',
          add_quote: 'Cole a citação histórica + autor: "frase" — Pessoa, contexto',
          fix_date: 'Data corrigida no formato: AGO · 1991',
        }[b.dataset.type] || '';
        const ta = $('contribute-text');
        if (ta) ta.placeholder = ph;
      });
    });
    const contribSubmit = $('contribute-submit');
    if (contribSubmit) contribSubmit.addEventListener('click', submitContributeForm);

    bindSwipe();

    const r = parseHash();
    if (r.view === 'event') {
      const ev = byId(r.id);
      if (ev) state.idx = state.events.indexOf(ev);
    }

    if (r.view === 'event') enterTimeline(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();