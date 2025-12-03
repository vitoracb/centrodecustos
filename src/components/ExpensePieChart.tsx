import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Path, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { ExpenseCategory, Expense } from '../context/FinancialContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  manutencao: '#0A84FF',
  funcionario: '#34C759',
  
  gestor: '#00C7BE',
  terceirizados: '#FF3B30',
  diversos: '#AF52DE',
  equipamentos: '#5856D6',
  impostos: '#FF2D55',
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
  gestor: 'Gestor',
  gestor: 'Gestor',
  terceirizados: 'Terceirizados',
  diversos: 'Diversos',
  equipamentos: 'Equipamentos',
  impostos: 'Impostos',
};

interface ExpensePieChartProps {
  expenses: Expense[];
  mode?: 'mensal' | 'anual';
  selectedPeriod?: dayjs.Dayjs;
}

export const ExpensePieChart = ({ expenses, mode: externalMode, selectedPeriod: externalPeriod }: ExpensePieChartProps) => {
  const [internalMode, setInternalMode] = useState<'mensal' | 'anual'>('mensal');
  const [internalPeriod, setInternalPeriod] = useState(dayjs());
  
  // Usa props externas se fornecidas, senão usa estado interno
  const mode = externalMode ?? internalMode;
  const selectedPeriod = externalPeriod ?? internalPeriod;

  const chartData = useMemo(() => {
    const totalsByCategory: Record<ExpenseCategory, number> = {
      manutencao: 0,
      funcionario: 0,
      
      gestor: 0,
      terceirizados: 0,
      diversos: 0,
      equipamentos: 0,
      impostos: 0,
    };

    // Usa as despesas já filtradas; trata categorias desconhecidas e valores inválidos
    expenses.forEach((expense) => {
      const rawCategory = expense.category as ExpenseCategory | string;

      // Garante que a categoria existe no mapa; senão, agrupa em 'diversos'
      const categoryKey: ExpenseCategory =
        (rawCategory in totalsByCategory
          ? (rawCategory as ExpenseCategory)
          : 'diversos');

      const value = Number.isFinite(expense.value) ? expense.value : 0;
      totalsByCategory[categoryKey] += value;
    });

    const total = Object.values(totalsByCategory)
      .filter((val) => Number.isFinite(val))
      .reduce((sum, val) => sum + val, 0);

    if (!Number.isFinite(total) || total <= 0) {
      return null;
    }

    const data = (Object.keys(totalsByCategory) as ExpenseCategory[])
      .map((category) => ({
        category,
        value: totalsByCategory[category],
        percentage:
          total > 0 && Number.isFinite(totalsByCategory[category])
            ? (totalsByCategory[category] / total) * 100
            : 0,
      }))
      .filter((item) => item.value > 0 && Number.isFinite(item.percentage))
      .sort((a, b) => b.value - a.value);

    return { data, total };
  }, [expenses, mode, selectedPeriod]);

  const size = 200;
  const center = size / 2;
  const radius = 80;
  const innerRadius = 0;

  // Calcular os arcos do gráfico (se houver dados)
  let arcs: Array<{
    category: ExpenseCategory;
    value: number;
    percentage: number;
    path: string;
    labelX: number;
    labelY: number;
    color: string;
  }> = [];

  if (chartData && chartData.data.length > 0) {
    let currentAngle = -90; // Começar do topo
    arcs = chartData.data.map((item) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Converter para radianos
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    // Calcular pontos do arco
    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    // Calcular o path do arco
    const largeArcFlag = angle > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    // Calcular posição do label (meio do arco)
    const labelAngle = (startAngle + angle / 2) * (Math.PI / 180);
    const labelRadius = radius * 0.65;
    const labelX = center + labelRadius * Math.cos(labelAngle);
    const labelY = center + labelRadius * Math.sin(labelAngle);

    return {
      ...item,
      path,
      labelX,
      labelY,
      color: CATEGORY_COLORS[item.category],
    };
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Distribuição por Categoria</Text>
      </View>
      {!externalMode && (
        <>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'mensal' && styles.modeButtonActive]}
              onPress={() => setInternalMode('mensal')}
            >
              <Text style={[styles.modeButtonText, mode === 'mensal' && styles.modeButtonTextActive]}>
                Mensal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'anual' && styles.modeButtonActive]}
              onPress={() => setInternalMode('anual')}
            >
              <Text style={[styles.modeButtonText, mode === 'anual' && styles.modeButtonTextActive]}>
                Anual
              </Text>
            </TouchableOpacity>
          </View>
          {mode === 'mensal' ? (
            <View style={styles.periodNavigatorContainer}>
              <View style={styles.periodNavigatorRow}>
                <Text style={styles.periodNavigatorLabel}>Mês</Text>
                <View style={styles.periodNavigator}>
                  <TouchableOpacity
                    style={styles.periodNavButton}
                    onPress={() => setInternalPeriod((prev) => prev.subtract(1, 'month'))}
                  >
                    <Text style={styles.periodNavButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.periodNavValue}>
                    {selectedPeriod.format('MMMM')}
                  </Text>
                  <TouchableOpacity
                    style={styles.periodNavButton}
                    onPress={() => setInternalPeriod((prev) => prev.add(1, 'month'))}
                  >
                    <Text style={styles.periodNavButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.periodNavigatorRow}>
                <Text style={styles.periodNavigatorLabel}>Ano</Text>
                <View style={styles.periodNavigator}>
                  <TouchableOpacity
                    style={styles.periodNavButton}
                    onPress={() => setInternalPeriod((prev) => prev.subtract(1, 'year'))}
                  >
                    <Text style={styles.periodNavButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.periodNavValue}>{selectedPeriod.format('YYYY')}</Text>
                  <TouchableOpacity
                    style={styles.periodNavButton}
                    onPress={() => setInternalPeriod((prev) => prev.add(1, 'year'))}
                  >
                    <Text style={styles.periodNavButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.periodNavigatorContainer}>
              <View style={[styles.periodNavigatorRow, { flex: 1 }]}>
                <Text style={styles.periodNavigatorLabel}>Ano</Text>
                <View style={styles.periodNavigator}>
                  <TouchableOpacity
                    style={styles.periodNavButton}
                    onPress={() => setInternalPeriod((prev) => prev.subtract(1, 'year'))}
                  >
                    <Text style={styles.periodNavButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.periodNavValue}>{selectedPeriod.format('YYYY')}</Text>
                  <TouchableOpacity
                    style={styles.periodNavButton}
                    onPress={() => setInternalPeriod((prev) => prev.add(1, 'year'))}
                  >
                    <Text style={styles.periodNavButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      )}
      {!chartData || chartData.data.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Nenhuma despesa para exibir neste período</Text>
        </View>
      ) : (
        <>
          <View style={styles.chartContainer}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <G>
                {arcs.map((arc, index) => {
                  // Se for 100%, usar Circle em vez de Path
                  if (arc.percentage >= 100) {
                    return (
                      <SvgCircle
                        key={arc.category}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill={arc.color}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    );
                  }
                  return (
                    <Path
                      key={arc.category}
                      d={arc.path}
                      fill={arc.color}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  );
                })}
                {arcs.map((arc) => {
                  if (arc.percentage < 8 && arc.percentage < 100) return null; // Não mostrar label se muito pequeno (exceto 100%)
                  // Para 100%, centralizar o label no meio do círculo
                  const labelX = arc.percentage >= 100 ? center : arc.labelX;
                  const labelY = arc.percentage >= 100 ? center + 4 : arc.labelY + 4;
                  return (
                    <SvgText
                      key={`label-${arc.category}`}
                      x={labelX}
                      y={labelY}
                      fontSize="11"
                      fontWeight="700"
                      fill="#FFFFFF"
                      textAnchor="middle"
                    >
                      {arc.percentage.toFixed(0)}%
                    </SvgText>
                  );
                })}
              </G>
            </Svg>
          </View>
          <View style={styles.legend}>
            {arcs.map((arc) => (
              <View key={arc.category} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: arc.color }]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel}>{CATEGORY_LABELS[arc.category]}</Text>
                  <Text style={styles.legendValue}>{formatCurrency(arc.value)}</Text>
                </View>
              </View>
            ))}
            {/* Total */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(chartData.total)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C6C70',
  },
  modeButtonTextActive: {
    color: '#0A84FF',
  },
  periodNavigatorContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  periodNavigatorRow: {
    flex: 1,
    gap: 8,
  },
  periodNavigatorLabel: {
    fontSize: 12,
    color: '#6C6C70',
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  periodNavButton: {
    padding: 5,
  },
  periodNavButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  periodNavValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6C6C70',
  },
  legend: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
});

