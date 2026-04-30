import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyPhoneMask(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0)  return '';
  if (d.length <= 3)   return `(${d}`;
  if (d.length <= 6)   return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function buildMensagem(nome) {
  const n = nome.trim() || '[nome]';
  return `Olá ${n}! Estou usando o AUREN para gerenciar minha agenda e adorei. Acho que você vai gostar também! Baixe agora: auren.app`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IndicacaoScreen({ navigation }) {
  const [userId,    setUserId]    = useState(null);
  const [nome,      setNome]      = useState('');
  const [telefone,  setTelefone]  = useState('');
  const [email,     setEmail]     = useState('');
  const [mensagem,  setMensagem]  = useState(buildMensagem(''));
  const [msgTocada, setMsgTocada] = useState(false);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id);
    });
  }, []);

  // Sync mensagem com nome enquanto o usuário não editou manualmente
  useEffect(() => {
    if (!msgTocada) setMensagem(buildMensagem(nome));
  }, [nome, msgTocada]);

  function handleTelefone(raw) {
    setTelefone(applyPhoneMask(raw));
  }

  function handleMensagem(texto) {
    setMensagem(texto);
    setMsgTocada(true);
  }

  async function registrarIndicacao() {
    if (!userId) return;
    const digits = telefone.replace(/\D/g, '');
    await supabase.from('indicacoes').insert({
      indicador_id:      userId,
      nome_indicado:     nome.trim(),
      telefone_indicado: digits ? `+1${digits}` : null,
      email_indicado:    email.trim() || null,
      status:            'enviado',
    });
  }

  async function enviarConvite() {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do profissional ou cliente.');
      return;
    }
    setSaving(true);
    try {
      const result = await Share.share({
        message: mensagem,
        url: 'https://auren.app',
      });
      if (result.action === Share.sharedAction) {
        await registrarIndicacao();
      }
    } catch (_) {}
    setSaving(false);
  }

  async function copiarLink() {
    await Clipboard.setStringAsync('auren.app');
    Alert.alert('Copiado!', 'Link copiado para a área de transferência.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Indicar AUREN</Text>
          <Text style={styles.headerSub}>Convide quem vai amar o app</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

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

          {/* ── Contato ── */}
          <Text style={styles.sectionLabel}>CONTATO</Text>
          <View style={styles.card}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Nome <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Nome do profissional ou cliente"
                placeholderTextColor="#555560"
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Telefone</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.countryCode}>+1</Text>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={telefone}
                  onChangeText={handleTelefone}
                  placeholder="(305) 555-0000"
                  placeholderTextColor="#555560"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email <Text style={styles.optional}>(opcional)</Text></Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@exemplo.com"
                placeholderTextColor="#555560"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* ── Mensagem ── */}
          <Text style={styles.sectionLabel}>MENSAGEM</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.msgInput}
              value={mensagem}
              onChangeText={handleMensagem}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholderTextColor="#555560"
            />
            {msgTocada && (
              <TouchableOpacity
                onPress={() => { setMsgTocada(false); setMensagem(buildMensagem(nome)); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.resetMsg}>Restaurar mensagem original</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Botões ── */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={copiarLink} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>Copiar link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, saving && { opacity: 0.7 }]}
              onPress={enviarConvite}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.btnPrimaryText}>Enviar convite</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            O convite abre as opções de envio do seu celular — SMS, WhatsApp, e-mail e mais.
          </Text>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
  },
  backBtn:      { width: 32, alignItems: 'center' },
  backArrow:    { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub:    { fontSize: 12, color: '#8A8A8E', marginTop: 2 },
  headerRight:  { width: 32 },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A8A8E',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 8,
  },

  card: { backgroundColor: CARD_BG, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },

  fieldWrap:    { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: '#8A8A8E', letterSpacing: 0.6, marginBottom: 8 },
  fieldDivider: { height: 1, backgroundColor: SUBTLE },
  required:     { color: '#A8235A' },
  optional:     { fontWeight: '400', color: '#555560' },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#FFFFFF',
  },

  phoneRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countryCode:{ fontSize: 15, fontWeight: '700', color: '#C8C8CE', paddingHorizontal: 4 },
  phoneInput: { flex: 1 },

  msgInput: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#FFFFFF', lineHeight: 22,
    minHeight: 120, margin: 16,
  },
  resetMsg: {
    fontSize: 12, fontWeight: '600', color: '#A8235A',
    textAlign: 'right', paddingHorizontal: 16, paddingBottom: 12,
  },

  btnRow:        { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnSecondary:  {
    flex: 1, height: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#A8235A' },
  btnPrimary:    {
    flex: 2, height: 50, borderRadius: 14,
    backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  hint: {
    fontSize: 12, color: '#555560', textAlign: 'center',
    marginTop: 12, lineHeight: 18, paddingHorizontal: 8,
  },
});
