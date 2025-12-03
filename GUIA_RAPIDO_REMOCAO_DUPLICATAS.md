# 🚀 Guia Rápido - Remoção de Parcelas Duplicadas

## ⚡ Execução Rápida

### 1️⃣ Visualizar Duplicatas (Modo Seguro)

```bash
npm run remove-duplicates:preview
```

**Este comando NÃO altera nada no banco de dados**, apenas mostra um relatório.

### 2️⃣ Remover Duplicatas (Modo Execução)

```bash
npm run remove-duplicates:execute
```

**⚠️ ATENÇÃO:** Este comando REMOVE permanentemente as duplicatas!

---

## 📋 Pré-requisitos

### 1. Variáveis de Ambiente

Certifique-se de que o arquivo `.env` existe com:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
```

### 2. Dependências Instaladas

Se ainda não instalou:

```bash
npm install
```

---

## 📊 O que o Script Faz

### Identifica Duplicatas Por:
- ✅ Mesma descrição (nome da despesa)
- ✅ Mesmo centro de custo
- ✅ Mesma data
- ✅ Mesmo valor

### Mantém:
- ✅ A parcela mais antiga (primeira criada)

### Remove:
- ❌ Todas as outras parcelas duplicadas

---

## 🎯 Exemplo de Uso

```bash
# Passo 1: Ver o que será removido
npm run remove-duplicates:preview

# Saída:
# 📊 RELATÓRIO DE DUPLICATAS
# ================================================================================
# 
# 📌 Despesa: Aluguel
#    Centro: valenca
#    Data: 2024-12-01
#    Valor: R$ 2000.00
#    Parcela: 2
#    Total de duplicatas: 2
#    ✅ Manter: ID abc123 (criado em 01/12/2024, 10:00:00)
#    ❌ Remover: ID def456 (criado em 01/12/2024, 10:05:00)
# 
# ================================================================================
# 
# 📊 RESUMO:
#    • Grupos com duplicatas: 5
#    • Total de registros duplicados a remover: 8

# Passo 2: Se estiver tudo OK, executar
npm run remove-duplicates:execute

# Saída:
# ⚠️  ATENÇÃO: Iniciando remoção de duplicatas...
# 
# ✅ Removido: Aluguel - 2024-12-01 (ID: def456)
# ✅ Removido: Internet - 2024-12-01 (ID: ghi789)
# ...
# 
# ✅ REMOÇÃO CONCLUÍDA:
#    • Registros removidos: 8
#    • Erros: 0
```

---

## ⚠️ Importante

1. **Sempre execute em modo preview primeiro**
2. **Revise o relatório cuidadosamente**
3. **Faça backup do banco antes de executar**
4. **Teste em desenvolvimento primeiro**

---

## 🐛 Problemas Comuns

### Erro: "Variáveis de ambiente não configuradas"

**Solução:** Verifique se o arquivo `.env` existe e contém as variáveis corretas.

### Erro: "Cannot find module"

**Solução:** Execute `npm install` para instalar as dependências.

### Erro: "Permission denied"

**Solução:** Verifique as permissões do Supabase (RLS policies).

---

## 📞 Suporte

Para mais detalhes, consulte: `REMOCAO_PARCELAS_DUPLICADAS.md`

---

**Status:** ✅ Pronto para uso
**Última atualização:** 03/12/2024
