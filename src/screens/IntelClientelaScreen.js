import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { BarChart } from 'react-native-chart-kit';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoeda(v) {
  return Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function calcDados(agend) {
  const total = agend.length;

  // ── Serviços ─────────────────────────────────────────────────────────────
  const bySvc = {};
  for (const a of agend) {
    const nome = a.servicos?.nome ?? 'Serviço';
    if (!bySvc[nome]) bySvc[nome] = { nome, count: 0, valor: 0 };
    bySvc[nome].count++;
    bySvc[nome].valor += Number(a.valor || 0);
  }
  const svcArr = Object.values(bySvc);
  const topSvcCount = [...svcArr].sort((a, b) => b.count - a.count).slice(0, 5);
  const topSvcValor = [...svcArr].sort((a, b) => b.valor - a.valor).slice(0, 3);

  // ── Clientes ─────────────────────────────────────────────────────────────
  const byCli = {};
  for (const a of agend) {
    const nome = a.clientes?.nome ?? 'Cliente';
    if (!byCli[nome]) byCli[nome] = { nome, count: 0, valor: 0, ultimoServico: '—', ultimaDt: '' };
    byCli[nome].count++;
    byCli[nome].valor += Number(a.valor || 0);
    if (!byCli[nome].ultimaDt || a.data_hora > byCli[nome].ultimaDt) {
      byCli[nome].ultimaDt    = a.data_hora;
      byCli[nome].ultimoServico = a.servicos?.nome ?? '—';
    }
  }
  const cliArr = Object.values(byCli);
  const topCliFreq  = [...cliArr].sort((a, b) => b.count - a.count).slice(0, 5);
  const topCliValor = [...cliArr].sort((a, b) => b.valor - a.valor).slice(0, 5);

  // ── Horário de pico ───────────────────────────────────────────────────────
  const byHora = {};
  for (const a of agend) {
    const h = new Date(a.data_hora).getHours();
    byHora[h] = (byHora[h] ?? 0) + 1;
  }
  const topHoras = Object.entries(byHora)
    .map(([h, c]) => ({ hora: Number(h), count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // ── Dia da semana ─────────────────────────────────────────────────────────
  const byDia = Array(7).fill(0);
  for (const a of agend) byDia[new Date(a.data_hora).getDay()]++;
  const diasRanking = byDia
    .map((c, i) => ({ dia: DIAS_SEMANA[i], count: c }))
    .sort((a, b) => b.count - a.count);

  return { total, topSvcCount, topSvcValor, topCliFreq, topCliValor, topHoras, diasRanking };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, top }) {
  return (
    <Text style={[styles.sectionLabel, top && { marginTop: top }]}>{text}</Text>
  );
}

function Bar({ pct, height = 6 }) {
  return (
    <View style={[styles.barTrack, { height }]}>
      <View style={[styles.barFill, { width: `${Math.max(pct, 2)}%`, height }]} />
    </View>
  );
}

function GraficoServicos({ topSvcCount }) {
  const labels = topSvcCount.map(s =>
    s.nome.length > 10 ? s.nome.slice(0, 10) + '...' : s.nome
  );
  const values = topSvcCount.map(s => s.count);
  return (
    <View style={styles.graficoCard}>
      <Text style={styles.graficoTitle}>Serviços mais realizados</Text>
      <BarChart
        data={{
          labels,
          datasets: [{
            data: values,
            colors: values.map((_, i) =>
              i === 0
                ? (opacity) => `rgba(168,35,90,${opacity})`
                : (opacity) => `rgba(58,42,46,${opacity})`
            ),
          }],
        }}
        width={Dimensions.get('window').width - 40}
        height={200}
        fromZero
        withInnerLines={false}
        withCustomBarColorFromData
        flatColor
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: '#1A1B1E',
          backgroundGradientTo: '#1A1B1E',
          decimalPlaces: 0,
          color: () => '#C8C8CE',
          labelColor: () => '#8A8A8E',
          propsForLabels: { fontSize: 10 },
          paddingRight: 40,
        }}
        style={{ borderRadius: 12 }}
      />
      <View style={styles.graficoList}>
        {topSvcCount.map((s, i) => (
          <View key={i} style={styles.graficoListRow}>
            <Text style={styles.graficoListNome}>{s.nome}</Text>
            <Text style={styles.graficoListValor}>{formatMoeda(s.valor)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RankRow({ rank, title, sub, right, pct, isLast }) {
  return (
    <>
      <View style={styles.rankRow}>
        <Text style={styles.rankNum}>{rank}</Text>
        <View style={styles.rankBody}>
          <View style={styles.rankTitleRow}>
            <Text style={styles.rankTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.rankRight}>{right}</Text>
          </View>
          {sub !== undefined && <Text style={styles.rankSub}>{sub}</Text>}
          {pct !== undefined && <Bar pct={pct} />}
        </View>
      </View>
      {!isLast && <View style={styles.rowDiv} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntelClientelaScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [dados,   setDados]   = useState(null);
  const [vazio,   setVazio]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setLoading(false); setVazio(true); return; }

      const { data: raw } = await supabase
        .from('agendamentos')
        .select('data_hora, valor, servicos(nome), clientes(nome)')
        .eq('profissional_id', uid)
        .neq('status', 'cancelado');

      const agend = raw ?? [];
      if (agend.length === 0) { setVazio(true); setLoading(false); return; }

      setDados(calcDados(agend));
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Inteligência de Clientela</Text>
          <Text style={styles.headerSub}>Análise de todos os atendimentos</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ActivityIndicator color="#A8235A" style={{ marginTop: 80 }} />
      ) : vazio ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Nenhum atendimento registrado ainda.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {dados.topSvcCount.length > 0 && (
            <GraficoServicos topSvcCount={dados.topSvcCount} />
          )}

          {/* ── Serviços mais realizados ── */}
          <SectionLabel text="SEUS SERVIÇOS MAIS REALIZADOS" />
          <View style={styles.card}>
            {dados.topSvcCount.map((s, i) => {
              const pct = (s.count / (dados.topSvcCount[0]?.count || 1)) * 100;
              return (
                <RankRow
                  key={i}
                  rank={i + 1}
                  title={s.nome}
                  sub={`${s.count} realizado${s.count !== 1 ? 's' : ''}`}
                  right={`${Math.round((s.count / Math.max(dados.total, 1)) * 100)}%`}
                  pct={pct}
                  isLast={i === dados.topSvcCount.length - 1}
                />
              );
            })}
          </View>

          {/* ── Serviço que mais gera receita ── */}
          <SectionLabel text="SERVIÇO QUE MAIS GERA RECEITA" top={18} />
          <View style={styles.card}>
            {dados.topSvcValor.map((s, i) => (
              <RankRow
                key={i}
                rank={i + 1}
                title={s.nome}
                sub={`${s.count} realizado${s.count !== 1 ? 's' : ''}`}
                right={formatMoeda(s.valor)}
                isLast={i === dados.topSvcValor.length - 1}
              />
            ))}
          </View>

          {/* ── Clientes mais frequentes ── */}
          <SectionLabel text="CLIENTES MAIS FREQUENTES" top={18} />
          <View style={styles.card}>
            {dados.topCliFreq.map((c, i) => (
              <RankRow
                key={i}
                rank={i + 1}
                title={c.nome}
                sub={`Último: ${c.ultimoServico}`}
                right={`${c.count} visita${c.count !== 1 ? 's' : ''}`}
                isLast={i === dados.topCliFreq.length - 1}
              />
            ))}
          </View>

          {/* ── Clientes que mais gastaram ── */}
          <SectionLabel text="CLIENTES QUE MAIS GASTARAM" top={18} />
          <View style={styles.card}>
            {dados.topCliValor.map((c, i) => (
              <RankRow
                key={i}
                rank={i + 1}
                title={c.nome}
                sub={`${c.count} visita${c.count !== 1 ? 's' : ''}`}
                right={formatMoeda(c.valor)}
                isLast={i === dados.topCliValor.length - 1}
              />
            ))}
          </View>

          {/* ── Horário de pico ── */}
          <SectionLabel text="HORÁRIO DE PICO" top={18} />
          <View style={styles.card}>
            {dados.topHoras.length === 0 ? (
              <Text style={styles.emptyCardText}>Dados insuficientes.</Text>
            ) : dados.topHoras.map((h, i) => (
              <RankRow
                key={i}
                rank={i + 1}
                title={`${h.hora}h – ${h.hora + 1}h`}
                right={`${h.count} agend.`}
                pct={(h.count / (dados.topHoras[0]?.count || 1)) * 100}
                isLast={i === dados.topHoras.length - 1}
              />
            ))}
          </View>

          {/* ── Dia da semana ── */}
          <SectionLabel text="DIA DA SEMANA MAIS MOVIMENTADO" top={18} />
          <View style={styles.card}>
            {dados.diasRanking.map((d, i) => (
              <RankRow
                key={i}
                rank={i + 1}
                title={d.dia}
                right={`${d.count} agend.`}
                pct={(d.count / (dados.diasRanking[0]?.count || 1)) * 100}
                isLast={i === dados.diasRanking.length - 1}
              />
            ))}
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      )}

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
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
  },
  backBtn:      { width: 32, alignItems: 'center' },
  backArrow:    { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub:    { fontSize: 12, color: '#8A8A8E', marginTop: 2 },
  headerRight:  { width: 32 },

  scroll: { paddingHorizontal: 18, paddingTop: 4 },

  graficoCard:     { marginBottom: 18 },
  graficoTitle:    { fontSize: 11, fontWeight: '700', color: '#8A8A8E', letterSpacing: 1.2, marginBottom: 8 },
  graficoList:     { paddingHorizontal: 4, marginTop: 4 },
  graficoListRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  graficoListNome: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },
  graficoListValor:{ fontSize: 13, fontWeight: '700', color: '#C8C8CE' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A8A8E',
    letterSpacing: 1.2, marginBottom: 10,
  },

  card: { backgroundColor: CARD_BG, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 16, marginBottom: 4 },

  rankRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rankNum:      { fontSize: 17, fontWeight: '800', color: '#A8235A', width: 26, flexShrink: 0 },
  rankBody:     { flex: 1, marginLeft: 8 },
  rankTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  rankTitle:    { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1, paddingRight: 8 },
  rankRight:    { fontSize: 13, fontWeight: '700', color: '#C8C8CE', flexShrink: 0 },
  rankSub:      { fontSize: 11, color: '#8A8A8E', marginBottom: 6 },
  rowDiv:       { height: 1, backgroundColor: SUBTLE },

  barTrack: { borderRadius: 3, backgroundColor: SUBTLE, overflow: 'hidden' },
  barFill:  { borderRadius: 3, backgroundColor: '#A8235A' },

  emptyCardText: { fontSize: 13, color: '#8A8A8E', paddingVertical: 12 },
  emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:     { fontSize: 14, color: '#8A8A8E' },
});
