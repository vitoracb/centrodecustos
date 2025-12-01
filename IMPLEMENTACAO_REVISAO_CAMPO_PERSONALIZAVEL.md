# 🔧 IMPLEMENTAÇÃO - Sistema de Revisão com Campo Personalizável

## 🎯 Estrutura Simplificada:

**Campos no equipamento:**
1. **Horas Atuais** (current_hours): Ex: 1250h
2. **Horas para Próxima Revisão** (hours_until_revision): Ex: 250h (você define quanto falta)

**Cálculo automático:**
- Próxima revisão em: current_hours + hours_until_revision
- Ex: 1250 + 250 = 1500h

---

## 🗄️ PASSO 1: SQL de Migração

### Arquivo: `supabase_equipment_hours_system.sql`

```sql
-- Adicionar colunas de horas trabalhadas
ALTER TABLE equipments 
ADD COLUMN IF NOT EXISTS current_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_until_revision NUMERIC DEFAULT 250;

-- Comentários explicativos
COMMENT ON COLUMN equipments.current_hours IS 'Horas trabalhadas atuais do equipamento';
COMMENT ON COLUMN equipments.hours_until_revision IS 'Quantas horas faltam para a próxima revisão';

-- Atualizar equipamentos existentes com valores padrão
UPDATE equipments 
SET 
  current_hours = 0,
  hours_until_revision = 250
WHERE current_hours IS NULL;

-- Verificar os dados
SELECT 
  name,
  current_hours,
  hours_until_revision,
  (current_hours + hours_until_revision) as next_revision_at
FROM equipments;
```

---

## 🔧 PASSO 2: Atualizar EquipmentContext.tsx

### Interface Equipment:

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
  currentHours: number;              // Horas trabalhadas atuais
  hoursUntilRevision: number;        // Quantas horas faltam para revisão
  
  // Campo calculado (não salvo no banco):
  // nextRevisionHours = currentHours + hoursUntilRevision
  
  // Manter por compatibilidade:
  nextRevisionDate?: string;
  
  createdAt?: number;
}
```

### Função mapRowToEquipment:

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
    hoursUntilRevision: row.hours_until_revision ?? 250,
    
    nextRevisionDate: row.next_revision_date
      ? fromDbDate(row.next_revision_date)
      : undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  };
}
```

### Nova função: updateEquipmentHours

```typescript
const updateEquipmentHours = useCallback(async (
  equipmentId: string, 
  newCurrentHours: number
) => {
  try {
    const equipment = equipments.find(e => e.id === equipmentId);
    if (!equipment) {
      console.error('❌ Equipamento não encontrado');
      return;
    }

    // Calcula quantas horas foram trabalhadas
    const hoursWorked = newCurrentHours - equipment.currentHours;
    
    // Desconta das horas até revisão
    const newHoursUntilRevision = Math.max(0, equipment.hoursUntilRevision - hoursWorked);
    
    console.log(`🔧 ${equipment.name}:`);
    console.log(`   Horas trabalhadas: +${hoursWorked}h`);
    console.log(`   Faltam para revisão: ${newHoursUntilRevision}h`);

    const { data, error } = await supabase
      .from('equipments')
      .update({
        current_hours: newCurrentHours,
        hours_until_revision: newHoursUntilRevision,
      })
      .eq('id', equipmentId)
      .select(`
        id, name, type, plate_or_id, observations, photos,
        current_hours, hours_until_revision,
        next_revision_date, created_at,
        cost_centers ( code )
      `)
      .single();

    if (error || !data) {
      console.error('❌ Erro ao atualizar horas:', error);
      return;
    }

    const updated = mapRowToEquipment(data);
    setEquipments(prev => prev.map(e => e.id === equipmentId ? updated : e));
    
    console.log(`✅ Horas atualizadas com sucesso`);
    
    // Verifica se precisa notificar
    checkRevisionNotification(updated);
    
  } catch (e) {
    console.error('❌ Erro ao atualizar horas:', e);
  }
}, [equipments]);
```

### Função de notificação:

```typescript
const checkRevisionNotification = useCallback((equipment: Equipment) => {
  // Notifica se faltar 50h ou menos
  if (equipment.hoursUntilRevision <= 50 && equipment.hoursUntilRevision > 0) {
    console.log(`🔔 NOTIFICAÇÃO: ${equipment.name} precisa de revisão em ${equipment.hoursUntilRevision}h`);
    
    // TODO: Adicionar push notification
    // schedulePushNotification({
    //   title: '🔧 Revisão Próxima',
    //   body: `${equipment.name} precisa de revisão em ${equipment.hoursUntilRevision}h`,
    //   data: { equipmentId: equipment.id, type: 'revision' }
    // });
  }
  
  // Alerta se já passou da revisão
  if (equipment.hoursUntilRevision <= 0) {
    console.log(`⚠️ ALERTA: ${equipment.name} PRECISA DE REVISÃO URGENTE!`);
    
    // TODO: Adicionar push notification urgente
  }
}, []);
```

### Exportar no Provider:

```typescript
return (
  <EquipmentContext.Provider value={{
    equipments,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    updateEquipmentHours, // ✅ ADICIONAR
    getEquipmentsByCenter,
    getAllEquipments,
  }}>
    {children}
  </EquipmentContext.Provider>
);
```

### Atualizar a interface do Context:

```typescript
interface EquipmentContextType {
  equipments: Equipment[];
  addEquipment: (equipment: Omit<Equipment, 'id'>) => void;
  updateEquipment: (equipment: Equipment) => void;
  deleteEquipment: (id: string) => void;
  updateEquipmentHours: (equipmentId: string, newCurrentHours: number) => void; // ✅ ADICIONAR
  getEquipmentsByCenter: (center: CostCenter) => Equipment[];
  getAllEquipments: () => Equipment[];
}
```

---

## 🎨 PASSO 3: Atualizar EquipmentCard

### Exibir informações de horas:

```typescript
// No componente EquipmentCard
const nextRevisionHours = equipment.currentHours + equipment.hoursUntilRevision;
const isNearRevision = equipment.hoursUntilRevision <= 50 && equipment.hoursUntilRevision > 0;
const isPastRevision = equipment.hoursUntilRevision <= 0;

return (
  <View style={styles.card}>
    {/* ... header com nome e foto ... */}
    
    {/* Informações de Horas */}
    <View style={styles.hoursContainer}>
      {/* Horas Atuais */}
      <View style={styles.hoursRow}>
        <Text style={styles.hoursLabel}>Horas Atuais:</Text>
        <Text style={styles.hoursValue}>
          {equipment.currentHours.toLocaleString('pt-BR')}h
        </Text>
      </View>
      
      {/* Próxima Revisão */}
      <View style={styles.hoursRow}>
        <Text style={styles.hoursLabel}>Próxima Revisão:</Text>
        <Text style={styles.hoursValue}>
          {nextRevisionHours.toLocaleString('pt-BR')}h
        </Text>
      </View>
      
      {/* Horas Faltantes - com destaque se próximo */}
      <View style={[
        styles.hoursRow,
        isNearRevision && styles.warningRow,
        isPastRevision && styles.dangerRow,
      ]}>
        <Text style={styles.hoursLabel}>Faltam:</Text>
        <Text style={[
          styles.hoursValue,
          styles.hoursBold,
          isNearRevision && styles.warningText,
          isPastRevision && styles.dangerText,
        ]}>
          {isPastRevision 
            ? 'REVISÃO URGENTE!' 
            : `${equipment.hoursUntilRevision}h`
          }
        </Text>
      </View>
    </View>
    
    {/* Badge de Alerta */}
    {isNearRevision && (
      <View style={styles.warningBadge}>
        <Text style={styles.warningBadgeText}>
          ⚠️ Faltam apenas {equipment.hoursUntilRevision}h para revisão
        </Text>
      </View>
    )}
    
    {isPastRevision && (
      <View style={styles.dangerBadge}>
        <Text style={styles.dangerBadgeText}>
          🔴 REVISÃO ATRASADA - Agende urgente!
        </Text>
      </View>
    )}
    
    {/* Botão para atualizar horas */}
    <TouchableOpacity 
      style={styles.updateButton}
      onPress={() => setUpdateHoursModalVisible(true)}
    >
      <Text style={styles.updateButtonText}>
        ⏱️ Atualizar Horas
      </Text>
    </TouchableOpacity>
  </View>
);
```

### Estilos:

```typescript
const styles = StyleSheet.create({
  // ... estilos existentes ...
  
  hoursContainer: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningRow: {
    backgroundColor: '#FFF9E6',
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dangerRow: {
    backgroundColor: '#FFEBEE',
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  hoursLabel: {
    fontSize: 14,
    color: '#6C6C70',
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  hoursBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningText: {
    color: '#FF9500',
  },
  dangerText: {
    color: '#FF3B30',
  },
  warningBadge: {
    backgroundColor: '#FFF3D6',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
    textAlign: 'center',
  },
  dangerBadge: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  dangerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

---

## 📝 PASSO 4: Modal para Atualizar Horas

### Arquivo: `src/components/UpdateHoursModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
      Alert.alert(
        'Reduzir Horas?',
        'As horas normalmente não diminuem. Tem certeza que deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: () => {
              onUpdate(equipment.id, newHours);
              onClose();
            },
          },
        ]
      );
      return;
    }
    
    if (equipment) {
      onUpdate(equipment.id, newHours);
      onClose();
    }
  };

  if (!equipment) return null;

  const hoursWorked = parseFloat(hours) - equipment.currentHours;
  const newHoursUntilRevision = Math.max(0, equipment.hoursUntilRevision - hoursWorked);
  const nextRevisionHours = equipment.currentHours + equipment.hoursUntilRevision;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>⏱️ Atualizar Horas</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {/* Equipment Info */}
          <View style={styles.equipmentInfo}>
            <Text style={styles.equipmentName}>{equipment.name}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Horas Atuais:</Text>
              <Text style={styles.infoValue}>
                {equipment.currentHours.toLocaleString('pt-BR')}h
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Próxima Revisão:</Text>
              <Text style={styles.infoValue}>
                {nextRevisionHours.toLocaleString('pt-BR')}h
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Faltam:</Text>
              <Text style={[styles.infoValue, styles.infoBold]}>
                {equipment.hoursUntilRevision}h
              </Text>
            </View>
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
              placeholderTextColor="#C7C7CC"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            {hoursWorked > 0 && !error && (
              <View style={styles.calculatedInfo}>
                <Text style={styles.workedHours}>
                  +{hoursWorked.toFixed(1)}h trabalhadas
                </Text>
                <Text style={styles.remainingHours}>
                  Faltarão: {newHoursUntilRevision}h para revisão
                </Text>
                {newHoursUntilRevision <= 50 && newHoursUntilRevision > 0 && (
                  <Text style={styles.warningText}>
                    ⚠️ Revisão se aproximando!
                  </Text>
                )}
                {newHoursUntilRevision <= 0 && (
                  <Text style={styles.dangerText}>
                    🔴 Equipamento precisa de revisão!
                  </Text>
                )}
              </View>
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
    gap: 8,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6C6C70',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  infoBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A84FF',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
  },
  calculatedInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E9FAF0',
    borderRadius: 8,
    gap: 4,
  },
  workedHours: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  remainingHours: {
    fontSize: 13,
    color: '#1C1C1E',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
    marginTop: 4,
  },
  dangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 4,
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

## 📋 Resumo dos Campos:

| Campo | Descrição | Exemplo | Editável? |
|-------|-----------|---------|-----------|
| `currentHours` | Horas atuais do equipamento | 1250h | ✅ Sim (via modal) |
| `hoursUntilRevision` | Quantas horas faltam para revisão | 250h | ✅ Sim (ao criar/editar) |
| `nextRevisionHours` | Quando será a revisão | 1500h | ❌ Calculado automaticamente |

**Cálculo:** `nextRevisionHours = currentHours + hoursUntilRevision`

---

## 🧪 Fluxo de Uso:

1. **Criar equipamento:**
   - Horas atuais: 1200h
   - Horas até revisão: 300h
   - → Próxima revisão: 1500h

2. **Trabalhar 100h (atualizar para 1300h):**
   - Horas atuais: 1300h
   - Horas até revisão: 200h (300 - 100)
   - → Próxima revisão: 1500h

3. **Trabalhar mais 160h (atualizar para 1460h):**
   - Horas atuais: 1460h
   - Horas até revisão: 40h (200 - 160)
   - → ⚠️ Notificação: Faltam 40h!

4. **Fazer a revisão:**
   - Editar equipamento
   - Definir novas "Horas até revisão": 300h
   - → Próxima revisão: 1760h

---

Quer que eu crie todos esses arquivos? 🚀
