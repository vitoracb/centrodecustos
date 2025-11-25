# 🗄️ Integração de Notificações com Banco de Dados

## 📋 Resumo

O sistema de notificações de revisão foi integrado com o banco de dados Supabase para:

- ✅ **Sincronização entre dispositivos** - Evita notificações duplicadas mesmo usando o app em múltiplos dispositivos
- ✅ **Histórico persistente** - Não perde histórico ao reinstalar o app
- ✅ **Analytics futuros** - Permite relatórios e análises de notificações enviadas
- ✅ **Fallback automático** - Se o banco falhar, usa AsyncStorage local

---

## 🏗️ Arquitetura

### Estratégia Híbrida

O sistema usa uma **estratégia híbrida**:

1. **Banco de Dados (Supabase)** - Fonte principal
   - Sincronização entre dispositivos
   - Histórico persistente
   - Analytics

2. **AsyncStorage (Local)** - Backup e fallback
   - Funciona offline
   - Backup caso o banco falhe
   - Performance local rápida

### Fluxo de Funcionamento

```
1. Verifica notificação necessária?
   ↓
2. Verifica no banco de dados se já foi notificado hoje
   ↓ (se falhar)
3. Verifica no AsyncStorage local
   ↓
4. Se não foi notificado, envia notificação
   ↓
5. Salva no banco de dados
   ↓ (se falhar)
6. Salva no AsyncStorage como fallback
```

---

## 📊 Tabela no Banco de Dados

### `review_notifications`

```sql
CREATE TABLE review_notifications (
  id UUID PRIMARY KEY,
  equipment_id UUID REFERENCES equipments(id),
  review_date TEXT, -- 'DD/MM/YYYY'
  days_until INTEGER, -- 7, 1, ou 0
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Características

- **Unique constraint**: Evita duplicatas por equipamento/data/intervalo/dia
- **Índices**: Performance otimizada para consultas
- **RLS Policies**: Acesso anônimo permitido (leitura/escrita)
- **Cascade delete**: Remove notificações quando equipamento é deletado

---

## 🔧 Como Funciona

### 1. Verificação de Duplicatas

```typescript
// Verifica primeiro no banco
const { data } = await supabase
  .from('review_notifications')
  .select('id')
  .eq('equipment_id', equipmentId)
  .eq('review_date', reviewDate)
  .eq('days_until', daysUntil)
  .gte('notified_at', todayStart)
  .lte('notified_at', todayEnd);

// Se não encontrar, verifica AsyncStorage (fallback)
```

### 2. Salvamento

```typescript
// Tenta salvar no banco primeiro
await supabase
  .from('review_notifications')
  .insert({ equipment_id, review_date, days_until, notified_at });

// Se falhar, salva apenas no AsyncStorage
```

### 3. Limpeza Automática

```typescript
// Remove notificações com mais de 30 dias
await supabase
  .from('review_notifications')
  .delete()
  .lt('notified_at', thirtyDaysAgo);
```

---

## 🚀 Setup

### 1. Criar Tabela no Supabase

Execute o script SQL:

```bash
# No Supabase SQL Editor
supabase_review_notifications.sql
```

Ou copie e cole o conteúdo do arquivo `supabase_review_notifications.sql` no SQL Editor do Supabase.

### 2. Verificar RLS Policies

As políticas devem permitir acesso anônimo:

- ✅ SELECT - Qualquer um pode ler
- ✅ INSERT - Qualquer um pode inserir
- ✅ DELETE - Qualquer um pode deletar (para limpeza)

### 3. Testar

O sistema funciona automaticamente. Para testar:

1. Crie um equipamento com revisão próxima (hoje, amanhã ou 7 dias)
2. O app verifica automaticamente
3. Verifique no Supabase se o registro foi criado:

```sql
SELECT * FROM review_notifications 
ORDER BY notified_at DESC 
LIMIT 10;
```

---

## 🔄 Fallback Automático

O sistema **sempre funciona**, mesmo se:

- ❌ A tabela não existir no banco
- ❌ O banco estiver offline
- ❌ Houver erro de conexão

Nesses casos, o sistema usa apenas o AsyncStorage local.

---

## 📈 Vantagens da Integração

### Antes (Apenas AsyncStorage)
- ❌ Cada dispositivo tem seu próprio histórico
- ❌ Notificações duplicadas entre dispositivos
- ❌ Perde histórico ao reinstalar app

### Depois (Banco + AsyncStorage)
- ✅ Histórico sincronizado entre dispositivos
- ✅ Evita duplicatas mesmo em múltiplos dispositivos
- ✅ Histórico persistente (não perde ao reinstalar)
- ✅ Permite analytics e relatórios
- ✅ Funciona offline (fallback para AsyncStorage)

---

## 🐛 Troubleshooting

### Notificações duplicadas entre dispositivos

**Causa**: Tabela não criada no banco ou RLS bloqueando.

**Solução**:
1. Execute o script SQL `supabase_review_notifications.sql`
2. Verifique as RLS policies
3. Verifique logs: `logger.debug('Erro ao salvar no banco...')`

### Erro ao salvar no banco

**Causa**: Tabela não existe ou permissões incorretas.

**Solução**: O sistema usa AsyncStorage automaticamente como fallback. Para habilitar o banco:
1. Execute o script SQL
2. Verifique RLS policies

### Verificar se está usando banco

```typescript
// Verifique os logs
// Se aparecer "Usando AsyncStorage como fallback", o banco não está funcionando
// Se aparecer "Notificação salva apenas no AsyncStorage", houve erro ao salvar no banco
```

---

## 📝 Notas Técnicas

- **Performance**: Consultas ao banco são rápidas (índices criados)
- **Offline**: Sistema funciona offline usando AsyncStorage
- **Sincronização**: Automática ao verificar notificações
- **Limpeza**: Automática (remove registros com mais de 30 dias)
- **Unique constraint**: Garante que não há duplicatas no banco

---

## ✅ Status

- ✅ Tabela criada no Supabase
- ✅ RLS policies configuradas
- ✅ Código integrado com fallback
- ✅ Testes de fallback funcionando
- ✅ TypeScript sem erros

**Sistema híbrido funcionando!** 🎉

