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

const PLANS = [
  {
    id: 1,
    name: 'Básico',
    price: '$59',
    popular: false,
    items: ['Agenda ilimitada', 'Até 50 clientes', 'SMS manual'],
  },
  {
    id: 2,
    name: 'Pro',
    price: '$89',
    popular: true,
    items: [
      'Tudo do Básico',
      'Clientes ilimitadas',
      'SMS automático + recuperação',
      'Insights inteligentes',
      'Relatórios de ganhos',
    ],
  },
];

const MENU = [
  { id: 1,  label: 'Meus Dados' },
  { id: 2,  label: 'Meus Serviços' },
  { id: 3,  label: 'Endereços' },
  { id: 4,  label: 'Templates de SMS' },
  { id: 5,  label: 'Metas e Objetivos' },
  { id: 6,  label: 'Despesas' },
  { id: 7,  label: 'Gamificação' },
  { id: 8,  label: 'Auren Community' },
  { id: 9,  label: 'Configurações' },
  { id: 10, label: 'Sair', danger: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({ name, price, popular, items }) {
  return (
    <View style={[styles.planCard, popular && styles.planCardPro]}>
      <View>
        {popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
          </View>
        )}
        <Text style={[styles.planName, popular && styles.planNamePro]}>{name}</Text>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{price}</Text>
          <Text style={styles.planPeriod}>/mês</Text>
        </View>
        <View style={styles.planDivider} />
        {items.map((item, i) => (
          <View key={i} style={styles.planItem}>
            <Text style={[styles.planCheck, popular && styles.planCheckPro]}>✓</Text>
            <Text style={styles.planItemText}>{item}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.planBtn, popular && styles.planBtnPro]}
        activeOpacity={0.8}
      >
        <Text style={[styles.planBtnText, popular && styles.planBtnTextPro]}>
          Escolher
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function MenuItem({ label, danger, last }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      activeOpacity={0.65}
    >
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {!danger && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.gearBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <GearIcon />
          </TouchableOpacity>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>MC</Text>
            </View>
          </View>

          <Text style={styles.profileName}>Maria Carvalho</Text>
          <Text style={styles.profileSub}>Miami, FL · PT/ES</Text>

          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>NÍVEL 3</Text>
            </View>
            <Text style={styles.agendaStatus}>Agenda Cheia</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>SEU PLANO</Text>
        <View style={styles.plansRow}>
          {PLANS.map(p => <PlanCard key={p.id} {...p} />)}
        </View>

        <View style={styles.menuCard}>
          {MENU.map((item, i) => (
            <MenuItem
              key={item.id}
              {...item}
              last={i === MENU.length - 1}
            />
          ))}
        </View>

        <Text style={styles.version}>AUREN v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Gear Icon ────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <View style={gearSt.outer}>
      <View style={gearSt.inner} />
      <View style={[gearSt.spoke, gearSt.spokeV]} />
      <View style={[gearSt.spoke, gearSt.spokeH]} />
      <View style={[gearSt.spoke, gearSt.spokeDL]} />
      <View style={[gearSt.spoke, gearSt.spokeDR]} />
    </View>
  );
}

const GEAR = '#555555';
const gearSt = StyleSheet.create({
  outer:   { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: GEAR, alignItems: 'center', justifyContent: 'center' },
  inner:   { width: 8, height: 8, borderRadius: 4, backgroundColor: GEAR },
  spoke:   { position: 'absolute', width: 3, height: 22, backgroundColor: GEAR, borderRadius: 1 },
  spokeV:  { transform: [{ rotate: '0deg'   }] },
  spokeH:  { transform: [{ rotate: '90deg'  }] },
  spokeDL: { transform: [{ rotate: '45deg'  }] },
  spokeDR: { transform: [{ rotate: '-45deg' }] },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';
const SUBTLE  = '#2C2C2C';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  profileCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20, marginBottom: 28,
    position: 'relative',
  },
  gearBtn: { position: 'absolute', top: 18, right: 18 },
  avatarWrap: { marginBottom: 14 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 5,
  },
  profileSub: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray,
    marginBottom: 16,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge: {
    backgroundColor: 'rgba(232,196,160,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(232,196,160,0.30)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 1,
  },
  agendaStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cream,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray,
    letterSpacing: 1.3,
    marginBottom: 14,
  },

  plansRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    alignItems: 'stretch',
  },
  planCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  planCardPro: { borderWidth: 1.5, borderColor: colors.primary },
  popularBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray,
    marginBottom: 4,
  },
  planNamePro: { color: colors.white },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  planPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 28,
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
    marginBottom: 3, marginLeft: 2,
  },
  planDivider: { height: 1, backgroundColor: SUBTLE, marginVertical: 12 },
  planItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7, gap: 6 },
  planCheck: { fontSize: 11, fontWeight: '400', color: colors.gray, marginTop: 1 },
  planCheckPro: { color: colors.primary },
  planItemText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.gray,
    flex: 1, lineHeight: 16,
  },
  planBtn: {
    marginTop: 16, borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', borderWidth: 1, borderColor: colors.primary,
  },
  planBtnPro: { backgroundColor: colors.primary },
  planBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  planBtnTextPro: { color: colors.white },

  menuCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 18,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
  },
  menuLabelDanger: { color: '#F87171' },
  menuArrow: {
    fontSize: 20,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 22,
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '400',
    color: '#3A3A3A',
    letterSpacing: 1,
    marginBottom: 8,
  },
});
