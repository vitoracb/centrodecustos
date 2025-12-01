# 🔧 IMPLEMENTAÇÃO - Sistema de Revisão por Horas Trabalhadas

## 🎯 Objetivo:

Transformar o sistema de revisões de **data** para **horas trabalhadas**.

### Mudanças:

**ANTES:**
- ❌ Próxima revisão: Data (ex: 15/12/2024)
- ❌ Notificação: X dias antes

**DEPOIS:**
- ✅ Horas atuais: 1.250h
- ✅ Próxima revisão: 1.500h (a cada 250h, por exemplo)
- ✅ Horas faltantes: 250h
- ✅ Notificação: Quando faltar ≤ 50h

---

## 📊 Estrutura de Dados:

### Campos Necessários:

```typescript
interface Equipment {
  id: string;
  name: string;
  // ... campos existentes
  
  // ❌ REMOVER (ou deprecar):
  nextRevisionDate?: string;
  
  // ✅ ADICIONAR:
  currentHours: number;           // Ex: 1250 (horas trabalhadas atuais)
  hoursPerRevision: number;       // Ex: 250 (revisão a cada 250h)
  lastRevisionHours?: number;     // Ex: 1000 (horas da última revisão)
  nextRevisionHours: number;      // Ex: 1500 (próxima revisão em 1500h)
}
```

### Cálculos:

```typescript
// Horas até próxima revisão
const hoursUntilRevision = nextRevisionHours - currentHours;

// Ex: 1500 - 1250 = 250h faltando

// Deve notificar?
const shouldNotify = hoursUntilRevision <= 50 && hoursUntilRevision > 0;
```

---

## 🗄️ PASSO 1: Migração do Banco de Dados

### SQL para adicionar novas colunas:

```sql
-- Adicionar colunas de horas
ALTER TABLE equipments 
ADD COLUMN IF NOT EXISTS current_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_per_revision NUMERIC DEFAULT 250,
ADD COLUMN IF NOT EXISTS last_revision_hours NUMERIC,
ADD COLUMN IF NOT EXISTS next_revision_hours NUMERIC;

-- Opcional: Deprecar next_revision_date (não deletar, para manter histórico)
-- ALTER TABLE equipments RENAME COLUMN next_revision_date TO next_revision_date_deprecated;

-- Atualizar equipamentos existentes com valores padrão
UPDATE equipments 
SET 
  current_hours = 0,
  hours_per_revision = 250,
  next_revision_hours = 250
WHERE current_hours IS NULL;
```

### Arquivo SQL para criar:

`supabase_equipment_hours_migration.sql`

---

## 🔧 PASSO 2: Atualizar o Context

### Arquivo: `src/context/EquipmentContext.tsx`

**1. Atualizar a interface Equipment:**

```typescript
export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  center: CostCenter;
  plateOrId: string;
  observations?: string;
  photos?: string[];
  
  // ✅ NOVOS CAMPOS:
  currentHours: number;              // Horas atuais
  hoursPerRevision: number;          // Intervalo de revisão (padrão: 250h)
  lastRevisionHours?: number;        // Horas da última revisão
  nextRevisionHours: number;         // Próxima revisão em X horas
  
  // ❌ DEPRECADO (manter por enquanto):
  nextRevisionDate?: string;
  
  createdAt?: number;
}
```

**2. Atualizar a função `mapRowToEquipment`:**

```typescript
function mapRowToEquipment(row: any): Equipment {
  const rawCostCenter = Array.isArray(row.cost_centers)
    ? row.cost_centers[0]
    : row.cost_centers;

  const centerCode = (rawCostCenter?.code ?? "valenca") as CostCenter;

  return {
    id: row.id,
    name: row.name ?? "",
    type: (row.type ?? "outros") as EquipmentType,
    center: centerCode,
    plateOrId: row.plate_or_id ?? "",
    observations: row.observations ?? undefined,
    photos: row.photos ? JSON.parse(row.photos) : undefined,
    
    // ✅ NOVOS CAMPOS:
    currentHours: row.current_hours ?? 0,
    hoursPerRevision: row.hours_per_revision ?? 250,
    lastRevisionHours: row.last_revision_hours ?? undefined,
    nextRevisionHours: row.next_revision_hours ?? (row.current_hours ?? 0) + (row.hours_per_revision ?? 250),
    
    nextRevisionDate: row.next_revision_date
      ? fromDbDate(row.next_revision_date)
      : undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  };
}
```

**3. Adicionar função para atualizar horas:**

```typescript
const updateEquipmentHours = useCallback(async (
  equipmentId: string, 
  newCurrentHours: number
) => {
  try {
    const equipment = equipments.find(e => e.id === equipmentId);
    if (!equipment) {
      console.error('Equipamento não encontrado');
      return;
    }

    // Calcula se passou da próxima revisão
    const passedRevision = newCurrentHours >= equipment.nextRevisionHours;
    
    let updateData: any = {
      current_hours: newCurrentHours,
    };

    // Se passou da revisão, atualiza a próxima
    if (passedRevision) {
      updateData.last_revision_hours = equipment.nextRevisionHours;
      updateData.next_revision_hours = newCurrentHours + equipment.hoursPerRevision;
      
      console.log(`⚠️ Equipamento "${equipment.name}" passou da revisão! Nova revisão em ${updateData.next_revision_hours}h`);
    }

    const { data, error } = await supabase
      .from('equipments')
      .update(updateData)
      .eq('id', equipmentId)
      .select(`
        id, name, type, plate_or_id, observations, photos,
        current_hours, hours_per_revision, last_revision_hours, next_revision_hours,
        next_revision_date, created_at,
        cost_centers ( code )
      `)
      .single();

    if (error || !data) {
      console.error('Erro ao atualizar horas:', error);
      return;
    }

    const updated = mapRowToEquipment(data);
    setEquipments(prev => prev.map(e => e.id === equipmentId ? updated : e));
    
    console.log(`✅ Horas atualizadas: ${equipment.name} - ${newCurrentHours}h`);
    
    // Verifica se precisa notificar
    checkRevisionNotification(updated);
    
  } catch (e) {
    console.error('Erro ao atualizar horas:', e);
  }
}, [equipments]);

// Exportar no provider
return (
  <EquipmentContext.Provider value={{
    equipments,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    updateEquipmentHours, // ✅ NOVO
    // ...
  }}>
    {children}
  </EquipmentContext.Provider>
);
```

**4. Adicionar função de verificação de notificação:**

```typescript
const checkRevisionNotification = useCallback((equipment: Equipment) => {
  const hoursUntilRevision = equipment.nextRevisionHours - equipment.currentHours;
  
  // Notifica se faltar 50h ou menos
  if (hoursUntilRevision <= 50 && hoursUntilRevision > 0) {
    console.log(`🔔 NOTIFICAÇÃO: ${equipment.name} precisa de revisão em ${hoursUntilRevision}h`);
    
    // Aqui você pode chamar a função de push notification
    // schedulePushNotification({
    //   title: 'Revisão Próxima',
    //   body: `${equipment.name} precisa de revisão em ${hoursUntilRevision}h`,
    //   data: { equipmentId: equipment.id, type: 'revision' }
    // });
  }
  
  // Notifica se já passou da revisão
  if (hoursUntilRevision <= 0) {
    console.log(`⚠️ ALERTA: ${equipment.name} passou ${Math.abs(hoursUntilRevision)}h da revisão!`);
  }
}, []);
```

---

## 🎨 PASSO 3: Atualizar UI dos Cards

### Arquivo: `src/components/EquipmentCard.tsx` (ou similar)

**ANTES:**
```typescript
<View style={styles.revisionInfo}>
  <Text>Próxima Revisão: {equipment.nextRevisionDate}</Text>
</View>
```

**DEPOIS:**
```typescript
const hoursUntilRevision = equipment.nextRevisionHours - equipment.currentHours;
const isNearRevision = hoursUntilRevision <= 50 && hoursUntilRevision > 0;
const isPastRevision = hoursUntilRevision <= 0;

<View style={styles.hoursInfo}>
  {/* Horas Atuais */}
  <View style={styles.hoursRow}>
    <Text style={styles.label}>Horas Atuais:</Text>
    <Text style={styles.value}>{equipment.currentHours.toLocaleString()}h</Text>
  </View>
  
  {/* Próxima Revisão */}
  <View style={styles.hoursRow}>
    <Text style={styles.label}>Próxima Revisão:</Text>
    <Text style={styles.value}>{equipment.nextRevisionHours.toLocaleString()}h</Text>
  </View>
  
  {/* Horas Faltantes */}
  <View style={[
    styles.hoursRow,
    isNearRevision && styles.warningRow,
    isPastRevision && styles.errorRow,
  ]}>
    <Text style={styles.label}>Faltam:</Text>
    <Text style={[
      styles.value,
      isNearRevision && styles.warningText,
      isPastRevision && styles.errorText,
    ]}>
      {isPastRevision 
        ? `ATRASADO ${Math.abs(hoursUntilRevision)}h` 
        : `${hoursUntilRevision}h`
      }
    </Text>
  </View>
  
  {/* Badge de Alerta */}
  {isNearRevision && (
    <View style={styles.warningBadge}>
      <AlertTriangle size={14} color="#FF9500" />
      <Text style={styles.warningBadgeText}>
        Revisão em {hoursUntilRevision}h
      </Text>
    </View>
  )}
  
  {isPastRevision && (
    <View style={styles.errorBadge}>
      <AlertCircle size={14} color="#FF3B30" />
      <Text style={styles.errorBadgeText}>
        REVISÃO ATRASADA!
      </Text>
    </View>
  )}
</View>
```

---

## 📝 PASSO 4: Criar Modal para Atualizar Horas

### Arquivo: `src/components/UpdateHoursModal.tsx` (criar novo)

```typescript
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Equipment } from '../context/EquipmentContext';

interface UpdateHoursModalProps {
  visible: boolean;
  equipment: Equipment | null;
  onClose: () => void;
  onUpdate: (equipmentId: string, newHours: number) => void;
}

export const UpdateHoursModal = ({
  visible,
  equipment,
  onClose,
  onUpdate,
}: UpdateHoursModalProps) => {
  const [hours, setHours] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (equipment) {
      setHours(equipment.currentHours.toString());
      setError('');
    }
  }, [equipment]);

  const handleUpdate = () => {
    const newHours = parseFloat(hours);
    
    if (isNaN(newHours) || newHours < 0) {
      setError('Digite um valor válido');
      return;
    }
    
    if (equipment && newHours < equipment.currentHours) {
      setError('As horas não podem diminuir');
      return;
    }
    
    if (equipment) {
      onUpdate(equipment.id, newHours);
      onClose();
    }
  };

  if (!equipment) return null;

  const hoursAdded = parseFloat(hours) - equipment.currentHours;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Atualizar Horas</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {/* Equipment Info */}
          <View style={styles.equipmentInfo}>
            <Text style={styles.equipmentName}>{equipment.name}</Text>
            <Text style={styles.currentHours}>
              Horas Atuais: {equipment.currentHours.toLocaleString()}h
            </Text>
          </View>

          {/* Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Novas Horas Totais:</Text>
            <TextInput
              style={styles.input}
              value={hours}
              onChangeText={(text) => {
                setHours(text);
                setError('');
              }}
              keyboardType="decimal-pad"
              placeholder="Ex: 1350"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            {hoursAdded > 0 && !error && (
              <Text style={styles.addedHours}>
                +{hoursAdded.toFixed(1)}h trabalhadas
              </Text>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.updateButton]} 
              onPress={handleUpdate}
            >
              <Text style={styles.updateButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  equipmentInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  currentHours: {
    fontSize: 14,
    color: '#6C6C70',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
  },
  addedHours: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 6,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  updateButton: {
    backgroundColor: '#0A84FF',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

---

## 🔔 PASSO 5: Push Notifications

### Arquivo: `src/lib/revisionNotifications.ts` (criar novo)

```typescript
import * as Notifications from 'expo-notifications';
import { Equipment } from '../context/EquipmentContext';

export const scheduleRevisionNotification = async (equipment: Equipment) => {
  const hoursUntilRevision = equipment.nextRevisionHours - equipment.currentHours;
  
  // Notifica se faltar 50h ou menos
  if (hoursUntilRevision <= 50 && hoursUntilRevision > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔧 Revisão Próxima',
        body: `${equipment.name} precisa de revisão em ${hoursUntilRevision}h de trabalho`,
        data: { 
          equipmentId: equipment.id,
          type: 'revision',
          hoursUntilRevision 
        },
      },
      trigger: null, // Notificação imediata
    });
  }
  
  // Alerta se já passou da revisão
  if (hoursUntilRevision <= 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ REVISÃO ATRASADA',
        body: `${equipment.name} passou ${Math.abs(hoursUntilRevision)}h da revisão!`,
        data: { 
          equipmentId: equipment.id,
          type: 'revision_overdue',
          hoursPastDue: Math.abs(hoursUntilRevision)
        },
      },
      trigger: null,
    });
  }
};

export const checkAllEquipmentsForRevision = async (equipments: Equipment[]) => {
  for (const equipment of equipments) {
    await scheduleRevisionNotification(equipment);
  }
};
```

---

## 📋 Checklist de Implementação:

- [ ] 1. Executar SQL de migração (`supabase_equipment_hours_migration.sql`)
- [ ] 2. Atualizar `EquipmentContext.tsx`:
  - [ ] Interface Equipment
  - [ ] mapRowToEquipment
  - [ ] updateEquipmentHours
  - [ ] checkRevisionNotification
- [ ] 3. Criar `UpdateHoursModal.tsx`
- [ ] 4. Atualizar tela de equipamentos para usar o modal
- [ ] 5. Atualizar card de equipamento para mostrar horas
- [ ] 6. Criar `revisionNotifications.ts`
- [ ] 7. Integrar notificações
- [ ] 8. Testar fluxo completo

---

## 🧪 Fluxo de Teste:

1. **Criar equipamento:**
   - Horas atuais: 1200h
   - Intervalo de revisão: 250h
   - Próxima revisão: 1450h

2. **Atualizar horas para 1420h:**
   - Faltam: 30h
   - ✅ Deve mostrar badge de alerta
   - ✅ Deve enviar notificação

3. **Atualizar horas para 1460h:**
   - Passou: 10h
   - ✅ Deve marcar como atrasado
   - ✅ Deve recalcular próxima revisão: 1710h
   - ✅ Deve enviar notificação de atraso

---

Quer que eu comece criando os arquivos? Me diga por onde prefere começar! 🚀
