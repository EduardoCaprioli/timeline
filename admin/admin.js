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
    domains: [],
    settings: {},
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
      domains: loadDomains,
      media: loadMediaAI,
    };
    if (loaders[page]) loaders[page]();
  }

  // ── CONTRIBUIÇÕES ─────────────────────────────────────────
  async function loadContributions() {
    const status = $('filter-status').value;
    let query = db.from('contributions')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

    const contributions = data || [];
    const eventIds = [...new Set(contributions.map((c) => c.event_id).filter(Boolean))];
    if (eventIds.length) {
      const { data: evData } = await db.from('events')
        .select('id, title, date_display, year')
        .in('id', eventIds);
      const evMap = {};
      (evData || []).forEach((ev) => { evMap[ev.id] = ev; });
      contributions.forEach((c) => { c.events = evMap[c.event_id] || null; });
    }

    state.contributions = contributions;
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
        <td><span class="badge ${c.source === 'ai' ? 'b-ai' : 'b-community'}">${c.source === 'ai' ? 'IA' : 'Comunidade'}</span></td>
        <td>${formatDate(c.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="btn-sm btn-view" data-action="review" data-id="${c.id}">Ver</button>
            ${c.status === 'pending' ? `
              <button class="btn-sm btn-approve" data-action="approve" data-id="${c.id}">Aprovar</button>
              <button class="btn-sm btn-reject" data-action="reject" data-id="${c.id}">Rejeitar</button>
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
      <div class="review-field"><strong>Origem:</strong> ${c.source === 'ai' ? 'Gerado por IA (' + escapeHtml(c.ai_model || '?') + ')' : 'Comunidade'}</div>
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

    toast('Contribuição aprovada e publicada', 'success');
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

  // ── DOMÍNIOS ──────────────────────────────────────────────
  async function loadDomains() {
    const { data, error } = await db.from('domains').select('*').order('sort_order', { ascending: true });
    if (error) { toast('Erro ao carregar domínios: ' + error.message, 'error'); return; }
    state.domains = data || [];
    renderDomains(state.domains);
    $('domains-subtitle').textContent = state.domains.length + ' domínios cadastrados';
  }

  function renderDomains(list) {
    const tbody = $('domains-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum domínio. Execute a migração SQL e clique em Atualizar.</td></tr>';
      return;
    }
    const nameMap = {};
    list.forEach((d) => { nameMap[d.id] = d.name; });
    tbody.innerHTML = list.map((d) => `
      <tr>
        <td><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${escapeHtml(d.color)};vertical-align:middle"></span></td>
        <td><code>${escapeHtml(d.id)}</code></td>
        <td>
          <div class="td-title">${escapeHtml(d.name)}</div>
          ${d.description ? `<div class="td-meta">${escapeHtml(truncate(d.description, 60))}</div>` : ''}
        </td>
        <td>${d.parent_id ? `<span class="td-meta">${escapeHtml(nameMap[d.parent_id] || d.parent_id)}</span>` : '<span class="td-meta">—</span>'}</td>
        <td>${d.sort_order}</td>
        <td>
          <div class="row-actions">
            <button class="btn-sm" data-action="edit-domain" data-id="${escapeHtml(d.id)}">Editar</button>
            <button class="btn-sm btn-reject" data-action="delete-domain" data-id="${escapeHtml(d.id)}">Excluir</button>
          </div>
        </td>
      </tr>`).join('');
  }

  $('domains-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit-domain') {
      const d = state.domains.find((x) => x.id === btn.dataset.id);
      if (d) openDomainModal(d);
    } else if (btn.dataset.action === 'delete-domain') {
      deleteDomainById(btn.dataset.id);
    }
  });

  $('btn-new-domain').addEventListener('click', () => openDomainModal(null));
  $('domain-close').addEventListener('click', () => $('domain-modal').classList.remove('show'));
  $('domain-cancel').addEventListener('click', () => $('domain-modal').classList.remove('show'));

  function openDomainModal(domain) {
    const form = $('domain-form');
    form.reset();
    delete form.dataset.editId;
    const isEdit = !!domain;
    $('domain-modal-title').textContent = isEdit ? 'Editar domínio' : 'Novo domínio';

    const sel = $('domain-parent-select');
    sel.innerHTML = '<option value="">Nenhum (domínio raiz)</option>';
    state.domains.forEach((d) => {
      if (isEdit && d.id === domain.id) return;
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      if (isEdit && domain.parent_id === d.id) opt.selected = true;
      sel.appendChild(opt);
    });

    const idInput = form.querySelector('[name=id]');
    idInput.disabled = isEdit;

    if (isEdit) {
      idInput.value = domain.id;
      form.querySelector('[name=name]').value = domain.name || '';
      form.querySelector('[name=color]').value = domain.color || '#5cc8b8';
      form.querySelector('[name=sort_order]').value = domain.sort_order ?? 0;
      form.querySelector('[name=description]').value = domain.description || '';
      form.dataset.editId = domain.id;
    }
    $('domain-modal').classList.add('show');
  }

  $('domain-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const editId = e.target.dataset.editId;
    const payload = {
      name:        fd.get('name'),
      color:       fd.get('color'),
      parent_id:   fd.get('parent_id') || null,
      sort_order:  parseInt(fd.get('sort_order'), 10) || 0,
      description: fd.get('description') || null,
    };
    if (!editId) payload.id = fd.get('id');

    const { error } = editId
      ? await db.from('domains').update(payload).eq('id', editId)
      : await db.from('domains').insert(payload);

    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast(editId ? 'Domínio atualizado' : 'Domínio criado', 'success');
    $('domain-modal').classList.remove('show');
    loadDomains();
  });

  async function deleteDomainById(id) {
    const domain = state.domains.find((d) => d.id === id);
    if (!confirm('Excluir domínio "' + (domain ? domain.name : id) + '"?\n\nEventos que usam este domínio não serão alterados, mas perderão a referência de cor/nome.')) return;
    const { error } = await db.from('domains').delete().eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Domínio excluído', 'info');
    loadDomains();
  }

  // ── MÍDIA IA ──────────────────────────────────────────────
  const IMG_PROVIDERS = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      model: 'gemini-2.0-flash-preview-image-generation',
      vendor: 'Google',
      badge: 'Gratuito',
      badgeClass: 'b-free',
      placeholder: 'AIza...',
      keyUrl: 'https://aistudio.google.com/apikey',
      desc: 'Geração de imagens via Gemini 2.0 Flash. Usa a mesma chave do painel de IA. Plano gratuito disponível.',
    },
    {
      id: 'dalle3',
      name: 'DALL-E 3',
      model: 'dall-e-3',
      vendor: 'OpenAI',
      badge: 'Pago',
      badgeClass: 'b-soon',
      placeholder: 'sk-...',
      keyUrl: 'https://platform.openai.com/api-keys',
      desc: 'Qualidade máxima. Gera imagens 1792×1024 em estilo fotorrealista. Requer créditos OpenAI.',
    },
  ];

  let activeImgProvider = localStorage.getItem('tl_img_provider') || 'gemini';
  let genAbort = false;

  function getImgKey(id) { return localStorage.getItem('tl_img_key_' + id) || ''; }
  function setImgKey(id, key) { localStorage.setItem('tl_img_key_' + id, key); }

  async function loadMediaAI() {
    // Stats
    const [noImg, aiImg, total] = await Promise.all([
      db.from('events').select('id', { count: 'exact', head: true }).is('img_url', null),
      db.from('events').select('id', { count: 'exact', head: true }).eq('img_type', 'ai'),
      db.from('events').select('id', { count: 'exact', head: true }),
    ]);
    $('stat-media-no-img').textContent = noImg.count ?? '—';
    $('stat-media-ai').textContent = aiImg.count ?? '—';
    $('stat-media-total').textContent = total.count ?? '—';

    // Load saved prompt base
    const { data: pbData } = await db.from('settings').select('value').eq('key', 'img_prompt_base').maybeSingle();
    if (pbData) $('img-prompt-base').value = pbData.value || '';

    renderImgProviderCards();
    updateImgKeySection();
    attachMediaListeners();
    loadVideoSection();
  }

  function renderImgProviderCards() {
    const container = $('img-provider-cards');
    container.innerHTML = IMG_PROVIDERS.map((p) => `
      <div class="settings-card img-pcard ${p.id === activeImgProvider ? 'active' : ''}" data-pid="${p.id}" style="cursor:pointer">
        <div class="scard-head">
          <span class="scard-name">${p.name}</span>
          <span class="badge ${p.badgeClass}">${p.badge}</span>
        </div>
        <p class="scard-desc">${p.desc}</p>
        <p class="scard-footer" style="color:${getImgKey(p.id) ? '#1e7a4a' : '#aaa'}">
          ${getImgKey(p.id) ? 'Chave salva' : 'Sem chave'}
        </p>
      </div>
    `).join('');
    container.querySelectorAll('.img-pcard').forEach((card) => {
      card.addEventListener('click', () => {
        activeImgProvider = card.dataset.pid;
        localStorage.setItem('tl_img_provider', activeImgProvider);
        renderImgProviderCards();
        updateImgKeySection();
      });
    });
  }

  function updateImgKeySection() {
    const p = IMG_PROVIDERS.find((x) => x.id === activeImgProvider);
    if (!p) return;
    $('img-key-label').textContent = 'Chave de API — ' + p.vendor;
    $('img-api-key').placeholder = p.placeholder;
    $('img-api-key').value = getImgKey(p.id) ? '••••••••' : '';
    $('img-key-link').href = p.keyUrl;
    $('img-key-link').textContent = 'Obter chave — ' + p.vendor;
    const hasKey = !!getImgKey(activeImgProvider);
    $('btn-generate-pending').disabled = !hasKey;
    $('btn-generate-all').disabled = !hasKey;
    $('img-queue-subtitle').textContent = hasKey
      ? 'Imagens salvas no Supabase Storage e vinculadas ao evento permanentemente'
      : 'Salve uma chave de API para habilitar a geração';
  }

  let mediaListenersAttached = false;
  function attachMediaListeners() {
    if (mediaListenersAttached) return;
    mediaListenersAttached = true;

    $('btn-save-img-key').addEventListener('click', () => {
      const val = $('img-api-key').value.trim();
      if (!val || val === '••••••••') return;
      setImgKey(activeImgProvider, val);
      $('img-api-key').value = '••••••••';
      toast('Chave salva localmente', 'success');
      renderImgProviderCards();
      updateImgKeySection();
    });

    $('btn-generate-pending').addEventListener('click', () => runImageGeneration(false));
    $('btn-generate-all').addEventListener('click', () => runImageGeneration(true));
    $('btn-abort-gen').addEventListener('click', () => { genAbort = true; });

    // Prompt base save
    $('btn-save-prompt-base').addEventListener('click', async () => {
      const val = $('img-prompt-base').value.trim();
      const { error } = await db.from('settings').upsert(
        { key: 'img_prompt_base', value: val, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) toast('Erro ao salvar: ' + error.message, 'error');
      else toast('Estilo global salvo', 'success');
    });

    // Video section
    $('btn-refresh-videos').addEventListener('click', loadVideoSection);

    $('video-events-list').addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-dl-img');
      if (!btn) return;
      await downloadEventImage(btn.dataset.url, btn.dataset.evid);
    });

    $('video-events-list').addEventListener('change', async (e) => {
      if (e.target.matches('.img-file-input')) {
        const file = e.target.files[0];
        if (!file) return;
        const evId = e.target.dataset.evid;
        toast('Fazendo upload...', 'info');
        try {
          const url = await uploadEventImageFile(evId, file);
          const { error } = await db.from('events').update({
            img_url: url, img_type: 'manual', img_credit: 'Upload manual',
          }).eq('id', evId);
          if (error) throw new Error(error.message);
          toast('Imagem salva com sucesso', 'success');
          loadVideoSection();
        } catch (err) {
          toast('Erro no upload: ' + err.message, 'error');
        }
      } else if (e.target.matches('.ver-file-input')) {
        const file = e.target.files[0];
        if (!file) return;
        const evId = e.target.dataset.evid;
        toast('Fazendo upload...', 'info');
        try {
          const url = await uploadEventVideo(evId, file);
          const { error } = await db.from('events').update({ video_url: url }).eq('id', evId);
          if (error) throw new Error(error.message);
          toast('Video salvo com sucesso', 'success');
          loadVideoSection();
        } catch (err) {
          toast('Erro no upload: ' + err.message, 'error');
        }
      } else if (e.target.matches('.ver-display')) {
        const evId = e.target.dataset.evid;
        const mode = e.target.value;
        const { error } = await db.from('events').update({ media_display: mode }).eq('id', evId);
        if (error) { toast('Erro: ' + error.message, 'error'); return; }
        toast(mode === 'video' ? 'Evento agora exibe video' : 'Evento agora exibe imagem', 'success');
      }
    });
  }

  function buildAdminImagePrompt(ev) {
    const base = ($('img-prompt-base') && $('img-prompt-base').value.trim()) ||
      'cinematic composition, dramatic lighting, photorealistic, 8K resolution, editorial photography';
    return `${base}. ${ev.title}, ${ev.year}${ev.era ? ', ' + ev.era : ''}, historical scene, no text, no watermark, no logos`;
  }

  async function callImgAPI(ev, providerId, apiKey) {
    const prompt = buildAdminImagePrompt(ev);

    if (providerId === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['image'], responseMimeType: 'image/jpeg' },
          }),
        }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || res.status); }
      const d = await res.json();
      const part = d.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error('Sem imagem na resposta');
      return { b64: part.inlineData.data, mime: part.inlineData.mimeType || 'image/jpeg' };
    }

    if (providerId === 'dalle3') {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1792x1024', quality: 'standard', response_format: 'b64_json' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || res.status); }
      const d = await res.json();
      return { b64: d.data[0].b64_json, mime: 'image/png' };
    }

    throw new Error('Provedor desconhecido');
  }

  function b64ToBlob(b64, mime) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function uploadEventImage(eventId, b64, mime) {
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const path = `${eventId}.${ext}`;
    const blob = b64ToBlob(b64, mime);
    const { error } = await db.storage.from('event-images').upload(path, blob, { contentType: mime, upsert: true });
    if (error) throw new Error('Storage: ' + error.message);
    const { data } = db.storage.from('event-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function runImageGeneration(regenerateAll) {
    const apiKey = getImgKey(activeImgProvider);
    if (!apiKey) { toast('Salve a chave de API primeiro', 'error'); return; }

    const query = db.from('events').select('id, title, year, era').eq('is_published', true);
    const { data: events, error } = regenerateAll ? await query : await query.is('img_url', null);
    if (error) { toast('Erro ao carregar eventos: ' + error.message, 'error'); return; }
    if (!events || !events.length) { toast('Nenhum evento para processar', 'info'); return; }

    genAbort = false;
    const prov = IMG_PROVIDERS.find((p) => p.id === activeImgProvider);
    const log = $('img-log');
    const progressWrap = $('img-progress-wrap');
    const fill = $('img-progress-fill');
    const label = $('img-progress-label');

    $('btn-generate-pending').disabled = true;
    $('btn-generate-all').disabled = true;
    progressWrap.style.display = 'block';
    log.innerHTML = '';

    let done = 0;
    const total = events.length;

    for (const ev of events) {
      if (genAbort) break;

      const entry = document.createElement('div');
      entry.className = 'img-log-entry';
      entry.textContent = `Gerando: ${ev.title} (${ev.year})...`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;

      try {
        const { b64, mime } = await callImgAPI(ev, activeImgProvider, apiKey);
        const url = await uploadEventImage(ev.id, b64, mime);
        await db.from('events').update({
          img_url: url,
          img_type: 'ai',
          img_credit: prov.name + ' · ' + prov.vendor,
        }).eq('id', ev.id);
        entry.className = 'img-log-entry success';
        entry.textContent = `${ev.title} (${ev.year})`;
      } catch (err) {
        entry.className = 'img-log-entry error';
        entry.textContent = `${ev.title}: ${err.message}`;
      }

      done++;
      fill.style.width = ((done / total) * 100) + '%';
      label.textContent = `${done} / ${total}`;
    }

    $('btn-generate-pending').disabled = false;
    $('btn-generate-all').disabled = false;
    toast(genAbort ? 'Geração interrompida' : `${done} eventos processados`, 'success');
    loadMediaAI();
  }

  // ── VIDEOS POR EVENTO ─────────────────────────────────────
  async function loadVideoSection() {
    const container = $('video-events-list');
    container.innerHTML = '<div class="empty-state">Carregando...</div>';
    const { data: events, error } = await db.from('events')
      .select('*')
      .eq('is_published', true)
      .order('year', { ascending: true });
    if (error) {
      container.innerHTML = '<div class="empty-state">Erro ao carregar. Execute a migração SQL para adicionar as colunas <code>video_url</code> e <code>media_display</code>.</div>';
      return;
    }
    renderVideoEvents(events || []);
  }

  function renderVideoEvents(events) {
    const container = $('video-events-list');
    if (!events.length) {
      container.innerHTML = '<div class="empty-state">Nenhum evento publicado.</div>';
      return;
    }
    container.innerHTML = `
      <table class="ver-table">
        <thead>
          <tr>
            <th>Ano</th><th>Evento</th><th>Imagem</th><th>Video</th><th>Exibir como</th>
          </tr>
        </thead>
        <tbody>
          ${events.map((ev) => {
            const active = ev.media_display || 'image';
            const imgActive = active === 'image';
            const vidActive = active === 'video';
            return `
            <tr>
              <td class="td-meta" style="vertical-align:top;padding-top:14px">${ev.year}</td>
              <td style="vertical-align:top;padding-top:14px">
                <div class="td-title">${escapeHtml(ev.title)}</div>
                <div class="td-meta">${escapeHtml(ev.id)}</div>
              </td>
              <td>
                <div class="ver-media-cell">
                  ${ev.img_url
                    ? `<div class="ver-thumb-wrap${imgActive ? ' is-active' : ''}">
                        <img class="ver-thumb" src="${escapeHtml(ev.img_url)}" loading="lazy" />
                        ${imgActive ? '<span class="ver-active-label">ativo</span>' : ''}
                       </div>`
                    : '<span class="ver-no-media">sem imagem</span>'
                  }
                  <div class="ver-actions">
                    ${ev.img_url ? `<button class="btn-sm ver-action btn-dl-img" data-evid="${escapeHtml(ev.id)}" data-url="${escapeHtml(ev.img_url)}">Baixar</button>` : ''}
                    <label class="btn-sm ver-upload-label">
                      ${ev.img_url ? 'Trocar' : 'Upload'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" class="img-file-input" data-evid="${escapeHtml(ev.id)}" style="display:none" />
                    </label>
                  </div>
                </div>
              </td>
              <td>
                <div class="ver-media-cell">
                  ${ev.video_url
                    ? `<div class="ver-thumb-wrap${vidActive ? ' is-active' : ''}">
                        <div class="ver-video-thumb">▶</div>
                        ${vidActive ? '<span class="ver-active-label">ativo</span>' : ''}
                       </div>`
                    : '<span class="ver-no-media">sem video</span>'
                  }
                  <div class="ver-actions">
                    <label class="btn-sm ver-upload-label">
                      ${ev.video_url ? 'Substituir' : 'Upload'}
                      <input type="file" accept="video/mp4,video/webm" class="ver-file-input" data-evid="${escapeHtml(ev.id)}" style="display:none" />
                    </label>
                  </div>
                </div>
              </td>
              <td style="vertical-align:top;padding-top:14px">
                <select class="ver-display" data-evid="${escapeHtml(ev.id)}" ${!ev.video_url ? 'disabled' : ''}>
                  <option value="image" ${!vidActive ? 'selected' : ''}>Imagem</option>
                  <option value="video" ${vidActive ? 'selected' : ''}>Video</option>
                </select>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  async function uploadEventImageFile(eventId, file) {
    const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    const path = `${eventId}.${ext}`;
    const { error } = await db.storage.from('event-images').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });
    if (error) throw new Error('Storage: ' + error.message);
    const { data } = db.storage.from('event-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function downloadEventImage(url, eventId) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = eventId + '.' + ext;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast('Erro ao baixar: ' + err.message, 'error');
    }
  }

  async function uploadEventVideo(eventId, file) {
    const ext = file.name.split('.').pop().toLowerCase() || 'mp4';
    const path = `${eventId}.${ext}`;
    const { error } = await db.storage.from('event-videos').upload(path, file, {
      contentType: file.type || 'video/mp4',
      upsert: true,
    });
    if (error) throw new Error('Storage: ' + error.message);
    const { data } = db.storage.from('event-videos').getPublicUrl(path);
    return data.publicUrl;
  }

  // ── INIT ──────────────────────────────────────────────────
  checkAuth();
})();
