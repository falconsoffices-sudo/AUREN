import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PerfilScreen     from '../screens/PerfilScreen';
import ServicosScreen   from '../screens/ServicosScreen';
import MeusDadosScreen  from '../screens/MeusDadosScreen';
import EnderecosScreen  from '../screens/EnderecosScreen';
import DespesasScreen   from '../screens/DespesasScreen';

const Stack = createNativeStackNavigator();

export default function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilHome"  component={PerfilScreen}    />
      <Stack.Screen name="Servicos"    component={ServicosScreen}  />
      <Stack.Screen name="MeusDados"   component={MeusDadosScreen} />
      <Stack.Screen name="Enderecos"   component={EnderecosScreen} />
      <Stack.Screen name="Despesas"    component={DespesasScreen}  />
    </Stack.Navigator>
  );
}
