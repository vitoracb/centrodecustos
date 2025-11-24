import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CostCenter } from './CostCenterContext';

export type OrderStatus = 'orçamento_pendente' | 'orçamento_enviado' | 'aprovado' | 'rejeitado';

export interface OrderBudget {
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
}

export interface Order {
  id: string;
  name: string;
  description: string;
  date: string;
  status: OrderStatus;
  center: CostCenter;
  equipmentId?: string;
  budget?: OrderBudget;
  createdAt?: number; // Timestamp quando foi criado
  updatedAt?: number; // Timestamp quando foi atualizado
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id'>) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (id: string) => void;
  getOrdersByCenter: (center: CostCenter) => Order[];
  getUnreadNotificationsCount: () => number;
  getRecentOrders: (limit?: number) => Order[];
  markOrderAsRead: (orderId: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

const initialOrders: Order[] = [
  {
    id: 'ord-1',
    name: 'Compra de equipamentos de irrigação',
    description: 'Sistema de irrigação automático',
    date: '04/11/2024',
    status: 'orçamento_pendente',
    center: 'valenca',
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 horas atrás
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 'ord-2',
    name: 'Aquisição de EPI',
    description: 'Lotes de EPIs para safra',
    date: '28/10/2024',
    status: 'orçamento_enviado',
    center: 'valenca',
    createdAt: Date.now() - 5 * 60 * 60 * 1000, // 5 horas atrás
    updatedAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hora atrás (orçamento enviado)
  },
  {
    id: 'ord-3',
    name: 'Manutenção de maquinário',
    description: 'Revisão geral dos equipamentos',
    date: '15/11/2024',
    status: 'orçamento_pendente',
    center: 'cna',
    createdAt: Date.now() - 24 * 60 * 60 * 1000, // 1 dia atrás
    updatedAt: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: 'ord-4',
    name: 'Compra de sementes',
    description: 'Sementes para plantio da safra',
    date: '10/11/2024',
    status: 'aprovado',
    center: 'cabralia',
    createdAt: Date.now() - 48 * 60 * 60 * 1000, // 2 dias atrás
    updatedAt: Date.now() - 48 * 60 * 60 * 1000,
  },
];

export const OrderProvider = ({ children }: OrderProviderProps) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());

  const addOrder = useCallback((order: Omit<Order, 'id'>) => {
    const now = Date.now();
    const newOrder: Order = {
      ...order,
      id: `ord-${now}`,
      createdAt: now,
      updatedAt: now,
    };
    setOrders((prev) => [newOrder, ...prev]);
  }, []);

  const updateOrder = useCallback((updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === updatedOrder.id) {
          return {
            ...updatedOrder,
            updatedAt: Date.now(),
          };
        }
        return order;
      })
    );
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== id));
  }, []);

  const getOrdersByCenter = useCallback(
    (center: CostCenter) => orders.filter((order) => order.center === center),
    [orders]
  );

  const getUnreadNotificationsCount = useCallback(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000; // 24 horas atrás
    
    return orders.filter((order) => {
      // Ignora pedidos já lidos
      if (readOrderIds.has(order.id)) {
        return false;
      }
      
      // Pedido novo (criado nas últimas 24h)
      const isNew = order.createdAt && order.createdAt > oneDayAgo;
      // Orçamento enviado recentemente (atualizado nas últimas 24h, status é orçamento_enviado e tem budget)
      // Verifica se foi atualizado recentemente (não apenas criado)
      const isRecentBudget = 
        order.status === 'orçamento_enviado' && 
        order.updatedAt && 
        order.updatedAt > oneDayAgo &&
        order.updatedAt !== order.createdAt && // Garante que foi atualizado, não apenas criado
        order.budget;
      
      return isNew || isRecentBudget;
    }).length;
  }, [orders, readOrderIds]);

  const getRecentOrders = useCallback((limit: number = 5) => {
    return [...orders]
      .sort((a, b) => {
        // Ordena por updatedAt ou createdAt (mais recente primeiro)
        const timeA = a.updatedAt || a.createdAt || 0;
        const timeB = b.updatedAt || b.createdAt || 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }, [orders]);

  const markOrderAsRead = useCallback((orderId: string) => {
    setReadOrderIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(orderId);
      return newSet;
    });
  }, []);

  return (
    <OrderContext.Provider
      value={{ 
        orders, 
        addOrder, 
        updateOrder, 
        deleteOrder, 
        getOrdersByCenter,
        getUnreadNotificationsCount,
        getRecentOrders,
        markOrderAsRead,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

