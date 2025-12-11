import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, LogBox } from "react-native";

// Ignora erros específicos de Auth que são tratados silenciosamente
LogBox.ignoreLogs([
  'AuthApiError: Invalid Refresh Token: Refresh Token Not Found',
]);
import Toast from "react-native-toast-message";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { AuthProvider } from "@/src/context/AuthContext";
import { PermissionsProvider } from "@/src/context/PermissionsContext";
import { ProtectedRoute } from "@/src/components/ProtectedRoute";
import { CostCenterProvider } from "@/src/context/CostCenterContext";
import { EquipmentProvider } from "@/src/context/EquipmentContext";
import { EmployeeProvider } from "@/src/context/EmployeeContext";
import { OrdersProvider } from "@/src/context/OrderContext";
import { FinancialProvider } from "@/src/context/FinancialContext";
import { ContractProvider } from "@/src/context/ContractContext";
import { toastConfig } from "@/src/components/ToastConfig";
import { ReviewNotificationsWrapper } from "@/src/components/ReviewNotificationsWrapper";
import { OfflineBanner } from "@/src/components/OfflineBanner";
import { queryClient } from "@/src/lib/queryClient";
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.locale('pt-br');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Componente que envolve as telas autenticadas com todos os providers
function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CostCenterProvider>
        <EquipmentProvider>
          <EmployeeProvider>
            <OrdersProvider>
              <FinancialProvider>
                <ContractProvider>
                  <ReviewNotificationsWrapper>
                    {children}
                  </ReviewNotificationsWrapper>
                </ContractProvider>
              </FinancialProvider>
            </OrdersProvider>
          </EmployeeProvider>
        </EquipmentProvider>
      </CostCenterProvider>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <PermissionsProvider>
        <ProtectedRoute>
          <AuthenticatedProviders>
            <View style={{ flex: 1 }}>
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="signup" options={{ headerShown: false }} />
                <Stack.Screen name="change-password" options={{ headerShown: false }} />
                <Stack.Screen name="user-management" options={{ headerShown: false }} />
                {/* Tela aberta via deep link de recuperação de senha */}
                <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
              <Toast config={toastConfig} />
            </View>
          </AuthenticatedProviders>
        </ProtectedRoute>
      </PermissionsProvider>
    </AuthProvider>
  );
}