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
  SUPABASE_URL: 'https://cswhjnwmirllbgecrbzj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzd2hqbndtaXJsbGJnZWNyYnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzIxMzEsImV4cCI6MjA5MjY0ODEzMX0.Ae427Xvmy6uPpJrMsQRfZI0C7yU9i_LVCgLrV9F0Hyc',

  // Anthropic (opcional — usuário também pode colar a sua na UI)
  // Se preencher aqui, todos os visitantes usam SUA chave (cuidado com custo).
  // Em produção, prefira deixar vazio e cada usuário usa a própria.
  ANTHROPIC_API_KEY: '',
};
