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
import RelatorioScreen       from '../screens/RelatorioScreen';
import IndicacaoScreen       from '../screens/IndicacaoScreen';
import IntelClientelaScreen  from '../screens/IntelClientelaScreen';
import ConexoesScreen        from '../screens/ConexoesScreen';
import EquipeScreen          from '../screens/EquipeScreen';
import CommunityScreen       from '../screens/CommunityScreen';
import PagamentosScreen      from '../screens/PagamentosScreen';
import LicencaScreen         from '../screens/LicencaScreen';
import PlaidScreen           from '../screens/PlaidScreen';
import PlansScreen           from '../screens/PlansScreen';

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
      <Stack.Screen name="Relatorio"     component={RelatorioScreen}     />
      <Stack.Screen name="Indicacao"      component={IndicacaoScreen}      />
      <Stack.Screen name="IntelClientela" component={IntelClientelaScreen} />
      <Stack.Screen name="Conexoes"       component={ConexoesScreen}       />
      <Stack.Screen name="Equipe"         component={EquipeScreen}         />
      <Stack.Screen name="Community"      component={CommunityScreen}      />
      <Stack.Screen name="Pagamentos"     component={PagamentosScreen}     />
      <Stack.Screen name="Licenca"        component={LicencaScreen}        />
      <Stack.Screen name="Plaid"          component={PlaidScreen}          />
      <Stack.Screen name="Plans"          component={PlansScreen}          />
    </Stack.Navigator>
  );
}
