import React, { useState, useEffect, useRef } from 'react';
import { Image, StyleSheet, Animated } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen             from './src/screens/WelcomeScreen';
import AuthScreen                from './src/screens/AuthScreen';
import AuthClienteScreen         from './src/screens/AuthClienteScreen';
import LoginScreen               from './src/screens/LoginScreen';
import ClientePlaceholderScreen  from './src/screens/ClientePlaceholderScreen';
import HomeScreen       from './src/screens/HomeScreen';
import AgendaScreen     from './src/screens/AgendaScreen';
import ClientesScreen   from './src/screens/ClientesScreen';
import CaixaScreen      from './src/screens/CaixaScreen';
import PerfilStack      from './src/navigation/PerfilStack';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SaibaMaisScreen  from './src/screens/SaibaMaisScreen';
import PoliticasScreen  from './src/screens/PoliticasScreen';
import IndicacaoScreen  from './src/screens/IndicacaoScreen';
import { supabase } from './src/lib/supabase';
import { registerForPushNotifications } from './src/lib/notifications';
import { agendarNotificacaoRelatorio } from './src/lib/relatorio';
import { verificarEnvioRelatorio } from './src/lib/emailRelatorio';
import { enviarSMSRota } from './src/lib/sms';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0E0F11',
    card: '#1A1B1E',
    border: 'transparent',
  },
};

function MainTabs() {
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1A1B1E' : '#FFFFFF',
          borderTopColor: isDark ? 'transparent' : '#E6D8CF',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: '#B09AA8',
      }}
    >
      <Tab.Screen name="Início"   component={HomeScreen}     />
      <Tab.Screen name="Agenda"   component={AgendaScreen}   />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Caixa"    component={CaixaScreen}    />
      <Tab.Screen name="Perfil"   component={PerfilStack}    />
    </Tab.Navigator>
  );
}

async function setupPushToken() {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
  } catch (_) {}
}

function AppContent() {
  const { isDark } = useTheme();
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={isDark ? customDarkTheme : undefined}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome"           component={WelcomeScreen}            />
          <Stack.Screen name="Auth"             component={AuthScreen}               />
          <Stack.Screen name="AuthCliente"      component={AuthClienteScreen}        />
          <Stack.Screen name="Login"            component={LoginScreen}              />
          <Stack.Screen name="ClientePlaceholder" component={ClientePlaceholderScreen} />
          <Stack.Screen name="Onboarding"       component={OnboardingScreen}         />
          <Stack.Screen name="SaibaMais"  component={SaibaMaisScreen}  />
          <Stack.Screen name="Politicas"  component={PoliticasScreen}  />
          <Stack.Screen name="Indicacao"  component={IndicacaoScreen}  />
          <Stack.Screen name="Main"       component={MainTabs}         />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 3000);

    setupPushToken();
    agendarNotificacaoRelatorio();
    verificarEnvioRelatorio();

    // Quando notificação de rota chega em foreground, dispara SMS
    const sub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.type === 'sms_rota' && data?.telefone) {
        enviarSMSRota(
          data.telefone,
          data.profissionalNome ?? '',
          data.horario ?? '',
          data.endereco ?? '',
          data.isDomicilio ?? false,
        ).catch(() => {});
      }
    });

    return () => {
      clearTimeout(fadeTimer);
      sub.remove();
    };
  }, []);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splash, { opacity: fadeAnim }]}>
        <Image
          source={require('./assets/images/emblema.png')}
          style={styles.emblema}
        />
      </Animated.View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1A0A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblema: {
    width: 360,
    height: 360,
    resizeMode: 'contain',
  },
});
