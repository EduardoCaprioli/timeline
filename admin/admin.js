/* ════════════════════════════════════════════════════════════
   TIMELINE ADMIN — Dashboard de curadoria
   ════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const cfg = (window.TL_CONFIG) || {};
  const SUPABASE_URL = cfg.SUPABASE_URL;
  const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('SEU_PROJETO')) {
    document.body.innerHTML = '<div style="padding:60px;font-family:Sora;color:#444;text-align:center"><h1 style="font-weight:300">Admin indisponível</h1><p>Crie <code>config.js</code> na raiz do projeto (copie de <code>config.example.js</code>) com as chaves do Supabase.</p></div>';
    return;
  }

  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const state = {
    user: null,
    currentPage: 'contributions',
    contributions: [],
    events: [],
    reviewing: null,
  };

  // ── HELPERS ───────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);
  const toast = (msg, type) => {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'show ' + (type || 'info');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = ''; }, 3000);
  };
  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const truncate = (s, n) => (s && s.length > n) ? s.slice(0, n) + '…' : (s || '');
  const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const statusLabel = (s) => ({ pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' }[s] || s);
  const typeLabel = (t) => ({
    edit_text: 'Edição de texto', edit_image: 'Troca de imagem',
    new_event: 'Novo evento', add_quote: 'Citação', fix_date: 'Correção de data'
  }[t] || t);

  // ── AUTH ──────────────────────────────────────────────────
  async function checkAuth() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      state.user = session.user;
      showAdmin();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    $('login-screen').style.display = 'flex';
    $('admin-app').style.display = 'none';
  }

  function showAdmin() {
    $('login-screen').style.display = 'none';
    $('admin-app').style.display = 'flex';
    $('user-email').textContent = state.user.email;
    loadPage('contributions');
  }

  $('login-btn').addEventListener('click', async () => {
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    $('login-error').textContent = '';
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      $('login-error').textContent = 'Email ou senha incorretos.';
    } else {
      checkAuth();
    }
  });

  $('logout-btn').addEventListener('click', async () => {
    await db.auth.signOut();
    showLogin();
  });

  // Enter no login
  $('login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('login-btn').click(); });
  $('login-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('login-password').focus(); });

  // ── NAV ───────────────────────────────────────────────────
  $$('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) loadPage(page);
    });
  });

  function loadPage(page) {
    state.currentPage = page;
    $$('.nav-item').forEach((i) => i.classList.toggle('active', i.dataset.page === page));
    $$('.page').forEach((p) => p.classList.toggle('active', p.id === 'page-' + page));

    const loaders = {
      contributions: loadContributions,
      events: loadEventsList,
      analytics: loadAnalytics,
      searches: loadSearches,
    };
    if (loaders[page]) loaders[page]();
  }

  // ── CONTRIBUIÇÕES ─────────────────────────────────────────
  async function loadContributions() {
    const status = $('filter-status').value;
    let query = db.from('contributions')
      .select('*, events(title, date_display, year)')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    state.contributions = data || [];
    renderContributions(state.contributions);
    updateStats();
  }

  function renderContributions(list) {
    const tbody = $('contributions-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma contribuição.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((c) => `
      <tr>
        <td>
          <div class="td-event">
            <div class="td-title">${escapeHtml((c.events && c.events.title) || c.event_id || 'Novo evento')}</div>
            <div class="td-meta">${escapeHtml((c.events && c.events.date_display) || '')} · ${escapeHtml(c.event_id || '—')}</div>
          </div>
        </td>
        <td><div class="td-change">${renderDiff(c)}</div></td>
        <td>
          <div class="td-author">
            <div class="avatar">${(c.contributor_name || '?')[0].toUpperCase()}</div>
            <span>${escapeHtml(c.contributor_name || 'Anônimo')}</span>
          </div>
        </td>
        <td><span class="badge ${c.source === 'ai' ? 'b-ai' : 'b-community'}">${c.source === 'ai' ? '✦ IA' : 'Comunidade'}</span></td>
        <td>${formatDate(c.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="btn-sm btn-view" data-action="review" data-id="${c.id}">Ver</button>
            ${c.status === 'pending' ? `
              <button class="btn-sm btn-approve" data-action="approve" data-id="${c.id}">✓</button>
              <button class="btn-sm btn-reject" data-action="reject" data-id="${c.id}">✗</button>
            ` : `<span class="badge b-${c.status}">${statusLabel(c.status)}</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderDiff(c) {
    if (c.contribution_type === 'new_event') return '<ins>Novo evento completo</ins>';
    if (c.value_before && c.value_after) {
      return '<del>' + escapeHtml(truncate(c.value_before, 60)) + '</del><br><ins>' + escapeHtml(truncate(c.value_after, 60)) + '</ins>';
    }
    return c.value_after ? escapeHtml(truncate(c.value_after, 120)) : '—';
  }

  // Event delegation para os botões da tabela
  $('contributions-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'review') openReview(id);
    else if (btn.dataset.action === 'approve') quickApprove(id);
    else if (btn.dataset.action === 'reject') quickReject(id);
  });

  function openReview(id) {
    const c = state.contributions.find((x) => x.id === id);
    if (!c) return;
    state.reviewing = c;

    $('review-title').textContent = c.contribution_type === 'new_event'
      ? 'Revisar novo evento proposto'
      : 'Revisar edição: ' + ((c.events && c.events.title) || c.event_id);

    const fullJson = c.full_event_json
      ? '<pre class="json-block">' + escapeHtml(JSON.stringify(c.full_event_json, null, 2)) + '</pre>'
      : '';

    $('review-body').innerHTML = `
      <div class="review-field"><strong>Tipo:</strong> ${typeLabel(c.contribution_type)}</div>
      <div class="review-field"><strong>Campo:</strong> ${escapeHtml(c.field_changed || '—')}</div>
      ${c.value_before ? `<div class="review-diff"><strong>Antes:</strong><div class="diff-before">${escapeHtml(c.value_before)}</div></div>` : ''}
      ${c.value_after ? `<div class="review-diff"><strong>Depois:</strong><div class="diff-after">${escapeHtml(c.value_after)}</div></div>` : ''}
      ${fullJson}
      <div class="review-field"><strong>Autor:</strong> ${escapeHtml(c.contributor_name || 'Anônimo')} ${c.contributor_email ? '(' + escapeHtml(c.contributor_email) + ')' : ''}</div>
      <div class="review-field"><strong>Origem:</strong> ${c.source === 'ai' ? '✦ Gerado por IA (' + escapeHtml(c.ai_model || '?') + ')' : 'Comunidade'}</div>
      <div class="review-field"><strong>Data:</strong> ${formatDate(c.created_at)}</div>
    `;

    $('rejection-reason').value = '';
    $('review-actions').style.display = c.status === 'pending' ? 'block' : 'none';
    $('review-modal').classList.add('show');
  }

  function closeReview() { $('review-modal').classList.remove('show'); }
  $('review-close').addEventListener('click', closeReview);
  document.querySelectorAll('.modal-bg').forEach((bg) => {
    bg.addEventListener('click', () => bg.closest('.modal').classList.remove('show'));
  });

  async function approveContribution(id) {
    const c = state.contributions.find((x) => x.id === id);
    if (!c) return;

    if (c.contribution_type === 'new_event' && c.full_event_json) {
      const newEvent = Object.assign({}, c.full_event_json, { is_published: true });
      const { error } = await db.from('events').upsert(newEvent);
      if (error) { toast('Erro ao criar evento: ' + error.message, 'error'); return; }
    } else if (c.field_changed && c.value_after && c.event_id) {
      const updateObj = {};
      updateObj[c.field_changed] = c.value_after;
      const { error } = await db.from('events').update(updateObj).eq('id', c.event_id);
      if (error) { toast('Erro: ' + error.message, 'error'); return; }

      // Histórico
      const snapshot = {};
      snapshot[c.field_changed] = c.value_after;
      await db.from('event_history').insert({
        event_id: c.event_id,
        snapshot,
        changed_fields: [c.field_changed],
        change_summary: c.field_changed + ' atualizado via contribuição',
        contribution_id: c.id,
      });
    }

    await db.from('contributions').update({
      status: 'approved',
      reviewed_by: state.user.email,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    toast('✓ Contribuição aprovada e publicada', 'success');
    closeReview();
    loadContributions();
  }

  async function rejectContribution(id, reason) {
    if (!reason || !reason.trim()) { toast('Informe o motivo da rejeição', 'error'); return; }
    await db.from('contributions').update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: state.user.email,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    toast('Contribuição rejeitada', 'info');
    closeReview();
    loadContributions();
  }

  async function quickApprove(id) { await approveContribution(id); }
  async function quickReject(id) {
    const reason = prompt('Motivo da rejeição:');
    if (reason) await rejectContribution(id, reason);
  }

  $('btn-approve').addEventListener('click', () => { if (state.reviewing) approveContribution(state.reviewing.id); });
  $('btn-reject').addEventListener('click', () => {
    const reason = $('rejection-reason').value;
    if (state.reviewing) rejectContribution(state.reviewing.id, reason);
  });

  $('filter-status').addEventListener('change', loadContributions);

  // ── EVENTOS ───────────────────────────────────────────────
  async function loadEventsList() {
    const { data, error } = await db.from('events').select('*').order('year', { ascending: true });
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    state.events = data || [];
    renderEventsList(state.events);
    $('events-subtitle').textContent = state.events.length + ' eventos';
  }

  function renderEventsList(list) {
    const tbody = $('events-tbody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Sem eventos.</td></tr>'; return; }
    tbody.innerHTML = list.map((ev) => `
      <tr>
        <td>${ev.year}</td>
        <td>
          <div class="td-title">${escapeHtml(ev.title)}</div>
          <div class="td-meta">${escapeHtml(ev.id)}</div>
        </td>
        <td><span class="track-badge t-${ev.track}">${escapeHtml(ev.track)}</span></td>
        <td>${'★'.repeat(ev.importance || 3)}</td>
        <td><span class="badge ${ev.is_published ? 'b-approved' : 'b-rejected'}">${ev.is_published ? 'Publicado' : 'Oculto'}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn-sm btn-view" data-action="open-public" data-id="${escapeHtml(ev.id)}">Ver no site</button>
            <button class="btn-sm" data-action="toggle-publish" data-id="${escapeHtml(ev.id)}" data-pub="${ev.is_published}">${ev.is_published ? 'Ocultar' : 'Publicar'}</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  $('events-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'open-public') {
      window.open('../#/e/' + btn.dataset.id, '_blank');
    } else if (btn.dataset.action === 'toggle-publish') {
      togglePublish(btn.dataset.id, btn.dataset.pub === 'true');
    }
  });

  async function togglePublish(id, current) {
    const { error } = await db.from('events').update({ is_published: !current }).eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast(current ? 'Evento ocultado' : 'Evento publicado', 'success');
    loadEventsList();
  }

  $('events-search').addEventListener('input', () => {
    const q = $('events-search').value.toLowerCase();
    const tr = $('filter-track').value;
    const filtered = state.events.filter((ev) =>
      (!tr || ev.track === tr) &&
      (!q || ev.title.toLowerCase().includes(q) || ev.id.includes(q) || String(ev.year).includes(q))
    );
    renderEventsList(filtered);
  });
  $('filter-track').addEventListener('change', () => $('events-search').dispatchEvent(new Event('input')));

  // ── NOVO EVENTO ────────────────────────────────────────────
  $('new-event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const event = {
      id: fd.get('id'),
      year: parseInt(fd.get('year'), 10),
      month: parseInt(fd.get('month'), 10),
      date_display: fd.get('date_display'),
      era: fd.get('era'),
      track: fd.get('track'),
      title: fd.get('title'),
      description: fd.get('description'),
      tags: (fd.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean),
      parents: (fd.get('parents') || '').split(',').map((s) => s.trim()).filter(Boolean),
      importance: parseInt(fd.get('importance'), 10),
      img_url: fd.get('img_url') || null,
      img_credit: fd.get('img_credit') || null,
      img_type: fd.get('img_type'),
      quote_text: fd.get('quote_text') || null,
      quote_by: fd.get('quote_by') || null,
      video_id: fd.get('video_id') || null,
      is_published: true,
    };
    const { error } = await db.from('events').insert(event);
    if (error) toast('Erro: ' + error.message, 'error');
    else { toast('✓ Evento publicado', 'success'); e.target.reset(); loadPage('events'); }
  });

  // ── ANALYTICS ─────────────────────────────────────────────
  async function loadAnalytics() {
    const todayIso = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [today, week, total] = await Promise.all([
      db.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
      db.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      db.from('page_views').select('id', { count: 'exact', head: true }),
    ]);

    $('stat-views-today').textContent = today.count || 0;
    $('stat-views-week').textContent = week.count || 0;
    $('stat-views-total').textContent = total.count || 0;

    const { data: views } = await db.from('page_views').select('event_id').not('event_id', 'is', null);
    const counts = {};
    (views || []).forEach((v) => { counts[v.event_id] = (counts[v.event_id] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    $('top-events-tbody').innerHTML = sorted.length
      ? sorted.map(([id, n]) => '<tr><td>' + escapeHtml(id) + '</td><td>' + n + '</td></tr>').join('')
      : '<tr><td colspan="2" class="empty-state">Sem dados ainda.</td></tr>';
  }

  // ── BUSCAS ─────────────────────────────────────────────────
  async function loadSearches() {
    const { data } = await db.from('searches').select('*').order('created_at', { ascending: false }).limit(200);
    const counts = {};
    (data || []).forEach((s) => {
      const k = s.query.toLowerCase();
      if (!counts[k]) counts[k] = { count: 0, ai: false };
      counts[k].count++;
      if (s.ai_generated) counts[k].ai = true;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
    $('searches-tbody').innerHTML = sorted.length
      ? sorted.map(([q, info]) =>
          '<tr><td>' + escapeHtml(q) + '</td><td>' + info.count + '</td><td>' + (info.ai ? '<span class="badge b-ai">✦ Sim</span>' : '—') + '</td></tr>'
        ).join('')
      : '<tr><td colspan="3" class="empty-state">Sem buscas registradas.</td></tr>';
  }

  // ── STATS GLOBAIS ──────────────────────────────────────────
  async function updateStats() {
    const [pend, appr, rej, evCount] = await Promise.all([
      db.from('contributions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('contributions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      db.from('contributions').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      db.from('events').select('id', { count: 'exact', head: true }).eq('is_published', true),
    ]);
    $('stat-pending').textContent = pend.count || 0;
    $('stat-approved').textContent = appr.count || 0;
    $('stat-rejected').textContent = rej.count || 0;
    $('stat-total-events').textContent = evCount.count || 0;
    $('pending-count').textContent = pend.count || 0;

    $('contributions-subtitle').textContent =
      (pend.count || 0) + ' pendentes · ' + (appr.count || 0) + ' aprovadas · ' + (rej.count || 0) + ' rejeitadas';
  }

  // ── INIT ──────────────────────────────────────────────────
  checkAuth();
})();
