import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

function getLocation(cidade, estado) {
  if (cidade && estado) return `${cidade}, ${estado}`;
  return cidade || estado || null;
}

function nivelStr(n) {
  const labels = { 1: 'Iniciante', 2: 'Em Crescimento', 3: 'Profissional', 4: 'Expert', 5: 'Master' };
  return labels[n] ?? `Nível ${n ?? 1}`;
}

async function sendPushToUser(pushToken, titulo, corpo) {
  if (!pushToken) return;
  fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: pushToken, title: titulo, body: corpo, sound: 'default' }),
  }).catch(() => {});
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProAvatar({ nome, size = 46 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{getInitials(nome)}</Text>
    </View>
  );
}

function ProInfo({ nome, cidade, estado, nivel_gamificacao }) {
  const loc = getLocation(cidade, estado);
  return (
    <View style={styles.proInfo}>
      <Text style={styles.proNome} numberOfLines={1}>{nome}</Text>
      <Text style={styles.proSub} numberOfLines={1}>
        {nivelStr(nivel_gamificacao)}{loc ? ` · ${loc}` : ''}
      </Text>
    </View>
  );
}

function AtivaCard({ pro, atualizando, onRemover }) {
  const busy = atualizando === pro.rowId;
  return (
    <View style={styles.proCard}>
      <ProAvatar nome={pro.nome} />
      <ProInfo {...pro} />
      <TouchableOpacity
        style={styles.btnRemover}
        onPress={() => onRemover(pro.rowId)}
        disabled={busy}
        activeOpacity={0.75}
      >
        {busy
          ? <ActivityIndicator size="small" color="#EF4444" />
          : <Text style={styles.btnRemoverText}>Remover</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function PedidoCard({ pro, atualizando, onAceitar, onRecusar }) {
  const busy = atualizando === pro.rowId;
  return (
    <View style={styles.proCard}>
      <ProAvatar nome={pro.nome} />
      <ProInfo {...pro} />
      <View style={styles.pedidoBtns}>
        <TouchableOpacity
          style={styles.btnAceitar}
          onPress={() => onAceitar(pro.rowId)}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Text style={styles.btnAceitarText}>Aceitar</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnRecusar}
          onPress={() => onRecusar(pro.rowId)}
          disabled={busy}
          activeOpacity={0.75}
        >
          <Text style={styles.btnRecusarText}>Recusar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ResultadoCard({ pro, ativasIds, enviados, pedidosIds, limitAtingido, atualizando, onConvidar }) {
  const busy    = atualizando === pro.id;
  const isAtiva = ativasIds.includes(pro.id);
  const isPend  = enviados.includes(pro.id);
  const isSent  = pedidosIds.includes(pro.id); // they sent ME a request

  let label = 'Convidar';
  let btnStyle = styles.btnConvidar;
  let textStyle = styles.btnConvidarText;
  let disabled = false;

  if (isAtiva)       { label = 'Conectado'; btnStyle = styles.btnConectado; textStyle = styles.btnConectadoText; disabled = true; }
  else if (isPend)   { label = 'Aguardando'; disabled = true; }
  else if (isSent)   { label = 'Aceitar'; btnStyle = styles.btnAceitar; textStyle = styles.btnAceitarText; }
  else if (limitAtingido) { label = '2/2 cheio'; disabled = true; }

  return (
    <View style={[styles.proCard, styles.proCardResult]}>
      <ProAvatar nome={pro.nome} />
      <ProInfo {...pro} />
      <TouchableOpacity
        style={[btnStyle, disabled && styles.btnDisabled]}
        onPress={() => onConvidar(pro)}
        disabled={disabled || busy}
        activeOpacity={0.85}
      >
        {busy
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Text style={textStyle}>{label}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConexoesScreen({ navigation }) {
  const [userId,     setUserId]     = useState(null);
  const [meuNome,    setMeuNome]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [ativas,     setAtivas]     = useState([]);   // { rowId, id, nome, cidade, estado, nivel_gamificacao, push_token }
  const [pedidos,    setPedidos]    = useState([]);   // same shape
  const [enviados,   setEnviados]   = useState([]);   // profile IDs I sent a pending invite to
  const [query,      setQuery]      = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando,   setBuscando]   = useState(false);
  const [atualizando, setAtualizando] = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const carregar = useCallback(async (uid) => {
    if (!uid) return;
    setLoading(true);

    const [sentAceitas, recvAceitas, recvPend, sentPend, myProf] = await Promise.all([
      supabase.from('conexoes').select('id, conexao_id').eq('profissional_id', uid).eq('status', 'aceita'),
      supabase.from('conexoes').select('id, profissional_id').eq('conexao_id', uid).eq('status', 'aceita'),
      supabase.from('conexoes').select('id, profissional_id').eq('conexao_id', uid).eq('status', 'pendente'),
      supabase.from('conexoes').select('conexao_id').eq('profissional_id', uid).eq('status', 'pendente'),
      supabase.from('profiles').select('nome').eq('id', uid).single(),
    ]);

    setMeuNome(myProf.data?.nome ?? '');
    setEnviados((sentPend.data ?? []).map(c => c.conexao_id));

    const ativaMap  = [
      ...(sentAceitas.data ?? []).map(c => ({ rowId: c.id, otherId: c.conexao_id })),
      ...(recvAceitas.data ?? []).map(c => ({ rowId: c.id, otherId: c.profissional_id })),
    ];
    const pedidoMap = (recvPend.data ?? []).map(c => ({ rowId: c.id, otherId: c.profissional_id }));

    const allIds = [...new Set([...ativaMap.map(a => a.otherId), ...pedidoMap.map(p => p.otherId)])];
    let profMap = {};
    if (allIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, nome, cidade, estado, nivel_gamificacao, push_token')
        .in('id', allIds);
      for (const p of (profs ?? [])) profMap[p.id] = p;
    }

    setAtivas(ativaMap.map(a => ({ rowId: a.rowId, ...profMap[a.otherId] })).filter(a => a.id));
    setPedidos(pedidoMap.map(p => ({ rowId: p.rowId, ...profMap[p.otherId] })).filter(p => p.id));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (uid) { setUserId(uid); carregar(uid); }
        else setLoading(false);
      })();
    }, [carregar])
  );

  // ── Search ────────────────────────────────────────────────────────────────

  async function buscar() {
    const q = query.trim();
    if (q.length < 2) { Alert.alert('Busca', 'Digite ao menos 2 caracteres.'); return; }
    setBuscando(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, cidade, estado, nivel_gamificacao, push_token')
      .ilike('nome', `%${q}%`)
      .neq('id', userId)
      .limit(8);
    setResultados(data ?? []);
    setBuscando(false);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function enviarConvite(pro) {
    if (ativas.length >= 2) {
      Alert.alert('Limite atingido', 'Você já tem 2 conexões ativas. Remova uma para adicionar outra.');
      return;
    }
    setAtualizando(pro.id);
    const { error } = await supabase.from('conexoes').insert({
      profissional_id: userId,
      conexao_id:      pro.id,
      status:          'pendente',
    });
    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      sendPushToUser(pro.push_token, 'Nova conexão no AUREN!', `${meuNome} quer se conectar com você.`);
      setEnviados(prev => [...prev, pro.id]);
    }
    setAtualizando(null);
  }

  async function aceitar(rowId) {
    setAtualizando(rowId);
    await supabase.from('conexoes').update({ status: 'aceita' }).eq('id', rowId);
    await carregar(userId);
    setAtualizando(null);
  }

  async function recusar(rowId) {
    setAtualizando(rowId);
    await supabase.from('conexoes').update({ status: 'recusada' }).eq('id', rowId);
    await carregar(userId);
    setAtualizando(null);
  }

  async function remover(rowId) {
    Alert.alert(
      'Remover conexão',
      'Tem certeza que deseja remover esta conexão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            setAtualizando(rowId);
            await supabase.from('conexoes').delete().eq('id', rowId);
            await carregar(userId);
            setAtualizando(null);
          },
        },
      ]
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const ativasIds  = ativas.map(a => a.id);
  const pedidosIds = pedidos.map(p => p.id);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Minhas Conexões</Text>
          <Text style={styles.headerSub}>Colabore com outras profissionais</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color="#A8235A" style={{ marginTop: 64 }} />
        ) : (
          <>
            {/* ── Conexões ativas ── */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>CONEXÕES ATIVAS</Text>
              <Text style={styles.sectionCount}>{ativas.length}/2</Text>
            </View>

            {ativas.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Você ainda não tem conexões ativas.</Text>
              </View>
            ) : ativas.map(pro => (
              <AtivaCard
                key={pro.rowId}
                pro={pro}
                atualizando={atualizando}
                onRemover={remover}
              />
            ))}

            {/* ── Pedidos recebidos ── */}
            {pedidos.length > 0 && (
              <>
                <View style={[styles.sectionHead, { marginTop: 20 }]}>
                  <Text style={styles.sectionLabel}>PEDIDOS RECEBIDOS</Text>
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{pedidos.length}</Text>
                  </View>
                </View>
                {pedidos.map(pro => (
                  <PedidoCard
                    key={pro.rowId}
                    pro={pro}
                    atualizando={atualizando}
                    onAceitar={aceitar}
                    onRecusar={recusar}
                  />
                ))}
              </>
            )}

            {/* ── Buscar profissional ── */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>BUSCAR PROFISSIONAL</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Nome do profissional"
                placeholderTextColor="#555560"
                returnKeyType="search"
                onSubmitEditing={buscar}
                autoCapitalize="words"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={buscar} activeOpacity={0.85}>
                {buscando
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.searchBtnText}>Buscar</Text>
                }
              </TouchableOpacity>
            </View>

            {resultados.length > 0 && (
              <View style={styles.resultadosWrap}>
                {resultados.map(pro => (
                  <ResultadoCard
                    key={pro.id}
                    pro={pro}
                    ativasIds={ativasIds}
                    enviados={enviados}
                    pedidosIds={pedidosIds}
                    limitAtingido={ativas.length >= 2}
                    atualizando={atualizando}
                    onConvidar={enviarConvite}
                  />
                ))}
              </View>
            )}

            {!buscando && query.trim().length >= 2 && resultados.length === 0 && (
              <Text style={styles.semResultados}>Nenhum profissional encontrado.</Text>
            )}

            <View style={{ height: 48 }} />
          </>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#1A1B1E';
const INPUT_BG = '#252528';
const SUBTLE   = '#2A2A2A';

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

  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  sectionHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8A8A8E', letterSpacing: 1.2 },
  sectionCount: { fontSize: 12, fontWeight: '700', color: '#A8235A' },

  badgeCount:     { backgroundColor: '#A8235A', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  badgeCountText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  emptyCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#8A8A8E' },

  proCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
  },
  proCardResult: { marginBottom: 4 },

  avatar:     { backgroundColor: '#3D1020', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  avatarText: { fontWeight: '700', color: '#E8C4A0' },

  proInfo:  { flex: 1, marginRight: 8 },
  proNome:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  proSub:   { fontSize: 12, color: '#8A8A8E' },

  btnRemover:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' },
  btnRemoverText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  pedidoBtns:     { flexDirection: 'column', gap: 6 },
  btnAceitar:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#A8235A', alignItems: 'center' },
  btnAceitarText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  btnRecusar:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: SUBTLE },
  btnRecusarText: { fontSize: 12, fontWeight: '600', color: '#8A8A8E' },

  btnConvidar:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#A8235A' },
  btnConvidarText:  { fontSize: 12, fontWeight: '700', color: '#A8235A' },
  btnConectado:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.15)' },
  btnConectadoText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  btnDisabled:      { opacity: 0.45 },

  searchRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput:  {
    flex: 1, backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#FFFFFF',
  },
  searchBtn:    { backgroundColor: '#A8235A', borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  searchBtnText:{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  resultadosWrap: { marginBottom: 8 },
  semResultados:  { fontSize: 13, color: '#8A8A8E', textAlign: 'center', paddingVertical: 12 },
});
