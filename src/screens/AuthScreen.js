import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const LICENCA_TIPOS = ['Nail Specialist', 'Cosmetologist', 'Esthetician', 'Outro'];

const US_STATES = [
  { sigla: 'AL', nome: 'Alabama' },
  { sigla: 'AK', nome: 'Alaska' },
  { sigla: 'AZ', nome: 'Arizona' },
  { sigla: 'AR', nome: 'Arkansas' },
  { sigla: 'CA', nome: 'California' },
  { sigla: 'CO', nome: 'Colorado' },
  { sigla: 'CT', nome: 'Connecticut' },
  { sigla: 'DE', nome: 'Delaware' },
  { sigla: 'FL', nome: 'Florida' },
  { sigla: 'GA', nome: 'Georgia' },
  { sigla: 'HI', nome: 'Hawaii' },
  { sigla: 'ID', nome: 'Idaho' },
  { sigla: 'IL', nome: 'Illinois' },
  { sigla: 'IN', nome: 'Indiana' },
  { sigla: 'IA', nome: 'Iowa' },
  { sigla: 'KS', nome: 'Kansas' },
  { sigla: 'KY', nome: 'Kentucky' },
  { sigla: 'LA', nome: 'Louisiana' },
  { sigla: 'ME', nome: 'Maine' },
  { sigla: 'MD', nome: 'Maryland' },
  { sigla: 'MA', nome: 'Massachusetts' },
  { sigla: 'MI', nome: 'Michigan' },
  { sigla: 'MN', nome: 'Minnesota' },
  { sigla: 'MS', nome: 'Mississippi' },
  { sigla: 'MO', nome: 'Missouri' },
  { sigla: 'MT', nome: 'Montana' },
  { sigla: 'NE', nome: 'Nebraska' },
  { sigla: 'NV', nome: 'Nevada' },
  { sigla: 'NH', nome: 'New Hampshire' },
  { sigla: 'NJ', nome: 'New Jersey' },
  { sigla: 'NM', nome: 'New Mexico' },
  { sigla: 'NY', nome: 'New York' },
  { sigla: 'NC', nome: 'North Carolina' },
  { sigla: 'ND', nome: 'North Dakota' },
  { sigla: 'OH', nome: 'Ohio' },
  { sigla: 'OK', nome: 'Oklahoma' },
  { sigla: 'OR', nome: 'Oregon' },
  { sigla: 'PA', nome: 'Pennsylvania' },
  { sigla: 'RI', nome: 'Rhode Island' },
  { sigla: 'SC', nome: 'South Carolina' },
  { sigla: 'SD', nome: 'South Dakota' },
  { sigla: 'TN', nome: 'Tennessee' },
  { sigla: 'TX', nome: 'Texas' },
  { sigla: 'UT', nome: 'Utah' },
  { sigla: 'VT', nome: 'Vermont' },
  { sigla: 'VA', nome: 'Virginia' },
  { sigla: 'WA', nome: 'Washington' },
  { sigla: 'WV', nome: 'West Virginia' },
  { sigla: 'WI', nome: 'Wisconsin' },
  { sigla: 'WY', nome: 'Wyoming' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatExpiracao(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleGroup({ options, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, active && styles.toggleActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LicencaTipoDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 18 }}>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger, { marginBottom: 0 }]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
          {value || 'Selecione o tipo *'}
        </Text>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {LICENCA_TIPOS.map((tipo, idx) => (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.dropdownItem,
                idx < LICENCA_TIPOS.length - 1 && styles.dropdownItemBorder,
                value === tipo && styles.dropdownItemActive,
              ]}
              onPress={() => { onChange(tipo); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, value === tipo && styles.dropdownItemTextActive]}>
                {tipo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function EstadoLicencaModal({ visible, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.estadoModalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.estadoModalSheet}>
          <View style={styles.estadoModalHandle} />
          <Text style={styles.estadoModalTitle}>Estado da licença</Text>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ marginBottom: 32 }}>
            {US_STATES.map((st, idx) => (
              <TouchableOpacity
                key={st.sigla}
                style={[
                  styles.estadoModalItem,
                  idx < US_STATES.length - 1 && styles.estadoModalItemBorder,
                  value === st.sigla && styles.estadoModalItemActive,
                ]}
                onPress={() => { onSelect(st.sigla); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.estadoModalItemText, value === st.sigla && styles.estadoModalItemTextActive]}>
                  {st.sigla} — {st.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AuthScreen({ navigation }) {
  const [step, setStep] = useState('form'); // 'form' | 'otp'

  // Form fields
  const [nome,             setNome]             = useState('');
  const [email,            setEmail]            = useState('');
  const [telefone,         setTelefone]         = useState('');
  const [idioma,           setIdioma]           = useState('pt');
  const [genero,           setGenero]           = useState('');
  const [licencaNumero,    setLicencaNumero]    = useState('');
  const [licencaTipo,      setLicencaTipo]      = useState('');
  const [licencaEstado,    setLicencaEstado]    = useState('');
  const [licencaExpiracao, setLicencaExpiracao] = useState('');
  const [estadoModalVisible, setEstadoModalVisible] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const digits    = telefone.replace(/\D/g, '');
  const fullPhone = `+1${digits}`;

  const estadoLabel = licencaEstado
    ? `${licencaEstado} — ${US_STATES.find(s => s.sigla === licencaEstado)?.nome ?? ''}`
    : '';

  // ── Step 1: validate form + send email OTP ───────────────────
  const handleSendOtp = async () => {
    if (
      !nome.trim() || !email.trim() || digits.length < 10 || !genero ||
      !licencaNumero.trim() || !licencaTipo || !licencaEstado || !licencaExpiracao.trim()
    ) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) throw error;
      setOtpCode('');
      setStep('otp');
    } catch (err) {
      Alert.alert('Erro ao enviar código', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify email OTP + create account ─────────────────
  const handleVerifyAndCreate = async () => {
    if (otpCode.length < 8) {
      Alert.alert('Código inválido', 'Digite os 8 dígitos recebidos por e-mail.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;

      if (data.user) {
        await supabase
          .from('profiles')
          .update({
            nome:              nome.trim(),
            telefone:          fullPhone,
            idioma,
            genero,
            licenca_numero:    licencaNumero.trim(),
            licenca_tipo:      licencaTipo,
            licenca_estado:    licencaEstado,
            licenca_expiracao: licencaExpiracao.trim(),
          })
          .eq('id', data.user.id);
      }

      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Erro ao verificar', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />

          {/* ══ STEP: form ══ */}
          {step === 'form' && (
            <>
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>Comece sua jornada com o AUREN</Text>

              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Maria Carvalho"
                placeholderTextColor="#6B4A58"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="maria@email.com"
                placeholderTextColor="#6B4A58"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />

              <Text style={styles.label}>Telefone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+1</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="(305) 555-0100"
                  placeholderTextColor="#6B4A58"
                  value={telefone}
                  onChangeText={raw => setTelefone(formatPhone(raw))}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>

              <Text style={styles.label}>Idioma</Text>
              <ToggleGroup
                value={idioma}
                onChange={setIdioma}
                options={[
                  { label: 'PT-BR',    value: 'pt' },
                  { label: 'ES-LATAM', value: 'es' },
                ]}
              />

              <Text style={styles.label}>Gênero</Text>
              <ToggleGroup
                value={genero}
                onChange={setGenero}
                options={[
                  { label: 'Feminino',  value: 'feminino'  },
                  { label: 'Masculino', value: 'masculino' },
                ]}
              />

              <Text style={styles.label}>Número da licença</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 0123456 *"
                placeholderTextColor="#6B4A58"
                value={licencaNumero}
                onChangeText={setLicencaNumero}
                autoCapitalize="characters"
                returnKeyType="next"
              />

              <Text style={styles.label}>Tipo de licença</Text>
              <LicencaTipoDropdown value={licencaTipo} onChange={setLicencaTipo} />

              <Text style={styles.label}>Estado da licença</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownTrigger, { marginBottom: 18 }]}
                onPress={() => setEstadoModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={licencaEstado ? styles.dropdownValueText : styles.dropdownPlaceholderText}>
                  {estadoLabel || 'Selecione o estado *'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Data de expiração</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/YYYY *"
                placeholderTextColor="#6B4A58"
                value={licencaExpiracao}
                onChangeText={raw => setLicencaExpiracao(formatExpiracao(raw))}
                keyboardType="numeric"
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Criar conta</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLinkText}>Já tenho conta</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══ STEP: otp ══ */}
          {step === 'otp' && (
            <>
              <Text style={styles.title}>Confirme seu e-mail</Text>
              <Text style={styles.subtitle}>
                Enviamos um código para{'\n'}{email}
              </Text>

              <Text style={styles.label}>Código de verificação</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="00000000"
                placeholderTextColor="#6B4A58"
                value={otpCode}
                onChangeText={t => setOtpCode(t.replace(/\D/g, '').slice(0, 8))}
                keyboardType="numeric"
                maxLength={8}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleVerifyAndCreate}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerifyAndCreate}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Confirmar e criar conta</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={styles.linkBtnText}>Reenviar código</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { setOtpCode(''); setStep('form'); }}
              >
                <Text style={styles.backBtnText}>← Editar dados</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <EstadoLicencaModal
        visible={estadoModalVisible}
        value={licencaEstado}
        onSelect={setLicencaEstado}
        onClose={() => setEstadoModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT_BG = '#2D1020';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A0A14' },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },

  logo: {
    width: 120, height: 60, resizeMode: 'contain',
    alignSelf: 'center', marginBottom: 28,
  },

  title:    { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '400', color: '#6B4A58', marginBottom: 28, lineHeight: 20 },

  label: {
    fontSize: 12, fontWeight: '600', color: '#C9A8B6',
    marginBottom: 8, letterSpacing: 0.4,
  },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '400', color: '#FFFFFF',
    marginBottom: 18,
  },
  otpInput: {
    fontSize: 28, fontWeight: '700',
    letterSpacing: 12, textAlign: 'center',
  },

  phoneRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  phonePrefix:     { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginRight: 8 },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },
  phoneInput:      { flex: 1, marginBottom: 0 },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: INPUT_BG,
  },
  toggleActive:      { backgroundColor: '#A8235A' },
  toggleText:        { fontSize: 14, fontWeight: '600', color: '#6B4A58' },
  toggleTextActive:  { color: '#FFFFFF' },

  dropdownTrigger:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownArrow:            { fontSize: 11, color: '#6B4A58' },
  dropdownValueText:        { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  dropdownPlaceholderText:  { fontSize: 15, fontWeight: '400', color: '#6B4A58' },
  dropdownList:             { backgroundColor: '#200C18', borderRadius: 12, marginTop: 4, marginBottom: 18, overflow: 'hidden' },
  dropdownItem:             { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder:       { borderBottomWidth: 1, borderBottomColor: '#3D1020' },
  dropdownItemActive:       { backgroundColor: 'rgba(168,35,90,0.15)' },
  dropdownItemText:         { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  dropdownItemTextActive:   { fontWeight: '700', color: '#A8235A' },

  estadoModalBackdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  estadoModalSheet:         { backgroundColor: '#1A0A14', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, maxHeight: '75%' },
  estadoModalHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3D1020', alignSelf: 'center', marginBottom: 16 },
  estadoModalTitle:         { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  estadoModalItem:          { paddingVertical: 14 },
  estadoModalItemBorder:    { borderBottomWidth: 1, borderBottomColor: '#2D1020' },
  estadoModalItemActive:    { backgroundColor: 'rgba(168,35,90,0.08)' },
  estadoModalItemText:      { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  estadoModalItemTextActive:{ fontWeight: '700', color: '#A8235A' },

  primaryBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  linkBtn:      { alignItems: 'center', paddingVertical: 10 },
  linkBtnText:  { fontSize: 14, fontWeight: '600', color: '#A8235A' },

  backBtn:      { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  backBtnText:  { fontSize: 13, fontWeight: '400', color: '#6B4A58' },

  loginLink:     { alignItems: 'center', paddingVertical: 10 },
  loginLinkText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },
});
