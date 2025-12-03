/**
 * Script para identificar e remover parcelas duplicadas de despesas fixas
 * 
 * PROBLEMA:
 * Algumas despesas fixas têm parcelas duplicadas no banco de dados,
 * causando valores incorretos nos relatórios.
 * 
 * SOLUÇÃO:
 * Este script identifica parcelas duplicadas (mesma descrição, centro de custo,
 * data e valor) e mantém apenas a mais antiga, removendo as duplicatas.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuração do Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Transaction {
  id: string;
  description: string;
  cost_center_id: string;
  date: string;
  value: number;
  is_fixed: boolean;
  installment_number: number | null;
  created_at: string;
  category: string;
  equipment_id: string | null;
}

interface DuplicateGroup {
  key: string;
  transactions: Transaction[];
  toKeep: Transaction;
  toDelete: Transaction[];
}

/**
 * Busca todas as despesas (incluindo parcelas geradas e possíveis duplicatas)
 */
async function fetchGeneratedInstallments(): Promise<Transaction[]> {
  console.log('🔍 Buscando todas as despesas para identificar duplicatas...');
  
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('type', 'DESPESA')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar despesas:', error);
    throw error;
  }

  console.log(`✅ Encontradas ${data?.length || 0} despesas no total`);
  
  // Filtra apenas as que têm installment_number (parcelas geradas)
  const installments = data?.filter(d => d.installment_number !== null && d.installment_number !== undefined) || [];
  console.log(`📊 Parcelas com installment_number: ${installments.length}`);
  
  return installments;
}

/**
 * Agrupa transações por chave única (descrição + centro + data + valor + parcela)
 * para identificar duplicatas
 */
function groupDuplicates(transactions: Transaction[]): DuplicateGroup[] {
  const groups = new Map<string, Transaction[]>();

  // Agrupa por chave única (incluindo número da parcela)
  for (const transaction of transactions) {
    const key = `${transaction.description}|${transaction.cost_center_id}|${transaction.date}|${transaction.value}|${transaction.installment_number || 'null'}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(transaction);
  }

  // Filtra apenas grupos com duplicatas (mais de 1 transação)
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [key, transactions] of groups.entries()) {
    if (transactions.length > 1) {
      // Ordena por created_at (mais antiga primeiro)
      transactions.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      duplicateGroups.push({
        key,
        transactions,
        toKeep: transactions[0], // Mantém a mais antiga
        toDelete: transactions.slice(1), // Remove as demais
      });
    }
  }

  return duplicateGroups;
}

/**
 * Exibe relatório de duplicatas encontradas
 */
function displayReport(duplicateGroups: DuplicateGroup[]): void {
  console.log('\n📊 RELATÓRIO DE DUPLICATAS\n');
  console.log('='.repeat(80));

  if (duplicateGroups.length === 0) {
    console.log('✅ Nenhuma duplicata encontrada!');
    return;
  }

  let totalDuplicates = 0;

  for (const group of duplicateGroups) {
    const { toKeep, toDelete } = group;
    totalDuplicates += toDelete.length;

    console.log(`\n📌 Despesa: ${toKeep.description}`);
    console.log(`   Centro: ${toKeep.cost_center_id}`);
    console.log(`   Data: ${toKeep.date}`);
    console.log(`   Valor: R$ ${toKeep.value.toFixed(2)}`);
    console.log(`   Parcela: ${toKeep.installment_number}`);
    console.log(`   Total de duplicatas: ${toDelete.length + 1}`);
    console.log(`   ✅ Manter: ID ${toKeep.id} (criado em ${new Date(toKeep.created_at).toLocaleString('pt-BR')})`);
    
    for (const dup of toDelete) {
      console.log(`   ❌ Remover: ID ${dup.id} (criado em ${new Date(dup.created_at).toLocaleString('pt-BR')})`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 RESUMO:`);
  console.log(`   • Grupos com duplicatas: ${duplicateGroups.length}`);
  console.log(`   • Total de registros duplicados a remover: ${totalDuplicates}`);
  console.log('');
}

/**
 * Remove as parcelas duplicadas do banco de dados
 */
async function removeDuplicates(duplicateGroups: DuplicateGroup[], dryRun: boolean = true): Promise<void> {
  if (dryRun) {
    console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita no banco de dados');
    console.log('   Execute com --execute para aplicar as mudanças\n');
    return;
  }

  console.log('⚠️  ATENÇÃO: Iniciando remoção de duplicatas...\n');

  let removedCount = 0;
  let errorCount = 0;

  for (const group of duplicateGroups) {
    const { toDelete } = group;

    for (const transaction of toDelete) {
      try {
        const { error } = await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', transaction.id);

        if (error) {
          console.error(`❌ Erro ao remover ID ${transaction.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Removido: ${transaction.description} - ${transaction.date} (ID: ${transaction.id})`);
          removedCount++;
        }
      } catch (err) {
        console.error(`❌ Erro inesperado ao remover ID ${transaction.id}:`, err);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ REMOÇÃO CONCLUÍDA:`);
  console.log(`   • Registros removidos: ${removedCount}`);
  console.log(`   • Erros: ${errorCount}`);
  console.log('');
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');
  const debugMode = args.includes('--debug');

  console.log('🚀 Iniciando script de remoção de parcelas duplicadas\n');

  try {
    // 1. Buscar todas as parcelas geradas
    const installments = await fetchGeneratedInstallments();

    if (installments.length === 0) {
      console.log('ℹ️  Nenhuma parcela gerada encontrada');
      return;
    }

    // Modo debug: mostra algumas despesas para análise
    if (debugMode) {
      console.log('\n🐛 MODO DEBUG - Amostra de despesas:\n');
      const sample = installments.slice(0, 10);
      for (const inst of sample) {
        console.log(`ID: ${inst.id}`);
        console.log(`  Descrição: ${inst.description}`);
        console.log(`  Centro: ${inst.cost_center_id}`);
        console.log(`  Data: ${inst.date}`);
        console.log(`  Valor: ${inst.value}`);
        console.log(`  Parcela: ${inst.installment_number}`);
        console.log(`  is_fixed: ${inst.is_fixed}`);
        console.log(`  Criado em: ${inst.created_at}`);
        console.log('---');
      }
      
      // Busca especificamente "Abatimento Imposto"
      console.log('\n🔍 Buscando "Abatimento Imposto"...\n');
      const abatimentos = installments.filter(i => i.description.includes('Abatimento'));
      console.log(`Encontrados ${abatimentos.length} registros com "Abatimento":\n`);
      
      // Agrupa por data para ver duplicatas na mesma data
      const byDate = new Map<string, typeof abatimentos>();
      for (const ab of abatimentos) {
        const key = ab.date;
        if (!byDate.has(key)) {
          byDate.set(key, []);
        }
        byDate.get(key)!.push(ab);
      }
      
      console.log('📊 Agrupados por data:\n');
      for (const [date, items] of byDate.entries()) {
        console.log(`Data ${date}: ${items.length} registro(s)`);
        for (const item of items) {
          console.log(`  - ID: ${item.id} | Valor: ${item.value} | Parcela: ${item.installment_number} | Centro: ${item.cost_center_id}`);
        }
        if (items.length > 1) {
          console.log(`  ⚠️  DUPLICATA ENCONTRADA!`);
        }
        console.log('');
      }
    }

    // 2. Identificar duplicatas
    console.log('\n🔍 Identificando duplicatas...');
    const duplicateGroups = groupDuplicates(installments);

    // 3. Exibir relatório
    displayReport(duplicateGroups);

    // 4. Remover duplicatas (se não for dry-run)
    if (duplicateGroups.length > 0) {
      await removeDuplicates(duplicateGroups, !executeMode);
    }

    console.log('✅ Script concluído com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  }
}

// Executar
main();
