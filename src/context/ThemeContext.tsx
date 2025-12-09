import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TIPOS
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  card: string;
  modal: string;
  
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverted: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Components
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  success: string;
  successLight: string;
  
  warning: string;
  warningLight: string;
  
  error: string;
  errorLight: string;
  
  info: string;
  infoLight: string;
  
  // Shadows
  shadow: string;
  
  // Status
  active: string;
  inactive: string;
  
  // Tabs
  tabActive: string;
  tabInactive: string;
  tabBackground: string;
}

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

// ============================================
// CORES DOS TEMAS
// ============================================

const lightColors: ThemeColors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F7',
  backgroundTertiary: '#E5E5EA',
  card: '#FFFFFF',
  modal: '#FFFFFF',
  
  // Text
  text: '#1C1C1E',
  textSecondary: '#6C6C70',
  textTertiary: '#AEAEB2',
  textInverted: '#FFFFFF',
  
  // Borders
  border: '#E5E5EA',
  borderLight: '#F0F0F5',
  
  // Components
  primary: '#0A84FF',
  primaryLight: '#E3F2FF',
  primaryDark: '#0066CC',
  
  success: '#34C759',
  successLight: '#E5F8EA',
  
  warning: '#FF9500',
  warningLight: '#FFF3E0',
  
  error: '#FF3B30',
  errorLight: '#FFE5E5',
  
  info: '#5E5CE6',
  infoLight: '#EFEFFB',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Status
  active: '#34C759',
  inactive: '#8E8E93',
  
  // Tabs
  tabActive: '#0A84FF',
  tabInactive: '#8E8E93',
  tabBackground: '#F5F5F7',
};

const darkColors: ThemeColors = {
  // Backgrounds
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  card: '#1C1C1E',
  modal: '#1C1C1E',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#6C6C70',
  textInverted: '#000000',
  
  // Borders
  border: '#38383A',
  borderLight: '#2C2C2E',
  
  // Components
  primary: '#0A84FF',
  primaryLight: '#1A3A52',
  primaryDark: '#409CFF',
  
  success: '#32D74B',
  successLight: '#1A3525',
  
  warning: '#FF9F0A',
  warningLight: '#3D2A0F',
  
  error: '#FF453A',
  errorLight: '#3D1A1A',
  
  info: '#5E5CE6',
  infoLight: '#2A2A3D',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.5)',
  
  // Status
  active: '#32D74B',
  inactive: '#6C6C70',
  
  // Tabs
  tabActive: '#0A84FF',
  tabInactive: '#6C6C70',
  tabBackground: '#1C1C1E',
};

// ============================================
// CONTEXT
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@nowtrading_theme';

// ============================================
// PROVIDER
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Determinar se deve usar dark mode
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  // Cores atuais baseadas no modo
  const colors = isDark ? darkColors : lightColors;

  // Carregar tema salvo ao iniciar
  useEffect(() => {
    loadTheme();
  }, []);

  // Observar mudanças no tema do sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('🎨 [Theme] Sistema mudou para:', colorScheme);
      setSystemTheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // Carregar tema do AsyncStorage
  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        console.log('🎨 [Theme] Tema carregado:', savedTheme);
        setThemeState(savedTheme as ThemeMode);
      } else {
        console.log('🎨 [Theme] Usando padrão: system');
      }
    } catch (error) {
      console.error('❌ [Theme] Erro ao carregar tema:', error);
    }
  };

  // Salvar e aplicar tema
  const setTheme = async (newTheme: ThemeMode) => {
    try {
      console.log('🎨 [Theme] Mudando para:', newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
      console.log('✅ [Theme] Tema salvo e aplicado');
    } catch (error) {
      console.error('❌ [Theme] Erro ao salvar tema:', error);
    }
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    colors,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default ThemeContext;
