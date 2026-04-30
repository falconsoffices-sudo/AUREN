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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'sugestoes',  label: 'Sugestões'  },
  { key: 'duvidas',    label: 'Dúvidas'    },
  { key: 'novidades',  label: 'Novidades'  },
  { key: 'parcerias',  label: 'Parcerias'  },
];

const STATUS_CFG = {
  em_analise:   { label: 'Em análise',   color: '#FBBF24' },
  aceito:       { label: 'Aceito',       color: '#34D399' },
  implementado: { label: 'Implementado', color: '#A8235A' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nome) {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : p[0].slice(0, 2).toUpperCase();
}

function formatDt(dt) {
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProAvatar({ nome, size = 36 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarTxt, { fontSize: Math.round(size * 0.36) }]}>
        {initials(nome)}
      </Text>
    </View>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <View style={[styles.statusBadge, {
      borderColor: cfg.color + '55',
      backgroundColor: cfg.color + '1A',
    }]}>
      <Text style={[styles.statusBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function PostCard({ post, votou, onVotar }) {
  const nome = post.autor?.nome ?? 'Profissional';
  return (
    <View style={styles.postCard}>
      <View style={styles.postTop}>
        <ProAvatar nome={nome} size={34} />
        <View style={styles.postTopInfo}>
          <Text style={styles.postAutor} numberOfLines={1}>{nome}</Text>
          <Text style={styles.postDt}>{formatDt(post.created_at)}</Text>
        </View>
        <StatusBadge status={post.status} />
      </View>

      <Text style={styles.postTitulo}>{post.titulo}</Text>
      {!!post.conteudo && (
        <Text style={styles.postBody} numberOfLines={3}>{post.conteudo}</Text>
      )}

      <TouchableOpacity
        style={[styles.votoBtn, votou && styles.votoBtnOn]}
        onPress={() => onVotar(post.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.votoArrow, votou && styles.votoArrowOn]}>▲</Text>
        <Text style={[styles.votoCount, votou && styles.votoCountOn]}>{post.votos}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommunityScreen({ navigation }) {
  const [uid,        setUid]        = useState(null);
  const [tab,        setTab]        = useState('sugestoes');
  const [posts,      setPosts]      = useState([]);
  const [meusVotos,  setMeusVotos]  = useState(new Set());
  const [implCount,  setImplCount]  = useState(0);
  const [loading,    setLoading]    = useState(true);

  // Modal novo post
  const [modal,      setModal]      = useState(false);
  const [novoTit,    setNovoTit]    = useState('');
  const [novoCat,    setNovoCat]    = useState('sugestoes');
  const [novoBody,   setNovoBody]   = useState('');
  const [enviando,   setEnviando]   = useState(false);

  async function carregar(userId, categoria) {
    const [postsRes, votosRes, implRes] = await Promise.all([
      supabase
        .from('community_posts')
        .select('id, titulo, conteudo, status, votos, created_at, autor:profiles!autor_id(nome)')
        .eq('categoria', categoria)
        .order('votos', { ascending: false })
        .limit(50),
      supabase
        .from('community_votos')
        .select('post_id')
        .eq('usuario_id', userId),
      supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'implementado'),
    ]);

    setPosts(postsRes.data ?? []);
    setMeusVotos(new Set((votosRes.data ?? []).map(v => v.post_id)));
    setImplCount(implRes.count ?? 0);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId || !active) return;
      setUid(userId);
      setLoading(true);
      await carregar(userId, tab);
    })();
    return () => { active = false; };
  }, []));

  async function mudarTab(nova) {
    setTab(nova);
    if (!uid) return;
    setLoading(true);
    await carregar(uid, nova);
  }

  async function votar(postId) {
    if (!uid) return;
    const jáVotou = meusVotos.has(postId);

    // Optimistic
    setMeusVotos(prev => {
      const s = new Set(prev);
      jáVotou ? s.delete(postId) : s.add(postId);
      return s;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, votos: p.votos + (jáVotou ? -1 : 1) } : p
    ));

    const { data, error } = await supabase.rpc('toggle_voto', {
      p_post_id: postId,
      p_usuario_id: uid,
    });

    if (error) {
      // Revert
      setMeusVotos(prev => {
        const s = new Set(prev);
        jáVotou ? s.add(postId) : s.delete(postId);
        return s;
      });
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, votos: p.votos + (jáVotou ? 1 : -1) } : p
      ));
      return;
    }

    if (data) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, votos: data.votos } : p
      ));
    }
  }

  async function publicar() {
    if (!novoTit.trim()) {
      Alert.alert('Campo obrigatório', 'Digite um título para o post.');
      return;
    }
    if (!novoBody.trim()) {
      Alert.alert('Campo obrigatório', 'Digite os detalhes do post.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from('community_posts').insert({
      autor_id:  uid,
      categoria: novoCat,
      titulo:    novoTit.trim(),
      conteudo:  novoBody.trim(),
    });
    setEnviando(false);
    if (error) {
      Alert.alert('Erro', 'Não foi possível publicar. Tente novamente.');
      return;
    }
    setModal(false);
    setNovoTit('');
    setNovoBody('');
    setNovoCat('sugestoes');
    if (novoCat === tab) {
      setLoading(true);
      await carregar(uid, tab);
    }
  }

  function fecharModal() {
    setModal(false);
    setNovoTit('');
    setNovoBody('');
    setNovoCat('sugestoes');
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Auren Community</Text>
          <Text style={styles.headerSub}>Sua voz melhora o app</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* ── Implementados banner ── */}
      {implCount > 0 && (
        <View style={styles.implBanner}>
          <Text style={styles.implTxt}>
            {'🚀 '}
            <Text style={styles.implNum}>{implCount}</Text>
            {implCount === 1
              ? ' ideia implementada graças à comunidade'
              : ' ideias implementadas graças à comunidade'}
          </Text>
        </View>
      )}

      {/* ── Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnOn]}
            onPress={() => mudarTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Lista ── */}
      {loading ? (
        <ActivityIndicator color="#A8235A" style={{ marginTop: 60 }} />
      ) : posts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTxt}>Nenhum post ainda. Seja a primeira!</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              votou={meusVotos.has(p.id)}
              onVotar={votar}
            />
          ))}
          <View style={{ height: 88 }} />
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Modal novo post ── */}
      <Modal
        visible={modal}
        transparent
        animationType="slide"
        onRequestClose={fecharModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={fecharModal} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Novo post</Text>

              <Text style={styles.modalLabel}>CATEGORIA</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catScroll}
                contentContainerStyle={styles.catContent}
              >
                {TABS.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.catChip, novoCat === t.key && styles.catChipOn]}
                    onPress={() => setNovoCat(t.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catChipTxt, novoCat === t.key && styles.catChipTxtOn]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>TÍTULO</Text>
              <TextInput
                style={styles.modalInput}
                value={novoTit}
                onChangeText={setNovoTit}
                placeholder="Resuma sua ideia em uma linha"
                placeholderTextColor="#555560"
                maxLength={120}
              />

              <Text style={styles.modalLabel}>DETALHES</Text>
              <TextInput
                style={[styles.modalInput, styles.modalArea]}
                value={novoBody}
                onChangeText={setNovoBody}
                placeholder="Explique com mais detalhes..."
                placeholderTextColor="#555560"
                multiline
                maxLength={800}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.publicarBtn, enviando && { opacity: 0.6 }]}
                onPress={publicar}
                activeOpacity={0.85}
                disabled={enviando}
              >
                {enviando
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.publicarBtnTxt}>Publicar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

  implBanner: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(168,35,90,0.10)', borderWidth: 1,
    borderColor: 'rgba(168,35,90,0.28)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  implTxt: { fontSize: 12, color: '#C9A8B6', textAlign: 'center' },
  implNum: { fontWeight: '800', color: '#A8235A' },

  tabsScroll:  { flexGrow: 0, marginBottom: 12 },
  tabsContent: { paddingHorizontal: 16, flexDirection: 'row', gap: 8 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: SUBTLE,
  },
  tabBtnOn:  { backgroundColor: '#A8235A', borderColor: '#A8235A' },
  tabTxt:    { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },
  tabTxtOn:  { color: '#FFFFFF' },

  scroll: { paddingHorizontal: 16, paddingTop: 2 },

  // Post card
  postCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  postTop:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postTopInfo: { flex: 1 },
  postAutor:   { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  postDt:      { fontSize: 11, color: '#8A8A8E', marginTop: 1 },
  postTitulo:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  postBody:    { fontSize: 13, color: '#8A8A8E', lineHeight: 19, marginBottom: 12 },

  avatar:    { backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#FFFFFF', fontWeight: '800' },

  statusBadge:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '700' },

  votoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: SUBTLE, backgroundColor: '#0E0F11',
  },
  votoBtnOn:    { borderColor: '#A8235A', backgroundColor: 'rgba(168,35,90,0.12)' },
  votoArrow:    { fontSize: 11, color: '#8A8A8E' },
  votoArrowOn:  { color: '#A8235A' },
  votoCount:    { fontSize: 13, fontWeight: '700', color: '#8A8A8E' },
  votoCountOn:  { color: '#A8235A' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTxt:  { fontSize: 14, color: '#8A8A8E' },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A8235A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { fontSize: 30, color: '#FFFFFF', lineHeight: 34, marginTop: -2 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: CARD_BG, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: SUBTLE,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle:  { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 18 },
  modalLabel:  { fontSize: 10, fontWeight: '700', color: '#8A8A8E', letterSpacing: 1.2, marginBottom: 8 },
  catScroll:   { flexGrow: 0, marginBottom: 16 },
  catContent:  { flexDirection: 'row', gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: SUBTLE, backgroundColor: '#0E0F11',
  },
  catChipOn:    { backgroundColor: '#A8235A', borderColor: '#A8235A' },
  catChipTxt:   { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },
  catChipTxtOn: { color: '#FFFFFF' },
  modalInput: {
    backgroundColor: '#0E0F11', borderRadius: 10, borderWidth: 1, borderColor: SUBTLE,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#FFFFFF', marginBottom: 14,
  },
  modalArea:      { height: 100 },
  publicarBtn: {
    height: 50, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  publicarBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
