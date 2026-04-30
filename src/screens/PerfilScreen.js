import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
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
  { id: 0.5, label: 'Pagamentos' },
  { id: 1,  label: 'Meus Dados' },
  { id: 2,  label: 'Meus Serviços' },
  { id: 3,  label: 'Endereços' },
  { id: 4,  label: 'Templates de SMS' },
  { id: 5,  label: 'Metas e Objetivos' },
  { id: 5.5, label: 'Relatório Mensal' },
  { id: 5.6, label: 'Inteligência de Clientela' },
  { id: 5.7, label: 'Minhas Conexões' },
  { id: 5.8, label: 'Minha Equipe' },
  { id: 6,  label: 'Despesas' },
  { id: 7,  label: 'Gamificação' },
  { id: 8,  label: 'Presentear com AUREN' },
  { id: 9,  label: 'Auren Community' },
  { id: 10, label: 'Configurações' },
  { id: 11, label: 'Ajuda' },
  { id: 12, label: 'Sair', danger: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({ name, price, popular, items, onEscolher }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  return (
    <View style={[styles.planCard, popular && styles.planCardPro]}>
      <View>
        {popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
          </View>
        )}
        <Text style={styles.planName}>{name}</Text>
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
        onPress={onEscolher}
        activeOpacity={0.8}
      >
        <Text style={[styles.planBtnText, popular && styles.planBtnTextPro]}>
          Escolher
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function MenuItem({ label, danger, last, onPress }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      activeOpacity={0.65}
      onPress={onPress}
    >
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {!danger && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PerfilScreen({ navigation }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const [planModal, setPlanModal] = useState(null);

  function menuPress(label) {
    switch (label) {
      case 'Pagamentos':            return () => navigation.navigate('Pagamentos');
      case 'Meus Serviços':        return () => navigation.navigate('Servicos');
      case 'Meus Dados':           return () => navigation.navigate('MeusDados');
      case 'Endereços':            return () => navigation.navigate('Enderecos');
      case 'Despesas':             return () => navigation.navigate('Despesas');
      case 'Configurações':        return () => navigation.navigate('Configuracoes');
      case 'Templates de SMS':     return () => navigation.navigate('TemplatesSMS');
      case 'Metas e Objetivos':    return () => navigation.navigate('Metas');
      case 'Relatório Mensal':          return () => navigation.navigate('Relatorio');
      case 'Inteligência de Clientela': return () => navigation.navigate('IntelClientela');
      case 'Minhas Conexões':           return () => navigation.navigate('Conexoes');
      case 'Minha Equipe':              return () => navigation.navigate('Equipe');
      case 'Auren Community':           return () => navigation.navigate('Community');
      case 'Gamificação':          return () => navigation.navigate('Gamificacao');
      case 'Presentear com AUREN': return () => navigation.navigate('Presentear');
      case 'Ajuda':                return () => navigation.navigate('Ajuda');
      case 'Sair':                 return () => Alert.alert(
        'Sair',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
              await supabase.auth.signOut();
              navigation.getParent()?.getParent()?.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            },
          },
        ],
      );
      default: return undefined;
    }
  }

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
            onPress={() => navigation.navigate('Configuracoes')}
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

        <Text style={[styles.sectionTitle, { color: isDark ? '#C9A8B6' : '#6B4A58' }]}>SEU PLANO</Text>
        <View style={styles.plansRow}>
          {PLANS.map(p => (
            <PlanCard
              key={p.id}
              {...p}
              onEscolher={() => setPlanModal(p)}
            />
          ))}
        </View>

        <View style={styles.menuCard}>
          {MENU.map((item, i) => (
            <MenuItem
              key={item.id}
              {...item}
              last={i === MENU.length - 1}
              onPress={menuPress(item.label)}
            />
          ))}
        </View>

        <Text style={styles.version}>AUREN v1.0.0</Text>

      </ScrollView>

      {/* ── Confirmation modal ── */}
      <Modal
        visible={planModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanModal(null)}
      >
        <View style={modalStyles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPlanModal(null)} activeOpacity={1} />
          {planModal && (
            <View style={modalStyles.sheet}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Plano {planModal.name}</Text>
              <Text style={modalStyles.price}>
                {planModal.price}<Text style={modalStyles.pricePer}>/mês</Text>
              </Text>
              <View style={modalStyles.divider} />
              {planModal.items.map((item, i) => (
                <View key={i} style={modalStyles.item}>
                  <Text style={modalStyles.check}>✓</Text>
                  <Text style={modalStyles.itemText}>{item}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={modalStyles.btn}
                activeOpacity={0.85}
                onPress={() => {
                  setPlanModal(null);
                  setTimeout(() => Alert.alert('Em breve!', 'Pagamento via Stripe em breve. Obrigada pelo interesse!'), 300);
                }}
              >
                <Text style={modalStyles.btnText}>Assinar agora</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.cancel} onPress={() => setPlanModal(null)}>
                <Text style={modalStyles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

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

function makeStyles(isDark) {
  const bg   = isDark ? '#0E0F11' : '#F5EDE8';
  const card = isDark ? '#1A1B1E' : '#FFFFFF';
  const text = isDark ? '#F5EDE8' : '#1A0A14';
  const sub  = isDark ? '#C9A8B6' : '#6B4A58';

  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: bg },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    profileCard: {
      backgroundColor: card, borderRadius: 20,
      paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20,
      alignItems: 'center', marginTop: 20, marginBottom: 28, position: 'relative',
    },
    gearBtn:    { position: 'absolute', top: 18, right: 18 },
    avatarWrap: { marginBottom: 14 },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText:   { fontSize: 28, fontWeight: '800', color: colors.white, letterSpacing: 1 },
    profileName:  { fontSize: 22, fontWeight: '700', color: text, marginBottom: 5 },
    profileSub:   { fontSize: 13, fontWeight: '400', color: sub, marginBottom: 16 },
    levelRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    levelBadge: {
      backgroundColor: 'rgba(232,196,160,0.14)', borderWidth: 1,
      borderColor: 'rgba(232,196,160,0.30)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    levelBadgeText: { fontSize: 10, fontWeight: '800', color: colors.cream, letterSpacing: 1 },
    agendaStatus:   { fontSize: 13, fontWeight: '600', color: colors.cream },

    sectionTitle: { fontSize: 11, fontWeight: '700', color: sub, letterSpacing: 1.3, marginBottom: 14 },

    plansRow: { flexDirection: 'row', gap: 12, marginBottom: 28, alignItems: 'stretch' },
    planCard: { flex: 1, backgroundColor: card, borderRadius: 16, padding: 16, justifyContent: 'space-between' },
    planCardPro: { borderWidth: 1.5, borderColor: colors.primary },
    popularBadge: {
      backgroundColor: colors.primary, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10,
    },
    popularBadgeText: { fontSize: 8, fontWeight: '800', color: colors.white, letterSpacing: 0.8 },
    planName:         { fontSize: 16, fontWeight: '700', color: sub, marginBottom: 4 },
    planPriceRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
    planPrice:        { fontSize: 26, fontWeight: '800', color: text, lineHeight: 28 },
    planPeriod:       { fontSize: 12, fontWeight: '400', color: sub, marginBottom: 3, marginLeft: 2 },
    planDivider:      { height: 1, backgroundColor: isDark ? '#3D1020' : '#E6D8CF', marginVertical: 12 },
    planItem:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7, gap: 6 },
    planCheck:        { fontSize: 11, fontWeight: '400', color: sub, marginTop: 1 },
    planCheckPro:     { color: colors.primary },
    planItemText:     { fontSize: 11, fontWeight: '400', color: sub, flex: 1, lineHeight: 16 },
    planBtn:          { marginTop: 16, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
    planBtnPro:       { backgroundColor: colors.primary },
    planBtnText:      { fontSize: 13, fontWeight: '700', color: colors.primary },
    planBtnTextPro:   { color: colors.white },

    menuCard: { backgroundColor: card, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, paddingHorizontal: 18,
    },
    menuItemBorder:  { borderBottomWidth: 1, borderBottomColor: isDark ? '#3D1020' : '#E6D8CF' },
    menuLabel:       { fontSize: 15, fontWeight: '500', color: text },
    menuLabelDanger: { color: '#F87171' },
    menuArrow:       { fontSize: 20, fontWeight: '400', color: isDark ? '#555555' : '#B09AA8', lineHeight: 22 },

    version: { textAlign: 'center', fontSize: 11, fontWeight: '400', color: sub, letterSpacing: 1, marginBottom: 8 },
  });
}

// Modal styles always dark (overlay)
const modalStyles = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#0E0F11', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3D1020', alignSelf: 'center', marginBottom: 24 },
  title:          { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  price:          { fontSize: 32, fontWeight: '800', color: '#A8235A' },
  pricePer:       { fontSize: 14, fontWeight: '400', color: '#C9A8B6' },
  divider:        { height: 1, backgroundColor: '#1A1B1E', marginVertical: 16 },
  item:           { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  check:          { fontSize: 13, color: '#A8235A', fontWeight: '700', marginTop: 1 },
  itemText:       { fontSize: 14, color: '#C9A8B6', flex: 1 },
  btn:            { height: 54, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnText:        { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancel:         { alignItems: 'center', paddingVertical: 14 },
  cancelText:     { fontSize: 14, fontWeight: '600', color: '#6B4A58' },
});
