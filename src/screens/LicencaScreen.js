import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pendente:   { label: 'Pendente',    color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  em_analise: { label: 'Em análise',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  verificada: { label: 'Verificada',  color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  rejeitada:  { label: 'Rejeitada',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  expirada:   { label: 'Expirada',    color: '#7F1D1D', bg: 'rgba(127,29,29,0.18)'   },
};

// ─── Sub-component ────────────────────────────────────────────────────────────

function DataRow({ label, value, last }) {
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LicencaScreen({ navigation }) {
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [uid,        setUid]        = useState(null);
  const [status,     setStatus]     = useState('pendente');
  const [licenca,    setLicenca]    = useState({ numero: '', tipo: '', estado: '', expiracao: '' });

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { setLoading(false); return; }
      setUid(userId);

      const { data: profile } = await supabase
        .from('profiles')
        .select('licenca_numero, licenca_tipo, licenca_estado, licenca_expiracao, licenca_status')
        .eq('id', userId)
        .single();

      if (profile) {
        setStatus(profile.licenca_status ?? 'pendente');
        setLicenca({
          numero:    profile.licenca_numero    ?? '',
          tipo:      profile.licenca_tipo      ?? '',
          estado:    profile.licenca_estado    ?? '',
          expiracao: profile.licenca_expiracao ?? '',
        });
      }
      setLoading(false);
    })();
  }, []);

  // ── Upload ────────────────────────────────────────────────────────────────

  async function enviarComprovante(source) {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert(
        'Permissão necessária',
        source === 'camera'
          ? 'Permita acesso à câmera nas configurações do dispositivo.'
          : 'Permita acesso à galeria nas configurações do dispositivo.',
      );
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (result.canceled) return;

    const asset = result.assets[0];
    const ext   = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path  = `${uid}/${Date.now()}.${ext}`;

    setUploading(true);
    try {
      const response = await fetch(asset.uri);
      const blob     = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('licencas')
        .upload(path, blob, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      await supabase
        .from('profiles')
        .update({ licenca_status: 'em_analise' })
        .eq('id', uid);

      setStatus('em_analise');
      Alert.alert(
        'Enviado!',
        'Comprovante recebido. Sua licença será verificada em até 48 horas úteis.',
      );
    } catch (err) {
      Alert.alert('Erro no upload', err.message ?? 'Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  function abrirOpcoes() {
    Alert.alert('Enviar comprovante', 'Escolha a origem da foto', [
      { text: 'Câmera',   onPress: () => enviarComprovante('camera')  },
      { text: 'Galeria',  onPress: () => enviarComprovante('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}><ActivityIndicator color="#A8235A" size="large" /></View>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pendente;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Back + Header ── */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Minha Licença</Text>

        {/* ── Status badge ── */}
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {/* ── Dados ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados da licença</Text>
          <DataRow label="Número"   value={licenca.numero}    />
          <DataRow label="Tipo"     value={licenca.tipo}      />
          <DataRow label="Estado"   value={licenca.estado}    />
          <DataRow label="Validade" value={licenca.expiracao} last />
        </View>

        {/* ── Instruções ── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Como funciona a verificação</Text>
          <Text style={styles.infoText}>
            Sua licença será verificada pela equipe AUREN em até 48 horas úteis.
            Para acelerar o processo, envie uma foto legível da sua licença profissional.
          </Text>
        </View>

        {/* ── Rejeitada ── */}
        {status === 'rejeitada' && (
          <View style={styles.rejeitadaCard}>
            <Text style={styles.rejeitadaTitle}>Licença não aprovada</Text>
            <Text style={styles.rejeitadaText}>
              Sua licença foi rejeitada. Corrija os dados e envie um novo comprovante.
            </Text>
            <TouchableOpacity
              style={styles.atualizarBtn}
              onPress={() => navigation.navigate('MeusDados')}
              activeOpacity={0.85}
            >
              <Text style={styles.atualizarBtnText}>Atualizar licença</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Upload ── */}
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && { opacity: 0.65 }]}
          onPress={abrirOpcoes}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.uploadBtnText}>Enviar comprovante</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0E0F11' },
  scroll:  { paddingHorizontal: 20, paddingBottom: 48 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },

  backBtn:   { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backArrow: { fontSize: 24, fontWeight: 'bold', color: '#A8235A' },
  header:    { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 20 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 24,
  },
  statusDot:   { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusLabel: { fontSize: 14, fontWeight: '700' },

  card:      { backgroundColor: '#1A1B1E', borderRadius: 16, padding: 18, marginBottom: 14 },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: '#A8235A',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },

  dataRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A30' },
  dataLabel:     { fontSize: 13, fontWeight: '500', color: '#6B4A58' },
  dataValue:     { fontSize: 13, fontWeight: '600', color: '#FFFFFF', flex: 1, textAlign: 'right', marginLeft: 12 },

  infoCard:  {
    backgroundColor: '#1A1B1E', borderRadius: 16, padding: 18,
    marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#A8235A',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#C9A8B6', marginBottom: 8 },
  infoText:  { fontSize: 13, fontWeight: '400', color: '#6B4A58', lineHeight: 20 },

  rejeitadaCard: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 16,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
  },
  rejeitadaTitle:  { fontSize: 14, fontWeight: '700', color: '#EF4444', marginBottom: 6 },
  rejeitadaText:   { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 20, marginBottom: 14 },
  atualizarBtn:    { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  atualizarBtnText:{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  uploadBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  uploadBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
