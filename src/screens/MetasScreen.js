import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { scheduleNotification } from '../lib/notifications';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'auren:metas';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const MILESTONES = [10, 25, 50, 75, 90, 100];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
}
function endOfMonth() {
  const d = new Date(); d.setMonth(d.getMonth()+1,0); d.setHours(23,59,59,999); return d;
}
function startOfYear() {
  const d = new Date(new Date().getFullYear(),0,1); d.setHours(0,0,0,0); return d;
}
function endOfYear() {
  const d = new Date(new Date().getFullYear(),11,31); d.setHours(23,59,59,999); return d;
}
function startOfSemester() {
  const now = new Date();
  const mes = now.getMonth();
  const d   = new Date(now.getFullYear(), mes < 6 ? 0 : 6, 1);
  d.setHours(0,0,0,0); return d;
}
function endOfSemester() {
  const now = new Date();
  const mes = now.getMonth();
  const d   = new Date(now.getFullYear(), mes < 6 ? 5 : 11, mes < 6 ? 30 : 31);
  d.setHours(23,59,59,999); return d;
}

function formatCurrency(val) {
  return `$${parseFloat(val || 0).toFixed(2)}`;
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ─── Number to English Words ─────────────────────────────────────────────────

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numToWords(n) {
  if (n === 0) return 'zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  if (n < 1000000) return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  return numToWords(Math.floor(n / 1000000)) + ' million' + (n % 1000000 ? ' ' + numToWords(n % 1000000) : '');
}

function amountToWords(val) {
  const num = Math.round(parseFloat(val) || 0);
  if (!num) return '';
  const str = numToWords(num);
  return str.charAt(0).toUpperCase() + str.slice(1) + ' dollars';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, target }) {
  const pct     = target > 0 ? clamp(current / target, 0, 1) : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;
  const reached  = pct >= 1;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }, reached && styles.progressFillDone]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressCurrent}>{formatCurrency(current)}</Text>
        <Text style={[styles.progressPct, reached && { color: '#4ade80' }]}>{pctLabel}</Text>
        <Text style={styles.progressTarget}>{formatCurrency(target)}</Text>
      </View>
    </View>
  );
}

function MetaCard({ title, accent, value, onChange, readonly, wordsLabel, children }) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.metaInputLabel}>META ($)</Text>
      <TextInput
        style={[styles.metaInput, readonly && styles.metaInputReadonly]}
        placeholder="0.00"
        placeholderTextColor={colors.gray}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        returnKeyType="done"
        editable={!readonly}
      />
      {wordsLabel ? (
        <Text style={styles.wordsLabel}>{wordsLabel}</Text>
      ) : null}
      {children}
    </View>
  );
}

function CelebrationModal({ visible, marco, onClose }) {
  const MESSAGES = {
    10:  { emoji: '🌱', title: 'Você começou!',             sub: 'Cada passo conta.' },
    25:  { emoji: '✨', title: 'Um quarto do caminho!',      sub: '' },
    50:  { emoji: '🔥', title: 'Metade lá!',                sub: '' },
    75:  { emoji: '💪', title: 'Falta pouco!',              sub: '' },
    90:  { emoji: '🚀', title: 'Quase lá, não para agora!', sub: '' },
    100: { emoji: '🎉', title: 'META ATINGIDA!',            sub: 'Você é incrível!' },
  };
  const msg = MESSAGES[marco] ?? MESSAGES[100];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.celebBackdrop}>
        <View style={styles.celebCard}>
          <Text style={styles.celebEmoji}>{msg.emoji}</Text>
          <Text style={styles.celebTitle}>{msg.title}</Text>
          {!!msg.sub && <Text style={styles.celebSub}>{msg.sub}</Text>}
          <Text style={styles.celebMarco}>{marco}% da meta mensal</Text>
          <TouchableOpacity style={styles.celebBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.celebBtnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MetasScreen({ navigation, route }) {
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [userId,         setUserId]         = useState(null);

  const [metaMensal,     setMetaMensal]     = useState('');
  const [metaSemestral,  setMetaSemestral]  = useState('');
  const [metaAnual,      setMetaAnual]      = useState('');
  const [metaMotivacao,  setMetaMotivacao]  = useState('');

  const [receitaMensal,    setReceitaMensal]    = useState(0);
  const [receitaSemestral, setReceitaSemestral] = useState(0);
  const [receitaAnual,     setReceitaAnual]     = useState(0);

  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationMarco,   setCelebrationMarco]   = useState(0);

  const fetchReceitas = useCallback(async (uid) => {
    const [mesRes, semRes, anoRes] = await Promise.all([
      supabase.from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['confirmado','finalizado'])
        .gte('data_hora', startOfMonth().toISOString())
        .lte('data_hora', endOfMonth().toISOString()),
      supabase.from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['confirmado','finalizado'])
        .gte('data_hora', startOfSemester().toISOString())
        .lte('data_hora', endOfSemester().toISOString()),
      supabase.from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['confirmado','finalizado'])
        .gte('data_hora', startOfYear().toISOString())
        .lte('data_hora', endOfYear().toISOString()),
    ]);

    const sum = rows => (rows?.data ?? []).reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    setReceitaMensal(sum(mesRes));
    setReceitaSemestral(sum(semRes));
    setReceitaAnual(sum(anoRes));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) { setUserId(uid); await fetchReceitas(uid); }

      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const m = JSON.parse(stored);
          setMetaMensal(m.meta_mensal      ? String(m.meta_mensal)     : '');
          setMetaSemestral(m.meta_semestral ? String(m.meta_semestral) : '');
          setMetaAnual(m.meta_anual         ? String(m.meta_anual)     : '');
          setMetaMotivacao(m.meta_motivacao ?? '');
        }
      } catch { /* usa defaults */ }

      setLoading(false);
    })();
  }, []);

  // Check milestones whenever receita or meta changes
  useEffect(() => {
    if (!userId || !metaMensal || celebrationVisible) return;
    const metaNum = parseFloat(metaMensal) || 0;
    if (!metaNum) return;
    const pct = Math.round((receitaMensal / metaNum) * 100);
    const now = new Date();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    (async () => {
      for (const marco of MILESTONES) {
        if (pct >= marco) {
          const key = `marco_celebrado_${mm}_${yyyy}_${marco}`;
          try {
            const jaViu = await AsyncStorage.getItem(key);
            if (!jaViu) {
              setCelebrationMarco(marco);
              setCelebrationVisible(true);
              scheduleNotification(
                `${marco}% da meta mensal!`,
                marco === 10  ? 'Você começou! Cada passo conta.'   :
                marco === 25  ? 'Um quarto do caminho!'              :
                marco === 50  ? 'Metade lá!'                        :
                marco === 75  ? 'Falta pouco!'                      :
                marco === 90  ? 'Quase lá, não para agora!'         :
                                'META ATINGIDA! Você é incrível!',
                2,
              ).catch(() => {});
              break;
            }
          } catch { /* ignore */ }
        }
      }
    })();
  }, [receitaMensal, metaMensal, userId, celebrationVisible]);

  function handleMetaMensalChange(val) {
    setMetaMensal(val);
    const mensal = parseFloat(val) || 0;
    if (mensal > 0) {
      setMetaSemestral(String(mensal * 6));
      setMetaAnual(String(mensal * 12));
    } else {
      setMetaSemestral('');
      setMetaAnual('');
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        meta_mensal:    parseFloat(metaMensal)    || 0,
        meta_semestral: parseFloat(metaSemestral) || 0,
        meta_anual:     parseFloat(metaAnual)     || 0,
        meta_motivacao: metaMotivacao,
      }));
      setEditing(false);
    } catch {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar as metas.');
    } finally {
      setSaving(false);
    }
  };

  const mesLabel    = `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;
  const wordsMonthly = amountToWords(metaMensal);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => route?.params?.voltarPara === 'Caixa'
            ? navigation.navigate('Main', { screen: 'Caixa' })
            : navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Metas e Objetivos</Text>
        <TouchableOpacity
          style={[styles.editBtn, saving && { opacity: 0.6 }]}
          onPress={editing ? handleSave : () => setEditing(true)}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving && editing
            ? <ActivityIndicator color={colors.primary} size="small" />
            : <Text style={styles.editBtnText}>{editing ? 'Salvar' : 'Editar'}</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <MetaCard
          title={`Mensal — ${mesLabel}`}
          accent={colors.primary}
          value={metaMensal}
          onChange={handleMetaMensalChange}
          readonly={!editing}
          wordsLabel={wordsMonthly}
        >
          <ProgressBar current={receitaMensal} target={parseFloat(metaMensal) || 0} />
        </MetaCard>

        <MetaCard
          title="Semestral"
          accent="#3B5BA5"
          value={metaSemestral}
          onChange={setMetaSemestral}
          readonly={!editing}
          wordsLabel={amountToWords(metaSemestral)}
        >
          <ProgressBar current={receitaSemestral} target={parseFloat(metaSemestral) || 0} />
        </MetaCard>

        <MetaCard
          title={`Anual — ${new Date().getFullYear()}`}
          accent="#2A7A4B"
          value={metaAnual}
          onChange={setMetaAnual}
          readonly={!editing}
          wordsLabel={amountToWords(metaAnual)}
        >
          <ProgressBar current={receitaAnual} target={parseFloat(metaAnual) || 0} />
        </MetaCard>

        {/* Por que você quer atingir essa meta? */}
        <View style={styles.motivacaoCard}>
          <Text style={styles.motivacaoLabel}>POR QUE VOCÊ QUER ATINGIR ESSA META?</Text>
          <TextInput
            style={[styles.motivacaoInput, !editing && styles.motivacaoInputReadonly]}
            placeholder="Ex: Quero expandir meu salão e contratar uma assistente..."
            placeholderTextColor={colors.gray}
            value={metaMotivacao}
            onChangeText={setMetaMotivacao}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="done"
            editable={editing}
          />
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Salvar metas</Text>
            }
          </TouchableOpacity>
        )}

      </ScrollView>
      </KeyboardAvoidingView>

      <CelebrationModal
        visible={celebrationVisible}
        marco={celebrationMarco}
        onClose={async () => {
          const now = new Date();
          const mm  = String(now.getMonth() + 1).padStart(2, '0');
          const key = `marco_celebrado_${mm}_${now.getFullYear()}_${celebrationMarco}`;
          try { await AsyncStorage.setItem(key, '1'); } catch {}
          setCelebrationVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#222222';
const INPUT_BG = '#2A2A2A';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 20,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  editBtn:     { width: 64, alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  card: {
    backgroundColor: CARD_BG, borderRadius: 16,
    padding: 16, marginBottom: 16, overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: colors.white,
    marginLeft: 8, marginBottom: 14, letterSpacing: 0.3,
  },

  metaInputLabel: {
    fontSize: 10, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.2, marginBottom: 6,
  },
  metaInput: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 22, fontWeight: '800', color: colors.white,
    marginBottom: 8,
  },
  metaInputReadonly: { opacity: 0.7 },

  wordsLabel: {
    fontSize: 12, fontWeight: '500', color: colors.primary,
    fontStyle: 'italic', marginBottom: 12, marginLeft: 2,
  },

  progressWrap:    { gap: 6 },
  progressTrack: {
    height: 8, backgroundColor: '#333333', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary, borderRadius: 4,
  },
  progressFillDone: { backgroundColor: '#4ade80' },
  progressLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  progressCurrent: { fontSize: 12, fontWeight: '600', color: colors.white },
  progressPct:     { fontSize: 12, fontWeight: '800', color: colors.primary },
  progressTarget:  { fontSize: 12, fontWeight: '400', color: colors.gray },

  motivacaoCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  motivacaoLabel: {
    fontSize: 10, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.2, marginBottom: 10,
  },
  motivacaoInput: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '400', color: colors.white,
    minHeight: 90,
  },
  motivacaoInputReadonly: { opacity: 0.7 },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },

  // Celebration modal
  celebBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  celebCard: {
    backgroundColor: '#1A0A14', borderRadius: 24,
    padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(168,35,90,0.4)',
    width: '100%',
  },
  celebEmoji: { fontSize: 56, marginBottom: 12 },
  celebTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  celebSub:   { fontSize: 14, fontWeight: '400', color: '#C9A8B6', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  celebMarco: {
    fontSize: 13, fontWeight: '700', color: colors.primary,
    marginBottom: 24, letterSpacing: 0.4,
  },
  celebBtn: {
    height: 48, borderRadius: 12, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  celebBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
