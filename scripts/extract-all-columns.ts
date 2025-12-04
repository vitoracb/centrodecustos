import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carrega .env (banco atual)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('🔍 EXTRAINDO TODAS AS COLUNAS DE TODAS AS TABELAS\n');
  
  const CURRENT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const CURRENT_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!CURRENT_URL || !CURRENT_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    process.exit(1);
  }
  
  const currentDB = createClient(CURRENT_URL, CURRENT_KEY);
  
  // Lista TODAS as tabelas do banco atual
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
    'order_quotes',
    'employee_documents',
    'expense_documents',
    'fixed_expenses',
    'financial_transactions',
    'review_notifications',
  ];
  
  let sqlOutput = '-- TODAS AS COLUNAS DE TODAS AS TABELAS\n';
  sqlOutput += '-- Execute este SQL no banco NOVO\n\n';
  
  for (const table of tables) {
    try {
      console.log(`📦 Analisando: ${table}`);
      
      const { data: sample, error } = await currentDB
        .from(table)
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.log(`   ⚠️  Erro: ${error.message}`);
        continue;
      }
      
      if (!sample) {
        console.log(`   ⚠️  Tabela vazia`);
        continue;
      }
      
      const columns = Object.keys(sample);
      console.log(`   ✅ ${columns.length} colunas encontradas`);
      
      sqlOutput += `-- ${table.toUpperCase()} (${columns.length} colunas)\n`;
      for (const col of columns) {
        const value = sample[col];
        let type = 'TEXT';
        
        if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
        } else if (typeof value === 'boolean') {
          type = 'BOOLEAN';
        } else if (value === null) {
          type = 'TEXT';
        } else if (typeof value === 'object') {
          type = 'JSONB';
        }
        
        sqlOutput += `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type};\n`;
      }
      sqlOutput += '\n';
      
    } catch (error) {
      console.error(`   ❌ Erro ao processar ${table}:`, error);
    }
  }
  
  const outputPath = path.resolve(__dirname, 'all-columns-complete.sql');
  fs.writeFileSync(outputPath, sqlOutput);
  
  console.log('\n✅ SCHEMA COMPLETO EXTRAÍDO!');
  console.log(`📄 Arquivo: ${outputPath}`);
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('   1. Execute all-columns-complete.sql no banco NOVO');
  console.log('   2. Importe os CSVs na ordem correta');
  console.log('   3. Execute restore-constraints.sql\n');
}

main().catch(console.error);
