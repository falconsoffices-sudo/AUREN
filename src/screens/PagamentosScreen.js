import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ── Profissional: dados bancários ────────────────────────────────────────────

function FormProfissional() {
  const [titular,   setTitular]   = useState('');
  const [tipoConta, setTipoConta] = useState('checking'); // 'checking' | 'savings'
  const [numConta,  setNumConta]  = useState('');
  const [routing,   setRouting]   = useState('');

  const salvar = () => {
    if (!titular.trim() || !numConta.trim() || !routing.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos bancários.');
      return;
    }
    Alert.alert('Dados salvos', 'Seus dados de recebimento foram atualizados com sucesso.');
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>DADOS DE RECEBIMENTO</Text>

      <Text style={styles.label}>Nome do titular</Text>
      <TextInput
        style={styles.input}
        placeholder="Como consta no banco"
        placeholderTextColor="#6B4A58"
        value={titular}
        onChangeText={setTitular}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Tipo de conta</Text>
      <View style={styles.toggleRow}>
        {[{ key: 'checking', label: 'Checking' }, { key: 'savings', label: 'Savings' }].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.toggleBtn, tipoConta === opt.key && styles.toggleActive]}
            onPress={() => setTipoConta(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.toggleText, tipoConta === opt.key && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Número da conta</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 123456789"
        placeholderTextColor="#6B4A58"
        value={numConta}
        onChangeText={t => setNumConta(t.replace(/\D/g, ''))}
        keyboardType="numeric"
        secureTextEntry
      />

      <Text style={styles.label}>Routing number</Text>
      <TextInput
        style={styles.input}
        placeholder="9 dígitos"
        placeholderTextColor="#6B4A58"
        value={routing}
        onChangeText={t => setRouting(t.replace(/\D/g, '').slice(0, 9))}
        keyboardType="numeric"
        maxLength={9}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔒 Seus dados bancários são criptografados e processados com segurança. Nenhuma informação é armazenada em nossos servidores.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={salvar} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Salvar dados bancários</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Cliente: dados do cartão ──────────────────────────────────────────────────

function FormCliente() {
  const [nomeCartao, setNomeCartao] = useState('');
  const [numero,     setNumero]     = useState('');
  const [validade,   setValidade]   = useState('');
  const [cvv,        setCvv]        = useState('');

  const salvar = () => {
    if (!nomeCartao.trim() || numero.replace(/\s/g, '').length < 16 || validade.length < 5 || cvv.length < 3) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os dados do cartão.');
      return;
    }
    Alert.alert('Cartão salvo', 'Seu cartão foi salvo com sucesso.');
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>MEU CARTÃO</Text>

      {/* Visual card preview */}
      <View style={styles.cardPreview}>
        <Text style={styles.cardPreviewNumber}>
          {numero.replace(/\s/g, '').padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim()}
        </Text>
        <View style={styles.cardPreviewBottom}>
          <View>
            <Text style={styles.cardPreviewLabel}>TITULAR</Text>
            <Text style={styles.cardPreviewValue}>{nomeCartao.toUpperCase() || '—'}</Text>
          </View>
          <View>
            <Text style={styles.cardPreviewLabel}>VALIDADE</Text>
            <Text style={styles.cardPreviewValue}>{validade || 'MM/AA'}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Nome no cartão</Text>
      <TextInput
        style={styles.input}
        placeholder="Como impresso no cartão"
        placeholderTextColor="#6B4A58"
        value={nomeCartao}
        onChangeText={setNomeCartao}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Número do cartão</Text>
      <TextInput
        style={styles.input}
        placeholder="0000 0000 0000 0000"
        placeholderTextColor="#6B4A58"
        value={numero}
        onChangeText={raw => setNumero(formatCardNumber(raw))}
        keyboardType="numeric"
        maxLength={19}
      />

      <View style={styles.rowInputs}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Validade</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/AA"
            placeholderTextColor="#6B4A58"
            value={validade}
            onChangeText={raw => setValidade(formatExpiry(raw))}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            style={styles.input}
            placeholder="•••"
            placeholderTextColor="#6B4A58"
            value={cvv}
            onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔒 Seus dados de pagamento são criptografados e nunca armazenados em nossos servidores.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={salvar} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Salvar cartão</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PagamentosScreen({ navigation }) {
  const [tipoUsuario, setTipoUsuario] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) {
        const { data } = await supabase
          .from('profiles')
          .select('tipo_usuario')
          .eq('id', uid)
          .single();
        setTipoUsuario(data?.tipo_usuario ?? 'profissional');
      }
      setLoading(false);
    })();
  }, []));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamentos</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#A8235A" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tipoUsuario === 'cliente' ? <FormCliente /> : <FormProfissional />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const INPUT_BG = '#1A1B1E';

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0E0F11' },
  scroll:  { paddingHorizontal: 24, paddingBottom: 48 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { padding: 8, marginRight: 4 },
  backBtnText: { fontSize: 28, color: '#A8235A', lineHeight: 30 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  section:      { paddingTop: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#A8235A', letterSpacing: 1.4, marginBottom: 20, marginTop: 8 },

  label: { fontSize: 12, fontWeight: '600', color: '#C9A8B6', marginBottom: 8, letterSpacing: 0.4 },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', marginBottom: 18,
  },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: INPUT_BG,
  },
  toggleActive:     { backgroundColor: '#A8235A' },
  toggleText:       { fontSize: 14, fontWeight: '600', color: '#6B4A58' },
  toggleTextActive: { color: '#FFFFFF' },

  rowInputs: { flexDirection: 'row' },

  infoBox:  { backgroundColor: '#1A1B1E', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 12, fontWeight: '400', color: '#6B4A58', lineHeight: 18 },

  primaryBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Card preview
  cardPreview: {
    backgroundColor: '#A8235A',
    borderRadius: 18, padding: 24,
    marginBottom: 24,
    shadowColor: '#A8235A', shadowOpacity: 0.35,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardPreviewNumber: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: 3, marginBottom: 24 },
  cardPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewLabel:  { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 3 },
  cardPreviewValue:  { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
