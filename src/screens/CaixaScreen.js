import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';

// ─── Data ────────────────────────────────────────────────────────────────────

const MONTHLY_EARNED = 6290;
const MONTHLY_GOAL   = 7000;
const MONTHLY_LEFT   = MONTHLY_GOAL - MONTHLY_EARNED;

const PAYMENTS = [
  { id: 1, abbr: 'ZL', label: 'Zelle',    value: '$3.420', bg: '#1A0D38', color: '#A78BFA' },
  { id: 2, abbr: 'CA', label: 'Cartão',   value: '$1.890', bg: '#0B1C32', color: '#60A5FA' },
  { id: 3, abbr: 'DI', label: 'Dinheiro', value: '$780',   bg: '#0A2218', color: '#4ade80' },
  { id: 4, abbr: 'CH', label: 'Cheque',   value: '$200',   bg: '#261500', color: '#FB923C' },
];

const METAS = [
  { id: 1, label: 'Meta mensal',  current: 6290, total: 7000 },
  { id: 2, label: 'Meta semanal', current: 1840, total: 2000 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(current, total) {
  return Math.min(Math.round((current / total) * 100), 100);
}

function fmt(n) {
  return '$' + n.toLocaleString('pt-BR');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ progress }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${progress}%` }]} />
    </View>
  );
}

function PaymentCard({ abbr, label, value, bg, color }) {
  return (
    <View style={styles.payCard}>
      <View style={[styles.payIndicator, { backgroundColor: bg }]}>
        <Text style={[styles.payAbbr, { color }]}>{abbr}</Text>
      </View>
      <Text style={styles.payLabel}>{label}</Text>
      <Text style={styles.payValue}>{value}</Text>
    </View>
  );
}

function MetaBar({ label, current, total }) {
  const progress = pct(current, total);
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaTopRow}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaPercent}>{progress}%</Text>
      </View>
      <ProgressBar progress={progress} />
      <View style={styles.metaBottomRow}>
        <Text style={styles.metaCurrent}>{fmt(current)}</Text>
        <Text style={styles.metaTotal}>de {fmt(total)}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CaixaScreen() {
  const monthPct = pct(MONTHLY_EARNED, MONTHLY_GOAL);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financeiro</Text>
          <Text style={styles.headerSub}>Abril · parcial</Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.mainCardLabel}>GANHOS DO MÊS</Text>
          <Text style={styles.mainCardValue}>$6.290</Text>
          <Text style={styles.mainCardSub}>
            Meta $7.000 · faltam ${MONTHLY_LEFT.toLocaleString('pt-BR')}
          </Text>
          <ProgressBar progress={monthPct} />
          <Text style={styles.mainCardPct}>{monthPct}% da meta</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>HOJE</Text>
            <Text style={styles.statValue}>$270</Text>
            <Text style={styles.statSub}>3 atendimentos</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>ESTA SEMANA</Text>
            <Text style={styles.statValue}>$1.840</Text>
            <Text style={[styles.statSub, styles.statGrowth]}>↑ +12%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pagamentos recebidos</Text>
        <View style={styles.payGrid}>
          <View style={styles.payRow}>
            <PaymentCard {...PAYMENTS[0]} />
            <PaymentCard {...PAYMENTS[1]} />
          </View>
          <View style={styles.payRow}>
            <PaymentCard {...PAYMENTS[2]} />
            <PaymentCard {...PAYMENTS[3]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Metas</Text>
        <View style={styles.metasCard}>
          {METAS.map((m, i) => (
            <View key={m.id}>
              <MetaBar {...m} />
              {i < METAS.length - 1 && <View style={styles.metaDivider} />}
            </View>
          ))}
        </View>

      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';
const SUBTLE  = '#2C2C2C';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  header: { paddingTop: 28, marginBottom: 24 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 3,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray,
  },

  mainCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 22,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  mainCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  mainCardValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 52,
    marginBottom: 8,
  },
  mainCardSub: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray,
    marginBottom: 16,
  },
  mainCardPct: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
    marginTop: 8,
  },

  track: {
    height: 8,
    backgroundColor: SUBTLE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: { backgroundColor: CARD_BG, borderRadius: 16, padding: 18 },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 5,
  },
  statSub: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
  },
  statGrowth: {
    fontWeight: '600',
    color: '#4ade80',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 14,
  },

  payGrid: { gap: 10, marginBottom: 28 },
  payRow: { flexDirection: 'row', gap: 10 },
  payCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
  },
  payIndicator: {
    width: 40, height: 40,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  payAbbr: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  payLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
    marginBottom: 4,
  },
  payValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  metasCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  metaItem: { paddingVertical: 4 },
  metaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  metaPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  metaBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaCurrent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  metaTotal: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray,
  },
  metaDivider: {
    height: 1,
    backgroundColor: SUBTLE,
    marginVertical: 18,
  },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  fabText: {
    fontSize: 30,
    fontWeight: '400',
    color: colors.white,
    lineHeight: 34,
  },
});
