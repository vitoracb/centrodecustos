# 🔒 GUIA DE IMPLEMENTAÇÃO: RLS (ROW LEVEL SECURITY)

Guia para configurar segurança a nível de linha no Supabase alinhada com os papéis do app:

- **Administrador (admin)**
- **Gerente (editor)**
- **Visualizador (viewer)**

Toda a lógica de RLS abaixo foi pensada para combinar com as flags que usamos na UI:

- `canCreate`  → admin, editor
- `canEdit`    → admin, editor
- `canDelete`  → só admin
- `canUploadFiles` → admin, editor
- `isViewer`   → viewer (somente leitura, mas pode gerar relatórios)

---

## 🎯 OBJETIVO

Garantir pelo banco de dados que:

- ✅ Cada usuário só acessa **seus centros de custo**
- ✅ **Admin** vê e altera tudo
- ✅ **Gerente (editor)** cria/edita (mas não deleta) nos centros que tem acesso
- ✅ **Visualizador** só lê dados, mas pode gerar relatórios
- ✅ Toda validação é feita no **Supabase (server)**, não apenas no app

---

## 🏗️ ARQUITETURA DE ROLES

### Papéis do sistema

```text
┌─────────────────────────────────────────┐
│ ADMIN                                   │
│ - Vê todos os centros de custo         │
│ - Cria/edita/deleta tudo               │
│ - Convida usuários / gerencia roles    │
│ - Acessa auditoria                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ EDITOR (Gerente)                        │
│ - Vê centros de custo atribuídos       │
│ - Cria/edita registros (sem deletar)   │
│ - Faz upload de arquivos               │
│ - Gera relatórios                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ VIEWER (Visualizador)                   │
│ - Apenas leitura                       │
│ - Vê dados dos centros atribuídos      │
│ - Gera relatórios                      │
│ - NÃO cria/edita/deleta                │
└─────────────────────────────────────────┘
```

Não usamos mais o papel genérico `user` aqui para simplificar: tudo é admin, editor ou viewer.

---

## 📊 TABELAS E POLÍTICAS

### 1. Tabela de Roles e Permissões

```sql
-- Tabela de roles dos usuários
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  cost_center_ids TEXT[], -- Array de centros que o usuário pode acessar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- (Opcional) Tabela de permissões específicas para granularidade extra
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL, -- 'create_expenses', 'approve_orders', etc.
  cost_center_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_roles
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
```

---

### 2. Funções Helper de Permissão

Essas funções são usadas dentro das políticas para manter as regras em um só lugar.

```sql
-- Função para verificar se usuário tem acesso a um centro de custo
CREATE OR REPLACE FUNCTION user_has_access_to_cost_center(
  p_user_id UUID,
  p_cost_center_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
    AND (
      role = 'admin'  -- Admin vê tudo
      OR p_cost_center_id = ANY(cost_center_ids)  -- Editor/Viewer têm centros atribuídos
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é editor (gerente)
CREATE OR REPLACE FUNCTION is_editor(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'editor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION user_has_permission(
  p_permission TEXT,
  p_cost_center_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (
      role = 'admin'  -- Admin tem todas as permissões
      OR (
        EXISTS (
          SELECT 1 FROM user_permissions
          WHERE user_id = auth.uid()
          AND permission = p_permission
          AND (cost_center_id IS NULL OR cost_center_id = p_cost_center_id)
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3. Exemplo: RLS para Despesas (fixed_expenses)

Esse exemplo reflete nossa regra de UI:

- Viewer: vê tudo do centro, **sem alterar**.
- Editor: cria/edita, **sem deletar**.
- Admin: cria/edita/deleta tudo.

```sql
-- Habilitar RLS
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário com acesso ao centro pode ver
CREATE POLICY "Can view expenses from allowed cost centers"
  ON fixed_expenses FOR SELECT
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
  );

-- INSERT: admin ou editor com acesso ao centro
CREATE POLICY "Can create expenses in allowed cost centers"
  ON fixed_expenses FOR INSERT
  WITH CHECK (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (is_admin(auth.uid()) OR is_editor(auth.uid()))
  );

-- UPDATE: admin ou editor com acesso ao centro
CREATE POLICY "Can update expenses in allowed cost centers"
  ON fixed_expenses FOR UPDATE
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
  )
  WITH CHECK (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (is_admin(auth.uid()) OR is_editor(auth.uid()))
  );

-- DELETE: somente admin
CREATE POLICY "Can delete expenses (admin only)"
  ON fixed_expenses FOR DELETE
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND is_admin(auth.uid())
  );
```

---

### 4. Exemplo: RLS para Recebimentos (receipts)

Mesma lógica de papéis aplicada a recebimentos:

```sql
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view receipts from allowed cost centers"
  ON receipts FOR SELECT
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Can create receipts in allowed cost centers"
  ON receipts FOR INSERT
  WITH CHECK (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (is_admin(auth.uid()) OR is_editor(auth.uid()))
  );

CREATE POLICY "Can update receipts in allowed cost centers"
  ON receipts FOR UPDATE
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id))
  WITH CHECK (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (is_admin(auth.uid()) OR is_editor(auth.uid()))
  );

-- Se quiser permitir delete em receipts, siga o mesmo padrão de despesas
CREATE POLICY "Can delete receipts (admin only)"
  ON receipts FOR DELETE
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND is_admin(auth.uid())
  );
```

---

### 5. Exemplo: RLS para Equipamentos (equipments)

Aqui a regra típica é:

- Viewer: vê lista e detalhes.
- Editor: cria/edita equipamentos (mas não deleta).
- Admin: cria/edita/deleta.

```sql
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view equipments from allowed cost centers"
  ON equipments FOR SELECT
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Can create equipments in allowed cost centers"
  ON equipments FOR INSERT
  WITH CHECK (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (is_admin(auth.uid()) OR is_editor(auth.uid()))
  );

CREATE POLICY "Can update equipments in allowed cost centers"
  ON equipments FOR UPDATE
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id))
  WITH CHECK (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (is_admin(auth.uid()) OR is_editor(auth.uid()))
  );

CREATE POLICY "Can delete equipments (admin only)"
  ON equipments FOR DELETE
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND is_admin(auth.uid())
  );
```

---

## ✅ Como isso se conecta com o app

- O campo `role` em `user_roles` deve bater com o que carregamos no `PermissionsContext` (`admin`, `editor`, `viewer`).
- As funções `is_admin` e `is_editor` são o "espelho" no banco das flags `isAdmin` e `isEditor` usadas na UI.
- As políticas de SELECT/INSERT/UPDATE/DELETE seguem exatamente o comportamento que já aplicamos na camada de interface:
  - Viewer: leitura + relatórios.
  - Editor: criação/edição/upload.
  - Admin: tudo, inclusive exclusão e gestão de usuários.

Esse arquivo serve como referência para criar os scripts SQL no Supabase e garantir que o que o usuário vê/no que ele clica no app esteja sempre coerente com o que o banco permite.
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view equipments from their cost centers"
  ON equipments FOR SELECT
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Managers can manage equipments"
  ON equipments FOR ALL
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );
```

---

### 6. RLS para Funcionários (employees)

```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees from their cost centers"
  ON employees FOR SELECT
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Managers can manage employees"
  ON employees FOR ALL
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
```

---

### 7. RLS para Contratos (contracts)

```sql
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts from their cost centers"
  ON contracts FOR SELECT
  USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Admins and managers can manage contracts"
  ON contracts FOR ALL
  USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
```

---

### 8. RLS para Documentos

```sql
-- Expense Documents
ALTER TABLE expense_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from their expenses"
  ON expense_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fixed_expenses
      WHERE fixed_expenses.id = expense_documents.expense_id
      AND user_has_access_to_cost_center(auth.uid(), fixed_expenses.cost_center_id)
    )
  );

-- Contract Documents
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract documents from their contracts"
  ON contract_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_documents.contract_id
      AND user_has_access_to_cost_center(auth.uid(), contracts.cost_center_id)
    )
  );
```

---

## 🛠️ IMPLEMENTAÇÃO NO APP

### 9. Context de Permissões

Crie `src/context/PermissionsContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { useAuth } from '@/src/context/AuthContext';

type Role = 'admin' | 'manager' | 'user' | 'viewer';

interface UserRole {
  role: Role;
  cost_center_ids: string[];
}

interface PermissionsContextType {
  userRole: UserRole | null;
  isAdmin: boolean;
  isManager: boolean;
  canAccessCostCenter: (costCenterId: string) => boolean;
  canCreate: (entity: string, costCenterId?: string) => boolean;
  canUpdate: (entity: string, costCenterId?: string) => boolean;
  canDelete: (entity: string, costCenterId?: string) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserRole();
    } else {
      setUserRole(null);
      setLoading(false);
    }
  }, [user]);

  const loadUserRole = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, cost_center_ids')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setUserRole(data);
    } catch (error) {
      console.error('Erro ao carregar role do usuário:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole?.role === 'admin';
  const isManager = userRole?.role === 'manager' || isAdmin;

  const canAccessCostCenter = (costCenterId: string): boolean => {
    if (!userRole) return false;
    if (isAdmin) return true;
    return userRole.cost_center_ids?.includes(costCenterId) || false;
  };

  const canCreate = (entity: string, costCenterId?: string): boolean => {
    if (!userRole) return false;
    if (isAdmin) return true;
    
    // Managers podem criar
    if (isManager && costCenterId) {
      return canAccessCostCenter(costCenterId);
    }
    
    // Users podem criar despesas (mas não equipamentos/funcionários)
    if (userRole.role === 'user') {
      if (entity === 'expense' || entity === 'receipt') {
        return costCenterId ? canAccessCostCenter(costCenterId) : true;
      }
      return false;
    }
    
    // Viewers não podem criar nada
    return false;
  };

  const canUpdate = (entity: string, costCenterId?: string): boolean => {
    if (!userRole) return false;
    if (isAdmin) return true;
    
    if (isManager && costCenterId) {
      return canAccessCostCenter(costCenterId);
    }
    
    // Users podem editar apenas suas próprias despesas/recebimentos
    if (userRole.role === 'user') {
      if (entity === 'expense' || entity === 'receipt') {
        return costCenterId ? canAccessCostCenter(costCenterId) : false;
      }
      return false;
    }
    
    return false;
  };

  const canDelete = (entity: string, costCenterId?: string): boolean => {
    if (!userRole) return false;
    if (isAdmin) return true;
    
    // Apenas managers podem deletar
    if (isManager && costCenterId) {
      return canAccessCostCenter(costCenterId);
    }
    
    return false;
  };

  return (
    <PermissionsContext.Provider
      value={{
        userRole,
        isAdmin,
        isManager,
        canAccessCostCenter,
        canCreate,
        canUpdate,
        canDelete,
        loading,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
```

---

### 10. Hook de Permissões

```typescript
// src/hooks/useEntityPermissions.ts
import { usePermissions } from '@/src/context/PermissionsContext';

export const useEntityPermissions = (
  entityType: string,
  costCenterId?: string
) => {
  const { canCreate, canUpdate, canDelete, isAdmin } = usePermissions();

  return {
    canCreate: canCreate(entityType, costCenterId),
    canUpdate: canUpdate(entityType, costCenterId),
    canDelete: canDelete(entityType, costCenterId),
    canView: true, // RLS já controla isso
    isAdmin,
  };
};
```

---

### 11. Uso nos Componentes

```typescript
// Exemplo em FinanceiroScreen.tsx
import { useEntityPermissions } from '@/src/hooks/useEntityPermissions';

export const FinanceiroScreen = () => {
  const { selectedCenter } = useCostCenter();
  const permissions = useEntityPermissions('expense', selectedCenter);

  return (
    <View>
      {/* Botão de criar só aparece se tiver permissão */}
      {permissions.canCreate && (
        <TouchableOpacity onPress={handleCreateExpense}>
          <Text>Nova Despesa</Text>
        </TouchableOpacity>
      )}

      {/* Botão de editar */}
      {permissions.canUpdate && (
        <TouchableOpacity onPress={handleEditExpense}>
          <Text>Editar</Text>
        </TouchableOpacity>
      )}

      {/* Botão de deletar */}
      {permissions.canDelete && (
        <TouchableOpacity onPress={handleDeleteExpense}>
          <Text>Excluir</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

---

## 📋 SCRIPT DE SETUP COMPLETO

### 12. Execute Este Script SQL

```sql
-- SCRIPT COMPLETO DE RLS
-- Execute no Supabase SQL Editor

-- 1. Criar tabelas
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
  cost_center_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 2. Criar funções helper
CREATE OR REPLACE FUNCTION user_has_access_to_cost_center(
  p_user_id UUID,
  p_cost_center_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
    AND (role = 'admin' OR p_cost_center_id = ANY(cost_center_ids))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Habilitar RLS em todas as tabelas
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas para fixed_expenses
CREATE POLICY "Users view expenses from their centers" ON fixed_expenses
  FOR SELECT USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Users create expenses in their centers" ON fixed_expenses
  FOR INSERT WITH CHECK (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Users update expenses in their centers" ON fixed_expenses
  FOR UPDATE USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

-- 5. Criar políticas para receipts
CREATE POLICY "Users view receipts from their centers" ON receipts
  FOR SELECT USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Users create receipts in their centers" ON receipts
  FOR INSERT WITH CHECK (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Users update receipts in their centers" ON receipts
  FOR UPDATE USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

-- 6. Criar políticas para equipments
CREATE POLICY "Users view equipments from their centers" ON equipments
  FOR SELECT USING (user_has_access_to_cost_center(auth.uid(), cost_center_id));

CREATE POLICY "Managers manage equipments" ON equipments
  FOR ALL USING (
    user_has_access_to_cost_center(auth.uid(), cost_center_id)
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 7. Criar políticas para user_roles
CREATE POLICY "Users view their own role" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins view all roles" ON user_roles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins manage roles" ON user_roles
  FOR ALL USING (is_admin(auth.uid()));

-- 8. Inserir primeiro admin (AJUSTE O EMAIL!)
INSERT INTO user_roles (user_id, role, cost_center_ids)
SELECT 
  id,
  'admin',
  ARRAY['valenca', 'cna', 'cabralia']
FROM auth.users
WHERE email = 'seu-email@empresa.com'  -- ⚠️ AJUSTE AQUI
ON CONFLICT (user_id) DO NOTHING;

-- Confirmar
SELECT * FROM user_roles;
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Executar script SQL completo no Supabase
- [ ] Criar tabela `user_roles`
- [ ] Criar funções helper
- [ ] Habilitar RLS em todas as tabelas
- [ ] Criar políticas para cada tabela
- [ ] Inserir primeiro usuário admin
- [ ] Criar `PermissionsContext.tsx`
- [ ] Adicionar `PermissionsProvider` no `_layout.tsx`
- [ ] Criar hook `useEntityPermissions`
- [ ] Atualizar componentes para usar permissões
- [ ] Testar com diferentes roles
- [ ] Verificar que usuários não veem dados de outros centros

---

## 🧪 TESTES

```sql
-- Testar como usuário comum (substitua o email)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-aqui"}';

-- Deve retornar apenas dados do centro do usuário
SELECT * FROM fixed_expenses;

-- Testar como admin
SET LOCAL request.jwt.claims TO '{"sub": "admin-uuid-aqui"}';

-- Deve retornar todos os dados
SELECT * FROM fixed_expenses;
```

---

**PRÓXIMO ARQUIVO: `SINCRONIZACAO_DADOS.md`** 🔄
