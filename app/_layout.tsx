import { Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
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
import { ReviewNotificationsWrapper} from "@/src/components/ReviewNotificationsWrapper";

// Componente que envolve as telas autenticadas com todos os providers
function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
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
  );
}

// Componente que decide se deve carregar os providers autenticados
function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const segments = useSegments();

  // Telas que não precisam dos providers de dados (autenticação/recuperação)
  const isPublicRoute =
    segments[0] === 'login' ||
    segments[0] === 'signup' ||
    segments[0] === 'reset-password';

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <PermissionsProvider>
        <ProtectedRoute>
          <ConditionalProviders>
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
          </ConditionalProviders>
        </ProtectedRoute>
      </PermissionsProvider>
    </AuthProvider>
  );
}