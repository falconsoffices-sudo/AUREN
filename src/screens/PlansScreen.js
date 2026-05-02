import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VendaModal from '../components/VendaModal';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'pro',
    name: 'AUREN PRO',
    price: '$89',
    period: '/mês',
    accent: '#A8235A',
    badge: 'POPULAR',
    features: [
      'Agenda ilimitada',
      'SMS automático',
      'Relatório mensal',
      'Inteligência de clientela',
      'Conexões',
      'Gamificação',
    ],
  },
  {
    id: 'business',
    name: 'AUREN BUSINESS',
    price: '$149',
    period: '/mês',
    accent: '#6D3FA0',
    badge: 'COMPLETO',
    features: [
      'Tudo do PRO',
      '5 profissionais inclusos + $25/mês por profissional adicional',
      'Dashboard consolidado',
      'Faturamento unificado',
      'Suporte prioritário',
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlansScreen({ navigation }) {
  const [selectedPlan, setSelectedPlan] = useState('business');
  const [vendaModal,   setVendaModal]   = useState(false);
  const [planVendido,  setPlanVendido]  = useState('');

  function handleAssinar(planName) {
    setPlanVendido(planName);
    setVendaModal(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Escolha o plano ideal para o seu negócio</Text>
        <Text style={styles.subline}>Cancele a qualquer momento. Sem taxa de adesão.</Text>

        {PLANS.map(plan => (
          <TouchableOpacity
            key={plan.id}
            activeOpacity={0.85}
            onPress={() => setSelectedPlan(plan.id)}
            style={[
              styles.planCard,
              { borderTopColor: plan.accent },
              selectedPlan === plan.id
                ? { borderWidth: 2, borderColor: plan.accent }
                : { borderWidth: 1, borderColor: '#2A2A2A' },
            ]}
          >
            <View style={[styles.badge, { backgroundColor: plan.accent }]}>
              <Text style={styles.badgeText}>{plan.badge}</Text>
            </View>
            <Text style={[styles.planName, { color: plan.accent }]}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{plan.price}</Text>
              <Text style={styles.period}>{plan.period}</Text>
            </View>
            <View style={styles.divider} />
            {plan.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.checkDot, { backgroundColor: plan.accent }]} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: plan.accent }]}
              onPress={() => Alert.alert(
                'Confirmar assinatura',
                `Deseja assinar o ${plan.name} por ${plan.price}/mês?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Confirmar', onPress: () => handleAssinar(plan.name) },
                ]
              )}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnText}>Assinar agora</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <Text style={styles.footer}>
          Todos os planos incluem 30 dias de teste gratuito.{'\n'}
          Cobrança mensal em USD via Stripe.
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <VendaModal
        visible={vendaModal}
        planName={planVendido}
        onClose={enviou => {
          setVendaModal(false);
          if (enviou) Alert.alert('Obrigada!', 'Suas indicações foram enviadas. Você está ajudando o AUREN a crescer!');
        }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG      = '#0E0F11';
const CARD_BG = '#1A1B1E';
const SUBTLE  = '#2A2A2A';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 32 },

  headline: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginTop: 8, marginBottom: 8, lineHeight: 28,
  },
  subline: {
    fontSize: 13, fontWeight: '400', color: '#8A8A8E',
    textAlign: 'center', marginBottom: 28,
  },

  planCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    padding: 22, marginBottom: 16,
    borderTopWidth: 4, position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  badge: {
    position: 'absolute', top: 16, right: 16,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },

  planName: { fontSize: 13, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },

  priceRow:  { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  price:     { fontSize: 48, fontWeight: '900', color: '#FFFFFF', lineHeight: 52 },
  period:    { fontSize: 16, fontWeight: '400', color: '#8A8A8E', marginBottom: 8, marginLeft: 4 },

  divider: { height: 1, backgroundColor: SUBTLE, marginVertical: 18 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  checkDot:    { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  featureText: { fontSize: 14, fontWeight: '500', color: '#E0D0D8', flex: 1 },

  ctaBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  footer: {
    fontSize: 12, color: '#555560', textAlign: 'center',
    lineHeight: 18, marginTop: 8,
  },
});
