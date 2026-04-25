# Timeline System

> Uma nova forma de explorar a história da tecnologia.
> Powered by AI · Curated by Community.

---

## ✨ O que tem nesta versão

- **49 eventos curados**, de 1876 a 2025
- **Backend Supabase** opcional — se ausente, o app cai automaticamente em fallback `data.js` local
- **Painel admin** completo (`/admin`) — login, fila de contribuições, edição de eventos, novo evento, analytics
- **Contribuições da comunidade** — modal com 4 tipos (texto, imagem, citação, data) que enfileira no Supabase
- **Busca com IA** — quando a busca não acha nada local, o Claude gera um evento histórico real e o envia para curadoria
- **Tracking** silencioso de pageviews e buscas
- **IA real** via Claude (Aprofundar · Contrafactual · Chat) com chave Anthropic em `localStorage`
- **Story Mode**, **Share** com canvas OG, **intro cinemática**

---

## 🚀 Deploy completo — passo a passo

### Fase 0 · Subir no GitHub e Vercel (15 min)

```bash
cd f:/Antigravity/Timeline
git init
git add .
git commit -m "feat: Timeline System v2 — backend, admin, AI search, contribuições"
```

1. Crie um repositório **privado** em https://github.com/new (nome sugerido: `timeline-system`, sem README)
2. Conecte e faça push:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/timeline-system.git
   git branch -M main
   git push -u origin main
   ```
3. Acesse https://vercel.com → "Add New Project" → escolha o repositório → Deploy (Framework: **Other**)
4. Em ~60s seu app estará em `https://timeline-system.vercel.app`

A partir daqui, **cada `git push` republica automaticamente.**

---

### Fase 1 · Backend Supabase (10 min)

1. https://supabase.com → "New project" → Region: **South America (São Paulo)**
2. Aguarde ~2 min até o projeto criar
3. **SQL Editor → New query** → cole o conteúdo de [`supabase-schema.sql`](supabase-schema.sql) → Run
4. **Settings → API** → copie:
   - `Project URL` (será `SUPABASE_URL`)
   - `anon public` key (será `SUPABASE_ANON_KEY`)
   - `service_role` key (será `SUPABASE_SERVICE_KEY` — **NUNCA** vai pro frontend)

---

### Fase 2 · Conectar frontend ao Supabase (5 min)

1. Copie `config.example.js` para `config.js`:
   ```bash
   cp config.example.js config.js
   ```
2. Edite `config.js` com as 2 chaves: `SUPABASE_URL` + `SUPABASE_ANON_KEY`
3. **Não commite o `config.js`** — já está no `.gitignore`

> Em produção (Vercel), você pode optar por não usar `config.js` e gerar essa configuração via **build step**, ou simplesmente subir o `config.js` mesmo (a anon key é pública por design, protegida pelas políticas RLS do Supabase).

---

### Fase 3 · Migrar 49 eventos para o banco (3 min)

```bash
cd f:/Antigravity/Timeline
npm init -y
npm install @supabase/supabase-js
SUPABASE_URL="https://SEU_PROJETO.supabase.co" SUPABASE_SERVICE_KEY="eyJ..." node scripts/migrate-events.js
```

Saída esperada: `✅ Concluído: 49 sucesso · 0 falhas`

Confira no Supabase → **Table Editor → events** que as linhas apareceram.

---

### Fase 4 · Criar usuário admin (2 min)

1. Supabase → **Authentication → Users → Invite user**
2. Insira seu email → Send
3. Você recebe email com link para definir senha
4. Acesse `https://timeline-system.vercel.app/admin/` (ou local: `http://localhost:8000/admin/`)
5. Login com email + senha definidos

---

## ⌨️ Atalhos do app principal

| Tecla | Ação |
|---|---|
| `→` / `←` | Próximo / Anterior |
| `Espaço` | Play / Pause |
| `A` | Aprofundar com IA |
| `S` | Compartilhar |
| `?` | Ajuda |
| `Esc` | Voltar / Fechar |
| `/` | Focar busca (na home) |

---

## 🤖 Configurando IA real

Clique em **Aprofundar com IA** → *Configurar* no rodapé do painel. Cole sua chave Anthropic (`sk-ant-...`). Fica em `localStorage`, enviada apenas para `api.anthropic.com` com header `anthropic-dangerous-direct-browser-access`.

Sem chave: tudo roda em **modo demo** com respostas prebaked. **Story Mode**, **Aprofundar**, **Contrafactual** e a **busca IA** ficam muito mais ricos com chave real.

---

## 📁 Estrutura

```
Timeline/
├── index.html              → app principal (público)
├── styles.css              → estilos do app
├── app.js                  → lógica do app
├── data.js                 → fallback local (49 eventos)
├── supabase.js             → client e funções de acesso ao banco
├── config.example.js       → template (copie para config.js)
├── config.js               → suas chaves (NÃO commitado)
├── supabase-schema.sql     → SQL para criar todas as tabelas
├── .gitignore
├── README.md
│
├── admin/
│   ├── index.html          → painel de curadoria
│   ├── admin.js            → lógica do admin
│   └── admin.css           → estilo (modo claro)
│
└── scripts/
    └── migrate-events.js   → data.js → Supabase
```

---

## 🛡 Como o sistema protege as chaves

| Chave | Onde fica | Vai pro git? |
|---|---|---|
| `SUPABASE_ANON_KEY` | `config.js` (frontend) | Não (gitignored), mas pode ir — é pública por design |
| `SUPABASE_SERVICE_KEY` | só no terminal local ao rodar `migrate-events.js` | **NUNCA** |
| `ANTHROPIC_API_KEY` (do usuário) | `localStorage` do browser | **NUNCA** |

As tabelas têm **RLS (Row Level Security)** ativo. Mesmo com a `anon` key vazada, o público só consegue:
- LER eventos publicados
- INSERIR contribuições e pageviews
- Tudo o resto exige login (admin).

---

## 🎯 Roadmap futuro

- [ ] Backend proxy para Anthropic (sem precisar usuário ter chave própria)
- [ ] Upload real de imagens (Supabase Storage)
- [ ] Mais temas: ciência, música, história mundial
- [ ] Webhook para notificar admin em nova contribuição
- [ ] Bookmarks pessoais (IndexedDB)

---

**Feito para escalar. Feito para surpreender.**
