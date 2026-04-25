// ════════════════════════════════════════════════════════════
// MIGRAÇÃO: data.js → Supabase
// ════════════════════════════════════════════════════════════
// Como usar:
//   1. cd Timeline/
//   2. npm init -y
//   3. npm install @supabase/supabase-js
//   4. Edite as 2 constantes abaixo (URL + SERVICE KEY)
//   5. node scripts/migrate-events.js
//
// IMPORTANTE: use a SERVICE_ROLE key (não a anon).
// A service_role key NUNCA vai para o frontend ou git.
// Encontre em: Supabase → Settings → API → service_role
// ════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 👇 PREENCHA AQUI antes de rodar
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://SEU_PROJETO.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'SUA_SERVICE_ROLE_KEY';

if (SUPABASE_URL.includes('SEU_PROJETO') || SUPABASE_SERVICE_KEY.includes('SUA_SERVICE_ROLE_KEY')) {
  console.error('\n❌ Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no início deste arquivo');
  console.error('   ou via variáveis de ambiente:');
  console.error('   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-events.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Carrega o EVENTS array do data.js (avalia o arquivo num escopo isolado)
const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const wrap = dataSrc.replace(/^const /gm, 'var ') + '\nmodule.exports = { EVENTS, TRACKS, TAG_COLORS, THEMES };';
const tmpFile = path.join(__dirname, '_data_loaded.js');
fs.writeFileSync(tmpFile, wrap);
const { EVENTS } = require('./_data_loaded.js');
fs.unlinkSync(tmpFile);

async function migrate() {
  console.log(`\n🚀 Migrando ${EVENTS.length} eventos para o Supabase...\n`);

  let ok = 0, fail = 0;

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
      tags: ev.tg || [],
      parents: ev.parents || [],
      importance: ev.importance || 3,
      img_url: ev.img,
      img_credit: ev.imgCredit,
      img_type: ev.imgType,
      quote_text: (ev.quote && ev.quote.text) || null,
      quote_by: (ev.quote && ev.quote.by) || null,
      video_id: ev.video || null,
      is_published: true,
    };

    const { error } = await supabase.from('events').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error(`  ✗ ${ev.id}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ ${ev.id}`);
      ok++;
    }
  }

  console.log(`\n✅ Concluído: ${ok} sucesso · ${fail} falhas\n`);
}

migrate().catch((e) => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});