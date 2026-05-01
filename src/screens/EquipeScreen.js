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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_MEMBROS = 5;

const BENEFITS = [
  {
    emoji: '📅',
    title: 'Agenda unificada',
    sub: 'Veja todos os atendimentos da equipe em um só lugar',
    detail: 'Visualize em tempo real os agendamentos de cada profissional da sua equipe, evite conflitos e maximize o aproveitamento da agenda.',
  },
  {
    emoji: '💰',
    title: 'Faturamento centralizado',
    sub: 'Acompanhe receitas e despesas de cada profissional',
    detail: 'Acompanhe receitas, despesas e lucro de cada profissional separadamente ou consolidado.',
  },
  {
    emoji: '🌱',
    title: 'Crescimento conjunto',
    sub: 'Indique clientes entre a equipe automaticamente',
    detail: 'Quando sua agenda estiver cheia, o AUREN indica automaticamente clientes para profissionais da sua equipe.',
  },
];

const STATUS_COLOR = {
  ativa:    '#34D399',
  pendente: '#FBBF24',
  removida: '#F87171',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function validEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProAvatar({ nome, size = 44 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials(nome)}</Text>
    </View>
  );
}

function MembroCard({ item, onRemover, isOwner }) {
  const isPendente = item.status === 'pendente';
  const nome       = item.perfil?.nome ?? item.email;
  const cidade     = item.perfil?.cidade ?? null;
  const estado     = item.perfil?.estado ?? null;
  const nivel      = item.perfil?.nivel_gamificacao ?? null;

  return (
    <View style={styles.membroCard}>
      <ProAvatar nome={nome} size={48} />

      <View style={styles.membroInfo}>
        <View style={styles.membroNameRow}>
          <Text style={styles.membroNome} numberOfLines={1}>{nome}</Text>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
        </View>

        {isPendente ? (
          <Text style={styles.membroSub}>Convite pendente · {item.email}</Text>
        ) : (
          <>
            {(cidade || estado) && (
              <Text style={styles.membroSub} numberOfLines={1}>
                {[cidade, estado].filter(Boolean).join(', ')}
              </Text>
            )}
            {nivel != null && (
              <View style={styles.nivelBadge}>
                <Text style={styles.nivelText}>NÍVEL {nivel}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {isOwner && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemover(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EquipeScreen({ navigation }) {
  const [loading,      setLoading]      = useState(true);
  const [plano,        setPlano]        = useState(null);
  const [uid,          setUid]          = useState(null);
  const [membros,      setMembros]      = useState([]);
  const [email,        setEmail]        = useState('');
  const [enviando,     setEnviando]     = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const isBusiness = plano === 'business';
  const ativos     = membros.filter(m => m.status !== 'removida');
  const slots      = MAX_MEMBROS - ativos.length;

  async function carregar() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) { setLoading(false); return; }
    setUid(userId);

    const [{ data: prof }, { data: rows }] = await Promise.all([
      supabase.from('profiles').select('plano').eq('id', userId).single(),
      supabase
        .from('equipe')
        .select('id, membro_id, email, status, created_at, perfil:profiles!membro_id(nome, cidade, estado, nivel_gamificacao)')
        .eq('owner_id', userId)
        .neq('status', 'removida')
        .order('created_at', { ascending: true }),
    ]);

    setPlano(prof?.plano ?? 'trial');
    setMembros(rows ?? []);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => {
    setLoading(true);
    carregar();
  }, []));

  async function convidar() {
    if (!validEmail(email)) {
      Alert.alert('E-mail inválido', 'Digite um e-mail válido para enviar o convite.');
      return;
    }
    if (ativos.length >= MAX_MEMBROS) {
      Alert.alert('Equipe cheia', `Você já atingiu o limite de ${MAX_MEMBROS} membros.`);
      return;
    }
    const emailTrim = email.trim().toLowerCase();
    if (ativos.some(m => m.email.toLowerCase() === emailTrim)) {
      Alert.alert('Já convidado', 'Este e-mail já está na equipe ou tem convite pendente.');
      return;
    }

    setEnviando(true);
    const { error } = await supabase
      .from('equipe')
      .insert({ owner_id: uid, email: emailTrim, status: 'pendente' });

    setEnviando(false);
    if (error) {
      Alert.alert('Erro', 'Não foi possível enviar o convite. Tente novamente.');
      return;
    }
    setEmail('');
    Alert.alert('Convite enviado!', `Um convite foi registrado para ${emailTrim}.`);
    carregar();
  }

  async function remover(item) {
    const nome = item.perfil?.nome ?? item.email;
    Alert.alert(
      'Remover membro',
      `Remover ${nome} da equipe?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('equipe')
              .update({ status: 'removida' })
              .eq('id', item.id);
            carregar();
          },
        },
      ],
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Minha Equipe</Text>
          {isBusiness && (
            <View style={styles.businessBadge}>
              <Text style={styles.businessBadgeText}>BUSINESS</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ActivityIndicator color="#A8235A" style={{ marginTop: 80 }} />
      ) : !isBusiness ? (
        /* ── Upsell ── */
        <ScrollView contentContainerStyle={styles.upsellScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.upsellIcon}>👥</Text>
          <Text style={styles.upsellTitle}>Plano Business</Text>
          <Text style={styles.upsellText}>
            Gerencie sua equipe, unifique agendas e acompanhe o faturamento das suas profissionais parceiras em um só lugar.
          </Text>

          {/* Benefit cards — accordion */}
          {BENEFITS.map((b, idx) => {
            const isOpen = expandedCard === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.benefitCard}
                onPress={() => setExpandedCard(isOpen ? null : idx)}
                activeOpacity={0.85}
              >
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitSub}>{b.sub}</Text>
                  {isOpen && <Text style={styles.benefitDetail}>{b.detail}</Text>}
                </View>
                <Text style={styles.benefitChevron}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate('Plans')}
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeBtnText}>Ver planos →</Text>
          </TouchableOpacity>

          <View style={styles.upsellBadge}>
            <Text style={styles.upsellBadgeText}>Disponível no plano Business</Text>
          </View>
        </ScrollView>
      ) : (
        /* ── Business content ── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Slots info ── */}
            <View style={styles.slotsRow}>
              <Text style={styles.slotsLabel}>
                {ativos.length}/{MAX_MEMBROS} membros
              </Text>
              <View style={styles.slotsTrack}>
                {Array.from({ length: MAX_MEMBROS }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.slotDot, i < ativos.length && styles.slotDotFilled]}
                  />
                ))}
              </View>
            </View>

            {/* ── Membros ── */}
            {ativos.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nenhum membro ainda. Convide abaixo.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {ativos.map((m, i) => (
                  <View key={m.id}>
                    <MembroCard item={m} onRemover={remover} isOwner />
                    {i < ativos.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            )}

            {/* ── Convidar ── */}
            <Text style={styles.sectionLabel}>CONVIDAR MEMBRO</Text>
            <View style={styles.card}>
              <Text style={styles.conviteHint}>
                Digite o e-mail da profissional. Ela receberá o convite para entrar na equipe.
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@exemplo.com"
                  placeholderTextColor="#555560"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={slots > 0}
                />
              </View>
              <TouchableOpacity
                style={[styles.convidarBtn, (slots === 0 || enviando) && styles.convidarBtnDisabled]}
                onPress={convidar}
                activeOpacity={0.8}
                disabled={slots === 0 || enviando}
              >
                {enviando ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.convidarBtnText}>
                    {slots === 0 ? 'Equipe cheia' : 'Enviar convite'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 48 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight:  { width: 32 },

  businessBadge: {
    backgroundColor: '#A8235A', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'center',
  },
  businessBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.2 },

  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  slotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  slotsLabel: { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },
  slotsTrack: { flexDirection: 'row', gap: 6 },
  slotDot:       { width: 12, height: 12, borderRadius: 6, backgroundColor: SUBTLE },
  slotDotFilled: { backgroundColor: '#A8235A' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A8A8E',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 20,
  },

  card: {
    backgroundColor: CARD_BG, borderRadius: 16,
    paddingVertical: 4, paddingHorizontal: 16, marginBottom: 4,
  },

  membroCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12,
  },
  avatar:     { backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  membroInfo: { flex: 1 },
  membroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  membroNome:    { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  statusDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  membroSub:     { fontSize: 12, color: '#8A8A8E' },
  nivelBadge: {
    marginTop: 5, backgroundColor: 'rgba(232,196,160,0.12)', borderWidth: 1,
    borderColor: 'rgba(232,196,160,0.25)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start',
  },
  nivelText: { fontSize: 9, fontWeight: '800', color: '#E8C4A0', letterSpacing: 1 },

  removeBtn:     { padding: 6 },
  removeBtnText: { fontSize: 15, color: '#F87171', fontWeight: '700' },

  divider: { height: 1, backgroundColor: SUBTLE },

  emptyWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#8A8A8E' },

  conviteHint: {
    fontSize: 13, color: '#8A8A8E', lineHeight: 19,
    marginTop: 12, marginBottom: 14,
  },
  inputRow: {
    backgroundColor: '#0E0F11', borderRadius: 10,
    borderWidth: 1, borderColor: SUBTLE, marginBottom: 12,
  },
  input: {
    height: 46, paddingHorizontal: 14,
    fontSize: 14, color: '#FFFFFF',
  },
  convidarBtn: {
    height: 48, borderRadius: 12, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  convidarBtnDisabled: { backgroundColor: '#3A1020', opacity: 0.6 },
  convidarBtnText:     { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ── Upsell ──
  upsellScroll: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40,
  },
  upsellIcon:  { fontSize: 52, marginBottom: 20 },
  upsellTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  upsellText:  {
    fontSize: 14, color: '#8A8A8E', textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  benefitCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#1A1B1E', borderRadius: 14,
    padding: 16, marginBottom: 10, width: '100%',
  },
  benefitEmoji:   { fontSize: 26, marginTop: 2, marginRight: 0 },
  benefitTitle:   { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  benefitSub:     { fontSize: 13, color: '#8A8A8E', lineHeight: 18 },
  benefitDetail:  { fontSize: 13, color: '#C9A8B6', lineHeight: 19, marginTop: 10 },
  benefitChevron: { fontSize: 10, color: '#555560', alignSelf: 'center', marginLeft: 10 },

  upgradeBtn: {
    height: 52, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, marginTop: 24, marginBottom: 20, width: '100%',
  },
  upgradeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  upsellBadge: {
    backgroundColor: 'rgba(168,35,90,0.15)', borderWidth: 1,
    borderColor: 'rgba(168,35,90,0.40)', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  upsellBadgeText: { fontSize: 13, fontWeight: '700', color: '#A8235A' },
});
