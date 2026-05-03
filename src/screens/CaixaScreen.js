import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import colors from '../constants/colors';
import { BarChart } from 'react-native-chart-kit';
import IndicacaoModal from '../components/IndicacaoModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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

function get6MonthRange() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01T00:00:00`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T23:59:59`,
  };
}

function groupByMonth(rows) {
  const now = new Date();
  const labels = [];
  const values = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(MONTHS_SHORT[d.getMonth()]);
    const sum = (rows ?? [])
      .filter(r => {
        const rd = new Date(r.data_hora);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      })
      .reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    values.push(Math.round(sum));
  }
  return { labels, values };
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

function getDailyChartMes(rows) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const pad = n => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month + 1)}`;
  const labels = [], values = [];
  for (let d = 1; d <= today; d++) {
    labels.push(d % 5 === 1 || d === today ? String(d) : '');
    const ds = `${prefix}-${pad(d)}`;
    const sum = (rows ?? []).filter(r => r.data_hora?.startsWith(ds)).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    values.push(Math.round(sum));
  }
  return { labels, values };
}

function getDailyChartSemana(rows) {
  const DIA_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const pad = n => String(n).padStart(2, '0');
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const labels = [], values = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    labels.push(DIA_SHORT[d.getDay()]);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const sum = (rows ?? []).filter(r => r.data_hora?.startsWith(ds)).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
    values.push(Math.round(sum));
  }
  return { labels, values, mondayOffset };
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
  const [descricao,       setDescricao]       = useState('');
  const [valor,           setValor]           = useState('');
  const [metodo,          setMetodo]          = useState('zelle');
  const [data,            setData]            = useState(todayMMDDYYYY());
  const [saving,          setSaving]          = useState(false);
  const [clienteSearch,   setClienteSearch]   = useState('');
  const [clientes,        setClientes]        = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [loadingClientes, setLoadingClientes] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoadingClientes(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { setLoadingClientes(false); return; }
      const { data: cData } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('profissional_id', uid)
        .order('nome');
      setClientes(cData ?? []);
      setLoadingClientes(false);
    })();
  }, [visible]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim() || selectedCliente) return [];
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(q)).slice(0, 5);
  }, [clientes, clienteSearch, selectedCliente]);

  function reset() {
    setDescricao(''); setValor(''); setMetodo('zelle'); setData(todayMMDDYYYY());
    setClienteSearch(''); setSelectedCliente(null);
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
        cliente_id:       selectedCliente?.id ?? null,
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

              <Text style={mstyles.label}>CLIENTE (OPCIONAL)</Text>
              {selectedCliente ? (
                <TouchableOpacity
                  style={mstyles.clienteSelectedRow}
                  onPress={() => { setSelectedCliente(null); setClienteSearch(''); }}
                  activeOpacity={0.75}
                >
                  <Text style={mstyles.clienteSelectedText}>{selectedCliente.nome}</Text>
                  <Text style={mstyles.clienteClearBtn}>✕</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={mstyles.input}
                    placeholder={loadingClientes ? 'Carregando...' : 'Buscar cliente...'}
                    placeholderTextColor="#C9A8B6"
                    value={clienteSearch}
                    onChangeText={setClienteSearch}
                    autoCapitalize="words"
                    returnKeyType="search"
                  />
                  {filteredClientes.length > 0 && (
                    <View style={mstyles.clienteListBox}>
                      {filteredClientes.map((c, i) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[mstyles.clienteItem, i < filteredClientes.length - 1 && mstyles.clienteItemBorder]}
                          onPress={() => { setSelectedCliente(c); setClienteSearch(''); }}
                          activeOpacity={0.7}
                        >
                          <Text style={mstyles.clienteItemText}>{c.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

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

export default function CaixaScreen({ navigation }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const bss    = useMemo(() => makeBss(isDark),    [isDark]);
  const [loading,           setLoading]           = useState(true);
  const [ganhosMes,         setGanhosMes]         = useState(0);
  const [ganhosHoje,        setGanhosHoje]        = useState(0);
  const [ganhosHojeCount,   setGanhosHojeCount]   = useState(0);
  const [ganhosSemana,      setGanhosSemana]      = useState(0);
  const [metaMensal,        setMetaMensal]        = useState(0);
  const [despesasMes,       setDespesasMes]       = useState(0);
  const [pagamentos,        setPagamentos]        = useState({});
  const [entradaModalVisible, setEntradaModalVisible] = useState(false);
  const [chartMonths, setChartMonths] = useState(() => groupByMonth([]));
  const [roiModal,    setRoiModal]    = useState(false);
  const [roiSubtitle, setRoiSubtitle] = useState('');
  const [roiMarco,    setRoiMarco]    = useState(null);
  const roiShownRef = useRef(false);
  const [mesMModal,       setMesMModal]       = useState(false);
  const [hojeModal,       setHojeModal]       = useState(false);
  const [semanaModal,     setSemanaModal]     = useState(false);
  const [lucroModal,      setLucroModal]      = useState(false);
  const [pagModal,        setPagModal]        = useState(false);
  const [pagModalKey,     setPagModalKey]     = useState(null);
  const [agendHoje,       setAgendHoje]       = useState([]);
  const [agendSemana,     setAgendSemana]     = useState([]);
  const [seisMesData,     setSeisMesData]     = useState([]);
  const [finLista,        setFinLista]        = useState([]);
  const [prevMesGanhos,   setPrevMesGanhos]   = useState(0);
  const [prevMesDespesas, setPrevMesDespesas] = useState(0);
  const [clienteNomes,    setClienteNomes]    = useState({});

  const carregarDados = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { setLoading(false); return; }

    const { hoje, semanaInicio, semanaFim, mesInicio, mesFim } = getDateRanges();
    const { start: mes6Start, end: mes6End } = get6MonthRange();

    const [mesRes, hojeRes, semRes, finRes, despRes, seisMesesRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', mesInicio)
        .lte('data_hora', mesFim),

      supabase
        .from('agendamentos')
        .select('valor, data_hora, clientes(nome), servicos(nome)')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', `${hoje}T00:00:00`)
        .lte('data_hora', `${hoje}T23:59:59`)
        .order('data_hora'),

      supabase
        .from('agendamentos')
        .select('valor, data_hora')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', semanaInicio)
        .lte('data_hora', semanaFim),

      supabase
        .from('financeiro')
        .select('metodo_pagamento, valor, created_at, categoria, cliente_id')
        .eq('profissional_id', uid)
        .eq('tipo', 'receita')
        .order('created_at', { ascending: false }),

      supabase
        .from('financeiro')
        .select('valor, recorrencia, data_despesa, status_pagamento, parcela_atual, total_parcelas')
        .eq('profissional_id', uid)
        .eq('tipo', 'despesa'),

      supabase
        .from('agendamentos')
        .select('valor, data_hora')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', mes6Start)
        .lte('data_hora', mes6End),
    ]);

    const soma = rows => (rows ?? []).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

    setGanhosMes(soma(mesRes.data));
    setGanhosHoje(soma(hojeRes.data));
    setGanhosHojeCount(hojeRes.data?.length ?? 0);
    setGanhosSemana(soma(semRes.data));

    const mesAtual = new Date();
    const mesAtualNum = mesAtual.getMonth();
    const anoAtual    = mesAtual.getFullYear();

    const despesasDoMes = (despRes.data ?? []).filter(d => {
      const rec = d.recorrencia ?? 'variavel';
      if (rec === 'fixa') {
        return d.status_pagamento !== 'concluida' && d.status_pagamento !== 'paga';
      }
      if (rec === 'parcelada') {
        return (
          d.status_pagamento !== 'concluida' &&
          d.status_pagamento !== 'paga' &&
          d.parcela_atual != null &&
          d.total_parcelas != null &&
          d.parcela_atual <= d.total_parcelas
        );
      }
      // variavel: compara mês/ano local para evitar problema de timezone
      const ref = d.data_despesa ? new Date(`${d.data_despesa}T12:00:00`) : new Date(d.created_at);
      return ref.getMonth() === mesAtualNum && ref.getFullYear() === anoAtual;
    });

    setDespesasMes(soma(despesasDoMes));

    const lucroCheck = soma(mesRes.data) - soma(despesasDoMes);
    const mesKey = `${mesAtual.getFullYear()}-${String(mesAtualNum + 1).padStart(2, '0')}`;

    const storedMeta = await AsyncStorage.getItem('auren:metas').catch(() => null);

    let metaMensalLocal = 0;
    try {
      if (storedMeta) metaMensalLocal = parseFloat(JSON.parse(storedMeta).meta_mensal) || 0;
    } catch {}
    setMetaMensal(metaMensalLocal);

    if (!roiShownRef.current && lucroCheck > 0) {
      let marcoAtingido = null;
      if (metaMensalLocal > 0) {
        const roiPct = (lucroCheck / metaMensalLocal) * 100;
        for (const marco of [100, 75, 50, 25]) {
          if (roiPct >= marco) {
            const stored = await AsyncStorage.getItem(`auren:roi_indicacao_${mesKey}-${marco}`).catch(() => null);
            if (!stored) marcoAtingido = marco;
            break;
          }
        }
      } else {
        const stored = await AsyncStorage.getItem(`auren:roi_indicacao_${mesKey}`).catch(() => null);
        if (!stored) marcoAtingido = 0;
      }

      if (marcoAtingido !== null) {
        roiShownRef.current = true;
        let subtitle = '';
        if (marcoAtingido === 100) {
          subtitle = 'Você atingiu 100% da meta este mês. Que tal ajudar outras profissionais a chegarem onde você chegou?';
        } else if (marcoAtingido > 0) {
          subtitle = `Você atingiu ${marcoAtingido}% da sua meta mensal. Conhece alguém que merece o mesmo resultado?`;
        } else {
          subtitle = 'Você fechou o mês no lucro. Conhece alguma profissional que merece o mesmo resultado?';
        }
        setRoiMarco(marcoAtingido);
        setRoiSubtitle(subtitle);
        setRoiModal(true);
      }
    }

    const byMethod = {};
    for (const row of finRes.data ?? []) {
      const key = row.metodo_pagamento ?? 'outro';
      byMethod[key] = (byMethod[key] || 0) + (parseFloat(row.valor) || 0);
    }
    setPagamentos(byMethod);
    setChartMonths(groupByMonth(seisMesesRes.data));
    setAgendHoje(hojeRes.data ?? []);
    setAgendSemana(semRes.data ?? []);
    setSeisMesData(seisMesesRes.data ?? []);
    setFinLista(finRes.data ?? []);
    const cIds = [...new Set((finRes.data ?? []).filter(r => r.cliente_id).map(r => r.cliente_id))];
    if (cIds.length > 0) {
      const { data: cNomesData } = await supabase.from('clientes').select('id, nome').in('id', cIds);
      const cMap = {};
      (cNomesData ?? []).forEach(c => { cMap[c.id] = c.nome; });
      setClienteNomes(cMap);
    }

    const padx = n => String(n).padStart(2, '0');
    const prevMo = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1);
    const prevStr = `${prevMo.getFullYear()}-${padx(prevMo.getMonth() + 1)}`;
    setPrevMesGanhos((seisMesesRes.data ?? []).filter(r => r.data_hora?.startsWith(prevStr)).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0));
    setPrevMesDespesas(soma((despRes.data ?? []).filter(d => {
      if ((d.recorrencia ?? 'variavel') !== 'variavel') return false;
      const ref = d.data_despesa ? new Date(`${d.data_despesa}T12:00:00`) : new Date(d.created_at);
      return ref.getMonth() === prevMo.getMonth() && ref.getFullYear() === prevMo.getFullYear();
    })));

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

        <TouchableOpacity style={styles.mainCard} onPress={() => setMesMModal(true)} activeOpacity={0.88}>
          <Text style={styles.mainCardLabel}>GANHOS DO MÊS</Text>
          <Text style={styles.mainCardValue}>{fmt(ganhosMes)}</Text>
          <Text style={styles.mainCardSub}>
            {metaMensal > 0
              ? `Meta ${fmt(metaMensal)} · faltam ${fmt(metaLeft)}`
              : 'Sem meta definida — configure em Metas'}
          </Text>
          <ProgressBar progress={monthPct} />
          <Text style={styles.mainCardPct}>{monthPct}% da meta</Text>
        </TouchableOpacity>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Faturamento — Últimos 6 meses</Text>
          <BarChart
            data={{
              labels: chartMonths.labels,
              datasets: [{
                data: chartMonths.values,
                colors: chartMonths.labels.map((_, i) =>
                  i === 5
                    ? (opacity) => `rgba(168,35,90,${opacity})`
                    : (opacity) => `rgba(58,42,46,${opacity})`
                ),
              }],
            }}
            width={Dimensions.get('window').width - 64}
            height={180}
            fromZero
            withInnerLines={false}
            withCustomBarColorFromData
            flatColor
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: isDark ? '#1A1B1E' : '#FFFFFF',
              backgroundGradientTo: isDark ? '#1A1B1E' : '#FFFFFF',
              decimalPlaces: 0,
              color: () => isDark ? '#C9A8B6' : '#6B4A58',
              labelColor: () => isDark ? '#C9A8B6' : '#6B4A58',
              propsForLabels: { fontSize: 10 },
              paddingRight: 64,
            }}
            style={{ borderRadius: 12 }}
          />
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { flex: 1 }]} onPress={() => setHojeModal(true)} activeOpacity={0.85}>
            <Text style={styles.statLabel}>HOJE</Text>
            <Text style={styles.statValue}>{fmt(ganhosHoje)}</Text>
            <Text style={styles.statSub}>
              {ganhosHojeCount} {ganhosHojeCount === 1 ? 'atendimento' : 'atendimentos'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { flex: 1 }]} onPress={() => setSemanaModal(true)} activeOpacity={0.85}>
            <Text style={styles.statLabel}>ESTA SEMANA</Text>
            <Text style={styles.statValue}>{fmt(ganhosSemana)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { flex: 1 }]} onPress={() => navigation.navigate('Despesas')} activeOpacity={0.85}>
            <Text style={styles.statLabel}>DESPESAS DO MÊS</Text>
            <Text style={[styles.statValue, styles.valueRed]}>{fmt(despesasMes)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { flex: 1 }]} onPress={() => setLucroModal(true)} activeOpacity={0.85}>
            <Text style={styles.statLabel}>LUCRO REAL</Text>
            <Text style={[styles.statValue, lucroReal >= 0 ? styles.valueGreen : styles.valueRed]}>
              {fmt(lucroReal)}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Pagamentos recebidos</Text>
        <View style={styles.payGrid}>
          {payRows.map((row, ri) => (
            <View key={ri} style={styles.payRow}>
              {row.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={{ flex: 1 }}
                  onPress={() => { setPagModalKey(p.key); setPagModal(true); }}
                  activeOpacity={0.85}
                >
                  <PaymentCard abbr={p.abbr} label={p.label} bg={p.bg} color={p.color} value={fmt(pagamentos[p.key] || 0)} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Metas</Text>
        <TouchableOpacity style={styles.metasCard} onPress={() => navigation.navigate('Metas')} activeOpacity={0.85}>
          <MetaBar
            label="Meta mensal"
            current={ganhosMes}
            total={metaMensal}
          />
        </TouchableOpacity>

      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setEntradaModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Modal: Ganhos do Mês ── */}
      <Modal visible={mesMModal} transparent animationType="slide" onRequestClose={() => setMesMModal(false)}>
        <View style={bss.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setMesMModal(false)} activeOpacity={1} />
          <View style={bss.sheet}>
            <View style={bss.handle} />
            <Text style={bss.title}>{MONTHS[new Date().getMonth()]} · {fmt(ganhosMes)}</Text>
            {(() => {
              const dc = getDailyChartMes(seisMesData);
              const chartW = Math.max(Dimensions.get('window').width - 40, dc.values.length * 22);
              const padx = n => String(n).padStart(2, '0');
              const now = new Date();
              const mesPrefix = `${now.getFullYear()}-${padx(now.getMonth() + 1)}`;
              const mesCount = seisMesData.filter(r => r.data_hora?.startsWith(mesPrefix)).length;
              const ticket = mesCount > 0 ? ganhosMes / mesCount : 0;
              const diff = ganhosMes - prevMesGanhos;
              const diffTxt = diff >= 0
                ? `↑ ${fmt(diff)} a mais que ${MONTHS_SHORT[new Date(now.getFullYear(), now.getMonth() - 1).getMonth()]}`
                : `↓ ${fmt(Math.abs(diff))} a menos que ${MONTHS_SHORT[new Date(now.getFullYear(), now.getMonth() - 1).getMonth()]}`;
              return (
                <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <Text style={bss.chartTitle}>FATURAMENTO POR DIA</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={{ labels: dc.labels, datasets: [{ data: dc.values.map(v => v || 0.01) }] }}
                      width={chartW}
                      height={140}
                      fromZero
                      withInnerLines={false}
                      chartConfig={{ backgroundColor: 'transparent', backgroundGradientFrom: isDark ? '#1A1B1E' : '#FFFFFF', backgroundGradientTo: isDark ? '#1A1B1E' : '#FFFFFF', decimalPlaces: 0, color: () => isDark ? '#C9A8B6' : '#6B4A58', labelColor: () => isDark ? '#C9A8B6' : '#6B4A58', fillShadowGradient: '#A8235A', fillShadowGradientOpacity: 1, propsForLabels: { fontSize: 9 }, paddingRight: 40 }}
                      style={{ borderRadius: 12 }}
                    />
                  </ScrollView>
                  <Text style={bss.compText}>Média por atendimento: {fmt(ticket)}</Text>
                  <Text style={bss.compText}>{diffTxt} ({fmt(prevMesGanhos)}).</Text>
                  <View style={{ height: 24 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Hoje ── */}
      <Modal visible={hojeModal} transparent animationType="slide" onRequestClose={() => setHojeModal(false)}>
        <View style={bss.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setHojeModal(false)} activeOpacity={1} />
          <View style={bss.sheet}>
            <View style={bss.handle} />
            <Text style={bss.title}>Hoje · {fmt(ganhosHoje)}</Text>
            {agendHoje.length === 0 ? (
              <Text style={bss.empty}>Nenhum atendimento hoje ainda.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {agendHoje.map((a, i) => (
                  <View key={i} style={[bss.row, i > 0 && bss.rowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={bss.rowTitle}>{a.clientes?.nome ?? 'Cliente'}</Text>
                      <Text style={bss.rowSub}>{a.servicos?.nome ?? '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={bss.rowAccent}>{new Date(a.data_hora).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                      <Text style={bss.rowSub}>{fmt(a.valor ?? 0)}</Text>
                    </View>
                  </View>
                ))}
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Esta Semana ── */}
      <Modal visible={semanaModal} transparent animationType="slide" onRequestClose={() => setSemanaModal(false)}>
        <View style={bss.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSemanaModal(false)} activeOpacity={1} />
          <View style={bss.sheet}>
            <View style={bss.handle} />
            <Text style={bss.title}>Esta semana · {fmt(ganhosSemana)}</Text>
            {(() => {
              const wc = getDailyChartSemana(agendSemana);
              const pastVals = wc.values.slice(0, wc.mondayOffset + 1);
              const maxVal = Math.max(...pastVals);
              const maxIdx = wc.values.findIndex((v, i) => i <= wc.mondayOffset && v === maxVal);
              const compTxt = maxVal === 0
                ? 'Sem faturamento esta semana ainda.'
                : maxIdx === wc.mondayOffset && maxVal > 0
                ? `Hoje é o melhor dia da semana — ${fmt(maxVal)}.`
                : `Melhor dia: ${wc.labels[maxIdx]} · ${fmt(maxVal)}.`;
              return (
                <>
                  <Text style={bss.chartTitle}>FATURAMENTO POR DIA</Text>
                  <BarChart
                    data={{ labels: wc.labels, datasets: [{ data: wc.values.map((v, i) => v || 0.01), colors: wc.labels.map((_, i) => i === maxIdx ? () => '#A8235A' : () => (isDark ? '#3A2A2E' : '#E6D8CF')) }] }}
                    width={Dimensions.get('window').width - 40}
                    height={160}
                    fromZero
                    withInnerLines={false}
                    withCustomBarColorFromData
                    flatColor
                    chartConfig={{ backgroundColor: 'transparent', backgroundGradientFrom: isDark ? '#1A1B1E' : '#FFFFFF', backgroundGradientTo: isDark ? '#1A1B1E' : '#FFFFFF', decimalPlaces: 0, color: () => isDark ? '#C9A8B6' : '#6B4A58', labelColor: () => isDark ? '#C9A8B6' : '#6B4A58', propsForLabels: { fontSize: 10 }, paddingRight: 64 }}
                    style={{ borderRadius: 12 }}
                  />
                  <Text style={bss.compText}>{compTxt}</Text>
                  <View style={{ height: 24 }} />
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Lucro Real ── */}
      <Modal visible={lucroModal} transparent animationType="slide" onRequestClose={() => setLucroModal(false)}>
        <View style={bss.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setLucroModal(false)} activeOpacity={1} />
          <View style={bss.sheet}>
            <View style={bss.handle} />
            <Text style={bss.title}>Lucro Real</Text>
            {(() => {
              const prevLucro = prevMesGanhos - prevMesDespesas;
              const diffLucro = lucroReal - prevLucro;
              const now = new Date();
              const curDay = now.getDate();
              const daysInMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const dailyAvg = curDay > 0 ? ganhosMes / curDay : 0;
              const projecao = dailyAvg * daysInMes;
              const projLucro = projecao - despesasMes;
              const diffTxt = diffLucro >= 0
                ? `↑ ${fmt(Math.abs(diffLucro))} a mais que mês anterior (${fmt(prevLucro)})`
                : `↓ ${fmt(Math.abs(diffLucro))} a menos que mês anterior (${fmt(prevLucro)})`;
              return (
                <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <View style={bss.eqRow}><Text style={bss.eqLabel}>Ganhos</Text><Text style={bss.eqVal}>{fmt(ganhosMes)}</Text></View>
                  <View style={bss.eqRow}><Text style={bss.eqLabel}>− Despesas</Text><Text style={[bss.eqVal, { color: '#F87171' }]}>{fmt(despesasMes)}</Text></View>
                  <View style={bss.eqDivider} />
                  <Text style={[bss.eqTotal, { color: lucroReal >= 0 ? '#4ade80' : '#F87171' }]}>{fmt(lucroReal)}</Text>
                  <Text style={bss.compText}>{diffTxt}.</Text>
                  <Text style={bss.compText}>Projeção até dia {daysInMes}: {fmt(projLucro)} de lucro ({fmt(projecao)} em ganhos).</Text>
                  <View style={{ height: 24 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Pagamento ── */}
      <Modal visible={pagModal} transparent animationType="slide" onRequestClose={() => setPagModal(false)}>
        <View style={bss.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPagModal(false)} activeOpacity={1} />
          <View style={bss.sheet}>
            <View style={bss.handle} />
            {(() => {
              const meta = PAYMENT_META.find(p => p.key === pagModalKey);
              const txs = finLista.filter(r => r.metodo_pagamento === pagModalKey);
              return (
                <>
                  <Text style={bss.title}>{meta?.label ?? pagModalKey} · {fmt(pagamentos[pagModalKey] || 0)}</Text>
                  {txs.length === 0 ? (
                    <Text style={bss.empty}>Nenhuma transação registrada.</Text>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                      {txs.map((t, i) => {
                        const d = new Date(t.created_at);
                        const dtStr = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
                        return (
                          <View key={i} style={[bss.row, i > 0 && bss.rowBorder]}>
                            <View style={{ flex: 1 }}>
                              <Text style={bss.rowTitle}>{t.categoria || 'Entrada manual'}</Text>
                              <Text style={bss.rowSub}>{t.cliente_id ? (clienteNomes[t.cliente_id] ?? '—') : 'Cliente não identificado'}</Text>
                            </View>
                            <Text style={bss.rowSub}>{dtStr}</Text>
                            <Text style={[bss.rowAccent, { marginLeft: 12 }]}>{fmt(t.valor)}</Text>
                          </View>
                        );
                      })}
                      <View style={{ height: 24 }} />
                    </ScrollView>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <EntradaManualModal
        visible={entradaModalVisible}
        onClose={() => setEntradaModalVisible(false)}
        onSaved={() => {
          setEntradaModalVisible(false);
          carregarDados();
        }}
      />

      <IndicacaoModal
        visible={roiModal}
        momento="roi"
        title="Você está no lucro!"
        subtitle={roiSubtitle}
        showImport
        onClose={async (enviou) => {
          setRoiModal(false);
          if (enviou) {
            const now = new Date();
            const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (roiMarco > 0) {
              await AsyncStorage.setItem(`auren:roi_indicacao_${mk}-${roiMarco}`, '1');
            } else {
              await AsyncStorage.setItem(`auren:roi_indicacao_${mk}`, '1');
            }
          }
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

    chartCard: {
      backgroundColor: card, borderRadius: 16,
      paddingTop: 20, paddingBottom: 4,
      marginBottom: 12, overflow: 'hidden',
    },
    chartTitle: {
      fontSize: 11, fontWeight: '700', color: colors.primary,
      letterSpacing: 1.5, marginBottom: 4, paddingHorizontal: 20,
    },

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

  clienteListBox:      { backgroundColor: MINPUT_BG, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  clienteItem:         { paddingHorizontal: 16, paddingVertical: 13 },
  clienteItemBorder:   { borderBottomWidth: 1, borderBottomColor: MSUBTLE },
  clienteItemText:     { fontSize: 14, fontWeight: '500', color: '#F5EDE8' },
  clienteSelectedRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: MINPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, gap: 10 },
  clienteSelectedText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#F5EDE8' },
  clienteClearBtn:     { fontSize: 16, color: '#C9A8B6', fontWeight: '600' },
});

// ─── Bottom-sheet styles (theme-aware) ───────────────────────────────────────

function makeBss(isDark) {
  const card = isDark ? '#1A1B1E' : '#FFFFFF';
  const text = isDark ? '#F5EDE8' : '#1A0A14';
  const sub  = isDark ? '#C9A8B6' : '#6B4A58';
  const div  = isDark ? '#2A2A2A' : '#E6D8CF';
  return StyleSheet.create({
    backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    sheet:       { backgroundColor: card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: '80%' },
    handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: div, alignSelf: 'center', marginBottom: 16 },
    title:       { fontSize: 18, fontWeight: '800', color: text, marginBottom: 16 },
    chartTitle:  { fontSize: 10, fontWeight: '700', color: '#A8235A', letterSpacing: 1.2, marginBottom: 4 },
    compText:    { fontSize: 13, fontWeight: '400', color: sub, marginTop: 8, lineHeight: 20 },
    empty:       { fontSize: 14, color: sub, textAlign: 'center', paddingVertical: 28 },
    row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    rowBorder:   { borderTopWidth: 1, borderTopColor: div },
    rowTitle:    { fontSize: 14, fontWeight: '600', color: text, marginBottom: 2 },
    rowSub:      { fontSize: 12, fontWeight: '400', color: sub },
    rowAccent:   { fontSize: 13, fontWeight: '700', color: '#A8235A' },
    eqRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    eqLabel:     { fontSize: 16, fontWeight: '500', color: sub },
    eqVal:       { fontSize: 20, fontWeight: '800', color: text },
    eqDivider:   { height: 1, backgroundColor: div, marginVertical: 10 },
    eqTotal:     { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  });
}
