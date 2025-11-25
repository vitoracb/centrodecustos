import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { useEffect } from "react";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { CostCenterProvider } from "@/src/context/CostCenterContext";
import { EquipmentProvider } from "@/src/context/EquipmentContext";
import { EmployeeProvider } from "@/src/context/EmployeeContext";
import { OrdersProvider } from "@/src/context/OrderContext";
import { FinancialProvider } from "@/src/context/FinancialContext";
import { ContractProvider } from "@/src/context/ContractContext";
import { toastConfig } from "@/src/components/ToastConfig";
import { requestNotificationPermissions } from "@/src/lib/notifications";
import { ReviewNotificationsWrapper } from "@/src/components/ReviewNotificationsWrapper";

export default function RootLayout() {
  useFrameworkReady();

  // Solicita permissões de notificação ao iniciar o app
  useEffect(() => {
    requestNotificationPermissions().catch((error) => {
      console.warn('Erro ao solicitar permissões de notificação:', error);
    });
  }, []);

  return (
    <CostCenterProvider>
      <EquipmentProvider>
        <EmployeeProvider>
          <OrdersProvider>
            <FinancialProvider>
              <ContractProvider>
                <ReviewNotificationsWrapper>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="auto" />
                  <Toast config={toastConfig} />
                </ReviewNotificationsWrapper>
              </ContractProvider>
            </FinancialProvider>
          </OrdersProvider>
        </EmployeeProvider>
      </EquipmentProvider>
    </CostCenterProvider>
  );
}