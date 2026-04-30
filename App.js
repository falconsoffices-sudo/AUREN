import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen  from './src/screens/WelcomeScreen';
import AuthScreen     from './src/screens/AuthScreen';
import LoginScreen    from './src/screens/LoginScreen';
import HomeScreen     from './src/screens/HomeScreen';
import AgendaScreen   from './src/screens/AgendaScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import CaixaScreen    from './src/screens/CaixaScreen';
import PerfilStack    from './src/navigation/PerfilStack';
import { supabase } from './src/lib/supabase';
import { registerForPushNotifications } from './src/lib/notifications';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    setupPushToken();
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('./assets/images/emblema.png')}
          style={styles.emblema}
        />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Auth"    component={AuthScreen}    />
            <Stack.Screen name="Login"   component={LoginScreen}   />
            <Stack.Screen name="Main"    component={MainTabs}      />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
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
