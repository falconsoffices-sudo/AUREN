import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { calcularNivel, NIVEIS_CONFIG } from '../lib/gamificacao';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVEL_COLORS = ['#4ade80', '#FACC15', '#A8235A', '#3B5BA5', '#E8C4A0'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function formatValor(v, formato) {
  switch (formato) {
    case 'pct':   return `${Math.round(v)}%`;
    case 'moeda': return `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    default:      return String(Math.round(v));
  }
}

function getAtual(key, dados) {
  switch (key) {
    case 'clientes':    return dados.totalClientes;
    case 'agendaPct':   return dados.agendaPct;
    case 'faturamento': return dados.faturamento;
    case 'totalAgend':  return dados.totalAgend;
    default:            return 0;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct, color, height = 6 }) {
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[
        styles.progressFill,
        { width: `${clamp(pct, 2, 100)}%`, backgroundColor: color, height },
      ]} />
    </View>
  );
}

function CriterioBar({ criterio, atual, color }) {
  const pct  = clamp((atual / criterio.meta) * 100, 0, 100);
  const done = atual >= criterio.meta;
  return (
    <View style={styles.critBarWrap}>
      <View style={styles.critBarHeader}>
        <Text style={styles.critBarLabel}>{criterio.label}</Text>
        <Text style={[styles.critBarVal, done && styles.critBarValDone]}>
          {formatValor(atual, criterio.formato)}
          {' / '}
          {formatValor(criterio.meta, criterio.formato)}
          {done ? '  ✓' : ''}
        </Text>
      </View>
      <ProgressBar pct={pct} color={done ? '#34D399' : color} />
    </View>
  );
}

function NivelCard({ info, isCurrent, dados }) {
  const color  = NIVEL_COLORS[info.nivel - 1];
  const isLast = info.nivel === 5;

  return (
    <View style={[styles.nivelCard, isCurrent && { borderWidth: 1.5, borderColor: color }]}>
      <View style={styles.nivelCardTop}>
        <View style={[styles.nivelBadge, { backgroundColor: color + '22' }]}>
          <Text style={styles.nivelEmoji}>{info.emoji}</Text>
          <Text style={[styles.nivelNum, { color }]}>Nível {info.nivel}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.nivelNome}>{info.nome}</Text>
          <Text style={styles.nivelDesc} numberOfLines={2}>{info.descricao}</Text>
        </View>
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.currentBadgeTxt, { color }]}>ATUAL</Text>
          </View>
        )}
      </View>

      {!isLast && info.criterios.map((c, i) => {
        const atual = dados ? getAtual(c.key, dados) : 0;
        const pct   = clamp((atual / c.meta) * 100, 0, 100);
        return (
          <View key={i} style={styles.criterioRow}>
            <Text style={[styles.criterioCheck, { color: atual >= c.meta ? '#34D399' : '#555560' }]}>
              {atual >= c.meta ? '✓' : '○'}
            </Text>
            <Text style={styles.criterioLabel}>{c.label}</Text>
            <Text style={styles.criterioMeta}>{formatValor(c.meta, c.formato)}</Text>
          </View>
        );
      })}
      {isLast && info.criterios.map((c, i) => (
        <View key={i} style={styles.criterioRow}>
          <Text style={[styles.criterioCheck, { color }]}>✓</Text>
          <Text style={styles.criterioLabel}>{c.label}</Text>
          <Text style={styles.criterioMeta}>{formatValor(c.meta, c.formato)}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GamificacaoScreen({ navigation }) {
  const [loading,    setLoading]    = useState(true);
  const [nivelAtual, setNivelAtual] = useState(1);
  const [dados,      setDados]      = useState(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }

      const result = await calcularNivel(uid);
      if (result) {
        setNivelAtual(result.nivel);
        setDados(result.dados);
      }
      setLoading(false);
    })();
  }, []);

  const currentInfo   = NIVEIS_CONFIG[nivelAtual - 1] ?? NIVEIS_CONFIG[0];
  const nextInfo      = NIVEIS_CONFIG[nivelAtual] ?? null;
  const nivelColor    = NIVEL_COLORS[nivelAtual - 1];
  const progressGeral = (nivelAtual - 1) / 4;

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gamificação</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero card ── */}
        <View style={[styles.heroCard, { borderColor: nivelColor + '55' }]}>
          <Text style={styles.heroEmoji}>{currentInfo.emoji}</Text>
          <Text style={[styles.heroNivel, { color: nivelColor }]}>NÍVEL {nivelAtual}</Text>
          <Text style={styles.heroNome}>{currentInfo.nome}</Text>
          <Text style={styles.heroDesc}>{currentInfo.descricao}</Text>

          <View style={styles.heroProgressWrap}>
            <ProgressBar pct={progressGeral * 100} color={nivelColor} height={8} />
            <View style={styles.heroProgressLabels}>
              <Text style={styles.heroProgressLabel}>Nível 1</Text>
              <Text style={[styles.heroProgressPct, { color: nivelColor }]}>
                {Math.round(progressGeral * 100)}% do caminho
              </Text>
              <Text style={styles.heroProgressLabel}>Nível 5</Text>
            </View>
          </View>

          {/* Stats */}
          {dados && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{dados.totalClientes}</Text>
                <Text style={styles.statLabel}>clientes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{dados.agendaPct}%</Text>
                <Text style={styles.statLabel}>agenda mês</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  ${Number(dados.faturamento).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.statLabel}>faturamento</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Próximo nível: critérios com progresso real ── */}
        {nextInfo && dados && (
          <View style={styles.proximoCard}>
            <Text style={styles.proximoTitle}>
              PARA O NÍVEL {nextInfo.nivel} — {nextInfo.nome.toUpperCase()}
            </Text>
            {nextInfo.criterios.map((c, i) => (
              <CriterioBar
                key={i}
                criterio={c}
                atual={getAtual(c.key, dados)}
                color={NIVEL_COLORS[nextInfo.nivel - 1]}
              />
            ))}
          </View>
        )}

        {nivelAtual === 5 && (
          <View style={styles.eliteCard}>
            <Text style={styles.eliteEmoji}>👑</Text>
            <Text style={styles.eliteTitle}>Você chegou ao topo!</Text>
            <Text style={styles.eliteDesc}>Nível Elite AUREN conquistado. Você é a referência máxima.</Text>
          </View>
        )}

        {/* ── Todos os níveis ── */}
        <Text style={styles.sectionTitle}>TODOS OS NÍVEIS</Text>
        {NIVEIS_CONFIG.map(n => (
          <NivelCard
            key={n.nivel}
            info={n}
            isCurrent={n.nivel === nivelAtual}
            dados={dados}
          />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';
const SUBTLE  = '#2C2C2C';

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
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  // Hero
  heroCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    padding: 24, marginBottom: 16,
    alignItems: 'center', borderWidth: 1,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroNivel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  heroNome:  { fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: 6 },
  heroDesc:  { fontSize: 13, color: colors.gray, textAlign: 'center', marginBottom: 20 },

  heroProgressWrap:   { width: '100%', marginBottom: 20 },
  heroProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  heroProgressLabel:  { fontSize: 10, color: colors.gray },
  heroProgressPct:    { fontSize: 12, fontWeight: '800' },

  progressTrack: { backgroundColor: '#333333', borderRadius: 4, overflow: 'hidden' },
  progressFill:  { borderRadius: 4 },

  statsRow:    { flexDirection: 'row', alignItems: 'center', width: '100%' },
  statBox:     { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 22, fontWeight: '800', color: colors.white },
  statLabel:   { fontSize: 10, color: colors.gray, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: SUBTLE },

  // Próximo nível
  proximoCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 16,
  },
  proximoTitle: {
    fontSize: 10, fontWeight: '800', color: colors.gray,
    letterSpacing: 1.3, marginBottom: 14,
  },

  // Critério bar (para o próximo nível)
  critBarWrap:    { marginBottom: 14 },
  critBarHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  critBarLabel:   { fontSize: 13, fontWeight: '500', color: colors.white },
  critBarVal:     { fontSize: 12, fontWeight: '700', color: colors.gray },
  critBarValDone: { color: '#34D399' },

  // Elite
  eliteCard:  {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E8C4A033',
  },
  eliteEmoji: { fontSize: 40, marginBottom: 10 },
  eliteTitle: { fontSize: 18, fontWeight: '800', color: '#E8C4A0', marginBottom: 6 },
  eliteDesc:  { fontSize: 13, color: colors.gray, textAlign: 'center', lineHeight: 19 },

  // Section
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.gray, letterSpacing: 1.3, marginBottom: 10 },

  // Nível cards
  nivelCard:    { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 10 },
  nivelCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nivelBadge: {
    borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 64,
  },
  nivelEmoji: { fontSize: 22, marginBottom: 2 },
  nivelNum:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  nivelNome:  { fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 3 },
  nivelDesc:  { fontSize: 12, color: colors.gray },
  currentBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  currentBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  criterioRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  criterioCheck: { fontSize: 13, fontWeight: '700', width: 16, textAlign: 'center' },
  criterioLabel: { fontSize: 12, color: colors.gray, flex: 1 },
  criterioMeta:  { fontSize: 12, fontWeight: '700', color: '#555560' },
});
