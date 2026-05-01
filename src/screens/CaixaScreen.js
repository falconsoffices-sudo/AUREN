import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const PAYMENT_META = [
  { key: 'zelle',    abbr: 'ZL', label: 'Zelle',    bg: '#1A0D38', color: '#A78BFA' },
  { key: 'cartao',   abbr: 'CA', label: 'Cartão',   bg: '#0B1C32', color: '#60A5FA' },
  { key: 'dinheiro', abbr: 'DI', label: 'Dinheiro', bg: '#0A2218', color: '#4ade80' },
  { key: 'cheque',   abbr: 'CH', label: 'Cheque',   bg: '#261500', color: '#FB923C' },
  { key: 'venmo',    abbr: 'VM', label: 'Venmo',    bg: '#1A2038', color: '#818CF8' },
  { key: 'cashapp',  abbr: 'CS', label: 'CashApp',  bg: '#0A2010', color: '#34d399' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(current, total) {
  if (!total) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('pt-BR');
}

function getDateRanges() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = dt =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  const hoje = fmtDate(now);

  const diaSemana      = now.getDay();
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const seg            = new Date(now); seg.setDate(now.getDate() - diasAteSegunda);
  const dom            = new Date(seg); dom.setDate(seg.getDate() + 6);
  const semanaInicio   = `${fmtDate(seg)}T00:00:00`;
  const semanaFim      = `${fmtDate(dom)}T23:59:59`;

  const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mesInicio = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01T00:00:00`;
  const mesFim    = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(ultimoDia)}T23:59:59`;

  return { hoje, semanaInicio, semanaFim, mesInicio, mesFim };
}

function todayMMDDYYYY() {
  const n = new Date();
  return `${String(n.getMonth() + 1).padStart(2,'0')}/${String(n.getDate()).padStart(2,'0')}/${n.getFullYear()}`;
}

function formatDateInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function mmddyyyyToISO(str) {
  const parts = str.split('/');
  const mm = parts[0], dd = parts[1], yyyy = parts[2];
  if (!mm || !dd || !yyyy || yyyy.length < 4) return new Date().toISOString();
  return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}T12:00:00`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ progress }) {
  const { isDark } = useTheme();
  return (
    <View style={{ height: 8, backgroundColor: isDark ? '#1A1B1E' : '#E6D8CF', borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ height: 8, backgroundColor: colors.primary, borderRadius: 4, width: `${progress}%` }} />
    </View>
  );
}

function PaymentCard({ abbr, label, value, bg, color }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
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
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
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

// ─── EntradaManualModal ───────────────────────────────────────────────────────

function EntradaManualModal({ visible, onClose, onSaved }) {
  const [descricao, setDescricao] = useState('');
  const [valor,     setValor]     = useState('');
  const [metodo,    setMetodo]    = useState('zelle');
  const [data,      setData]      = useState(todayMMDDYYYY());
  const [saving,    setSaving]    = useState(false);

  function reset() {
    setDescricao(''); setValor(''); setMetodo('zelle'); setData(todayMMDDYYYY());
  }

  function handleClose() { reset(); onClose(); }

  async function handleSalvar() {
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) {
      Alert.alert('Campo obrigatório', 'Informe um valor válido.');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const { error } = await supabase.from('financeiro').insert({
        profissional_id:  uid,
        valor:            valorNum,
        metodo_pagamento: metodo,
        tipo:             'receita',
        categoria:        descricao.trim() || 'entrada_manual',
        created_at:       mmddyyyyToISO(data),
      });
      if (error) throw error;

      reset();
      onSaved();
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={mstyles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={mstyles.sheet}>
            <View style={mstyles.handle} />
            <Text style={mstyles.title}>Registrar Entrada</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={mstyles.label}>DESCRIÇÃO</Text>
              <TextInput
                style={mstyles.input}
                placeholder="Ex: Gorjeta, adiantamento..."
                placeholderTextColor="#C9A8B6"
                value={descricao}
                onChangeText={setDescricao}
                autoCapitalize="sentences"
                returnKeyType="next"
              />

              <Text style={mstyles.label}>VALOR (USD)</Text>
              <View style={mstyles.prefixRow}>
                <View style={mstyles.prefix}><Text style={mstyles.prefixText}>$</Text></View>
                <TextInput
                  style={[mstyles.input, mstyles.prefixInput]}
                  placeholder="0.00"
                  placeholderTextColor="#C9A8B6"
                  value={valor}
                  onChangeText={setValor}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>

              <Text style={mstyles.label}>MÉTODO DE PAGAMENTO</Text>
              <View style={mstyles.metodoGrid}>
                {PAYMENT_META.map(p => {
                  const active = metodo === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[mstyles.metodoBtn, active && mstyles.metodoBtnActive]}
                      onPress={() => setMetodo(p.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[mstyles.metodoBtnText, active && mstyles.metodoBtnTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={mstyles.label}>DATA</Text>
              <TextInput
                style={mstyles.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#C9A8B6"
                value={data}
                onChangeText={t => setData(formatDateInput(t))}
                keyboardType="numeric"
                maxLength={10}
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[mstyles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSalvar}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={mstyles.saveBtnText}>Registrar</Text>}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CaixaScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const [loading,           setLoading]           = useState(true);
  const [ganhosMes,         setGanhosMes]         = useState(0);
  const [ganhosHoje,        setGanhosHoje]        = useState(0);
  const [ganhosHojeCount,   setGanhosHojeCount]   = useState(0);
  const [ganhosSemana,      setGanhosSemana]      = useState(0);
  const [metaMensal,        setMetaMensal]        = useState(0);
  const [despesasMes,       setDespesasMes]       = useState(0);
  const [pagamentos,        setPagamentos]        = useState({});
  const [entradaModalVisible, setEntradaModalVisible] = useState(false);

  const carregarDados = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { setLoading(false); return; }

    const { hoje, semanaInicio, semanaFim, mesInicio, mesFim } = getDateRanges();

    const [mesRes, hojeRes, semRes, finRes, despRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', mesInicio)
        .lte('data_hora', mesFim),

      supabase
        .from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', `${hoje}T00:00:00`)
        .lte('data_hora', `${hoje}T23:59:59`),

      supabase
        .from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', semanaInicio)
        .lte('data_hora', semanaFim),

      supabase
        .from('financeiro')
        .select('metodo_pagamento, valor')
        .eq('profissional_id', uid)
        .eq('tipo', 'receita'),

      supabase
        .from('financeiro')
        .select('valor')
        .eq('profissional_id', uid)
        .eq('tipo', 'despesa')
        .gte('created_at', mesInicio)
        .lte('created_at', mesFim),
    ]);

    const soma = rows => (rows ?? []).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

    setGanhosMes(soma(mesRes.data));
    setGanhosHoje(soma(hojeRes.data));
    setGanhosHojeCount(hojeRes.data?.length ?? 0);
    setGanhosSemana(soma(semRes.data));
    setDespesasMes(soma(despRes.data));

    const byMethod = {};
    for (const row of finRes.data ?? []) {
      const key = row.metodo_pagamento ?? 'outro';
      byMethod[key] = (byMethod[key] || 0) + (parseFloat(row.valor) || 0);
    }
    setPagamentos(byMethod);

    try {
      const stored = await AsyncStorage.getItem('auren:metas');
      if (stored) {
        const m = JSON.parse(stored);
        setMetaMensal(parseFloat(m.meta_mensal) || 0);
      }
    } catch {}

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => { carregarDados(); }, [carregarDados])
  );

  useEffect(() => {
    const ch = supabase
      .channel('caixa_financeiro')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro' },
        () => { carregarDados(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [carregarDados]);

  const monthName = MONTHS[new Date().getMonth()];
  const monthPct  = pct(ganhosMes, metaMensal);
  const metaLeft  = Math.max(0, metaMensal - ganhosMes);
  const lucroReal = ganhosMes - despesasMes;

  const payRows = [];
  for (let i = 0; i < PAYMENT_META.length; i += 2) {
    payRows.push(PAYMENT_META.slice(i, i + 2));
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financeiro</Text>
          <Text style={styles.headerSub}>{monthName} · parcial</Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.mainCardLabel}>GANHOS DO MÊS</Text>
          <Text style={styles.mainCardValue}>{fmt(ganhosMes)}</Text>
          <Text style={styles.mainCardSub}>
            {metaMensal > 0
              ? `Meta ${fmt(metaMensal)} · faltam ${fmt(metaLeft)}`
              : 'Sem meta definida — configure em Metas'}
          </Text>
          <ProgressBar progress={monthPct} />
          <Text style={styles.mainCardPct}>{monthPct}% da meta</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>HOJE</Text>
            <Text style={styles.statValue}>{fmt(ganhosHoje)}</Text>
            <Text style={styles.statSub}>
              {ganhosHojeCount} {ganhosHojeCount === 1 ? 'atendimento' : 'atendimentos'}
            </Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>ESTA SEMANA</Text>
            <Text style={styles.statValue}>{fmt(ganhosSemana)}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>DESPESAS DO MÊS</Text>
            <Text style={[styles.statValue, styles.valueRed]}>{fmt(despesasMes)}</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>LUCRO REAL</Text>
            <Text style={[styles.statValue, lucroReal >= 0 ? styles.valueGreen : styles.valueRed]}>
              {fmt(lucroReal)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pagamentos recebidos</Text>
        <View style={styles.payGrid}>
          {payRows.map((row, ri) => (
            <View key={ri} style={styles.payRow}>
              {row.map(p => (
                <PaymentCard
                  key={p.key}
                  abbr={p.abbr}
                  label={p.label}
                  bg={p.bg}
                  color={p.color}
                  value={fmt(pagamentos[p.key] || 0)}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Metas</Text>
        <View style={styles.metasCard}>
          <MetaBar
            label="Meta mensal"
            current={ganhosMes}
            total={metaMensal}
          />
        </View>

      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setEntradaModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <EntradaManualModal
        visible={entradaModalVisible}
        onClose={() => setEntradaModalVisible(false)}
        onSaved={() => {
          setEntradaModalVisible(false);
          carregarDados();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(isDark) {
  const bg   = isDark ? '#0E0F11' : '#F5EDE8';
  const card = isDark ? '#1A1B1E' : '#FFFFFF';
  const text = isDark ? '#F5EDE8' : '#1A0A14';
  const sub  = isDark ? '#C9A8B6' : '#6B4A58';

  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingBottom: 110 },

    header: { paddingTop: 28, marginBottom: 24 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: text, marginBottom: 3 },
    headerSub:   { fontSize: 13, fontWeight: '400', color: sub },

    mainCard: {
      backgroundColor: card, borderRadius: 16, padding: 22,
      marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    mainCardLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.5, marginBottom: 10 },
    mainCardValue: { fontSize: 48, fontWeight: '800', color: text, lineHeight: 52, marginBottom: 8 },
    mainCardSub:   { fontSize: 13, fontWeight: '400', color: sub, marginBottom: 16 },
    mainCardPct:   { fontSize: 12, fontWeight: '400', color: sub, marginTop: 8 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    statCard:  { backgroundColor: card, borderRadius: 16, padding: 18 },
    statLabel: { fontSize: 10, fontWeight: '700', color: sub, letterSpacing: 1.2, marginBottom: 10 },
    statValue: { fontSize: 24, fontWeight: '800', color: text, marginBottom: 5 },
    statSub:   { fontSize: 12, fontWeight: '400', color: sub },
    valueRed:   { color: '#F87171' },
    valueGreen: { color: '#4ade80' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: text, marginBottom: 14 },

    payGrid: { gap: 10, marginBottom: 28 },
    payRow:  { flexDirection: 'row', gap: 10 },
    payCard: { flex: 1, backgroundColor: card, borderRadius: 16, padding: 16 },
    payIndicator: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    payAbbr:  { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
    payLabel: { fontSize: 12, fontWeight: '400', color: sub, marginBottom: 4 },
    payValue: { fontSize: 18, fontWeight: '700', color: text },

    metasCard: { backgroundColor: card, borderRadius: 16, padding: 20, marginBottom: 12 },
    metaItem:  { paddingVertical: 4 },
    metaTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    metaLabel:  { fontSize: 14, fontWeight: '600', color: text },
    metaPercent: { fontSize: 14, fontWeight: '700', color: colors.primary },
    metaBottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    metaCurrent: { fontSize: 13, fontWeight: '600', color: text },
    metaTotal:   { fontSize: 13, fontWeight: '400', color: sub },

    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
    },
    fabText: { fontSize: 30, fontWeight: '400', color: colors.white, lineHeight: 34 },
  });
}

// ─── Modal styles (static dark) ───────────────────────────────────────────────

const MINPUT_BG = '#1A1B1E';
const MSUBTLE   = '#2A2A2A';

const mstyles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#0E0F11', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, maxHeight: '88%' },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: MSUBTLE, alignSelf: 'center', marginBottom: 20 },
  title:     { fontSize: 20, fontWeight: '700', color: '#F5EDE8', marginBottom: 20 },
  label:     { fontSize: 10, fontWeight: '700', color: '#C9A8B6', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  input:     { backgroundColor: MINPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#F5EDE8', marginBottom: 14 },

  prefixRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  prefix:      { backgroundColor: MINPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginRight: 8 },
  prefixText:  { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },
  prefixInput: { flex: 1, marginBottom: 0 },

  metodoGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metodoBtn:          { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: MINPUT_BG },
  metodoBtnActive:    { backgroundColor: '#A8235A' },
  metodoBtnText:      { fontSize: 13, fontWeight: '600', color: '#C9A8B6' },
  metodoBtnTextActive:{ color: '#FFFFFF' },

  saveBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
