import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FAQS = [
  {
    q: 'Como adicionar um agendamento?',
    a: 'Na tela Agenda, toque no botão + (canto inferior direito) para criar um novo agendamento. Selecione a cliente, o serviço, a data e o horário.',
  },
  {
    q: 'Como cadastrar um serviço?',
    a: 'Vá em Perfil → Meus Serviços e toque em + para adicionar um novo serviço com nome, valor e duração em minutos.',
  },
  {
    q: 'Como funciona o SMS automático?',
    a: 'No plano Pro, o AUREN envia SMS de confirmação assim que um agendamento é criado, e lembretes 24h e 1h antes do atendimento, sem precisar fazer nada.',
  },
  {
    q: 'Como alterar ou cancelar um agendamento?',
    a: 'Na tela Agenda, toque sobre o agendamento desejado. Um modal abrirá com as opções de editar os dados ou alterar o status para cancelado.',
  },
  {
    q: 'Como registrar uma despesa?',
    a: 'Acesse Perfil → Despesas. Adicione o valor, descrição e data da despesa. Isso ajuda o AUREN a calcular seu lucro real.',
  },
  {
    q: 'Posso usar o AUREN sem internet?',
    a: 'As funcionalidades principais exigem conexão com a internet. Os dados são sincronizados em tempo real para garantir que você nunca perca um agendamento.',
  },
  {
    q: 'Como funciona o período de trial?',
    a: 'Todos os usuários novos têm 30 dias de acesso completo ao AUREN gratuitamente. Nenhum cartão de crédito é necessário para começar.',
  },
  {
    q: 'Como cancelar meu plano?',
    a: 'Entre em contato pelo e-mail suporte@auren.app e nossa equipe processará o cancelamento em até 48 horas.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Todos os dados são armazenados com criptografia em servidores seguros via Supabase. Nunca compartilhamos suas informações com terceiros.',
  },
];

function FaqItem({ q, a }) {
  const [aberto, setAberto] = useState(false);
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => setAberto(v => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.faqQuestionText}>{q}</Text>
        <Text style={[styles.faqChevron, aberto && styles.faqChevronOpen]}>›</Text>
      </TouchableOpacity>
      {aberto && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{a}</Text>
        </View>
      )}
    </View>
  );
}

export default function AjudaScreen({ navigation }) {
  async function abrirEmail() {
    const url = 'mailto:suporte@auren.app?subject=Ajuda%20AUREN';
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else Alert.alert('Contato', 'Envie um e-mail para suporte@auren.app');
  }

  async function abrirInstagram() {
    const url = 'https://instagram.com/auren.app';
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else Alert.alert('Instagram', '@auren.app');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuda</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.sectionLabel}>PERGUNTAS FREQUENTES</Text>
        <View style={styles.faqCard}>
          {FAQS.map((faq, i) => (
            <View key={i}>
              <FaqItem q={faq.q} a={faq.a} />
              {i < FAQS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>FALE CONOSCO</Text>

        <TouchableOpacity style={styles.contatoCard} onPress={abrirEmail} activeOpacity={0.8}>
          <View style={styles.contatoIcon}>
            <Text style={styles.contatoEmoji}>✉️</Text>
          </View>
          <View style={styles.contatoBody}>
            <Text style={styles.contatoTitle}>E-mail de suporte</Text>
            <Text style={styles.contatoSub}>suporte@auren.app</Text>
          </View>
          <Text style={styles.contatoArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contatoCard} onPress={abrirInstagram} activeOpacity={0.8}>
          <View style={styles.contatoIcon}>
            <Text style={styles.contatoEmoji}>📷</Text>
          </View>
          <View style={styles.contatoBody}>
            <Text style={styles.contatoTitle}>Instagram</Text>
            <Text style={styles.contatoSub}>@auren.app</Text>
          </View>
          <Text style={styles.contatoArrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.versaoText}>AUREN v1.0.0 · suporte@auren.app</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_BG = '#222222';
const SUBTLE  = '#2C2C2C';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A0A14' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 8,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 56, paddingTop: 12 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B4A58',
    letterSpacing: 1.2, marginBottom: 12,
  },

  faqCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    overflow: 'hidden', marginBottom: 28,
  },
  faqItem:         {},
  faqQuestion:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  faqQuestionText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1, paddingRight: 12, lineHeight: 20 },
  faqChevron:      { fontSize: 20, color: '#6B4A58', transform: [{ rotate: '0deg' }] },
  faqChevronOpen:  { transform: [{ rotate: '90deg' }] },
  faqAnswer:       { paddingHorizontal: 18, paddingBottom: 16, paddingTop: 4 },
  faqAnswerText:   { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 21 },
  divider:         { height: 1, backgroundColor: SUBTLE, marginHorizontal: 18 },

  contatoCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  contatoIcon:  { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(168,35,90,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  contatoEmoji: { fontSize: 20 },
  contatoBody:  { flex: 1 },
  contatoTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  contatoSub:   { fontSize: 12, fontWeight: '400', color: '#6B4A58', marginTop: 2 },
  contatoArrow: { fontSize: 20, color: '#444444', lineHeight: 22 },

  versaoText: {
    textAlign: 'center', fontSize: 11, color: '#3A3A3A',
    letterSpacing: 0.8, marginTop: 16,
  },
});
