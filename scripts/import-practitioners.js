const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Setup Supabase Admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

async function run() {
  console.log("Membaca file main_info.csv...");
  
  const filePath = path.join(__dirname, '../main_info.csv');
  if (!fs.existsSync(filePath)) {
    console.error("❌ File main_info.csv tidak ditemukan! Pastikan sudah di-download dan ditaruh di folder combat-app.");
    return;
  }

  // Baca CSV
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, { columns: false, skip_empty_lines: true });

  let successCount = 0;
  let errorCount = 0;

  console.log(`Ditemukan ${records.length} baris. Mulai memproses...`);

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    
    // Berdasarkan kode lama (USER_COL):
    // ID=1, NAME=2, HOUSE=3, TIER=4, WIN=5, LOSE=6, DRAW=7, COMBAT=8, EXP=9, CP=10, GT=11, PHOTO=12, PASS=13
    const id = (row[1] || '').trim();
    const name = (row[2] || '').trim();
    let passwordRaw = (row[13] || '').trim(); 
    
    // Skip baris kosong atau baris header
    if (!id || id.toLowerCase() === 'id') continue;

    try {
      // JIKA PASSWORD KOSONG, PAKAI ID SEBAGAI PASSWORD DEFAULT
      if (!passwordRaw) {
        passwordRaw = id;
      }

      // 1. Masukkan ke tabel practitioners
      const { error: pracError } = await supabase
        .from('practitioners')
        .upsert({
          combat_id: id,
          name: name,
          house: (row[3] || '').trim(),
          tier: (row[4] || 'Shodan').trim(),
          win: parseInt(row[5]) || 0,
          lose: parseInt(row[6]) || 0,
          draw: parseInt(row[7]) || 0,
          combat: parseInt(row[8]) || 0,
          exp: parseInt(row[9]) || 0,
          cp: parseInt(row[10]) || 0,
          gatcha_token: parseInt(row[11]) || 0,
          photo_url: (row[12] || '').trim()
        }, { onConflict: 'combat_id' });

      if (pracError) throw pracError;

      // 2. Masukkan password ke legacy_credentials
      // Kalau password di sheet panjangnya 64 dan hanya huruf/angka, berarti sudah di-hash.
      // Kalau belum, kita hash di sini.
      const isAlreadyHashed = passwordRaw.length === 64 && /^[a-f0-9]+$/i.test(passwordRaw);
      const finalHash = isAlreadyHashed ? passwordRaw : hashPassword(passwordRaw);

      const { error: credError } = await supabase
        .from('legacy_credentials')
        .upsert({
          combat_id: id,
          password_hash: finalHash,
          kind: 'practitioner'
        }, { onConflict: 'combat_id' });

      if (credError) throw credError;

      successCount++;
      if (successCount % 10 === 0) console.log(`... berhasil memproses ${successCount} akun`);

    } catch (err) {
      console.error(`❌ Gagal memproses ID ${id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Selesai! Berhasil: ${successCount} akun. Gagal: ${errorCount} akun.`);
}

run();