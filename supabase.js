/* ════════════════════════════════════════════════════════════
   SUPABASE CLIENT — Acesso ao banco do Timeline
   ════════════════════════════════════════════════════════════
   Carrega de window.TL_CONFIG (config.js). Se não houver config
   ou se a chamada falhar, o app cai no fallback de data.js local.
   ════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const cfg = (typeof window !== 'undefined' && window.TL_CONFIG) || {};
  const url = cfg.SUPABASE_URL;
  const key = cfg.SUPABASE_ANON_KEY;
  const hasConfig = url && key && !url.includes('SEU_PROJETO');

  let db = null;
  if (hasConfig && typeof supabase !== 'undefined') {
    db = supabase.createClient(url, key);
  }

  // Expõe o status para o app.js
  window.TL_DB = {
    available: !!db,
    client: db,
    fetchEvents,
    fetchEvent,
    fetchDomains,
    submitContribution,
    trackView,
    trackSearch,
  };

  // ── Conversão DB → formato do app.js ─────────────────────
  function dbRowToEvent(row) {
    return {
      id: row.id,
      y: row.year,
      m: row.month,
      d: row.date_display,
      era: row.era,
      track: row.track,
      domainIds: row.domain_ids || (row.track ? [row.track] : []),
      t: row.title,
      x: row.description,
      tg: row.tags || [],
      parents: row.parents || [],
      importance: row.importance || 3,
      img: row.img_url,
      imgCredit: row.img_credit,
      imgType: row.img_type,
      quote: row.quote_text ? { text: row.quote_text, by: row.quote_by } : null,
      video: row.video_id || null,
      yearEnd: row.year_end || null,
      datePrecision: row.date_precision || 'year',
      region: row.region || null,
    };
  }

  // ── EVENTOS ───────────────────────────────────────────────
  async function fetchEvents() {
    if (!db) throw new Error('Supabase não configurado');
    const { data, error } = await db
      .from('events')
      .select('*')
      .eq('is_published', true)
      .order('year', { ascending: true })
      .order('month', { ascending: true });
    if (error) throw error;
    return data.map(dbRowToEvent);
  }

  async function fetchEvent(id) {
    if (!db) throw new Error('Supabase não configurado');
    const { data, error } = await db
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return dbRowToEvent(data);
  }

  // ── DOMÍNIOS ──────────────────────────────────────────────
  async function fetchDomains() {
    if (!db) throw new Error('Supabase não configurado');
    const { data, error } = await db
      .from('domains')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // ── CONTRIBUIÇÕES ─────────────────────────────────────────
  async function submitContribution(opts) {
    if (!db) throw new Error('Supabase não configurado');
    const payload = {
      event_id: opts.eventId || null,
      contribution_type: opts.contributionType,
      field_changed: opts.fieldChanged || null,
      value_before: opts.valueBefore || null,
      value_after: opts.valueAfter || null,
      contributor_name: opts.contributorName || null,
      contributor_email: opts.contributorEmail || null,
      full_event_json: opts.fullEventJson || null,
      source: opts.source || 'community',
      ai_model: opts.aiModel || null,
    };
    const { data, error } = await db
      .from('contributions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ── ANALYTICS ─────────────────────────────────────────────
  function getOrCreateSession() {
    let sid = sessionStorage.getItem('tl_session');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('tl_session', sid);
    }
    return sid;
  }

  async function trackView(eventId) {
    if (!db) return;
    try {
      await db.from('page_views').insert({
        event_id: eventId,
        session_id: getOrCreateSession(),
        referrer: document.referrer || null,
      });
    } catch (e) { /* silencioso */ }
  }

  async function trackSearch(query, resultsCount, aiGenerated) {
    if (!db) return;
    try {
      await db.from('searches').insert({
        query, results_count: resultsCount, ai_generated: !!aiGenerated,
      });
    } catch (e) { /* silencioso */ }
  }
})();
