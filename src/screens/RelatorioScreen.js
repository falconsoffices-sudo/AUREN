import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { gerarRelatorioMensal } from '../lib/relatorio';
import { dispararRelatorio } from '../lib/emailRelatorio';
import IndicacaoModal from '../components/IndicacaoModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoeda(v) {
  return Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCell({ label, value, valueColor }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function RankRow({ rank, nome, sub, valor, isLast }) {
  return (
    <>
      <View style={styles.rankRow}>
        <Text style={styles.rankNum}>{rank}</Text>
        <View style={styles.rankBody}>
          <Text style={styles.rankName} numberOfLines={1}>{nome}</Text>
          <Text style={styles.rankSub}>{sub}</Text>
        </View>
        <Text style={styles.rankValue}>{formatMoeda(valor)}</Text>
      </View>
      {!isLast && <View style={styles.rowDivider} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RelatorioScreen({ navigation }) {
  const agora = new Date();
  const [mes,     setMes]     = useState(agora.getMonth() + 1); // 1–12
  const [ano,     setAno]     = useState(agora.getFullYear());
  const [loading,        setLoading]        = useState(false);
  const [dados,          setDados]          = useState(null);
  const [userId,         setUserId]         = useState(null);
  const [enviandoEmail,  setEnviandoEmail]  = useState(false);
  const [indicModal,     setIndicModal]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id);
    });
  }, []);

  const carregar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setDados(await gerarRelatorioMensal(userId, mes, ano));
    } catch (_) {}
    setLoading(false);
  }, [userId, mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  function navMes(delta) {
    let m = mes + delta;
    let a = ano;
    if (m < 1)  { m = 12; a--; }
    if (m > 12) { m = 1;  a++; }
    setMes(m);
    setAno(a);
  }

  async function compartilhar() {
    if (!dados) return;
    const mesNome = MESES[mes - 1];
    const lines = [
      `RELATÓRIO AUREN — ${mesNome.toUpperCase()} ${ano}`,
      '─────────────────────────────────',
      `Atendimentos:      ${dados.totalAtendimentos}`,
      `Faturamento bruto: ${formatMoeda(dados.faturamentoBruto)}`,
      `Despesas:          ${formatMoeda(dados.despesas)}`,
      `Lucro real:        ${formatMoeda(dados.lucroReal)}`,
      '',
      'TOP SERVIÇOS',
      ...dados.topServicos.map((s, i) => `${i + 1}. ${s.nome} — ${s.count}× — ${formatMoeda(s.valor)}`),
      '',
      'TOP CLIENTES',
      ...dados.topClientes.map((c, i) => `${i + 1}. ${c.nome} — ${formatMoeda(c.valor)}`),
      '',
      'Gerado pelo AUREN app',
    ];
    try { await Share.share({ message: lines.join('\n') }); } catch (_) {}
  }

  const mesNome = MESES[mes - 1];
  const maxBar  = dados ? Math.max(dados.faturamentoBruto, dados.despesas, 1) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Relatório Mensal</Text>
          <Text style={styles.headerSub}>{mesNome} {ano}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* ── Month navigator ── */}
      <View style={styles.mesRow}>
        <TouchableOpacity onPress={() => navMes(-1)} hitSlop={{ top:12,bottom:12,left:16,right:16 }}>
          <Text style={styles.mesNav}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.mesTitulo}>{mesNome} {ano}</Text>
        <TouchableOpacity onPress={() => navMes(1)} hitSlop={{ top:12,bottom:12,left:16,right:16 }}>
          <Text style={styles.mesNav}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading || !dados ? (
          <ActivityIndicator color="#A8235A" style={{ marginTop: 64 }} />
        ) : (
          <>
            {/* ── Summary card ── */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <SummaryCell label="Atendimentos"    value={String(dados.totalAtendimentos)} />
                <View style={styles.summaryCellDiv} />
                <SummaryCell label="Faturamento"     value={formatMoeda(dados.faturamentoBruto)} valueColor="#10B981" />
              </View>
              <View style={styles.summaryRowDiv} />
              <View style={styles.summaryRow}>
                <SummaryCell label="Despesas"        value={formatMoeda(dados.despesas)}         valueColor="#EF4444" />
                <View style={styles.summaryCellDiv} />
                <SummaryCell label="Lucro Real"      value={formatMoeda(dados.lucroReal)}
                  valueColor={dados.lucroReal >= 0 ? '#A8235A' : '#EF4444'} />
              </View>
            </View>

            {/* ── Horizontal bar chart ── */}
            <Text style={styles.sectionLabel}>FATURAMENTO VS DESPESAS</Text>
            <View style={styles.card}>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>Faturamento</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(dados.faturamentoBruto / maxBar) * 100}%`, backgroundColor: '#10B981' }]} />
                </View>
                <Text style={styles.barValue}>{formatMoeda(dados.faturamentoBruto)}</Text>
              </View>
              <View style={[styles.barRow, { marginTop: 16 }]}>
                <Text style={styles.barLabel}>Despesas</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(dados.despesas / maxBar) * 100}%`, backgroundColor: '#EF4444' }]} />
                </View>
                <Text style={styles.barValue}>{formatMoeda(dados.despesas)}</Text>
              </View>
            </View>

            {/* ── Top serviços ── */}
            <Text style={styles.sectionLabel}>TOP SERVIÇOS</Text>
            <View style={styles.card}>
              {dados.topServicos.length === 0
                ? <Text style={styles.emptyText}>Nenhum serviço registrado neste mês.</Text>
                : dados.topServicos.map((s, i) => (
                  <RankRow
                    key={i}
                    rank={i + 1}
                    nome={s.nome}
                    sub={`${s.count}× realizado${s.count !== 1 ? 's' : ''}`}
                    valor={s.valor}
                    isLast={i === dados.topServicos.length - 1}
                  />
                ))
              }
            </View>

            {/* ── Top clientes ── */}
            <Text style={styles.sectionLabel}>TOP CLIENTES</Text>
            <View style={styles.card}>
              {dados.topClientes.length === 0
                ? <Text style={styles.emptyText}>Nenhuma cliente registrada neste mês.</Text>
                : dados.topClientes.map((c, i) => (
                  <RankRow
                    key={i}
                    rank={i + 1}
                    nome={c.nome}
                    sub={`${c.count} atendimento${c.count !== 1 ? 's' : ''}`}
                    valor={c.valor}
                    isLast={i === dados.topClientes.length - 1}
                  />
                ))
              }
            </View>

            {/* ── Share button ── */}
            <TouchableOpacity style={styles.shareBtn} onPress={compartilhar} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>Compartilhar relatório</Text>
            </TouchableOpacity>

            {/* ── TEST: enviar por email ── */}
            <TouchableOpacity
              style={[styles.shareBtn, styles.emailTestBtn, enviandoEmail && { opacity: 0.6 }]}
              onPress={async () => {
                if (!userId) return;
                setEnviandoEmail(true);
                const result = await dispararRelatorio(userId, mes, ano);
                setEnviandoEmail(false);
                if (result.ok) {
                  Alert.alert('Sucesso', `Relatório de ${MESES[mes - 1]} ${ano} enviado por e-mail.`);
                } else {
                  Alert.alert('Erro', result.error?.message ?? String(result.error ?? 'Erro desconhecido'));
                }
              }}
              disabled={enviandoEmail}
              activeOpacity={0.8}
            >
              {enviandoEmail
                ? <ActivityIndicator color="#A8235A" />
                : <Text style={[styles.shareBtnText, { color: '#A8235A' }]}>Enviar relatório por email (teste)</Text>}
            </TouchableOpacity>

            {/* ── Referral section ── */}
            <View style={styles.indicacaoCard}>
              <Text style={styles.indicacaoTitle}>Compartilhe esse resultado ✨</Text>
              <Text style={styles.indicacaoSub}>
                Conhece alguma profissional que deveria usar o AUREN? Ou uma cliente que gostaria de agendar online?
              </Text>
              <TouchableOpacity
                style={styles.indicacaoBtn}
                onPress={() => setIndicModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.indicacaoBtnText}>Indicar o AUREN</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 48 }} />
          </>
        )}
      </ScrollView>

      <IndicacaoModal
        visible={indicModal}
        momento="relatorio"
        title="Indicar o AUREN"
        subtitle="Indique profissionais ou convide clientes para agendar com as melhores nail pros."
        onClose={enviou => {
          setIndicModal(false);
          if (enviou) Alert.alert('Obrigada!', 'Suas indicações foram enviadas!');
        }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#1A1B1E';
const SUBTLE  = '#2A2A2A';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E0F11' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
  },
  backBtn:      { width: 32, alignItems: 'center' },
  backArrow:    { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub:    { fontSize: 12, color: '#8A8A8E', marginTop: 2 },
  headerRight:  { width: 32 },

  mesRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 28, paddingVertical: 12,
  },
  mesNav:    { fontSize: 28, color: '#A8235A', lineHeight: 30 },
  mesTitulo: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', minWidth: 140, textAlign: 'center' },

  scroll: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 44 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A8A8E',
    letterSpacing: 1.2, marginTop: 18, marginBottom: 10,
  },

  card: { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 4 },

  // Summary
  summaryCard:     { backgroundColor: CARD_BG, borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  summaryRow:      { flexDirection: 'row' },
  summaryRowDiv:   { height: 1, backgroundColor: SUBTLE },
  summaryCell:     { flex: 1, padding: 16, alignItems: 'center' },
  summaryCellDiv:  { width: 1, backgroundColor: SUBTLE },
  summaryLabel:    { fontSize: 11, fontWeight: '600', color: '#8A8A8E', marginBottom: 6, letterSpacing: 0.6 },
  summaryValue:    { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  // Bar chart
  barRow:   { flexDirection: 'row', alignItems: 'center' },
  barLabel: { width: 80, fontSize: 12, fontWeight: '500', color: '#C8C8CE' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: SUBTLE, overflow: 'hidden', marginHorizontal: 10 },
  barFill:  { height: 8, borderRadius: 4 },
  barValue: { width: 72, fontSize: 11, fontWeight: '700', color: '#C8C8CE', textAlign: 'right' },

  // Rank rows
  rankRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rankNum:   { fontSize: 18, fontWeight: '800', color: '#A8235A', width: 28 },
  rankBody:  { flex: 1, marginHorizontal: 10 },
  rankName:  { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  rankSub:   { fontSize: 11, fontWeight: '400', color: '#8A8A8E', marginTop: 2 },
  rankValue: { fontSize: 14, fontWeight: '700', color: '#C8C8CE' },
  rowDivider:{ height: 1, backgroundColor: SUBTLE },

  emptyText: { fontSize: 13, color: '#8A8A8E', paddingVertical: 8 },

  shareBtn: {
    borderWidth: 1, borderColor: '#A8235A', borderRadius: 14,
    height: 50, alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
  },
  shareBtnText:  { fontSize: 14, fontWeight: '700', color: '#A8235A' },
  emailTestBtn:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#A8235A', borderStyle: 'dashed', marginTop: 10 },

  indicacaoCard: {
    backgroundColor: '#1A1B1E', borderRadius: 16,
    padding: 20, marginTop: 24,
    borderLeftWidth: 3, borderLeftColor: '#A8235A',
  },
  indicacaoTitle: { fontSize: 16, fontWeight: '700', color: '#F5EDE8', marginBottom: 8 },
  indicacaoSub:   { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 18, marginBottom: 16 },
  indicacaoBtn: {
    backgroundColor: '#A8235A', borderRadius: 12,
    height: 46, alignItems: 'center', justifyContent: 'center',
  },
  indicacaoBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
