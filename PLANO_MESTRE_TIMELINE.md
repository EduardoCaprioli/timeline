# PLANO MESTRE — Timeline System
## Documento para execução pelo Claude Code

> **Para o Claude Code:** Este documento contém tudo que precisa ser feito no projeto Timeline System, em ordem de prioridade. Execute cada fase completamente antes de avançar para a próxima. O projeto já existe com 4 arquivos base (index.html, app.js, styles.css, data.js). Tudo que está descrito aqui é construído em cima desses arquivos existentes.

---

## CONTEXTO DO PROJETO

O **Timeline System** é uma plataforma visual e imersiva para explorar a história da tecnologia. Ela combina:
- Interface cinematográfica escura (estilo Dubai Culture Timeline)
- IA conversacional via Claude/Anthropic para aprofundar eventos
- Sistema de contribuição comunitária (modelo Wikipedia)
- Painel de administrador para o dono do projeto aprovar/rejeitar contribuições
- 49 eventos históricos reais de 1876 a 2025

**Stack atual (arquivos existentes):**
- `index.html` — estrutura HTML completa com 9 componentes
- `styles.css` — CSS cinematográfico, responsivo, fonte Sora
- `app.js` — lógica completa (1.350 linhas): router, AI streaming, Story Mode, Share
- `data.js` — 49 eventos com schema completo (id, year, track, parents, importance, etc)

**Stack de destino:**
- Frontend: HTML/CSS/JS puro (sem framework — manter simples)
- Backend: Supabase (banco PostgreSQL + Auth + API REST automática)
- Deploy: Vercel (frontend) + Supabase (backend)
- Repositório: GitHub privado
- IA: Claude/Anthropic API (já integrado)

---

## FASE 0 — PUBLICAR NO GITHUB E VERCEL
### Objetivo: projeto no ar com URL pública em menos de 30 minutos

#### 0.1 — Criar repositório GitHub privado

Execute os seguintes comandos na pasta do projeto:

```bash
# Inicializar git no projeto
git init

# Criar arquivo .gitignore
cat > .gitignore << 'EOF'
.env
.env.local
.env.production
node_modules/
.DS_Store
*.log
EOF

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "feat: Timeline System MVP — 49 eventos, AI panel, Story Mode, Share"
```

Depois instruir o usuário a:
1. Acessar https://github.com/new
2. Nome do repositório: `timeline-system`
3. Marcar como **Privado**
4. NÃO marcar "Add README" (já temos)
5. Clicar "Create repository"
6. Copiar a URL do repositório (ex: `https://github.com/SEU_USUARIO/timeline-system.git`)

Depois executar:
```bash
git remote add origin https://github.com/SEU_USUARIO/timeline-system.git
git branch -M main
git push -u origin main
```

#### 0.2 — Deploy no Vercel

Instruir o usuário a:
1. Acessar https://vercel.com
2. Clicar "Sign Up" → "Continue with GitHub"
3. Autorizar o Vercel a acessar o GitHub
4. Clicar "Add New Project"
5. Selecionar o repositório `timeline-system`
6. Deixar todas as configurações padrão (Framework: Other)
7. Clicar "Deploy"

Em 60 segundos o projeto estará em:
`https://timeline-system.vercel.app`

A partir de agora, **cada `git push` republica o projeto automaticamente.**

---

## FASE 1 — BACKEND COM SUPABASE
### Objetivo: banco de dados real para contribuições, usuários e histórico

#### 1.1 — Criar projeto no Supabase

Instruir o usuário a:
1. Acessar https://supabase.com
2. Clicar "Start your project" → fazer login com GitHub
3. Clicar "New project"
4. Nome: `timeline-system`
5. Gerar senha forte (salvar em lugar seguro)
6. Região: South America (São Paulo) — mais próximo do Brasil
7. Clicar "Create new project" — aguardar ~2 minutos

Após criação, acessar **Settings → API** e copiar:
- `Project URL` → salvar como `SUPABASE_URL`
- `anon public` key → salvar como `SUPABASE_ANON_KEY`
- `service_role` key → salvar como `SUPABASE_SERVICE_KEY` (NUNCA expor no frontend)

#### 1.2 — Criar estrutura do banco de dados

No Supabase, acessar **SQL Editor** e executar:

```sql
-- ══════════════════════════════════════════════════════════
-- TABELA: events (espelho do data.js, fonte de verdade)
-- ══════════════════════════════════════════════════════════
CREATE TABLE events (
  id TEXT PRIMARY KEY,           -- slug único ex: "iphone-2007"
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date_display TEXT NOT NULL,    -- "JAN · 2007"
  era TEXT NOT NULL,
  track TEXT NOT NULL,           -- hardware|software|ia|rede|cultura
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  parents TEXT[] NOT NULL DEFAULT '{}',
  importance INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  img_url TEXT,
  img_credit TEXT,
  img_type TEXT DEFAULT 'contributed' CHECK (img_type IN ('ai', 'contributed')),
  quote_text TEXT,
  quote_by TEXT,
  video_id TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- TABELA: contributions (sugestões da comunidade)
-- ══════════════════════════════════════════════════════════
CREATE TABLE contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  
  -- Quem contribuiu
  contributor_name TEXT,         -- nome opcional (pode ser anônimo)
  contributor_email TEXT,        -- email opcional
  
  -- Tipo de contribuição
  contribution_type TEXT NOT NULL CHECK (
    contribution_type IN ('edit_text', 'edit_image', 'new_event', 'add_quote', 'fix_date')
  ),
  
  -- O que mudou (campos antes e depois)
  field_changed TEXT,            -- qual campo foi alterado
  value_before TEXT,             -- conteúdo original
  value_after TEXT NOT NULL,     -- conteúdo proposto
  
  -- Para novos eventos completos
  full_event_json JSONB,         -- JSON completo se for novo evento
  
  -- Origem
  source TEXT DEFAULT 'community' CHECK (source IN ('community', 'ai')),
  ai_model TEXT,                 -- se veio de IA, qual modelo
  
  -- Status de moderação
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  rejection_reason TEXT,         -- motivo se rejeitado
  reviewed_by TEXT,              -- quem revisou (admin)
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- TABELA: event_history (histórico de versões — modelo Wikipedia)
-- ══════════════════════════════════════════════════════════
CREATE TABLE event_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,       -- estado completo do evento naquele momento
  changed_fields TEXT[],         -- quais campos mudaram
  change_summary TEXT,           -- resumo legível
  contribution_id UUID REFERENCES contributions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- TABELA: page_views (analytics básico)
-- ══════════════════════════════════════════════════════════
CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT,                 -- qual evento foi visto
  session_id TEXT,               -- sessão anônima
  referrer TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- TABELA: searches (o que as pessoas buscam)
-- ══════════════════════════════════════════════════════════
CREATE TABLE searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- ÍNDICES para performance
-- ══════════════════════════════════════════════════════════
CREATE INDEX idx_events_year ON events(year);
CREATE INDEX idx_events_track ON events(track);
CREATE INDEX idx_events_published ON events(is_published);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_event ON contributions(event_id);
CREATE INDEX idx_history_event ON event_history(event_id);
CREATE INDEX idx_views_event ON page_views(event_id);
CREATE INDEX idx_views_created ON page_views(created_at);

-- ══════════════════════════════════════════════════════════
-- FUNCTION: atualiza updated_at automaticamente
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════
-- RLS (Row Level Security) — segurança
-- ══════════════════════════════════════════════════════════
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode LER eventos publicados
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (is_published = true);

-- Qualquer pessoa pode CRIAR contribuição
CREATE POLICY "contributions_public_insert" ON contributions
  FOR INSERT WITH CHECK (true);

-- Qualquer pessoa pode CRIAR pageview
CREATE POLICY "pageviews_public_insert" ON page_views
  FOR INSERT WITH CHECK (true);

-- Qualquer pessoa pode CRIAR search
CREATE POLICY "searches_public_insert" ON searches
  FOR INSERT WITH CHECK (true);

-- Qualquer pessoa pode LER histórico
CREATE POLICY "history_public_read" ON event_history
  FOR SELECT USING (true);
```

#### 1.3 — Migrar eventos do data.js para o Supabase

Criar arquivo `scripts/migrate-events.js`:

```javascript
// scripts/migrate-events.js
// Execute: node scripts/migrate-events.js
// Migra todos os eventos do data.js para o Supabase

const { createClient } = require('@supabase/supabase-js');

// Copie do Supabase Settings → API
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_SERVICE_KEY = 'SUA_SERVICE_KEY_AQUI'; // use service_role, não anon

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cole aqui o array EVENTS do data.js
const EVENTS = [/* ... colar conteúdo do data.js aqui ... */];

async function migrate() {
  console.log(`Migrando ${EVENTS.length} eventos...`);
  
  for (const ev of EVENTS) {
    const row = {
      id: ev.id,
      year: ev.y,
      month: ev.m,
      date_display: ev.d,
      era: ev.era,
      track: ev.track,
      title: ev.t,
      description: ev.x,
      tags: ev.tg,
      parents: ev.parents || [],
      importance: ev.importance || 3,
      img_url: ev.img,
      img_credit: ev.imgCredit,
      img_type: ev.imgType,
      quote_text: ev.quote?.text || null,
      quote_by: ev.quote?.by || null,
      video_id: ev.video || null,
      is_published: true,
    };
    
    const { error } = await supabase.from('events').upsert(row);
    if (error) {
      console.error(`Erro em ${ev.id}:`, error.message);
    } else {
      console.log(`✓ ${ev.id}`);
    }
  }
  
  console.log('Migração concluída!');
}

migrate();
```

Para executar:
```bash
npm install @supabase/supabase-js
node scripts/migrate-events.js
```

#### 1.4 — Criar arquivo de variáveis de ambiente

Criar `.env.local` na raiz do projeto:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

**IMPORTANTE:** Este arquivo já está no `.gitignore` — nunca será enviado ao GitHub.

---

## FASE 2 — INTEGRAR SUPABASE NO FRONTEND
### Objetivo: o app.js busca eventos do banco, não do data.js

#### 2.1 — Adicionar SDK do Supabase

No `index.html`, antes do `</head>`, adicionar:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

#### 2.2 — Criar arquivo `supabase.js`

```javascript
// supabase.js — inicialização e funções de acesso ao banco

const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── EVENTOS ──────────────────────────────────────────────

/** Busca todos os eventos publicados ordenados por ano */
async function fetchEvents() {
  const { data, error } = await db
    .from('events')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  
  if (error) throw error;
  return data.map(dbRowToEvent); // converte para formato do app.js
}

/** Busca um evento específico por id */
async function fetchEvent(id) {
  const { data, error } = await db
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return dbRowToEvent(data);
}

/** Converte linha do banco para formato que o app.js espera */
function dbRowToEvent(row) {
  return {
    id: row.id,
    y: row.year,
    m: row.month,
    d: row.date_display,
    era: row.era,
    track: row.track,
    t: row.title,
    x: row.description,
    tg: row.tags,
    parents: row.parents,
    importance: row.importance,
    img: row.img_url,
    imgCredit: row.img_credit,
    imgType: row.img_type,
    quote: row.quote_text ? { text: row.quote_text, by: row.quote_by } : null,
    video: row.video_id,
  };
}

// ── CONTRIBUIÇÕES ─────────────────────────────────────────

/** Envia uma contribuição da comunidade */
async function submitContribution({
  eventId,
  contributionType,
  fieldChanged,
  valueBefore,
  valueAfter,
  contributorName,
  contributorEmail,
  fullEventJson,
  source = 'community',
}) {
  const { data, error } = await db
    .from('contributions')
    .insert({
      event_id: eventId,
      contribution_type: contributionType,
      field_changed: fieldChanged,
      value_before: valueBefore,
      value_after: valueAfter,
      contributor_name: contributorName,
      contributor_email: contributorEmail,
      full_event_json: fullEventJson,
      source,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ── ANALYTICS ─────────────────────────────────────────────

/** Registra visualização de evento (silencioso) */
async function trackView(eventId) {
  const sessionId = getOrCreateSession();
  await db.from('page_views').insert({
    event_id: eventId,
    session_id: sessionId,
    referrer: document.referrer || null,
  }).then(() => {}); // silencioso
}

/** Registra busca */
async function trackSearch(query, resultsCount, aiGenerated = false) {
  await db.from('searches').insert({
    query,
    results_count: resultsCount,
    ai_generated: aiGenerated,
  }).then(() => {});
}

/** Sessão anônima simples */
function getOrCreateSession() {
  let sid = sessionStorage.getItem('tl_session');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('tl_session', sid);
  }
  return sid;
}
```

#### 2.3 — Modificar `app.js` para usar Supabase

No início do `app.js`, substituir a referência estática ao EVENTS:

```javascript
// ANTES (data.js estático):
const state = {
  events: EVENTS.slice(),
  ...
};

// DEPOIS (busca do Supabase):
const state = {
  events: [],  // começa vazio, carregado assincronamente
  loading: true,
  ...
};

// Função de inicialização com carregamento do banco:
async function loadEvents() {
  try {
    const events = await fetchEvents();
    state.events = events;
    state.loading = false;
    // Se tiver evento na URL (#/e/iphone-2007), navega direto
    const r = parseHash();
    if (r.view === 'event') {
      const ev = byId(r.id);
      if (ev) {
        state.idx = state.events.indexOf(ev);
        enterTimeline(false);
      }
    }
  } catch (err) {
    // Fallback para data.js local se banco falhar
    console.warn('Supabase indisponível, usando data.js local:', err);
    state.events = EVENTS.slice();
    state.loading = false;
  }
}
```

Adicionar no `init()`:
```javascript
// Mostrar loading state enquanto busca eventos
showLoadingState();
await loadEvents();
hideLoadingState();
```

---

## FASE 3 — PAINEL DE ADMINISTRADOR
### Objetivo: interface completa para o dono gerenciar tudo

Criar arquivo `admin/index.html` — painel separado, protegido por senha.

#### 3.1 — Autenticação simples do admin

O Supabase tem Auth integrado. Criar usuário admin:
1. No Supabase: **Authentication → Users → Invite user**
2. Inserir o email do dono do projeto
3. O Supabase envia email com link de acesso

No `admin/index.html`:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Timeline · Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <link rel="stylesheet" href="admin.css" />
</head>
<body>
  <!-- LOGIN (mostrado se não autenticado) -->
  <div id="login-screen">
    <div id="login-card">
      <div id="login-logo">Timeline <span>Admin</span></div>
      <input id="login-email" type="email" placeholder="Seu email" />
      <input id="login-password" type="password" placeholder="Senha" />
      <button id="login-btn">Entrar</button>
      <div id="login-error"></div>
    </div>
  </div>

  <!-- PAINEL PRINCIPAL (mostrado se autenticado) -->
  <div id="admin-app" style="display:none;">
    
    <!-- SIDEBAR -->
    <aside id="sidebar">
      <div id="sidebar-logo">Timeline <span>Admin</span></div>
      
      <nav>
        <div class="nav-section">Conteúdo</div>
        <a class="nav-item active" data-page="contributions">
          <span class="ni-icon">⏳</span>
          Contribuições
          <span class="ni-badge" id="pending-count">0</span>
        </a>
        <a class="nav-item" data-page="events">
          <span class="ni-icon">◎</span>Eventos
        </a>
        <a class="nav-item" data-page="new-event">
          <span class="ni-icon">+</span>Novo evento
        </a>
        
        <div class="nav-section">Análise</div>
        <a class="nav-item" data-page="analytics">
          <span class="ni-icon">📊</span>Acessos
        </a>
        <a class="nav-item" data-page="searches">
          <span class="ni-icon">🔍</span>Buscas
        </a>
        
        <div class="nav-section">Sistema</div>
        <a class="nav-item" data-page="settings">
          <span class="ni-icon">⚙</span>Configurações
        </a>
      </nav>
      
      <div id="sidebar-user">
        <span id="user-email"></span>
        <button id="logout-btn">Sair</button>
      </div>
    </aside>

    <!-- CONTEÚDO PRINCIPAL -->
    <main id="main-content">
      
      <!-- PAGE: CONTRIBUIÇÕES -->
      <div id="page-contributions" class="page active">
        <div class="page-header">
          <div>
            <h1>Contribuições pendentes</h1>
            <p id="contributions-subtitle">Carregando...</p>
          </div>
          <div class="header-actions">
            <select id="filter-status">
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
              <option value="">Todas</option>
            </select>
          </div>
        </div>
        
        <!-- Stats -->
        <div id="stats-grid">
          <div class="stat-card">
            <div class="stat-val" id="stat-pending">—</div>
            <div class="stat-label">Pendentes</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" id="stat-approved">—</div>
            <div class="stat-label">Aprovadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" id="stat-rejected">—</div>
            <div class="stat-label">Rejeitadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" id="stat-total-events">—</div>
            <div class="stat-label">Eventos publicados</div>
          </div>
        </div>

        <!-- Tabela de contribuições -->
        <div class="table-card">
          <table id="contributions-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Alteração proposta</th>
                <th>Autor</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="contributions-tbody">
              <tr><td colspan="6" class="empty-state">Carregando contribuições...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAGE: EVENTOS -->
      <div id="page-events" class="page">
        <div class="page-header">
          <div>
            <h1>Todos os eventos</h1>
            <p id="events-subtitle">Carregando...</p>
          </div>
          <div class="header-actions">
            <input id="events-search" type="text" placeholder="Buscar evento..." />
            <select id="filter-track">
              <option value="">Todas as pistas</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="ia">IA</option>
              <option value="rede">Rede</option>
              <option value="cultura">Cultura</option>
            </select>
          </div>
        </div>
        <div class="table-card">
          <table id="events-table">
            <thead>
              <tr>
                <th>Ano</th>
                <th>Título</th>
                <th>Pista</th>
                <th>Importância</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="events-tbody">
              <tr><td colspan="6" class="empty-state">Carregando eventos...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PAGE: NOVO EVENTO -->
      <div id="page-new-event" class="page">
        <div class="page-header">
          <div>
            <h1>Adicionar novo evento</h1>
            <p>Preencha os campos abaixo. Campos marcados com * são obrigatórios.</p>
          </div>
        </div>
        <form id="new-event-form">
          <div class="form-grid">
            <div class="form-group">
              <label>ID único * <small>(slug, ex: linux-1991)</small></label>
              <input type="text" name="id" required placeholder="linux-1991" pattern="[a-z0-9-]+" />
            </div>
            <div class="form-group">
              <label>Ano *</label>
              <input type="number" name="year" required min="1800" max="2100" />
            </div>
            <div class="form-group">
              <label>Mês * <small>(1-12)</small></label>
              <input type="number" name="month" required min="1" max="12" />
            </div>
            <div class="form-group">
              <label>Data formatada * <small>(ex: AGO · 1991)</small></label>
              <input type="text" name="date_display" required placeholder="AGO · 1991" />
            </div>
            <div class="form-group">
              <label>Era *</label>
              <input type="text" name="era" required placeholder="Era da Computação" />
            </div>
            <div class="form-group">
              <label>Pista *</label>
              <select name="track" required>
                <option value="">Selecionar...</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="ia">Inteligência Artificial</option>
                <option value="rede">Redes & Internet</option>
                <option value="cultura">Cultura & Sociedade</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Título *</label>
              <input type="text" name="title" required placeholder="O título do evento histórico" />
            </div>
            <div class="form-group full">
              <label>Descrição * <small>(2-4 frases, tom jornalístico e envolvente)</small></label>
              <textarea name="description" required rows="4" placeholder="Descreva o evento de forma cinematográfica..."></textarea>
            </div>
            <div class="form-group full">
              <label>Tags <small>(separadas por vírgula)</small></label>
              <input type="text" name="tags" placeholder="hardware, software, ia" />
            </div>
            <div class="form-group full">
              <label>Causado por <small>(IDs de eventos pais, separados por vírgula)</small></label>
              <input type="text" name="parents" placeholder="turing-1936, transistor-1947" />
            </div>
            <div class="form-group">
              <label>Importância <small>(1 a 5)</small></label>
              <select name="importance">
                <option value="1">1 — Baixa</option>
                <option value="2">2</option>
                <option value="3" selected>3 — Média</option>
                <option value="4">4</option>
                <option value="5">5 — Alta</option>
              </select>
            </div>
            <div class="form-group">
              <label>URL da imagem hero</label>
              <input type="url" name="img_url" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label>Crédito da imagem</label>
              <input type="text" name="img_credit" placeholder="Unsplash · Arquivo histórico" />
            </div>
            <div class="form-group">
              <label>Tipo da imagem</label>
              <select name="img_type">
                <option value="contributed">Contribuída</option>
                <option value="ai">Gerada por IA</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Citação histórica</label>
              <input type="text" name="quote_text" placeholder="A frase icônica deste momento..." />
            </div>
            <div class="form-group">
              <label>Autor da citação</label>
              <input type="text" name="quote_by" placeholder="Nome, contexto" />
            </div>
            <div class="form-group">
              <label>ID do vídeo YouTube</label>
              <input type="text" name="video_id" placeholder="cwZb2mqId0A" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="btn-ai-generate">✦ Gerar com IA</button>
            <button type="submit" class="btn-primary">Publicar evento</button>
          </div>
        </form>
      </div>

      <!-- PAGE: ANALYTICS -->
      <div id="page-analytics" class="page">
        <div class="page-header">
          <h1>Acessos e uso</h1>
        </div>
        <div id="stats-grid-analytics">
          <div class="stat-card">
            <div class="stat-val" id="stat-views-today">—</div>
            <div class="stat-label">Visualizações hoje</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" id="stat-views-week">—</div>
            <div class="stat-label">Esta semana</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" id="stat-views-total">—</div>
            <div class="stat-label">Total histórico</div>
          </div>
        </div>
        <div class="table-card">
          <div class="table-header"><span>Eventos mais acessados</span></div>
          <table>
            <thead>
              <tr><th>Evento</th><th>Visualizações</th></tr>
            </thead>
            <tbody id="top-events-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- PAGE: BUSCAS -->
      <div id="page-searches" class="page">
        <div class="page-header">
          <h1>O que as pessoas buscam</h1>
        </div>
        <div class="table-card">
          <table>
            <thead>
              <tr><th>Busca</th><th>Quantidade</th><th>Gerou evento IA?</th></tr>
            </thead>
            <tbody id="searches-tbody"></tbody>
          </table>
        </div>
      </div>

    </main>
  </div>

  <!-- MODAL: Revisão de contribuição -->
  <div id="review-modal" class="modal">
    <div class="modal-bg"></div>
    <div class="modal-content">
      <button class="modal-close" id="review-close">×</button>
      <h2 id="review-title">Revisar contribuição</h2>
      <div id="review-body"></div>
      <div id="review-actions">
        <textarea id="rejection-reason" placeholder="Motivo da rejeição (obrigatório ao rejeitar)..."></textarea>
        <div class="review-btns">
          <button id="btn-approve" class="btn-approve">✓ Aprovar e publicar</button>
          <button id="btn-reject" class="btn-reject">✗ Rejeitar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: Editar evento -->
  <div id="edit-modal" class="modal">
    <div class="modal-bg"></div>
    <div class="modal-content modal-wide">
      <button class="modal-close" id="edit-close">×</button>
      <h2>Editar evento</h2>
      <div id="edit-body"></div>
    </div>
  </div>

  <div id="toast"></div>

  <script src="admin.js"></script>
</body>
</html>
```

#### 3.2 — Criar `admin/admin.js`

```javascript
// admin/admin.js — lógica completa do painel admin

const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── ESTADO ───────────────────────────────────────────────
const state = {
  user: null,
  currentPage: 'contributions',
  contributions: [],
  events: [],
  reviewing: null,
};

// ── HELPERS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const toast = (msg, type = 'info') => {
  const el = $('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => el.className = '', 3000);
};

// ── AUTENTICAÇÃO ─────────────────────────────────────────
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

// ── NAVEGAÇÃO ─────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    if (page) loadPage(page);
  });
});

function loadPage(page) {
  state.currentPage = page;
  
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.page === page)
  );
  document.querySelectorAll('.page').forEach(p =>
    p.classList.toggle('active', p.id === `page-${page}`)
  );
  
  const loaders = {
    'contributions': loadContributions,
    'events': loadEvents,
    'analytics': loadAnalytics,
    'searches': loadSearches,
  };
  
  if (loaders[page]) loaders[page]();
}

// ── CONTRIBUIÇÕES ─────────────────────────────────────────
async function loadContributions() {
  const status = $('filter-status')?.value || 'pending';
  
  let query = db
    .from('contributions')
    .select(`*, events(title, date_display, year)`)
    .order('created_at', { ascending: false });
  
  if (status) query = query.eq('status', status);
  
  const { data, error } = await query;
  if (error) { toast('Erro ao carregar contribuições', 'error'); return; }
  
  state.contributions = data;
  renderContributions(data);
  updateStats();
}

function renderContributions(list) {
  const tbody = $('contributions-tbody');
  
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma contribuição encontrada.</td></tr>';
    return;
  }
  
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <div class="td-event">
          <div class="td-title">${c.events?.title || c.event_id || 'Novo evento'}</div>
          <div class="td-meta">${c.events?.date_display || ''} · ${c.event_id || ''}</div>
        </div>
      </td>
      <td>
        <div class="td-change">
          ${renderDiff(c)}
        </div>
      </td>
      <td>
        <div class="td-author">
          <div class="avatar">${(c.contributor_name || '?')[0].toUpperCase()}</div>
          ${c.contributor_name || 'Anônimo'}
        </div>
      </td>
      <td><span class="badge ${c.source === 'ai' ? 'b-ai' : 'b-community'}">${c.source === 'ai' ? '✦ IA' : 'Comunidade'}</span></td>
      <td>${formatDate(c.created_at)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-sm btn-view" onclick="openReview('${c.id}')">Ver</button>
          ${c.status === 'pending' ? `
            <button class="btn-sm btn-approve" onclick="quickApprove('${c.id}')">✓</button>
            <button class="btn-sm btn-reject" onclick="quickReject('${c.id}')">✗</button>
          ` : `<span class="badge b-${c.status}">${statusLabel(c.status)}</span>`}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderDiff(c) {
  if (c.contribution_type === 'new_event') {
    return '<ins>Novo evento completo</ins>';
  }
  if (c.value_before && c.value_after) {
    return `<del>${truncate(c.value_before, 60)}</del><br><ins>${truncate(c.value_after, 60)}</ins>`;
  }
  return c.value_after ? truncate(c.value_after, 120) : '—';
}

async function openReview(id) {
  const c = state.contributions.find(x => x.id === id);
  if (!c) return;
  state.reviewing = c;
  
  const modal = $('review-modal');
  $('review-title').textContent = c.contribution_type === 'new_event'
    ? 'Revisar novo evento proposto'
    : `Revisar edição: ${c.events?.title || c.event_id}`;
  
  $('review-body').innerHTML = `
    <div class="review-field"><strong>Tipo:</strong> ${typeLabel(c.contribution_type)}</div>
    <div class="review-field"><strong>Campo:</strong> ${c.field_changed || '—'}</div>
    ${c.value_before ? `<div class="review-diff"><strong>Antes:</strong><div class="diff-before">${c.value_before}</div></div>` : ''}
    <div class="review-diff"><strong>Depois:</strong><div class="diff-after">${c.value_after || JSON.stringify(c.full_event_json, null, 2)}</div></div>
    <div class="review-field"><strong>Autor:</strong> ${c.contributor_name || 'Anônimo'} ${c.contributor_email ? `(${c.contributor_email})` : ''}</div>
    <div class="review-field"><strong>Origem:</strong> ${c.source === 'ai' ? '✦ Gerado por IA' : 'Comunidade'}</div>
    <div class="review-field"><strong>Data:</strong> ${formatDate(c.created_at)}</div>
  `;
  
  $('rejection-reason').value = '';
  $('review-actions').style.display = c.status === 'pending' ? 'block' : 'none';
  
  modal.classList.add('show');
}

async function approveContribution(id) {
  const c = state.contributions.find(x => x.id === id);
  if (!c) return;
  
  // Aplicar a mudança no evento
  if (c.contribution_type === 'new_event' && c.full_event_json) {
    const { error } = await db.from('events').insert(c.full_event_json);
    if (error) { toast('Erro ao criar evento: ' + error.message, 'error'); return; }
  } else if (c.field_changed && c.value_after) {
    const updateObj = { [c.field_changed]: c.value_after };
    const { error } = await db.from('events').update(updateObj).eq('id', c.event_id);
    if (error) { toast('Erro ao atualizar evento: ' + error.message, 'error'); return; }
    
    // Salvar no histórico
    await db.from('event_history').insert({
      event_id: c.event_id,
      snapshot: { [c.field_changed]: c.value_after },
      changed_fields: [c.field_changed],
      change_summary: `${c.field_changed} atualizado via contribuição da comunidade`,
      contribution_id: c.id,
    });
  }
  
  // Marcar como aprovado
  await db.from('contributions').update({
    status: 'approved',
    reviewed_by: state.user.email,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  
  toast('✓ Contribuição aprovada e publicada!', 'success');
  closeModal('review-modal');
  loadContributions();
}

async function rejectContribution(id, reason) {
  if (!reason?.trim()) { toast('Informe o motivo da rejeição', 'error'); return; }
  
  await db.from('contributions').update({
    status: 'rejected',
    rejection_reason: reason,
    reviewed_by: state.user.email,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  
  toast('Contribuição rejeitada.', 'info');
  closeModal('review-modal');
  loadContributions();
}

async function quickApprove(id) {
  state.reviewing = state.contributions.find(x => x.id === id);
  await approveContribution(id);
}

async function quickReject(id) {
  const reason = prompt('Motivo da rejeição:');
  if (reason) await rejectContribution(id, reason);
}

$('btn-approve').addEventListener('click', () => {
  if (state.reviewing) approveContribution(state.reviewing.id);
});
$('btn-reject').addEventListener('click', () => {
  const reason = $('rejection-reason').value;
  if (state.reviewing) rejectContribution(state.reviewing.id, reason);
});

// ── EVENTOS ───────────────────────────────────────────────
async function loadEvents() {
  const { data, error } = await db
    .from('events')
    .select('*')
    .order('year', { ascending: true });
  
  if (error) { toast('Erro ao carregar eventos', 'error'); return; }
  state.events = data;
  renderEvents(data);
  $('events-subtitle').textContent = `${data.length} eventos no banco de dados`;
}

function renderEvents(list) {
  const tbody = $('events-tbody');
  tbody.innerHTML = list.map(ev => `
    <tr>
      <td>${ev.year}</td>
      <td>
        <div class="td-title">${ev.title}</div>
        <div class="td-meta">${ev.id}</div>
      </td>
      <td><span class="track-badge" data-track="${ev.track}">${ev.track}</span></td>
      <td>${'★'.repeat(ev.importance || 3)}</td>
      <td><span class="badge ${ev.is_published ? 'b-approved' : 'b-rejected'}">${ev.is_published ? 'Publicado' : 'Oculto'}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-sm btn-view" onclick="editEvent('${ev.id}')">Editar</button>
          <button class="btn-sm btn-reject" onclick="togglePublish('${ev.id}', ${ev.is_published})">${ev.is_published ? 'Ocultar' : 'Publicar'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function togglePublish(id, current) {
  const { error } = await db.from('events').update({ is_published: !current }).eq('id', id);
  if (error) { toast('Erro', 'error'); return; }
  toast(current ? 'Evento ocultado' : 'Evento publicado', 'success');
  loadEvents();
}

// ── NOVO EVENTO ────────────────────────────────────────────
$('new-event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  
  const event = {
    id: data.get('id'),
    year: parseInt(data.get('year')),
    month: parseInt(data.get('month')),
    date_display: data.get('date_display'),
    era: data.get('era'),
    track: data.get('track'),
    title: data.get('title'),
    description: data.get('description'),
    tags: data.get('tags').split(',').map(t => t.trim()).filter(Boolean),
    parents: data.get('parents').split(',').map(t => t.trim()).filter(Boolean),
    importance: parseInt(data.get('importance')),
    img_url: data.get('img_url') || null,
    img_credit: data.get('img_credit') || null,
    img_type: data.get('img_type'),
    quote_text: data.get('quote_text') || null,
    quote_by: data.get('quote_by') || null,
    video_id: data.get('video_id') || null,
    is_published: true,
  };
  
  const { error } = await db.from('events').insert(event);
  if (error) {
    toast('Erro: ' + error.message, 'error');
  } else {
    toast('✓ Evento publicado com sucesso!', 'success');
    form.reset();
    loadPage('events');
  }
});

// ── ANALYTICS ─────────────────────────────────────────────
async function loadAnalytics() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  
  const [todayViews, weekViews, totalViews] = await Promise.all([
    db.from('page_views').select('id', { count: 'exact' }).gte('created_at', today),
    db.from('page_views').select('id', { count: 'exact' }).gte('created_at', weekAgo),
    db.from('page_views').select('id', { count: 'exact' }),
  ]);
  
  $('stat-views-today').textContent = todayViews.count || 0;
  $('stat-views-week').textContent = weekViews.count || 0;
  $('stat-views-total').textContent = totalViews.count || 0;
  
  // Top eventos
  const { data: topEvents } = await db
    .from('page_views')
    .select('event_id')
    .not('event_id', 'is', null);
  
  const counts = {};
  topEvents?.forEach(v => { counts[v.event_id] = (counts[v.event_id] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  
  $('top-events-tbody').innerHTML = sorted.map(([id, count]) =>
    `<tr><td>${id}</td><td>${count}</td></tr>`
  ).join('') || '<tr><td colspan="2" class="empty-state">Sem dados ainda</td></tr>';
}

// ── BUSCAS ────────────────────────────────────────────────
async function loadSearches() {
  const { data } = await db
    .from('searches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  const counts = {};
  data?.forEach(s => {
    const key = s.query.toLowerCase();
    if (!counts[key]) counts[key] = { count: 0, ai: false };
    counts[key].count++;
    if (s.ai_generated) counts[key].ai = true;
  });
  
  const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  
  $('searches-tbody').innerHTML = sorted.map(([query, info]) =>
    `<tr>
      <td>${query}</td>
      <td>${info.count}</td>
      <td>${info.ai ? '<span class="badge b-ai">✦ Sim</span>' : '—'}</td>
    </tr>`
  ).join('') || '<tr><td colspan="3" class="empty-state">Sem buscas registradas</td></tr>';
}

// ── STATS ─────────────────────────────────────────────────
async function updateStats() {
  const [pending, approved, rejected, eventsCount] = await Promise.all([
    db.from('contributions').select('id', { count: 'exact' }).eq('status', 'pending'),
    db.from('contributions').select('id', { count: 'exact' }).eq('status', 'approved'),
    db.from('contributions').select('id', { count: 'exact' }).eq('status', 'rejected'),
    db.from('events').select('id', { count: 'exact' }).eq('is_published', true),
  ]);
  
  if ($('stat-pending')) $('stat-pending').textContent = pending.count || 0;
  if ($('stat-approved')) $('stat-approved').textContent = approved.count || 0;
  if ($('stat-rejected')) $('stat-rejected').textContent = rejected.count || 0;
  if ($('stat-total-events')) $('stat-total-events').textContent = eventsCount.count || 0;
  if ($('pending-count')) $('pending-count').textContent = pending.count || 0;
  
  $('contributions-subtitle').textContent =
    `${pending.count || 0} pendentes · ${approved.count || 0} aprovadas · ${rejected.count || 0} rejeitadas`;
}

// ── MODAIS ────────────────────────────────────────────────
function closeModal(id) { $(id).classList.remove('show'); }
$('review-close').addEventListener('click', () => closeModal('review-modal'));
$('edit-close').addEventListener('click', () => closeModal('edit-modal'));
document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', () => bg.closest('.modal').classList.remove('show'));
});

// ── UTILS ─────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function truncate(str, n) { return str?.length > n ? str.slice(0, n) + '...' : str || ''; }
function statusLabel(s) { return { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' }[s] || s; }
function typeLabel(t) { return { edit_text: 'Edição de texto', edit_image: 'Troca de imagem', new_event: 'Novo evento', add_quote: 'Citação', fix_date: 'Correção de data' }[t] || t; }

// Filtro de status
$('filter-status')?.addEventListener('change', loadContributions);

// ── INIT ──────────────────────────────────────────────────
checkAuth();
```

#### 3.3 — Criar `admin/admin.css`

Criar o arquivo CSS do painel admin com o visual limpo (fundo branco, tipografia Sora, tabelas elegantes, sidebar esquerda). Reutilizar os tokens visuais do projeto principal mas em modo claro.

---

## FASE 4 — FORMULÁRIO DE CONTRIBUIÇÃO NO FRONTEND
### Objetivo: usuários podem sugerir mudanças direto da timeline

#### 4.1 — Adicionar modal de contribuição no `index.html`

```html
<!-- Modal de contribuição -->
<div id="contribute-modal" class="modal">
  <div class="modal-bg"></div>
  <div class="modal-content">
    <button class="modal-close" data-close="contribute-modal">×</button>
    <h3>Contribuir para este evento</h3>
    <p class="modal-sub" id="contribute-event-name"></p>
    
    <div id="contribute-type-picker">
      <button class="ctype-btn active" data-type="edit_text">✎ Corrigir texto</button>
      <button class="ctype-btn" data-type="edit_image">🖼 Sugerir imagem</button>
      <button class="ctype-btn" data-type="add_quote">❝ Adicionar citação</button>
      <button class="ctype-btn" data-type="new_event">+ Sugerir novo evento</button>
    </div>
    
    <div id="contribute-form">
      <textarea id="contribute-text" placeholder="Descreva sua sugestão ou cole o texto corrigido..." rows="5"></textarea>
      <input id="contribute-name" type="text" placeholder="Seu nome (opcional)" />
      <input id="contribute-email" type="email" placeholder="Seu email (opcional — para acompanhar)" />
      <button id="contribute-submit" class="cta-btn cta-primary">Enviar sugestão</button>
    </div>
    
    <p class="contribute-footer">
      Todas as sugestões são revisadas antes de serem publicadas.
      Origem: <strong>Comunidade</strong>.
    </p>
  </div>
</div>
```

#### 4.2 — Lógica no `app.js`

```javascript
// Abrir modal de contribuição
function openContribute() {
  const ev = state.events[state.idx];
  $('contribute-event-name').textContent = `${ev.y} · ${ev.t}`;
  openModal('contribute-modal');
}

// Enviar contribuição
$('contribute-submit').addEventListener('click', async () => {
  const ev = state.events[state.idx];
  const text = $('contribute-text').value.trim();
  const type = document.querySelector('.ctype-btn.active')?.dataset.type || 'edit_text';
  
  if (!text) { toast('Descreva sua sugestão'); return; }
  
  try {
    await submitContribution({
      eventId: ev.id,
      contributionType: type,
      valueAfter: text,
      contributorName: $('contribute-name').value.trim() || null,
      contributorEmail: $('contribute-email').value.trim() || null,
    });
    toast('✓ Sugestão enviada! Obrigado.', 2800);
    closeModal('contribute-modal');
  } catch (err) {
    toast('Erro ao enviar. Tente novamente.');
  }
});
```

---

## FASE 5 — BUSCA INTELIGENTE COM IA
### Objetivo: quando o usuário busca algo que não existe, a IA gera o evento

#### 5.1 — Modificar a função `searchTerm` no `app.js`

```javascript
async function searchTerm(query) {
  const q = query.toLowerCase().trim();
  if (!q) { enterTimeline(); return; }
  
  // Primeiro: buscar na base local
  const localMatch = state.events.findIndex(ev =>
    ev.t.toLowerCase().includes(q) ||
    ev.x.toLowerCase().includes(q) ||
    ev.tg.some(t => t.toLowerCase().includes(q)) ||
    ev.y.toString().includes(q) ||
    ev.era.toLowerCase().includes(q)
  );
  
  // Registrar busca no banco
  await trackSearch(q, localMatch >= 0 ? 1 : 0, false);
  
  if (localMatch >= 0) {
    state.idx = localMatch;
    enterTimeline();
    return;
  }
  
  // Não encontrou localmente: tentar gerar com IA
  const key = getKey();
  if (!key) {
    // Sem chave: entrar mesmo assim, mostrar o primeiro evento
    enterTimeline();
    toast('Evento não encontrado. Configure a IA para busca avançada.');
    return;
  }
  
  // Mostrar loading
  toast('Buscando com IA...');
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `O usuário buscou: "${query}" em uma timeline de história da tecnologia.
          
Gere um evento histórico real relacionado a esta busca no seguinte formato JSON (apenas o JSON, sem explicações):

{
  "id": "slug-unico-ano",
  "y": 1991,
  "m": 8,
  "d": "AGO · 1991",
  "era": "Era da Computação",
  "track": "software",
  "t": "Título curto e impactante",
  "x": "Descrição de 2-3 frases no estilo jornalístico cinematográfico. Use fatos reais verificáveis.",
  "tg": ["software", "cultura"],
  "parents": [],
  "importance": 4,
  "img": "https://images.unsplash.com/photo-XXXXXX?w=1600&q=80",
  "imgCredit": "Gerada por IA · Descrição",
  "imgType": "ai",
  "quote": { "text": "Citação real se existir", "by": "Pessoa, contexto" }
}

Use apenas eventos REAIS e VERIFICÁVEIS. Se não houver evento real relacionado, retorne: {"error": "Sem evento real para esta busca"}`
        }]
      })
    });
    
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const generated = JSON.parse(jsonMatch[0]);
      
      if (generated.error) {
        toast('Nenhum evento encontrado para esta busca.');
        enterTimeline();
        return;
      }
      
      // Adicionar flag de evento gerado pela IA
      generated.aiGenerated = true;
      
      // Inserir temporariamente no estado
      state.events = [generated, ...state.events];
      state.idx = 0;
      
      // Enviar para moderação no banco
      await submitContribution({
        eventId: generated.id,
        contributionType: 'new_event',
        valueAfter: generated.t,
        fullEventJson: generated,
        source: 'ai',
        aiModel: 'claude-sonnet-4-20250514',
      });
      
      await trackSearch(q, 1, true);
      
      enterTimeline();
      toast('✦ Evento gerado pela IA · Aguarda curadoria', 3500);
    } else {
      enterTimeline();
      toast('Nenhum evento encontrado.');
    }
  } catch (err) {
    enterTimeline();
    toast('Erro na busca com IA.');
  }
}
```

---

## FASE 6 — VARIÁVEIS DE AMBIENTE NO VERCEL
### Objetivo: chaves seguras, não expostas no código

No Vercel dashboard:
1. Entrar no projeto
2. Settings → Environment Variables
3. Adicionar:
   - `SUPABASE_URL` = sua URL do Supabase
   - `SUPABASE_ANON_KEY` = sua chave anon

Para usar no frontend (arquivo `config.js`):
```javascript
// config.js — gerado pelo build, não commitado
// Para projeto estático simples, usar as variáveis diretamente
// Em produção com Vercel, criar api/config.js como serverless function
```

---

## CHECKLIST COMPLETO DE EXECUÇÃO

### ✅ Fase 0 — Deploy (fazer primeiro)
- [ ] Inicializar git na pasta do projeto
- [ ] Criar `.gitignore` com `.env`, `node_modules/`, `.DS_Store`
- [ ] Criar repositório privado no GitHub (`timeline-system`)
- [ ] Fazer push de todos os arquivos
- [ ] Conectar repositório ao Vercel
- [ ] Confirmar que `https://timeline-system.vercel.app` funciona

### ✅ Fase 1 — Backend
- [ ] Criar projeto no Supabase
- [ ] Executar SQL completo da Fase 1.2
- [ ] Migrar 49 eventos com o script `migrate-events.js`
- [ ] Confirmar que os dados aparecem no Supabase Table Editor

### ✅ Fase 2 — Frontend integrado
- [ ] Adicionar SDK do Supabase no `index.html`
- [ ] Criar `supabase.js` com as funções de acesso
- [ ] Modificar `app.js` para buscar eventos do banco
- [ ] Adicionar tracking de pageviews e buscas
- [ ] Testar que a timeline carrega do banco

### ✅ Fase 3 — Admin Panel
- [ ] Criar pasta `admin/`
- [ ] Criar `admin/index.html`
- [ ] Criar `admin/admin.js`
- [ ] Criar `admin/admin.css`
- [ ] Criar usuário admin no Supabase Auth
- [ ] Testar login e listagem de contribuições
- [ ] Testar aprovação e rejeição

### ✅ Fase 4 — Contribuições
- [ ] Adicionar modal de contribuição no `index.html`
- [ ] Conectar botão "Contribuir" ao modal
- [ ] Testar envio de contribuição
- [ ] Confirmar que aparece no painel admin

### ✅ Fase 5 — Busca IA
- [ ] Modificar `searchTerm` no `app.js`
- [ ] Testar busca com termo existente na base
- [ ] Testar busca com termo novo (requer chave Anthropic)
- [ ] Confirmar que evento gerado aparece na fila do admin

### ✅ Fase 6 — Polimento final
- [ ] Atualizar README.md com nova stack
- [ ] Fazer push final para o GitHub
- [ ] Confirmar Vercel atualizou automaticamente
- [ ] Testar todo o fluxo de ponta a ponta

---

## ESTRUTURA FINAL DE ARQUIVOS

```
timeline-system/
├── index.html          → app principal (público)
├── styles.css          → estilos do app
├── app.js              → lógica do app
├── data.js             → fallback local (49 eventos)
├── supabase.js         → funções de acesso ao banco
├── config.js           → configurações (não commitar com chaves)
├── .gitignore          → ignora .env e node_modules
├── README.md           → documentação atualizada
│
├── admin/
│   ├── index.html      → painel de administrador
│   ├── admin.js        → lógica do admin
│   └── admin.css       → estilos do admin
│
└── scripts/
    └── migrate-events.js → migração do data.js para Supabase
```

---

## NOTAS IMPORTANTES PARA O CLAUDE CODE

1. **Não quebrar o que funciona:** o app.js atual funciona com data.js local. Sempre manter o fallback — se Supabase falhar, usar data.js.

2. **Segurança:** a `service_role` key do Supabase NUNCA vai para o frontend. Apenas a `anon` key. A `service_role` fica só no script de migração local.

3. **O admin fica em `/admin`:** não está protegido por obscuridade — a autenticação é feita pelo Supabase Auth. Mas NÃO adicionar link visível para `/admin` no app principal.

4. **Progressivo:** implementar uma fase de cada vez, testando no Vercel antes de avançar.

5. **O `data.js` permanece:** mesmo com Supabase, manter o `data.js` como fallback e como "fonte da verdade" para a estrutura dos dados.

---

*Documento gerado em: Abril 2026 | Timeline System v2.0*
*Construído com: Claude (Anthropic) como parceiro de produto e arquitetura*
