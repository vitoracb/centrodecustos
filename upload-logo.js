const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://foffmjqekmeogsldehbr.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  const logoPath = path.join(__dirname, 'logonoworiginal.png');
  const fileBuffer = fs.readFileSync(logoPath);
  
  const { data, error } = await supabase.storage
    .from('app-assets')
    .upload('now-trading-logo.png', fileBuffer, {
      contentType: 'image/png',
      upsert: true
    });
  
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('✅ Logo enviado com sucesso!');
    const { data: urlData } = supabase.storage
      .from('app-assets')
      .getPublicUrl('now-trading-logo.png');
    console.log('URL:', urlData.publicUrl);
  }
}

uploadLogo();
