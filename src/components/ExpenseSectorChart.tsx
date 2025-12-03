import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Expense, ExpenseSector } from '../context/FinancialContext';

const SECTOR_LABELS: Record<ExpenseSector, string> = {
  now: 'Now',
  felipe_viatransportes: 'Felipe Viatransportes',
  terceirizados: 'Terceirizados',
  gestao: 'Gestão',
  ronaldo: 'Ronaldo',
  variavel: 'Variável',
  parcela_patrol_ronaldo: 'Parcela Patrol Ronaldo',
  particular: 'Particular',
  imposto: 'Impostos',
};

const SECTOR_COLORS: Record<ExpenseSector, string> = {
  now: '#0A84FF', // Azul
  felipe_viatransportes: '#34C759', // Verde
  terceirizados: '#FF9500', // Laranja
  gestao: '#AF52DE', // Roxo
  ronaldo: '#FF3B30', // Vermelho
  variavel: '#00C7BE', // Turquesa/Ciano
  parcela_patrol_ronaldo: '#FF2D55', // Rosa
  particular: '#FFD60A', // Amarelo
  imposto: '#8E8E93', // Cinza
};

interface ExpenseSectorChartProps {
  expenses: Expense[];
}

export const ExpenseSectorChart = ({ expenses }: ExpenseSectorChartProps) => {
  const chartData = useMemo(() => {
    // Filtra apenas despesas fixas com setor
    // Prioriza parcelas geradas (isFixed: false com installmentNumber)
    // Exclui o template (isFixed: true) quando há parcelas geradas para evitar duplicação
    const fixedExpensesWithSector = expenses.filter(
      exp => {
        if (!exp.sector) return false;
        
        // Se tem installmentNumber, é uma parcela gerada - sempre inclui
        if (exp.installmentNumber !== undefined && exp.installmentNumber !== null) {
          return true;
        }
        
        // Se é o template (isFixed: true), verifica se há parcelas geradas NO MESMO MÊS
        // Se houver, exclui o template para evitar duplicação
        if (exp.isFixed) {
          const templateMonth = exp.date.substring(0, 7); // YYYY-MM
          const hasGeneratedInstallmentsInSameMonth = expenses.some(
            other => 
              other.id !== exp.id && // Não é a mesma despesa
              other.name === exp.name &&
              other.center === exp.center &&
              other.date.substring(0, 7) === templateMonth && // Mesmo mês
              other.installmentNumber !== undefined &&
              other.installmentNumber !== null
          );
          // Só inclui o template se NÃO houver parcelas geradas no mesmo mês
          return !hasGeneratedInstallmentsInSameMonth;
        }
        
        return false;
      }
    );

    // Agrupa por setor
    const sectorMap = new Map<ExpenseSector, number>();
    
    fixedExpensesWithSector.forEach(exp => {
      if (exp.sector) {
        const current = sectorMap.get(exp.sector) || 0;
        // Valores negativos (abatimentos) são subtraídos do total
        sectorMap.set(exp.sector, current + exp.value);
      }
    });

    // Converte para array e ordena por valor (decrescente)
    const data = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        label: SECTOR_LABELS[sector] || sector,
        color: SECTOR_COLORS[sector] || '#999999', // Cor padrão cinza para setores sem cor
      }))
      .sort((a, b) => b.value - a.value);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Calcula porcentagens e ângulos
    let currentAngle = -90; // Começa no topo
    const dataWithAngles = data.map(item => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = total > 0 ? (item.value / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        angle,
      };
    });

    return { data: dataWithAngles, total };
  }, [expenses]);

  const chartSize = 200;
  const center = chartSize / 2;
  const radius = 80;
  const innerRadius = 0; // Pizza sólida, sem buraco (igual ao gráfico de categoria)

  const formatCurrency = (value: number): string => {
    if (value === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const toRadians = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
  };

  const getArcPath = (
    startAngle: number,
    angle: number,
    outerRadius: number
  ): string => {
    // Se o ângulo é 360 graus (círculo completo), renderiza como círculo
    if (Math.abs(angle - 360) < 0.01 || angle >= 360) {
      // Círculo completo - desenha dois semicírculos
      const startAngleRad = toRadians(startAngle);
      const midAngle = startAngle + 180;
      const midAngleRad = toRadians(midAngle);
      
      const x1 = center + outerRadius * Math.cos(startAngleRad);
      const y1 = center + outerRadius * Math.sin(startAngleRad);
      const x2 = center + outerRadius * Math.cos(midAngleRad);
      const y2 = center + outerRadius * Math.sin(midAngleRad);
      
      // Círculo completo usando dois arcos de 180 graus
      return `M ${center} ${center} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 1 1 ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 1 1 ${x1} ${y1} Z`;
    }
    
    // Converte para radianos
    const startAngleRad = toRadians(startAngle);
    const endAngle = startAngle + angle;
    const endAngleRad = toRadians(endAngle);

    // Calcular pontos do arco
    const x1 = center + outerRadius * Math.cos(startAngleRad);
    const y1 = center + outerRadius * Math.sin(startAngleRad);
    const x2 = center + outerRadius * Math.cos(endAngleRad);
    const y2 = center + outerRadius * Math.sin(endAngleRad);

    // Calcular o path do arco (pizza sólida - triângulo a partir do centro)
    const largeArcFlag = angle > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return path;
  };

  if (chartData.data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Despesas por Setor</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Nenhuma despesa fixa com setor cadastrada
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Despesas por Setor</Text>
      </View>
      <View style={styles.chartContainer}>
        <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
          <G>
            {chartData.data.map((item, index) => {
              // Se for 100%, usar Circle em vez de Path (mesmo estilo do gráfico de categoria)
              if (item.percentage >= 100) {
                return (
                  <Circle
                    key={item.sector}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill={item.color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                );
              }
              
              const path = getArcPath(item.startAngle, item.angle, radius);
              
              // Calcula posição do label (meio do arco) - mesmo estilo do gráfico de categoria
              const labelAngle = (item.startAngle + item.angle / 2) * (Math.PI / 180);
              const labelRadius = radius * 0.65;
              const labelX = center + labelRadius * Math.cos(labelAngle);
              const labelY = center + labelRadius * Math.sin(labelAngle);

              return (
                <G key={item.sector}>
                  <Path
                    d={path}
                    fill={item.color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  {item.percentage > 5 && (
                    <SvgText
                      x={labelX}
                      y={labelY}
                      fontSize="11"
                      fontWeight="600"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {item.percentage.toFixed(0)}%
                    </SvgText>
                  )}
                </G>
              );
            })}
          </G>
        </Svg>
      </View>
      <View style={styles.legend}>
        {chartData.data.map((item) => (
          <View key={item.sector} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <View style={styles.legendText}>
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>{formatCurrency(item.value)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
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
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6C6C70',
    textAlign: 'center',
  },
});

