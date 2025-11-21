import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CostCenterSelector } from '../components/CostCenterSelector';
import { useCostCenter } from '../context/CostCenterContext';
import { Plus, ChevronRight, UploadCloud, FileText } from 'lucide-react-native';

const centerLabels = {
  valenca: 'Valença',
  cna: 'CNA',
  cabralia: 'Cabrália',
};

const ordersMock = [
  {
    id: 'ord-1',
    name: 'Compra de equipamentos de irrigação',
    date: '04/11/2024',
    status: 'orçamento_pendente',
    description: 'Sistema de irrigação automático',
  },
  {
    id: 'ord-2',
    name: 'Aquisição de EPI',
    date: '28/10/2024',
    status: 'orçamento_enviado',
    description: 'Lotes de EPIs para safra',
  },
];

const statusLabels = {
  orçamento_pendente: 'Orçamento pendente',
  orçamento_enviado: 'Orçamento enviado',
};

const statusStyles = {
  orçamento_pendente: {
    backgroundColor: '#FFF3D6',
    color: '#FF9500',
  },
  orçamento_enviado: {
    backgroundColor: '#E9FAF0',
    color: '#34C759',
  },
};

export const PedidosScreen = () => {
  const { selectedCenter } = useCostCenter();

  return (
    <View style={styles.container}>
      <CostCenterSelector />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Pedidos</Text>
          <Text style={styles.subtitle}>
            Controle os pedidos do centro {centerLabels[selectedCenter]}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9}>
          <Plus color="#FFFFFF" size={20} />
          <Text style={styles.primaryButtonText}>Novo Pedido</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lista de Pedidos</Text>
            <TouchableOpacity>
              <Text style={styles.link}>Filtrar período</Text>
            </TouchableOpacity>
          </View>

          {ordersMock.map((order) => (
            <TouchableOpacity key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{order.name}</Text>
                  <Text style={styles.cardSubtitle}>{order.description}</Text>
                </View>
                <ChevronRight size={18} color="#C7C7CC" />
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.metaLabel}>Data do pedido</Text>
                <Text style={styles.metaValue}>{order.date}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      statusStyles[order.status as keyof typeof statusStyles]
                        .backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        statusStyles[
                          order.status as keyof typeof statusStyles
                        ].color,
                    },
                  ]}
                >
                  {statusLabels[order.status as keyof typeof statusLabels]}
                </Text>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionPill}>
                  <FileText size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Detalhes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPill}>
                  <UploadCloud size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Enviar orçamento</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 15,
    color: '#6C6C70',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  link: {
    fontSize: 14,
    color: '#0A84FF',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6C6C70',
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
