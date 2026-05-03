import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Pref keys ────────────────────────────────────────────────────────────────

const PREF_KEYS = {
  push:      'auren:pref_push',
  analytics: 'auren:pref_analytics',
  marketing: 'auren:pref_marketing',
};

// ─── Doc building blocks ──────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <View style={doc.section}>
      <Text style={doc.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }) {
  return <Text style={doc.p}>{children}</Text>;
}

function Bullets({ items }) {
  return (
    <View style={doc.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={doc.bulletRow}>
          <Text style={doc.dot}>•</Text>
          <Text style={doc.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Termos de Uso ────────────────────────────────────────────────────────────

function TermosContent() {
  return (
    <View>
      <Text style={doc.updated}>Última atualização: 30 de abril de 2026</Text>

      <Section title="1. Descrição do Serviço">
        <P>
          O AUREN é um aplicativo de gestão profissional desenvolvido para profissionais
          licenciados da área de beleza e estética nos Estados Unidos. A plataforma oferece
          ferramentas de agendamento, gestão de clientes, controle financeiro e comunicação.
        </P>
        <P>
          O AUREN é operado por AUREN LLC, empresa registrada no Estado da Flórida, EUA
          ("AUREN", "nós", "nosso").
        </P>
      </Section>

      <Section title="2. Elegibilidade">
        <P>Para utilizar o AUREN, você deve:</P>
        <Bullets items={[
          'Ser profissional licenciado nos EUA nas áreas de nail care, cosmetologia, estética ou correlatas;',
          'Possuir licença profissional válida e não expirada emitida por um estado norte-americano;',
          'Ter 18 anos ou mais;',
          'Concordar integralmente com estes Termos de Uso.',
        ]} />
        <P>
          O AUREN reserva-se o direito de solicitar comprovação de licença e suspender contas
          que não atendam aos requisitos de elegibilidade.
        </P>
      </Section>

      <Section title="3. Responsabilidades do Usuário">
        <P>Ao usar o AUREN, você concorda em:</P>
        <Bullets items={[
          'Fornecer informações verdadeiras, precisas e atualizadas;',
          'Manter a confidencialidade de suas credenciais de acesso;',
          'Usar o aplicativo exclusivamente para fins profissionais legítimos;',
          'Não armazenar dados de clientes sem o consentimento adequado deles;',
          'Cumprir todas as leis aplicáveis, incluindo leis de proteção de dados;',
          'Não tentar acessar sistemas ou dados além do expressamente autorizado.',
        ]} />
      </Section>

      <Section title="4. Licença de Uso do Aplicativo">
        <P>
          O AUREN concede a você uma licença pessoal, intransferível, não exclusiva e revogável
          para usar o aplicativo exclusivamente conforme previsto nestes Termos.
        </P>
        <P>Você não tem permissão para:</P>
        <Bullets items={[
          'Copiar, modificar, distribuir ou criar obras derivadas do aplicativo;',
          'Realizar engenharia reversa ou extração do código-fonte;',
          'Vender, sublicenciar ou transferir o acesso a terceiros;',
          'Usar para fins comerciais além do uso pessoal profissional autorizado.',
        ]} />
      </Section>

      <Section title="5. Pagamentos e Assinaturas">
        <P>
          O AUREN é oferecido sob modelo de assinatura mensal ou anual. Preços exibidos no
          aplicativo em dólares americanos (USD) e podem ser alterados com aviso prévio de 30 dias.
        </P>
        <Bullets items={[
          'Pagamentos processados com segurança pela Stripe, Inc.;',
          'Assinaturas são renovadas automaticamente, salvo cancelamento prévio;',
          'Não realizamos reembolsos por períodos parciais já utilizados, exceto quando exigido por lei;',
          'Falha no pagamento pode resultar na suspensão temporária do acesso.',
        ]} />
      </Section>

      <Section title="6. Cancelamento">
        <P>
          Você pode cancelar sua assinatura a qualquer momento pelo aplicativo ou pelo e-mail
          suporte@auren.app. O cancelamento tem efeito ao término do período vigente, sem
          cobranças adicionais.
        </P>
        <P>
          O AUREN pode encerrar sua conta imediatamente em caso de violação grave destes Termos,
          uso fraudulento ou atividade ilegal.
        </P>
      </Section>

      <Section title="7. Limitação de Responsabilidade">
        <P>
          Na máxima extensão permitida por lei, o AUREN não se responsabiliza por danos
          indiretos, incidentais, especiais, consequentes ou punitivos, incluindo perda de
          lucros, perda de dados ou interrupção de negócios.
        </P>
        <P>
          A responsabilidade total do AUREN por qualquer reclamação não excederá o valor pago
          pelo usuário nos 12 meses anteriores à reclamação.
        </P>
        <P>
          O AUREN não garante disponibilidade ininterrupta ou ausência de erros no serviço.
        </P>
      </Section>

      <Section title="8. Lei Aplicável e Foro">
        <P>
          Estes Termos são regidos pelas leis do Estado da Flórida, Estados Unidos da América.
          Disputas serão submetidas à jurisdição dos tribunais competentes do condado de
          Miami-Dade, Flórida.
        </P>
        <P>
          Usuários em jurisdições onde esta cláusula não é aplicável terão suas leis locais
          obrigatórias respeitadas.
        </P>
      </Section>

      <Section title="9. Alterações e Contato">
        <P>
          Reservamo-nos o direito de modificar estes Termos com aviso prévio de 15 dias. O uso
          continuado após as alterações constitui aceitação dos novos termos.
        </P>
        <P>Contato: termos@auren.app</P>
      </Section>
    </View>
  );
}

// ─── Política de Privacidade ─────────────────────────────────────────────────

function PrivacidadeContent() {
  return (
    <View>
      <Text style={doc.updated}>Última atualização: 30 de abril de 2026</Text>

      <Section title="1. Dados Coletados">
        <P>Coletamos as seguintes categorias de dados pessoais para operar o AUREN:</P>
        <Bullets items={[
          'Identificação: nome completo, endereço de e-mail, número de telefone;',
          'Profissionais: número, tipo, estado e data de validade da licença;',
          'Localização: estado e cidade de atuação profissional;',
          'Financeiros: histórico de faturamento, valores de serviços e dados de pagamento (processados via Stripe);',
          'Clientes: nome, telefone e agendamentos cadastrados por você na plataforma;',
          'Uso: logs de acesso, funcionalidades utilizadas e preferências do aplicativo.',
        ]} />
      </Section>

      <Section title="2. Como Usamos os Dados">
        <P>Utilizamos seus dados para:</P>
        <Bullets items={[
          'Fornecer e manter os serviços do AUREN;',
          'Autenticar sua identidade e verificar elegibilidade profissional;',
          'Processar pagamentos e gerenciar assinaturas;',
          'Enviar notificações de agendamentos, lembretes e atualizações do sistema;',
          'Melhorar o aplicativo por meio de análise agregada e anonimizada;',
          'Cumprir obrigações legais e regulatórias;',
          'Oferecer suporte ao usuário.',
        ]} />
      </Section>

      <Section title="3. Compartilhamento com Terceiros">
        <P>
          Não vendemos seus dados pessoais. Compartilhamos somente com prestadores essenciais
          ao funcionamento da plataforma:
        </P>
        <Bullets items={[
          'Supabase (supabase.com) — banco de dados e autenticação. Dados armazenados em servidores seguros nos EUA com criptografia em repouso;',
          'Stripe, Inc. — processamento de pagamentos. Dados de cartão não são armazenados pelo AUREN; apenas tokens seguros são mantidos;',
          'Twilio, Inc. — envio de SMS de confirmação de agendamentos. Apenas nome, telefone e horário são compartilhados para esta finalidade.',
        ]} />
        <P>
          Todos os parceiros estão sujeitos a acordos de processamento de dados compatíveis
          com as legislações aplicáveis.
        </P>
      </Section>

      <Section title="4. Retenção de Dados">
        <P>
          Mantemos seus dados pelo período em que sua conta estiver ativa, acrescido de até
          3 anos após o encerramento para fins legais, contábeis e de auditoria.
        </P>
        <P>
          Dados de clientes cadastrados por você são excluídos 90 dias após o encerramento
          da sua conta, salvo obrigação legal em contrário.
        </P>
      </Section>

      <Section title="5. Direitos do Usuário">
        <P>Residentes da Califórnia (CCPA):</P>
        <Bullets items={[
          'Direito de saber quais dados pessoais são coletados e como são usados;',
          'Direito de solicitar a exclusão de seus dados pessoais;',
          'Direito de não ser discriminado por exercer direitos de privacidade.',
        ]} />
        <P>Brasileiros no exterior (LGPD):</P>
        <Bullets items={[
          'Direito de acesso, correção e exclusão de dados pessoais;',
          'Direito de revogar consentimento a qualquer momento;',
          'Direito de portabilidade dos seus dados;',
          'Direito de ser informado sobre compartilhamento de dados.',
        ]} />
        <P>
          Para exercer qualquer desses direitos, entre em contato: privacidade@auren.app
        </P>
      </Section>

      <Section title="6. Segurança dos Dados">
        <P>Medidas técnicas e organizacionais implementadas:</P>
        <Bullets items={[
          'Criptografia de dados em trânsito (TLS 1.3) e em repouso (AES-256);',
          'Autenticação via OTP — nenhuma senha armazenada em nossos servidores;',
          'Row Level Security (RLS) garantindo que cada usuário acessa apenas seus próprios dados;',
          'Monitoramento contínuo de acessos e atividades suspeitas;',
          'Plano de resposta a incidentes com notificação em até 72 horas.',
        ]} />
      </Section>

      <Section title="7. Contato">
        <P>{'privacidade@auren.app\nAUREN LLC — Miami, FL, USA'}</P>
      </Section>
    </View>
  );
}

// ─── Política de Cancelamento ────────────────────────────────────────────────

function CancelamentoContent() {
  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={doc.sectionTitle}>Política de Cancelamento e Remarcação</Text>
      <Text style={doc.updated}>Em vigor desde 1º de maio de 2026</Text>

      <Section title="Cancelamento gratuito">
        <P>
          Cancelamentos realizados com <Text style={{ fontWeight: '700', color: '#F5EDE8' }}>4 horas ou mais</Text> de
          antecedência em relação ao horário agendado são sempre gratuitos, sem qualquer cobrança.
        </P>
      </Section>

      <Section title="Cancelamento tardio">
        <P>
          Cancelamentos realizados com <Text style={{ fontWeight: '700', color: '#F5EDE8' }}>menos de 4 horas</Text> de
          antecedência estão sujeitos a uma taxa de <Text style={{ fontWeight: '700', color: '#F5EDE8' }}>20%</Text> do
          valor do serviço agendado.
        </P>
        <Bullets items={[
          'Na primeira ocorrência, a taxa é dispensada automaticamente como cortesia — você será notificada no momento do cancelamento.',
          'A partir do segundo cancelamento tardio, a taxa de 20% é cobrada automaticamente e de forma irrevogável.',
          'A taxa é calculada sobre o valor confirmado no agendamento no momento do cancelamento.',
        ]} />
      </Section>

      <Section title="Remarcação">
        <P>
          Remarcações realizadas com <Text style={{ fontWeight: '700', color: '#F5EDE8' }}>4 horas ou mais</Text> de
          antecedência são gratuitas e podem ser feitas diretamente pelo aplicativo.
        </P>
        <P>
          Remarcações com menos de 4 horas de antecedência seguem a mesma regra do cancelamento tardio e
          estão sujeitas à mesma taxa de 20%.
        </P>
      </Section>

      <Section title="Distribuição da taxa">
        <Bullets items={[
          '70% do valor da taxa é destinado ao profissional para compensar o horário perdido.',
          '30% é destinado à operação e manutenção da plataforma AUREN.',
        ]} />
      </Section>

      <Section title="Disposições gerais">
        <P>
          A AUREN reserva-se o direito de alterar esta política com aviso prévio de 15 dias pelo
          aplicativo. O uso continuado após as alterações constitui aceitação das novas condições.
        </P>
        <P>Dúvidas: suporte@auren.app</P>
      </Section>
    </View>
  );
}

// ─── Suas Escolhas ────────────────────────────────────────────────────────────

const ESCOLHAS = [
  {
    key:   'push',
    title: 'Notificações push',
    desc:  'Lembretes de agendamentos, alertas importantes e atualizações do aplicativo. Recomendado para não perder nenhum compromisso.',
  },
  {
    key:   'analytics',
    title: 'Dados analíticos anônimos',
    desc:  'Ajude a melhorar o AUREN compartilhando dados de uso anonimizados. Nenhuma informação pessoal identificável é incluída.',
  },
  {
    key:   'marketing',
    title: 'Comunicações de marketing',
    desc:  'Receba dicas, novidades de produto e ofertas exclusivas sobre o AUREN por e-mail.',
  },
];

function EscolhasContent({ prefs, onToggle }) {
  return (
    <View>
      <Text style={doc.choicesIntro}>
        Gerencie como o AUREN usa seus dados. Suas escolhas são salvas automaticamente.
      </Text>

      {ESCOLHAS.map(item => (
        <View key={item.key} style={doc.choiceCard}>
          <View style={doc.choiceTop}>
            <Text style={doc.choiceTitle}>{item.title}</Text>
            <Switch
              value={prefs[item.key]}
              onValueChange={val => onToggle(item.key, val)}
              trackColor={{ false: '#2A2A2A', true: '#A8235A' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#2A2A2A"
            />
          </View>
          <Text style={doc.choiceDesc}>{item.desc}</Text>
        </View>
      ))}

      <View style={doc.choiceFooter}>
        <Text style={doc.choiceFooterText}>
          Para solicitações de exclusão de dados ou exercício de outros direitos de privacidade,
          entre em contato: privacidade@auren.app
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'termos',      label: 'Termos' },
  { key: 'privacidade', label: 'Privacidade' },
  { key: 'escolhas',    label: 'Escolhas' },
];

export default function PoliticasScreen({ navigation }) {
  const [tab, setTab] = useState('termos');
  const [prefs, setPrefs] = useState({ push: true, analytics: false, marketing: false });

  useEffect(() => {
    (async () => {
      const [push, analytics, marketing] = await Promise.all([
        AsyncStorage.getItem(PREF_KEYS.push),
        AsyncStorage.getItem(PREF_KEYS.analytics),
        AsyncStorage.getItem(PREF_KEYS.marketing),
      ]);
      setPrefs({
        push:      push      !== 'false',
        analytics: analytics === 'true',
        marketing: marketing === 'true',
      });
    })();
  }, []);

  const handleToggle = async (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }));
    await AsyncStorage.setItem(PREF_KEYS[key], String(value));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos & Privacidade</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={styles.tabBtn}
            onPress={() => setTab(t.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
            {tab === t.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        key={tab}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'termos'      && <TermosContent />}
        {tab === 'privacidade' && <PrivacidadeContent />}
        {tab === 'escolhas'    && (
          <>
            <CancelamentoContent />
            <EscolhasContent prefs={prefs} onToggle={handleToggle} />
          </>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E0F11' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, marginBottom: 4,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 32 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: 13, position: 'relative',
  },
  tabText:       { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },
  tabTextActive: { color: '#A8235A' },
  tabUnderline:  {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, borderRadius: 1, backgroundColor: '#A8235A',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },
});

const doc = StyleSheet.create({
  section:      { marginBottom: 28 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#A8235A',
    marginBottom: 10, letterSpacing: 0.3,
  },
  updated: {
    fontSize: 11, fontWeight: '400', color: '#8A8A8E',
    marginBottom: 24, textAlign: 'right',
  },
  p:          { fontSize: 14, fontWeight: '400', color: '#C8C8CE', lineHeight: 22, marginBottom: 10 },
  bulletList: { marginBottom: 10 },
  bulletRow:  { flexDirection: 'row', marginBottom: 6 },
  dot:        { fontSize: 14, color: '#A8235A', marginRight: 8, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 14, fontWeight: '400', color: '#C8C8CE', lineHeight: 22 },

  choicesIntro: {
    fontSize: 14, fontWeight: '400', color: '#8A8A8E',
    lineHeight: 21, marginBottom: 20,
  },
  choiceCard: {
    backgroundColor: '#1A1B1E', borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  choiceTop:  {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  choiceTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flex: 1, marginRight: 12 },
  choiceDesc:  { fontSize: 13, fontWeight: '400', color: '#8A8A8E', lineHeight: 20 },
  choiceFooter: {
    marginTop: 8, padding: 16,
    backgroundColor: '#1A1B1E', borderRadius: 12,
  },
  choiceFooterText: {
    fontSize: 12, fontWeight: '400', color: '#8A8A8E',
    lineHeight: 18, textAlign: 'center',
  },
});
