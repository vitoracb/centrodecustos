# 🔧 CORREÇÃO - Problema no ReceiptFormModal

## 🎯 Diagnóstico:

O código no `FinanceiroScreen.tsx` está **IDÊNTICO** para despesas e receitas. Se funciona para despesas mas não para receitas, o problema está no **componente ReceiptFormModal**.

---

## 📋 O que verificar no ReceiptFormModal:

### 1️⃣ O componente recebe `initialData` corretamente?

Procure no arquivo `ReceiptFormModal.tsx` (ou similar) pela declaração dos props:

```typescript
interface ReceiptFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => void;
  initialData?: {  // ✅ Deve ter isso
    name: string;
    date: string;
    value: number;
    isFixed?: boolean;  // ✅ Deve ter isso
    fixedDurationMonths?: number;  // ✅ Deve ter isso
    id?: string;
  };
}
```

---

### 2️⃣ O estado inicial está usando `initialData`?

Procure onde o estado é inicializado:

**❌ ERRADO (ignora initialData):**
```typescript
const [isFixed, setIsFixed] = useState(false); // Sempre começa false
const [duration, setDuration] = useState<number | undefined>(undefined); // Sempre undefined
```

**✅ CORRETO (usa initialData):**
```typescript
const [isFixed, setIsFixed] = useState(initialData?.isFixed ?? false);
const [duration, setDuration] = useState<number | undefined>(initialData?.fixedDurationMonths);
```

---

### 3️⃣ O estado reseta quando `initialData` muda?

Precisa de um `useEffect` para atualizar quando editar um recebimento diferente:

**✅ NECESSÁRIO:**
```typescript
useEffect(() => {
  if (initialData) {
    setIsFixed(initialData.isFixed ?? false);
    setDuration(initialData.fixedDurationMonths);
    // ... outros campos
  } else {
    // Reseta para criar novo
    setIsFixed(false);
    setDuration(undefined);
    // ... outros campos
  }
}, [initialData]);
```

---

## 🔍 Como Comparar com ExpenseFormModal:

1. **Abra os dois arquivos lado a lado:**
   - `ReceiptFormModal.tsx`
   - `ExpenseFormModal.tsx`

2. **Compare estas seções:**

   **ExpenseFormModal (que funciona):**
   ```typescript
   // Props
   interface ExpenseFormModalProps {
     initialData?: {
       isFixed?: boolean;
       fixedDurationMonths?: number;
       // ...
     };
   }

   // Estado inicial
   const [isFixed, setIsFixed] = useState(initialData?.isFixed ?? false);
   const [duration, setDuration] = useState<number | undefined>(initialData?.fixedDurationMonths);

   // useEffect para atualizar quando initialData muda
   useEffect(() => {
     if (initialData) {
       setIsFixed(initialData.isFixed ?? false);
       setDuration(initialData.fixedDurationMonths);
     }
   }, [initialData]);
   ```

   **ReceiptFormModal (que NÃO funciona):**
   - Verifique se tem a mesma estrutura
   - Se NÃO tiver, copie a lógica do ExpenseFormModal

---

## 📤 Me envie o arquivo ReceiptFormModal:

Para eu identificar exatamente o problema, **me envie o código do arquivo `ReceiptFormModal.tsx`** (ou `.jsx`).

Provavelmente está em:
- `src/components/ReceiptFormModal.tsx`
- `components/ReceiptFormModal.tsx`

---

## 🧪 Teste Rápido para Confirmar:

1. **Adicione um console.log no ReceiptFormModal:**

   No início do componente:
   ```typescript
   export const ReceiptFormModal = ({ initialData, ...props }: ReceiptFormModalProps) => {
     console.log('🔵 ReceiptFormModal initialData:', initialData);
     // ... resto do código
   ```

2. **Edite um recebimento fixo e veja o console:**
   - ✅ Se aparecer `isFixed: true` e `fixedDurationMonths: 3` → O problema está no estado interno
   - ❌ Se aparecer `isFixed: undefined` → O problema está no FinanceiroScreen

---

## 💡 Solução Provável:

O `ReceiptFormModal` provavelmente tem:

**❌ Problema:**
```typescript
const [isFixed, setIsFixed] = useState(false); // Hardcoded false!
```

**✅ Correção:**
```typescript
const [isFixed, setIsFixed] = useState(initialData?.isFixed ?? false);

// E adicionar useEffect:
useEffect(() => {
  setIsFixed(initialData?.isFixed ?? false);
  setDuration(initialData?.fixedDurationMonths);
}, [initialData]);
```

---

**Me envie o arquivo `ReceiptFormModal.tsx` para eu fazer a correção exata!** 📁
