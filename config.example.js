/* ════════════════════════════════════════════════════════════
   CONFIGURAÇÃO — Copie este arquivo para `config.js` e preencha
   ════════════════════════════════════════════════════════════
   - O `config.js` real está no .gitignore — NUNCA é commitado.
   - Apenas a chave `anon` do Supabase pode ficar aqui (ela é
     pública por design, protegida pelas políticas RLS).
   - A chave `service_role` SÓ pode estar em scripts/migrate-events.js
     que roda local (também ignorado se você passar via env).
   ════════════════════════════════════════════════════════════ */

window.TL_CONFIG = {
  // Supabase — Settings → API
  SUPABASE_URL: 'https://SEU_PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',

  // Anthropic (opcional — usuário também pode colar a sua na UI)
  // Se preencher aqui, todos os visitantes usam SUA chave (cuidado com custo).
  // Em produção, prefira deixar vazio e cada usuário usa a própria.
  ANTHROPIC_API_KEY: '',
};
