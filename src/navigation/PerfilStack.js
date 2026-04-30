import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PerfilScreen          from '../screens/PerfilScreen';
import ServicosScreen        from '../screens/ServicosScreen';
import MeusDadosScreen       from '../screens/MeusDadosScreen';
import EnderecosScreen       from '../screens/EnderecosScreen';
import DespesasScreen        from '../screens/DespesasScreen';
import ConfiguracoesScreen   from '../screens/ConfiguracoesScreen';
import TemplatesSMSScreen    from '../screens/TemplatesSMSScreen';
import MetasScreen           from '../screens/MetasScreen';
import GamificacaoScreen     from '../screens/GamificacaoScreen';
import PresentearScreen      from '../screens/PresentearScreen';
import AjudaScreen           from '../screens/AjudaScreen';
import SaibaMaisScreen       from '../screens/SaibaMaisScreen';
import PoliticasScreen       from '../screens/PoliticasScreen';
import TutoriaisScreen       from '../screens/TutoriaisScreen';

const Stack = createNativeStackNavigator();

export default function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilHome"    component={PerfilScreen}        />
      <Stack.Screen name="Servicos"      component={ServicosScreen}      />
      <Stack.Screen name="MeusDados"     component={MeusDadosScreen}     />
      <Stack.Screen name="Enderecos"     component={EnderecosScreen}     />
      <Stack.Screen name="Despesas"      component={DespesasScreen}      />
      <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
      <Stack.Screen name="TemplatesSMS"  component={TemplatesSMSScreen}  />
      <Stack.Screen name="Metas"         component={MetasScreen}         />
      <Stack.Screen name="Gamificacao"   component={GamificacaoScreen}   />
      <Stack.Screen name="Presentear"    component={PresentearScreen}    />
      <Stack.Screen name="Ajuda"         component={AjudaScreen}         />
      <Stack.Screen name="SaibaMais"     component={SaibaMaisScreen}     />
      <Stack.Screen name="Politicas"     component={PoliticasScreen}     />
      <Stack.Screen name="Tutoriais"     component={TutoriaisScreen}     />
    </Stack.Navigator>
  );
}
