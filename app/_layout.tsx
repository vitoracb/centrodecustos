import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { CostCenterProvider } from '@/src/context/CostCenterContext';
import { EquipmentProvider } from '@/src/context/EquipmentContext';
import { ContractProvider } from '@/src/context/ContractContext';
import { FinancialProvider } from '@/src/context/FinancialContext';
import { OrderProvider } from '@/src/context/OrderContext';
import { EmployeeProvider } from '@/src/context/EmployeeContext';

export default function RootLayout() {
  useFrameworkReady();

      return (
        <CostCenterProvider>
          <EquipmentProvider>
            <ContractProvider>
              <FinancialProvider>
                <OrderProvider>
                  <EmployeeProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style="auto" />
                  </EmployeeProvider>
                </OrderProvider>
              </FinancialProvider>
            </ContractProvider>
          </EquipmentProvider>
        </CostCenterProvider>
      );
}
