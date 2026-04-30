import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEATURES = [
  { icon: '📅', titulo: 'Agenda inteligente',   descricao: 'Gerencie todos os seus agendamentos em um só lugar, com visualização por dia, semana ou mês.' },
  { icon: '💬', titulo: 'SMS automático',        descricao: 'Envie lembretes e confirmações automáticas via SMS para suas clientes antes de cada atendimento.' },
  { icon: '💰', titulo: 'Controle financeiro',   descricao: 'Acompanhe o faturamento por dia, semana e mês. Registre despesas e visualize o lucro real.' },
  { icon: '📊', titulo: 'Insights em tempo real',descricao: 'Veja quais serviços rendem mais, quais clientes retornam e o que otimizar no seu negócio.' },
  { icon: '🎯', titulo: 'Metas e gamificação',   descricao: 'Defina metas de faturamento e desbloqueie conquistas à medida que seu negócio cresce.' },
  { icon: '👥', titulo: 'Gestão de clientes',    descricao: 'Histórico completo de cada cliente, preferências e comunicação centralizada.' },
];

const PLANOS = [
  { feature: 'Agenda ilimitada',       basico: true,  pro: true  },
  { feature: 'Até 50 clientes',        basico: true,  pro: false, proLabel: 'Ilimitado' },
  { feature: 'SMS manual',             basico: true,  pro: false, proLabel: 'Automático' },
  { feature: 'Controle financeiro',    basico: true,  pro: true  },
  { feature: 'Insights inteligentes',  basico: false, pro: true  },
  { feature: 'Relatórios de ganhos',   basico: false, pro: true  },
  { feature: 'Recuperação de clientes',basico: false, pro: true  },
  { feature: 'Suporte prioritário',    basico: false, pro: true  },
];

const DEPOIMENTOS = [
  {
    nome:      'Carla Mendes',
    cidade:    'Miami, FL',
    texto:     'Desde que comecei a usar o AUREN, nunca mais perdi agendamento. Minhas clientes adoram receber o lembrete automático!',
    iniciais:  'CM',
  },
  {
    nome:      'Patrícia Silva',
    cidade:    'Orlando, FL',
    texto:     'O controle financeiro me abriu os olhos. Descobri que estava cobrando barato em 3 serviços e ajustei o preço. Aumento de 30% no faturamento.',
    iniciais:  'PS',
  },
  {
    nome:      'Fernanda Costa',
    cidade:    'Houston, TX',
    texto:     'O AUREN é o melhor investimento que fiz no meu salão. Tudo organizado, profissional e super fácil de usar.',
    iniciais:  'FC',
  },
];

export default function SaibaMaisScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saiba Mais</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>O QUE É O AUREN?</Text>
          <Text style={styles.heroTitle}>Gestão completa para profissionais de beleza</Text>
          <Text style={styles.heroText}>
            O AUREN é um aplicativo desenvolvido especialmente para manicures e profissionais
            de beleza que trabalham nos Estados Unidos. Centralize sua agenda, clientes,
            finanças e comunicação em um único lugar.
          </Text>
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>FUNCIONALIDADES</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{f.titulo}</Text>
              <Text style={styles.featureText}>{f.descricao}</Text>
            </View>
          </View>
        ))}

        {/* Plan comparison */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>COMPARATIVO DE PLANOS</Text>
        <View style={styles.tableCard}>

          <View style={styles.tableHeader}>
            <View style={styles.tableFeatureCol} />
            <View style={styles.tablePlanCol}>
              <Text style={styles.tableHeaderText}>Básico</Text>
              <Text style={styles.tableHeaderPrice}>$59/mês</Text>
            </View>
            <View style={[styles.tablePlanCol, styles.tablePlanColPro]}>
              <Text style={[styles.tableHeaderText, styles.tableHeaderTextPro]}>Pro</Text>
              <Text style={[styles.tableHeaderPrice, styles.tableHeaderPricePro]}>$89/mês</Text>
            </View>
          </View>

          {PLANOS.map((row, i) => (
            <View key={i} style={[styles.tableRow, i < PLANOS.length - 1 && styles.tableRowBorder]}>
              <View style={styles.tableFeatureCol}>
                <Text style={styles.tableFeatureText}>{row.feature}</Text>
              </View>
              <View style={styles.tablePlanCol}>
                <Text style={styles.tableCell}>
                  {row.basico ? '✓' : '—'}
                </Text>
              </View>
              <View style={[styles.tablePlanCol, styles.tablePlanColPro]}>
                <Text style={[styles.tableCell, styles.tableCellPro]}>
                  {row.pro ? (row.proLabel ?? '✓') : row.proLabel ?? '—'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Testimonials */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>DEPOIMENTOS</Text>
        {DEPOIMENTOS.map((d, i) => (
          <View key={i} style={styles.depoCard}>
            <View style={styles.depoHeader}>
              <View style={styles.depoAvatar}>
                <Text style={styles.depoAvatarText}>{d.iniciais}</Text>
              </View>
              <View>
                <Text style={styles.depoNome}>{d.nome}</Text>
                <Text style={styles.depoCidade}>{d.cidade}</Text>
              </View>
            </View>
            <Text style={styles.depoTexto}>"{d.texto}"</Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Começar agora</Text>
        </TouchableOpacity>

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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 56, paddingTop: 12 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#6B4A58',
    letterSpacing: 1.3, marginBottom: 14,
  },

  heroCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    padding: 22, marginBottom: 28,
    borderLeftWidth: 3, borderLeftColor: '#A8235A',
  },
  heroEyebrow: { fontSize: 10, fontWeight: '800', color: '#A8235A', letterSpacing: 1.5, marginBottom: 10 },
  heroTitle:   { fontSize: 20, fontWeight: '800', color: '#FFFFFF', lineHeight: 26, marginBottom: 12 },
  heroText:    { fontSize: 14, fontWeight: '400', color: '#C9A8B6', lineHeight: 22 },

  featureCard: {
    backgroundColor: CARD_BG, borderRadius: 14,
    padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  featureIcon: { fontSize: 24, marginRight: 14, marginTop: 2 },
  featureBody: { flex: 1 },
  featureTitle:{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 5 },
  featureText: { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 20 },

  tableCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    overflow: 'hidden', marginBottom: 28,
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: SUBTLE,
    paddingHorizontal: 14,
  },
  tableFeatureCol:  { flex: 1.5 },
  tablePlanCol:     { flex: 1, alignItems: 'center' },
  tablePlanColPro:  { borderLeftWidth: 1, borderLeftColor: SUBTLE },
  tableHeaderText:  { fontSize: 13, fontWeight: '700', color: '#C9A8B6' },
  tableHeaderTextPro: { color: '#FFFFFF' },
  tableHeaderPrice:   { fontSize: 11, color: '#6B4A58', marginTop: 2 },
  tableHeaderPricePro:{ color: '#A8235A' },

  tableRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  tableFeatureText: { fontSize: 13, fontWeight: '400', color: '#C9A8B6' },
  tableCell:      { fontSize: 14, fontWeight: '600', color: '#6B4A58', textAlign: 'center' },
  tableCellPro:   { color: '#A8235A' },

  depoCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    padding: 18, marginBottom: 12,
  },
  depoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  depoAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  depoAvatarText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  depoNome:   { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  depoCidade: { fontSize: 12, fontWeight: '400', color: '#6B4A58', marginTop: 1 },
  depoTexto:  { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 20, fontStyle: 'italic' },

  ctaBtn: {
    height: 54, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
