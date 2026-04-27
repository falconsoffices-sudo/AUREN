import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PerfilScreen   from '../screens/PerfilScreen';
import ServicosScreen from '../screens/ServicosScreen';

const Stack = createNativeStackNavigator();

export default function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilHome"  component={PerfilScreen}   />
      <Stack.Screen name="Servicos"    component={ServicosScreen} />
    </Stack.Navigator>
  );
}
