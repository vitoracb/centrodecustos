# 🔄 IMPLEMENTAÇÃO: Cache + Realtime no FinancialContext

Guia para integrar **CacheManager** e **useRealtimeSync** no `FinancialContext.tsx`.

---

## 🎯 OBJETIVO

Atualizar o `FinancialContext.tsx` para:
- ✅ Carregar despesas do **cache** primeiro (instantâneo)
- ✅ Atualizar do **banco** em background
- ✅ Escutar mudanças em **tempo real** (Realtime)
- ✅ Invalidar cache quando houver alterações

**⚠️ IMPORTANTE:** Esta implementação é **APENAS para DESPESAS** (fixed_expenses). Receitas continuam sem cache/realtime por enquanto.

---

## 📂 ARQUIVOS ENVOLVIDOS

```
src/
├── context/
│   └── FinancialContext.tsx  ← ARQUIVO A SER MODIFICADO
├── hooks/
│   └── useRealtimeSync.ts    ← já existe ✅
└── lib/
    └── cacheManager.ts       ← já existe ✅
```

---

## 📋 MUDANÇAS NO FinancialContext.tsx

### 1️⃣ IMPORTS NECESSÁRIOS

Adicionar estes imports no **topo do arquivo**:

```typescript
import { useRealtimeSync } from '@/src/hooks/useRealtimeSync';
import { CacheManager } from '@/src/lib/cacheManager';
```

**Verificar que estes imports já existem:**
```typescript
import { useAuth } from './AuthContext';
import { useCostCenter } from './CostCenterContext';
import { supabase } from '@/src/lib/supabaseClient';
```

---

### 2️⃣ ADICIONAR REALTIME SYNC

Adicionar **dentro do componente `FinancialProvider`**, logo após os `useState`:

```typescript
export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { selectedCenter } = useCostCenter();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  // ============================================
  // 🔄 REALTIME SYNC - DESPESAS
  // ============================================
  useRealtimeSync<Expense>({
    table: 'fixed_expenses',
    costCenterId: selectedCenter || '',
    enabled: !!user && !!selectedCenter,
    
    onInsert: (newExpense) => {
      console.log('[Financial] 📥 INSERT via Realtime:', newExpense.name);
      
      // Adicionar na lista (evitar duplicatas)
      setExpenses(prev => {
        const exists = prev.some(exp => exp.id === newExpense.id);
        if (exists) return prev;
        return [newExpense, ...prev];
      });
      
      // Invalidar cache
      if (user && selectedCenter) {
        CacheManager.invalidate('expenses', {
          userId: user.id,
          costCenterId: selectedCenter,
        });
      }
    },
    
    onUpdate: (oldExpense, newExpense) => {
      console.log('[Financial] 📝 UPDATE via Realtime:', newExpense.name);
      
      // Atualizar na lista
      setExpenses(prev =>
        prev.map(exp => exp.id === newExpense.id ? newExpense : exp)
      );
      
      // Invalidar cache
      if (user && selectedCenter) {
        CacheManager.invalidate('expenses', {
          userId: user.id,
          costCenterId: selectedCenter,
        });
      }
    },
    
    onDelete: (deletedExpense) => {
      console.log('[Financial] 🗑️ DELETE via Realtime:', deletedExpense.name);
      
      // Remover da lista
      setExpenses(prev => prev.filter(exp => exp.id !== deletedExpense.id));
      
      // Invalidar cache
      if (user && selectedCenter) {
        CacheManager.invalidate('expenses', {
          userId: user.id,
          costCenterId: selectedCenter,
        });
      }
    },
    
    onError: (error) => {
      console.error('[Financial] ❌ Erro no Realtime:', error);
    },
  });

  // ... resto do código
```

**⚠️ ATENÇÃO:**
- Este código deve ficar **logo após os `useState`**
- Deve ficar **antes** das funções `loadExpenses` e `loadReceipts`

---

### 3️⃣ ATUALIZAR FUNÇÃO loadExpenses

**SUBSTITUIR** a função `loadExpenses` existente por esta versão com cache:

```typescript
  // ============================================
  // 📦 CARREGAR DESPESAS (Cache + Banco)
  // ============================================
  const loadExpenses = useCallback(async () => {
    if (!user || !selectedCenter) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }

    try {
      setLoadingExpenses(true);

      // 1️⃣ CARREGAR DO CACHE PRIMEIRO (instantâneo)
      console.log('[Financial] 📦 Tentando carregar do cache...');
      const cached = await CacheManager.get<Expense[]>('expenses', {
        userId: user.id,
        costCenterId: selectedCenter,
      });

      if (cached && cached.length > 0) {
        console.log(`[Financial] ✅ ${cached.length} despesas carregadas do cache`);
        setExpenses(cached);
        setLoadingExpenses(false); // Loading já pode ser false aqui
      }

      // 2️⃣ CARREGAR DO BANCO (background)
      console.log('[Financial] 🌐 Carregando do banco...');
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('cost_center_id', selectedCenter)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      console.log(`[Financial] ✅ ${data.length} despesas carregadas do banco`);
      setExpenses(data);

      // 3️⃣ ATUALIZAR CACHE
      await CacheManager.set('expenses', data, {
        userId: user.id,
        costCenterId: selectedCenter,
        ttl: 15 * 60 * 1000, // 15 minutos
      });
      
      console.log('[Financial] 💾 Cache atualizado');

    } catch (error) {
      console.error('[Financial] ❌ Erro ao carregar despesas:', error);
      
      // Se falhou, pelo menos mostrar o cache (se houver)
      if (expenses.length === 0) {
        const cached = await CacheManager.get<Expense[]>('expenses', {
          userId: user.id,
          costCenterId: selectedCenter,
        });
        if (cached) {
          setExpenses(cached);
        }
      }
    } finally {
      setLoadingExpenses(false);
    }
  }, [user, selectedCenter]);
```

**⚠️ IMPORTANTE:**
- Esta função **substitui** a versão antiga
- Mantém a mesma assinatura: `const loadExpenses = useCallback(async () => { ... }, [user, selectedCenter])`
- O `useEffect` que chama `loadExpenses()` **não precisa mudar**

---

### 4️⃣ ATUALIZAR FUNÇÃO addExpense

**ADICIONAR** invalidação de cache na função `addExpense`:

```typescript
  const addExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .insert(expense)
        .select()
        .single();

      if (error) throw error;

      console.log('[Financial] ✅ Despesa criada:', data.name);

      // Adicionar localmente (Realtime também vai adicionar, mas ok)
      setExpenses(prev => [data, ...prev]);

      // ✨ ADICIONAR ESTA LINHA - Invalidar cache
      await CacheManager.invalidate('expenses', {
        userId: user.id,
        costCenterId: selectedCenter || '',
      });

    } catch (error) {
      console.error('[Financial] ❌ Erro ao adicionar despesa:', error);
      throw error;
    }
  };
```

---

### 5️⃣ ATUALIZAR FUNÇÃO updateExpense

**ADICIONAR** invalidação de cache na função `updateExpense`:

```typescript
  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('fixed_expenses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      console.log('[Financial] ✅ Despesa atualizada:', id);

      // Atualizar localmente (Realtime também vai atualizar)
      setExpenses(prev =>
        prev.map(exp => 
          exp.id === id 
            ? { ...exp, ...updates, updated_at: new Date().toISOString() } 
            : exp
        )
      );

      // ✨ ADICIONAR ESTA LINHA - Invalidar cache
      await CacheManager.invalidate('expenses', {
        userId: user.id,
        costCenterId: selectedCenter || '',
      });

    } catch (error) {
      console.error('[Financial] ❌ Erro ao atualizar despesa:', error);
      throw error;
    }
  };
```

---

### 6️⃣ ATUALIZAR FUNÇÃO deleteExpense

**ADICIONAR** invalidação de cache na função `deleteExpense`:

```typescript
  const deleteExpense = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('fixed_expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      console.log('[Financial] ✅ Despesa deletada:', id);

      // Remover localmente (Realtime também vai remover)
      setExpenses(prev => prev.filter(exp => exp.id !== id));

      // ✨ ADICIONAR ESTA LINHA - Invalidar cache
      await CacheManager.invalidate('expenses', {
        userId: user.id,
        costCenterId: selectedCenter || '',
      });

    } catch (error) {
      console.error('[Financial] ❌ Erro ao deletar despesa:', error);
      throw error;
    }
  };
```

---

### 7️⃣ ADICIONAR FUNÇÃO refreshExpenses

**ADICIONAR** esta função (se não existir):

```typescript
  const refreshExpenses = async () => {
    await loadExpenses();
  };
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

Use este checklist para garantir que tudo foi feito:

- [ ] **Imports adicionados** no topo do arquivo
  - [ ] `import { useRealtimeSync } from '@/src/hooks/useRealtimeSync';`
  - [ ] `import { CacheManager } from '@/src/lib/cacheManager';`

- [ ] **Hook useRealtimeSync adicionado** no componente
  - [ ] Logo após os `useState`
  - [ ] Com callbacks onInsert, onUpdate, onDelete
  - [ ] Com invalidação de cache em cada callback

- [ ] **Função loadExpenses atualizada**
  - [ ] Carrega do cache primeiro
  - [ ] Carrega do banco em background
  - [ ] Atualiza cache após carregar do banco
  - [ ] Tem try/catch com fallback para cache

- [ ] **Função addExpense atualizada**
  - [ ] Invalidação de cache adicionada após insert

- [ ] **Função updateExpense atualizada**
  - [ ] Invalidação de cache adicionada após update

- [ ] **Função deleteExpense atualizada**
  - [ ] Invalidação de cache adicionada após delete

- [ ] **Função refreshExpenses existe**
  - [ ] Retorna `await loadExpenses()`

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Não Mexer em Receitas

**Receitas (receipts) continuam SEM cache/realtime por enquanto.**

Mantenha as funções `loadReceipts`, `addReceipt`, `updateReceipt`, `deleteReceipt` **exatamente como estão**.

### 2. Console Logs

Os `console.log` foram adicionados propositalmente para **debug**.

Mantenha-os por enquanto para validar que tudo está funcionando. Depois podem ser removidos.

### 3. Cache TTL

O TTL está configurado para **15 minutos**:
```typescript
ttl: 15 * 60 * 1000, // 15 minutos
```

Se quiser mudar, ajuste este valor.

### 4. Tabela no Supabase

Certifique-se que:
- A tabela se chama **`fixed_expenses`** (não `expenses`)
- Realtime está habilitado para esta tabela (veja guia de Sincronização)
- RLS está configurado corretamente

---

## 🧪 COMO TESTAR

### Teste 1: Verificar Compilação

```bash
# No terminal
npm run ios
# ou
npm run android
```

**Resultado esperado:**
- ✅ App compila sem erros
- ✅ Nenhum erro de import
- ✅ Nenhum erro de TypeScript

---

### Teste 2: Cache Funcionando

```
1. Abrir app pela primeira vez
   → Deve aparecer loading (~2s)
   → Console deve mostrar: "📦 Tentando carregar do cache..."
   → Console deve mostrar: "🌐 Carregando do banco..."
   → Console deve mostrar: "✅ X despesas carregadas do banco"
   → Console deve mostrar: "💾 Cache atualizado"

2. Fechar app completamente (swipe up no iOS)

3. Abrir app novamente
   → Loading deve ser MUITO mais rápido (<500ms)
   → Console deve mostrar: "✅ X despesas carregadas do cache"
   → Console deve mostrar: "🌐 Carregando do banco..." (background)
```

**✅ Se o segundo carregamento foi instantâneo: Cache funcionando!**

---

### Teste 3: Realtime Funcionando

**Você precisa de 2 dispositivos (ou simulador + web):**

```
Device 1: Abrir app
Device 2: Abrir app (mesmo usuário, mesmo centro)

Device 1: Criar uma despesa "Teste Realtime"
   → Console Device 1: "✅ Despesa criada: Teste Realtime"

Device 2: Aguardar ~2 segundos
   → Console Device 2: "📥 INSERT via Realtime: Teste Realtime"
   → Despesa deve aparecer AUTOMATICAMENTE na lista
   → SEM precisar dar pull-to-refresh
```

**✅ Se a despesa apareceu automaticamente no Device 2: Realtime funcionando!**

---

### Teste 4: Invalidação de Cache

```
1. Criar uma despesa "Teste Cache"
   → Console: "✅ Despesa criada: Teste Cache"

2. Fechar app completamente

3. Abrir app novamente
   → Console: "✅ X despesas carregadas do cache"
   → A despesa "Teste Cache" DEVE aparecer
```

**✅ Se a despesa criada apareceu: Invalidação funcionando!**

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot find module 'useRealtimeSync'"

**Causa:** Hook não foi criado ou caminho está errado

**Solução:**
```typescript
// Verificar que existe:
src/hooks/useRealtimeSync.ts

// Verificar import:
import { useRealtimeSync } from '@/src/hooks/useRealtimeSync';
```

---

### Erro: "Cannot find module 'CacheManager'"

**Causa:** CacheManager não foi criado ou caminho está errado

**Solução:**
```typescript
// Verificar que existe:
src/lib/cacheManager.ts

// Verificar import:
import { CacheManager } from '@/src/lib/cacheManager';
```

---

### Cache não está funcionando

**Possíveis causas:**

1. **MMKV não instalado:**
```bash
npm install react-native-mmkv
cd ios && pod install && cd ..
```

2. **Cache não está salvando:**
```typescript
// Verificar console se aparece:
console.log('[Financial] 💾 Cache atualizado');

// Se não aparecer, verificar se chegou até lá
```

3. **Limpar cache para testar:**
```typescript
// Adicionar temporariamente no loadExpenses:
CacheManager.clearUser(user.id); // ← testar se sem cache funciona
```

---

### Realtime não está funcionando

**Possíveis causas:**

1. **Realtime não habilitado no Supabase:**
```sql
-- Execute no Supabase SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE fixed_expenses;

-- Verificar:
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

2. **RLS bloqueando Realtime:**
```sql
-- Verificar política SELECT existe:
SELECT * FROM pg_policies WHERE tablename = 'fixed_expenses' AND cmd = 'SELECT';
```

3. **Canal não conectou:**
```typescript
// Verificar console:
console.log('[Realtime] Status: SUBSCRIBED');

// Se aparecer 'CHANNEL_ERROR', verificar filtros
```

---

### Despesas duplicadas no Realtime

**Causa:** Tanto o `addExpense` quanto o Realtime adicionam na lista

**Solução:** Já está implementado no código:
```typescript
onInsert: (newExpense) => {
  setExpenses(prev => {
    const exists = prev.some(exp => exp.id === newExpense.id);
    if (exists) return prev; // ← Evita duplicata
    return [newExpense, ...prev];
  });
}
```

---

## 📊 LOGS ESPERADOS

Quando tudo estiver funcionando, você deve ver estes logs no console:

### Primeira Abertura (sem cache):
```
[Financial] 📦 Tentando carregar do cache...
[Financial] 🌐 Carregando do banco...
[Financial] ✅ 45 despesas carregadas do banco
[Financial] 💾 Cache atualizado
[Realtime] Conectando: fixed_expenses:valenca:user123
[Realtime] Status: SUBSCRIBED
✅ [Realtime] Conectado: fixed_expenses:valenca:user123
```

### Segunda Abertura (com cache):
```
[Financial] 📦 Tentando carregar do cache...
[Financial] ✅ 45 despesas carregadas do cache
[Financial] 🌐 Carregando do banco...
[Financial] ✅ 45 despesas carregadas do banco
[Financial] 💾 Cache atualizado
[Realtime] Conectando: fixed_expenses:valenca:user123
[Realtime] Status: SUBSCRIBED
```

### Criar Despesa:
```
[Financial] ✅ Despesa criada: Aluguel Dezembro
[Financial] 📥 INSERT via Realtime: Aluguel Dezembro
```

### Editar Despesa:
```
[Financial] ✅ Despesa atualizada: expense-id-123
[Financial] 📝 UPDATE via Realtime: Aluguel Dezembro
```

### Deletar Despesa:
```
[Financial] ✅ Despesa deletada: expense-id-123
[Financial] 🗑️ DELETE via Realtime: Aluguel Dezembro
```

---

## 🎉 RESULTADO FINAL

Após implementar tudo, você terá:

✅ **Carregamento instantâneo** (<500ms com cache)  
✅ **Sincronização em tempo real** entre dispositivos  
✅ **Cache inteligente** com invalidação automática  
✅ **Experiência fluida** para o usuário  

---

## 📞 PRÓXIMOS PASSOS

Após validar que despesas estão funcionando:

1. **Testar extensivamente** com múltiplos usuários
2. **Replicar para receitas** (mesmo padrão)
3. **Adicionar offline sync** (SyncQueue) se necessário
4. **Remover console.logs** de debug (opcional)

---

## 🚀 IMPLEMENTAR AGORA

**Comando para Windsurf:**

```
Por favor, implementar as mudanças descritas neste guia no arquivo 
src/context/FinancialContext.tsx seguindo exatamente o passo a passo.

Importante:
- Adicionar imports
- Adicionar useRealtimeSync
- Substituir loadExpenses
- Adicionar invalidação em add/update/delete
- NÃO mexer em receitas
- Manter console.logs para debug
```

---

**ARQUIVO PRONTO PARA IMPLEMENTAÇÃO!** ✨
