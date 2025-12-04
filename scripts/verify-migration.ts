import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carrega .env (banco atual)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Carrega .env.migration (novo banco)
const migrationEnvPath = path.resolve(__dirname, '../.env.migration');
if (fs.existsSync(migrationEnvPath)) {
  dotenv.config({ path: migrationEnvPath });
}

async function main() {
  console.log('🔍 VERIFICANDO MIGRAÇÃO\n');
  
  // Banco ATUAL (origem)
  const CURRENT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const CURRENT_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Banco NOVO (destino)
  const NEW_URL = process.env.NEW_SUPABASE_URL || '';
  const NEW_KEY = process.env.NEW_SUPABASE_ANON_KEY || '';
  
  if (!CURRENT_URL || !CURRENT_KEY || !NEW_URL || !NEW_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    process.exit(1);
  }
  
  const currentDB = createClient(CURRENT_URL, CURRENT_KEY);
  const newDB = createClient(NEW_URL, NEW_KEY);
  
  console.log('📊 Banco ATUAL:', CURRENT_URL);
  console.log('🆕 Banco NOVO:', NEW_URL);
  console.log('');
  
  // Lista de tabelas para verificar
  const tables = [
    'cost_centers',
    'equipments',
    'equipment_documents',
    'equipment_photos',
    'equipment_reviews',
    'contracts',
    'contract_documents',
    'orders',
    'order_documents',
    'employee_documents',
    'fixed_expenses',
    'financial_transactions',
    'review_notifications',
  ];
  
  let totalCurrent = 0;
  let totalNew = 0;
  let allMatch = true;
  
  console.log('📋 COMPARAÇÃO DE REGISTROS:\n');
  console.log('Tabela'.padEnd(30) + 'Atual'.padEnd(10) + 'Novo'.padEnd(10) + 'Status');
  console.log('-'.repeat(60));
  
  for (const table of tables) {
    try {
      // Conta registros no banco atual
      const { count: currentCount, error: currentError } = await currentDB
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      // Conta registros no banco novo
      const { count: newCount, error: newError } = await newDB
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      const current = currentCount || 0;
      const novo = newCount || 0;
      
      totalCurrent += current;
      totalNew += novo;
      
      const match = current === novo;
      if (!match) allMatch = false;
      
      const status = match ? '✅' : '❌';
      const diff = novo - current;
      const diffStr = diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : '';
      
      console.log(
        table.padEnd(30) +
        String(current).padEnd(10) +
        String(novo).padEnd(10) +
        status + diffStr
      );
      
    } catch (error) {
      console.log(
        table.padEnd(30) +
        '?'.padEnd(10) +
        '?'.padEnd(10) +
        '⚠️  Erro'
      );
    }
  }
  
  console.log('-'.repeat(60));
  console.log(
    'TOTAL'.padEnd(30) +
    String(totalCurrent).padEnd(10) +
    String(totalNew).padEnd(10) +
    (allMatch ? '✅' : '❌')
  );
  
  console.log('\n' + '='.repeat(60));
  
  if (allMatch && totalCurrent === totalNew) {
    console.log('✅ MIGRAÇÃO 100% COMPLETA!');
    console.log(`📊 Total de ${totalNew} registros migrados com sucesso!`);
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('   1. Execute restore-constraints.sql para restaurar FKs');
    console.log('   2. Configure Storage buckets (se necessário)');
    console.log('   3. Atualize .env com novas credenciais');
    console.log('   4. Teste o app com o novo banco');
  } else {
    console.log('⚠️  MIGRAÇÃO INCOMPLETA');
    console.log(`📊 Atual: ${totalCurrent} registros`);
    console.log(`📊 Novo: ${totalNew} registros`);
    console.log(`📊 Diferença: ${totalNew - totalCurrent} registros`);
    console.log('\n📝 Verifique as tabelas marcadas com ❌');
  }
  
  console.log('');
}

main().catch(console.error);
