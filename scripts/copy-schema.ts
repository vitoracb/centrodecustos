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
  console.log('🔍 COPIANDO SCHEMA DO BANCO ATUAL\n');
  
  // Banco ATUAL (origem)
  const CURRENT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const CURRENT_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!CURRENT_URL || !CURRENT_KEY) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas no .env');
    process.exit(1);
  }
  
  const currentDB = createClient(CURRENT_URL, CURRENT_KEY);
  
  console.log('📊 Obtendo schema do banco atual...\n');
  
  // Lista de tabelas
  const tables = [
    'equipments',
    'contracts',
    'orders',
    'employee_documents',
    'financial_transactions',
  ];
  
  let sqlOutput = '-- Schema completo do banco atual\n';
  sqlOutput += '-- Execute este SQL no novo banco\n\n';
  
  for (const table of tables) {
    try {
      console.log(`📦 Analisando tabela: ${table}`);
      
      // Pega um registro de exemplo para ver todas as colunas
      const { data: sample, error } = await currentDB
        .from(table)
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.log(`   ⚠️  Erro ao acessar ${table}: ${error.message}`);
        continue;
      }
      
      if (!sample) {
        console.log(`   ⚠️  Tabela ${table} está vazia`);
        continue;
      }
      
      // Lista todas as colunas
      const columns = Object.keys(sample);
      console.log(`   📊 ${columns.length} colunas encontradas`);
      
      sqlOutput += `-- Tabela: ${table}\n`;
      for (const col of columns) {
        const value = sample[col];
        let type = 'TEXT';
        
        if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
        } else if (typeof value === 'boolean') {
          type = 'BOOLEAN';
        } else if (value === null) {
          type = 'TEXT'; // Assume TEXT para nulls
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
  
  // Salva em arquivo
  const outputPath = path.resolve(__dirname, 'schema-from-current.sql');
  fs.writeFileSync(outputPath, sqlOutput);
  
  console.log('\n✅ Schema extraído com sucesso!');
  console.log(`📄 Arquivo salvo em: ${outputPath}`);
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('   1. Abra o arquivo schema-from-current.sql');
  console.log('   2. Execute no SQL Editor do novo banco');
  console.log('   3. Execute a migração novamente\n');
}

main().catch(console.error);
