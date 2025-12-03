# 🔧 Remoção de Parcelas Duplicadas - Despesas Fixas

## 📋 Problema

Algumas despesas fixas têm **parcelas duplicadas** no banco de dados, causando:
- Valores incorretos nos relatórios financeiros
- Duplicação de despesas no mesmo mês
- Inconsistência nos dados

## ✅ Solução

Criamos um script TypeScript que:
1. **Identifica** parcelas duplicadas (mesma descrição, centro de custo, data e valor)
2. **Mantém** apenas a parcela mais antiga (primeira criada)
3. **Remove** todas as duplicatas

---

## 🚀 Como Usar

### 1. Modo Visualização (Dry-Run)

Primeiro, execute o script em modo **dry-run** para ver quais duplicatas serão removidas **SEM fazer alterações** no banco:

```bash
npx ts-node scripts/remove-duplicate-installments.ts
```

Ou usando o comando npm:

```bash
npm run remove-duplicates:preview
```

**Saída esperada:**
```
🔍 Buscando parcelas geradas de despesas fixas...
✅ Encontradas 150 parcelas geradas

🔍 Identificando duplicatas...

📊 RELATÓRIO DE DUPLICATAS
================================================================================

📌 Despesa: Aluguel
   Centro: valenca
   Data: 2024-12-01
   Valor: R$ 2000.00
   Parcela: 2
   Total de duplicatas: 2
   ✅ Manter: ID abc123 (criado em 01/12/2024, 10:00:00)
   ❌ Remover: ID def456 (criado em 01/12/2024, 10:05:00)

================================================================================

📊 RESUMO:
   • Grupos com duplicatas: 5
   • Total de registros duplicados a remover: 8

🔍 MODO DRY-RUN: Nenhuma alteração será feita no banco de dados
   Execute com --execute para aplicar as mudanças
```

### 2. Modo Execução (Remove Duplicatas)

**⚠️ ATENÇÃO:** Este comando **REMOVE PERMANENTEMENTE** as duplicatas do banco de dados!

Após revisar o relatório e confirmar que está tudo correto, execute:

```bash
npx ts-node scripts/remove-duplicate-installments.ts --execute
```

Ou usando o comando npm:

```bash
npm run remove-duplicates:execute
```

**Saída esperada:**
```
⚠️  ATENÇÃO: Iniciando remoção de duplicatas...

✅ Removido: Aluguel - 2024-12-01 (ID: def456)
✅ Removido: Internet - 2024-12-01 (ID: ghi789)
...

================================================================================

✅ REMOÇÃO CONCLUÍDA:
   • Registros removidos: 8
   • Erros: 0
```

---

## 📊 Como o Script Funciona

### 1. Busca Parcelas Geradas
```sql
SELECT * FROM financial_transactions
WHERE type = 'DESPESA'
  AND is_fixed = false
  AND installment_number IS NOT NULL
```

### 2. Identifica Duplicatas

Agrupa por chave única:
- `description` (nome da despesa)
- `cost_center_id` (centro de custo)
- `date` (data)
- `value` (valor)

Se houver **mais de 1 registro** com a mesma chave, são duplicatas.

### 3. Decide o que Manter

- **Mantém:** A parcela com `created_at` mais antigo (primeira criada)
- **Remove:** Todas as outras parcelas com a mesma chave

### 4. Remove do Banco

```sql
DELETE FROM financial_transactions
WHERE id IN ('id1', 'id2', ...)
```

---

## 🔒 Segurança

### ✅ O que o script FAZ:
- Identifica duplicatas com precisão
- Mantém sempre a parcela mais antiga
- Exibe relatório detalhado antes de remover
- Modo dry-run por padrão (não altera nada)

### ❌ O que o script NÃO FAZ:
- Não remove templates (despesas com `is_fixed = true`)
- Não remove parcelas únicas (sem duplicatas)
- Não altera valores ou datas
- Não remove despesas não-fixas

---

## 📝 Comandos NPM (package.json)

Adicione ao seu `package.json`:

```json
{
  "scripts": {
    "remove-duplicates:preview": "ts-node scripts/remove-duplicate-installments.ts",
    "remove-duplicates:execute": "ts-node scripts/remove-duplicate-installments.ts --execute"
  }
}
```

---

## 🧪 Testes Recomendados

### Antes de Executar:
1. ✅ Faça backup do banco de dados
2. ✅ Execute em modo dry-run primeiro
3. ✅ Revise o relatório de duplicatas
4. ✅ Confirme que as parcelas a remover são realmente duplicatas

### Após Executar:
1. ✅ Verifique os relatórios financeiros
2. ✅ Confira se os valores estão corretos
3. ✅ Teste a geração de novas parcelas fixas
4. ✅ Valide que não há mais duplicatas

---

## 🐛 Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"
**Solução:** Configure as variáveis no arquivo `.env`:
```bash
EXPO_PUBLIC_SUPABASE_URL=sua-url-aqui
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
```

### Erro: "Cannot find module '@supabase/supabase-js'"
**Solução:** Instale as dependências:
```bash
npm install @supabase/supabase-js
npm install -D ts-node @types/node
```

### Erro: "Permission denied"
**Solução:** Verifique as permissões do Supabase (RLS policies)

---

## 📈 Exemplo de Uso Completo

```bash
# 1. Visualizar duplicatas (não altera nada)
npm run remove-duplicates:preview

# 2. Revisar o relatório

# 3. Se estiver tudo OK, executar remoção
npm run remove-duplicates:execute

# 4. Verificar no app se os valores estão corretos
```

---

## ⚠️ IMPORTANTE

- **Sempre execute em modo dry-run primeiro**
- **Faça backup do banco antes de executar**
- **Revise o relatório cuidadosamente**
- **Teste em ambiente de desenvolvimento primeiro**

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do script
2. Confira as variáveis de ambiente
3. Valide as permissões do Supabase
4. Execute em modo dry-run para debug

---

**Status:** ✅ Script pronto para uso
**Última atualização:** 03/12/2024
