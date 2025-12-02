# ➕ ADICIONAR CATEGORIA "EQUIPAMENTOS" ÀS DESPESAS

## 🎯 Objetivo

Adicionar nova categoria "Equipamentos" para despesas, ficando:
1. ✅ Manutenção
2. ✅ Funcionário
3. ✅ Gestão
4. ✅ Terceirizados
5. ✅ Diversos
6. ✅ **Equipamentos** ← NOVO

---

## 📝 PASSO 1: Atualizar o Tipo no TypeScript

**Arquivo:** `src/context/FinancialContext.tsx`

**Procure por (linha ~33):**

```typescript
export type ExpenseCategory =
  | "manutencao"
  | "funcionario"
  | "gestao"
  | "terceirizados"
  | "diversos"
  | "equipamentos"; // ❌ ANTES: não tinha
```

**SUBSTITUA por:**

```typescript
export type ExpenseCategory =
  | "manutencao"
  | "funcionario"
  | "gestao"
  | "terceirizados"
  | "diversos"
  | "equipamentos"; // ✅ ADICIONE esta linha
```

---

## 📝 PASSO 2: Adicionar Label da Categoria

**Procure onde tem os labels das categorias** (geralmente em um arquivo de constantes ou no próprio componente):

**Possíveis locais:**
- `src/constants/categories.ts`
- `src/components/ExpenseFormModal.tsx`
- `src/screens/FinanceiroScreen.tsx`

**Exemplo típico:**

```typescript
// ❌ ANTES
export const EXPENSE_CATEGORIES = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
};

// ✅ DEPOIS
export const EXPENSE_CATEGORIES = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestao: 'Gestão',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
  equipamentos: 'Equipamentos', // ✅ ADICIONE esta linha
};
```

---

## 📝 PASSO 3: Adicionar Ícone da Categoria

**Arquivo:** Onde os ícones das categorias são definidos

**Procure por uma função como `getCategoryIcon` ou similar:**

```typescript
// ❌ ANTES
const getCategoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case 'manutencao':
      return <Wrench size={20} color="#FF9500" />;
    case 'funcionario':
      return <Users size={20} color="#007AFF" />;
    case 'gestao':
      return <Briefcase size={20} color="#5856D6" />;
    case 'terceirizados':
      return <UserCheck size={20} color="#34C759" />;
    case 'diversos':
      return <MoreHorizontal size={20} color="#8E8E93" />;
    default:
      return <FileText size={20} color="#8E8E93" />;
  }
};

// ✅ DEPOIS
const getCategoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case 'manutencao':
      return <Wrench size={20} color="#FF9500" />;
    case 'funcionario':
      return <Users size={20} color="#007AFF" />;
    case 'gestao':
      return <Briefcase size={20} color="#5856D6" />;
    case 'terceirizados':
      return <UserCheck size={20} color="#34C759" />;
    case 'diversos':
      return <MoreHorizontal size={20} color="#8E8E93" />;
    case 'equipamentos': // ✅ ADICIONE esta linha
      return <Truck size={20} color="#FF3B30" />; // ✅ Ícone de caminhão/equipamento
    default:
      return <FileText size={20} color="#8E8E93" />;
  }
};
```

**Ícones sugeridos para Equipamentos:**
- `<Truck />` - Caminhão (recomendado)
- `<Package />` - Pacote/Caixa
- `<Tool />` - Ferramenta
- `<Settings />` - Engrenagem
- `<Boxes />` - Caixas

---

## 📝 PASSO 4: Adicionar Cor da Categoria

**Se houver um mapa de cores:**

```typescript
// ❌ ANTES
const CATEGORY_COLORS = {
  manutencao: '#FF9500',
  funcionario: '#007AFF',
  gestao: '#5856D6',
  terceirizados: '#34C759',
  diversos: '#8E8E93',
};

// ✅ DEPOIS
const CATEGORY_COLORS = {
  manutencao: '#FF9500',
  funcionario: '#007AFF',
  gestao: '#5856D6',
  terceirizados: '#34C759',
  diversos: '#8E8E93',
  equipamentos: '#FF3B30', // ✅ ADICIONE (vermelho)
};
```

---

## 📝 PASSO 5: Adicionar no Modal de Seleção

**Arquivo:** `src/components/ExpenseFormModal.tsx` (ou onde tem o picker de categoria)

**Procure por onde renderiza as categorias:**

```typescript
// ❌ ANTES
const categories: ExpenseCategory[] = [
  'manutencao',
  'funcionario',
  'gestao',
  'terceirizados',
  'diversos',
];

// ✅ DEPOIS
const categories: ExpenseCategory[] = [
  'manutencao',
  'funcionario',
  'gestao',
  'terceirizados',
  'diversos',
  'equipamentos', // ✅ ADICIONE
];
```

**OU se for um objeto:**

```typescript
// ❌ ANTES
<Picker selectedValue={category} onValueChange={setCategory}>
  <Picker.Item label="Manutenção" value="manutencao" />
  <Picker.Item label="Funcionário" value="funcionario" />
  <Picker.Item label="Gestão" value="gestao" />
  <Picker.Item label="Terceirizados" value="terceirizados" />
  <Picker.Item label="Diversos" value="diversos" />
</Picker>

// ✅ DEPOIS
<Picker selectedValue={category} onValueChange={setCategory}>
  <Picker.Item label="Manutenção" value="manutencao" />
  <Picker.Item label="Funcionário" value="funcionario" />
  <Picker.Item label="Gestão" value="gestao" />
  <Picker.Item label="Terceirizados" value="terceirizados" />
  <Picker.Item label="Diversos" value="diversos" />
  <Picker.Item label="Equipamentos" value="equipamentos" /> // ✅ ADICIONE
</Picker>
```

---

## 📝 PASSO 6: Atualizar Filtros (se houver)

**Arquivo:** Onde tem filtros de categoria

```typescript
// ❌ ANTES
const filterOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Funcionário', value: 'funcionario' },
  { label: 'Gestão', value: 'gestao' },
  { label: 'Terceirizados', value: 'terceirizados' },
  { label: 'Diversos', value: 'diversos' },
];

// ✅ DEPOIS
const filterOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Manutenção', value: 'manutencao' },
  { label: 'Funcionário', value: 'funcionario' },
  { label: 'Gestão', value: 'gestao' },
  { label: 'Terceirizados', value: 'terceirizados' },
  { label: 'Diversos', value: 'diversos' },
  { label: 'Equipamentos', value: 'equipamentos' }, // ✅ ADICIONE
];
```

---

## 📝 PASSO 7: Atualizar Gráficos

**Arquivos que podem precisar atualizar:**
- `src/components/ExpensePieChart.tsx`
- `src/components/ExpenseBarChart.tsx`
- `src/components/ExpenseSectorChart.tsx`

**Exemplo em gráfico de pizza:**

```typescript
// Não precisa fazer nada se o gráfico já pega automaticamente todas as categorias
// Mas se tiver cores hardcoded, adicione:

const CHART_COLORS = {
  manutencao: '#FF9500',
  funcionario: '#007AFF',
  gestao: '#5856D6',
  terceirizados: '#34C759',
  diversos: '#8E8E93',
  equipamentos: '#FF3B30', // ✅ ADICIONE
};
```

---

## 🗄️ PASSO 8: Atualizar Banco de Dados (Opcional)

**O Supabase já aceita qualquer string na coluna `category`**, então não precisa alterar nada!

Mas se você quiser adicionar validação no banco:

```sql
-- OPCIONAL: Adicionar constraint de validação
ALTER TABLE financial_transactions
DROP CONSTRAINT IF EXISTS financial_transactions_category_check;

ALTER TABLE financial_transactions
ADD CONSTRAINT financial_transactions_category_check
CHECK (
  category IN (
    'manutencao',
    'funcionario',
    'gestao',
    'terceirizados',
    'diversos',
    'equipamentos' -- ✅ ADICIONE
  )
);
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] 1. Adicionar `"equipamentos"` no tipo `ExpenseCategory`
- [ ] 2. Adicionar label `'Equipamentos'` no mapa de labels
- [ ] 3. Adicionar ícone no `getCategoryIcon()`
- [ ] 4. Adicionar cor no mapa de cores
- [ ] 5. Adicionar no array/picker de categorias do formulário
- [ ] 6. Adicionar nos filtros (se houver)
- [ ] 7. Atualizar gráficos (se necessário)
- [ ] 8. (Opcional) Adicionar constraint no banco
- [ ] 9. Salvar os arquivos
- [ ] 10. Reiniciar o servidor
- [ ] 11. Testar criar despesa com categoria "Equipamentos"

---

## 🧪 TESTE

Depois de implementar:

1. ✅ Abra o modal de nova despesa
2. ✅ Verifique se "Equipamentos" aparece nas opções
3. ✅ Crie uma despesa com categoria "Equipamentos"
4. ✅ Verifique se aparece corretamente no card
5. ✅ Verifique se o ícone e cor estão corretos
6. ✅ Verifique se aparece nos gráficos
7. ✅ Verifique se os filtros funcionam

---

## 📂 ARQUIVOS A MODIFICAR

Lista de arquivos que provavelmente precisam ser modificados:

1. **`src/context/FinancialContext.tsx`** - Adicionar tipo
2. **`src/components/ExpenseFormModal.tsx`** - Adicionar no formulário
3. **`src/components/ExpenseCard.tsx`** - Adicionar ícone/cor
4. **`src/components/ExpensePieChart.tsx`** - Adicionar cor no gráfico
5. **`src/components/ExpenseBarChart.tsx`** - (se necessário)
6. **`src/components/ExpenseFilterModal.tsx`** - Adicionar filtro
7. **`src/constants/categories.ts`** - Se existir

---

## 🎨 SUGESTÕES DE ESTILO

**Cor sugerida para Equipamentos:** `#FF3B30` (Vermelho)

**Ícone sugerido:** `<Truck />` da biblioteca `lucide-react-native`

**Import:**
```typescript
import { Truck } from 'lucide-react-native';
```

---

## 💡 EXEMPLO COMPLETO DE UM ARQUIVO

**Exemplo: `src/constants/categories.ts` (se você quiser criar)**

```typescript
import { Wrench, Users, Briefcase, UserCheck, MoreHorizontal, Truck } from 'lucide-react-native';

export type ExpenseCategory =
  | "manutencao"
  | "funcionario"
  | "gestao"
  | "terceirizados"
  | "diversos"
  | "equipamentos";

export const EXPENSE_CATEGORIES = {
  manutencao: {
    label: 'Manutenção',
    icon: Wrench,
    color: '#FF9500',
  },
  funcionario: {
    label: 'Funcionário',
    icon: Users,
    color: '#007AFF',
  },
  gestao: {
    label: 'Gestão',
    icon: Briefcase,
    color: '#5856D6',
  },
  terceirizados: {
    label: 'Terceirizados',
    icon: UserCheck,
    color: '#34C759',
  },
  diversos: {
    label: 'Diversos',
    icon: MoreHorizontal,
    color: '#8E8E93',
  },
  equipamentos: { // ✅ NOVO
    label: 'Equipamentos',
    icon: Truck,
    color: '#FF3B30',
  },
};

export const getCategoryLabel = (category: ExpenseCategory): string => {
  return EXPENSE_CATEGORIES[category]?.label || 'Diversos';
};

export const getCategoryIcon = (category: ExpenseCategory, size = 20) => {
  const Icon = EXPENSE_CATEGORIES[category]?.icon || MoreHorizontal;
  const color = EXPENSE_CATEGORIES[category]?.color || '#8E8E93';
  return <Icon size={size} color={color} />;
};
```

---

**Quer que eu encontre os arquivos específicos do seu projeto e faça as alterações?** 

Ou você prefere fazer manualmente seguindo o guia? 🚀
