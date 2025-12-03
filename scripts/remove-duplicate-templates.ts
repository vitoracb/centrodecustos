/**
 * Script para identificar e remover TEMPLATES duplicados de despesas fixas
 * 
 * PROBLEMA:
 * Existem múltiplos templates (is_fixed = true) da mesma despesa fixa,
 * causando geração de parcelas duplicadas.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Template {
  id: string;
  description: string;
  cost_center_id: string;
  value: number;
  date: string;
  fixed_duration_months: number;
  created_at: string;
  category: string;
}

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  console.log('🚀 Buscando templates duplicados de despesas fixas\n');

  // Busca todos os templates
  const { data: templates, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('type', 'DESPESA')
    .eq('is_fixed', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar templates:', error);
    process.exit(1);
  }

  console.log(`✅ Encontrados ${templates?.length || 0} templates\n`);

  // Agrupa por descrição + centro
  const groups = new Map<string, Template[]>();
  for (const template of templates || []) {
    const key = `${template.description}|${template.cost_center_id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(template);
  }

  // Identifica duplicatas e ordena para manter o melhor
  const duplicates: Array<{ key: string; templates: Template[] }> = [];
  for (const [key, items] of groups.entries()) {
    if (items.length > 1) {
      // Ordena: maior valor absoluto primeiro, depois mais recente
      items.sort((a, b) => {
        const absA = Math.abs(a.value);
        const absB = Math.abs(b.value);
        if (absA !== absB) {
          return absB - absA; // Maior valor absoluto primeiro
        }
        // Se valores iguais, mantém o mais recente
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      duplicates.push({ key, templates: items });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ Nenhum template duplicado encontrado!');
    return;
  }

  console.log('📊 TEMPLATES DUPLICADOS ENCONTRADOS:\n');
  console.log('='.repeat(80));

  for (const dup of duplicates) {
    const [desc, center] = dup.key.split('|');
    console.log(`\n📌 Despesa: ${desc}`);
    console.log(`   Centro: ${center}`);
    console.log(`   Total de templates: ${dup.templates.length}\n`);

    for (let i = 0; i < dup.templates.length; i++) {
      const t = dup.templates[i];
      const marker = i === 0 ? '✅ MANTER' : '❌ REMOVER';
      console.log(`   ${marker}:`);
      console.log(`      ID: ${t.id}`);
      console.log(`      Valor: R$ ${t.value.toFixed(2)}`);
      console.log(`      Data: ${t.date}`);
      console.log(`      Duração: ${t.fixed_duration_months} meses`);
      console.log(`      Criado: ${new Date(t.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log(`\n📊 RESUMO:`);
  console.log(`   • Grupos com duplicatas: ${duplicates.length}`);
  const totalToRemove = duplicates.reduce((sum, d) => sum + (d.templates.length - 1), 0);
  console.log(`   • Templates a remover: ${totalToRemove}\n`);

  if (!executeMode) {
    console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita');
    console.log('   Execute com --execute para remover os templates duplicados\n');
    console.log('⚠️  ATENÇÃO: Remover um template também removerá todas as suas parcelas geradas!\n');
    return;
  }

  // Modo execução
  console.log('⚠️  INICIANDO REMOÇÃO...\n');

  for (const dup of duplicates) {
    const toRemove = dup.templates.slice(1); // Remove todos exceto o primeiro

    for (const template of toRemove) {
      console.log(`🗑️  Removendo template: ${template.description} (ID: ${template.id})`);

      // 1. Remove todas as parcelas geradas deste template
      const { data: parcelas } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('type', 'DESPESA')
        .eq('description', template.description)
        .eq('cost_center_id', template.cost_center_id)
        .eq('is_fixed', false);

      if (parcelas && parcelas.length > 0) {
        console.log(`   📦 Removendo ${parcelas.length} parcelas geradas...`);
        for (const parcela of parcelas) {
          await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', parcela.id);
        }
      }

      // 2. Remove o template
      const { error: deleteError } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', template.id);

      if (deleteError) {
        console.error(`   ❌ Erro ao remover template:`, deleteError);
      } else {
        console.log(`   ✅ Template removido com sucesso`);
      }
    }
  }

  console.log('\n✅ Remoção concluída!');
  console.log('\n⚠️  IMPORTANTE: Execute generateFixedExpenses() no app para regenerar as parcelas corretas\n');
}

main();
