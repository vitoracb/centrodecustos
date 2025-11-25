import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { CostCenterProvider } from "@/src/context/CostCenterContext";
import { EquipmentProvider } from "@/src/context/EquipmentContext";
import { EmployeeProvider } from "@/src/context/EmployeeContext";
import { OrdersProvider } from "@/src/context/OrderContext";
import { FinancialProvider } from "@/src/context/FinancialContext";
import { ContractProvider } from "@/src/context/ContractContext";

export default function RootLayout() {
  useFrameworkReady();

  return (
    <CostCenterProvider>
      <EquipmentProvider>
        <EmployeeProvider>
          <OrdersProvider>
            <FinancialProvider>
              <ContractProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </ContractProvider>
            </FinancialProvider>
          </OrdersProvider>
        </EmployeeProvider>
      </EquipmentProvider>
    </CostCenterProvider>
  );
}