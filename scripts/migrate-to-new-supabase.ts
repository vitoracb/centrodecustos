import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import * as fs from 'fs';

// Carrega .env (banco atual)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Carrega .env.migration (novo banco)
const migrationEnvPath = path.resolve(__dirname, '../.env.migration');
if (fs.existsSync(migrationEnvPath)) {
  dotenv.config({ path: migrationEnvPath });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔄 MIGRAÇÃO DE DADOS SUPABASE\n');
  
  // Banco ATUAL (origem)
  const CURRENT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const CURRENT_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!CURRENT_URL || !CURRENT_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas no .env');
    process.exit(1);
  }
  
  console.log('📊 Banco ATUAL (origem):');
  console.log(`   URL: ${CURRENT_URL}\n`);
  
  // Banco NOVO (destino) - lê do .env.migration
  let NEW_URL = process.env.NEW_SUPABASE_URL || '';
  let NEW_KEY = process.env.NEW_SUPABASE_ANON_KEY || '';
  
  // Se não encontrou no .env.migration, pergunta
  if (!NEW_URL || !NEW_KEY) {
    console.log('🆕 Configure o banco NOVO (destino):\n');
    NEW_URL = await question('   URL do novo Supabase: ');
    NEW_KEY = await question('   Anon Key do novo Supabase: ');
    
    if (!NEW_URL || !NEW_KEY) {
      console.error('❌ Erro: Credenciais do novo banco não fornecidas');
      rl.close();
      process.exit(1);
    }
  } else {
    console.log('🆕 Banco NOVO (destino):');
    console.log(`   URL: ${NEW_URL}`);
    console.log('   (Credenciais carregadas de .env.migration)\n');
  }
  
  console.log('\n⚠️  ATENÇÃO: Esta operação irá:');
  console.log('   1. Exportar TODOS os dados do banco atual');
  console.log('   2. Importar para o novo banco');
  console.log('   3. Pode sobrescrever dados existentes no novo banco\n');
  
  const confirm = await question('   Deseja continuar? (sim/não): ');
  
  if (confirm.toLowerCase() !== 'sim') {
    console.log('❌ Operação cancelada');
    rl.close();
    process.exit(0);
  }
  
  console.log('\n🚀 Iniciando migração...\n');
  
  // Conecta aos bancos
  const currentDB = createClient(CURRENT_URL, CURRENT_KEY);
  const newDB = createClient(NEW_URL, NEW_KEY);
  
  // Lista de tabelas para migrar
  const tables = [
    'cost_centers',
    'equipments',
    'expenses',
    'receipts',
    'contracts',
    'orders',
    'employee_documents',
    'contract_documents',
    'review_notifications',
    'financial_transactions',
  ];
  
  let totalRecords = 0;
  
  for (const table of tables) {
    try {
      console.log(`📦 Migrando tabela: ${table}`);
      
      // Exporta dados
      const { data: records, error: fetchError } = await currentDB
        .from(table)
        .select('*');
      
      if (fetchError) {
        console.error(`   ❌ Erro ao exportar ${table}:`, fetchError.message);
        continue;
      }
      
      if (!records || records.length === 0) {
        console.log(`   ⚠️  Tabela ${table} está vazia`);
        continue;
      }
      
      console.log(`   📊 ${records.length} registros encontrados`);
      
      // Importa dados em lotes de 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error: insertError } = await newDB
          .from(table)
          .upsert(batch, { onConflict: 'id' });
        
        if (insertError) {
          console.error(`   ❌ Erro ao importar lote ${i / batchSize + 1}:`, insertError.message);
        } else {
          console.log(`   ✅ Lote ${i / batchSize + 1} importado (${batch.length} registros)`);
        }
      }
      
      totalRecords += records.length;
      console.log(`   ✅ ${table} migrada com sucesso!\n`);
      
    } catch (error) {
      console.error(`   ❌ Erro inesperado ao migrar ${table}:`, error);
    }
  }
  
  console.log('\n✅ MIGRAÇÃO CONCLUÍDA!');
  console.log(`📊 Total de registros migrados: ${totalRecords}`);
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('   1. Verifique os dados no novo banco');
  console.log('   2. Configure as RLS Policies no novo banco');
  console.log('   3. Configure os Storage Buckets (se usar)');
  console.log('   4. Atualize o arquivo .env com as novas credenciais');
  console.log('   5. Teste o app com o novo banco\n');
  
  rl.close();
}

main().catch(console.error);
