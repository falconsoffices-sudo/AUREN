import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS = ['FL', 'TX', 'CA', 'NY', 'Outro'];

const IDIOMAS = [
  { label: 'PT-BR',    value: 'pt' },
  { label: 'ES-LATAM', value: 'es' },
];
const GENEROS = [
  { label: 'Feminino',  value: 'feminino'  },
  { label: 'Masculino', value: 'masculino' },
];

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

function formatExpiracao(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, active && styles.toggleBtnActive]}
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

function EstadoDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {value || 'Selecione o estado'}
        </Text>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {ESTADOS.map((est, idx) => (
            <TouchableOpacity
              key={est}
              style={[
                styles.dropdownItem,
                idx < ESTADOS.length - 1 && styles.dropdownItemBorder,
                value === est && styles.dropdownItemActive,
              ]}
              onPress={() => { onChange(est); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, value === est && styles.dropdownItemTextActive]}>
                {est}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function LicencaTipoDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {value || 'Selecione o tipo'}
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

export default function MeusDadosScreen({ navigation }) {
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [userId,            setUserId]            = useState(null);

  const [nome,              setNome]              = useState('');
  const [telefone,          setTelefone]          = useState('');
  const [cidade,            setCidade]            = useState('');
  const [estado,            setEstado]            = useState('');
  const [idioma,            setIdioma]            = useState('pt');
  const [genero,            setGenero]            = useState('feminino');

  const [licencaNumero,     setLicencaNumero]     = useState('');
  const [licencaTipo,       setLicencaTipo]       = useState('');
  const [licencaEstado,     setLicencaEstado]     = useState('');
  const [licencaExpiracao,  setLicencaExpiracao]  = useState('');
  const [estadoModalVisible, setEstadoModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (data) {
        setNome(data.nome              ?? '');
        setTelefone(data.telefone      ?? '');
        setCidade(data.cidade          ?? '');
        setEstado(data.estado          ?? '');
        setIdioma(data.idioma          ?? 'pt');
        setGenero(data.genero          ?? 'feminino');
        setLicencaNumero(data.licenca_numero    ?? '');
        setLicencaTipo(data.licenca_tipo        ?? '');
        setLicencaEstado(data.licenca_estado    ?? '');
        setLicencaExpiracao(data.licenca_expiracao ?? '');
      } else if (error && error.code !== 'PGRST116') {
        Alert.alert('Erro ao carregar', error.message);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome completo.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id:                userId,
          nome:              nome.trim(),
          telefone:          telefone.trim()          || null,
          cidade:            cidade.trim()            || null,
          idioma,
          genero,
          licenca_numero:    licencaNumero.trim()     || null,
          licenca_tipo:      licencaTipo              || null,
          licenca_estado:    licencaEstado            || null,
          licenca_expiracao: licencaExpiracao.trim()  || null,
        });
      if (error) throw error;
      Alert.alert('Salvo!', 'Seus dados foram atualizados.');
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const estadoLabel = licencaEstado
    ? `${licencaEstado} — ${US_STATES.find(s => s.sigla === licencaEstado)?.nome ?? ''}`
    : '';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Dados</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <Field label="Nome completo">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.gray}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="Telefone">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="+1 (305) 555-0100"
            placeholderTextColor={colors.gray}
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </Field>

        <Field label="Cidade">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="Miami"
            placeholderTextColor={colors.gray}
            value={cidade}
            onChangeText={setCidade}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="Estado">
          <EstadoDropdown value={estado} onChange={setEstado} />
        </Field>

        <Field label="Idioma">
          <Toggle options={IDIOMAS} value={idioma} onChange={setIdioma} />
        </Field>

        <Field label="Gênero">
          <Toggle options={GENEROS} value={genero} onChange={setGenero} />
        </Field>

        {/* ── Licença ── */}
        <Field label="Número da licença">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="Ex: 0123456"
            placeholderTextColor={colors.gray}
            value={licencaNumero}
            onChangeText={setLicencaNumero}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </Field>

        <Field label="Tipo de licença">
          <LicencaTipoDropdown value={licencaTipo} onChange={setLicencaTipo} />
        </Field>

        <Field label="Estado da licença">
          <TouchableOpacity
            style={[styles.input, styles.dropdownTrigger]}
            onPress={() => setEstadoModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={licencaEstado ? styles.inputText : styles.inputPlaceholder}>
              {estadoLabel || 'Selecione o estado'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Data de expiração">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="MM/YYYY"
            placeholderTextColor={colors.gray}
            value={licencaExpiracao}
            onChangeText={raw => setLicencaExpiracao(formatExpiracao(raw))}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </Field>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Salvar</Text>
          }
        </TouchableOpacity>

      </ScrollView>

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

const CARD_BG  = '#222222';
const INPUT_BG = '#222222';
const SUBTLE   = '#2C2C2C';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 24,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  fieldWrap:  { marginBottom: 20 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8,
  },

  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputText:        { color: colors.white, fontWeight: '400' },
  inputPlaceholder: { color: colors.gray,  fontWeight: '400' },

  // Dropdown
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownArrow: { fontSize: 11, color: colors.gray },
  dropdownList: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  dropdownItemActive: { backgroundColor: 'rgba(168,35,90,0.15)' },
  dropdownItemText:       { fontSize: 15, fontWeight: '400', color: colors.white },
  dropdownItemTextActive: { fontWeight: '700', color: colors.primary },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: INPUT_BG,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText:       { fontSize: 14, fontWeight: '600', color: colors.gray },
  toggleTextActive: { color: colors.white },

  // Estado licença modal
  estadoModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  estadoModalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '75%',
  },
  estadoModalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: SUBTLE, alignSelf: 'center', marginBottom: 16,
  },
  estadoModalTitle: {
    fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 16,
  },
  estadoModalItem: { paddingVertical: 14 },
  estadoModalItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  estadoModalItemActive: { backgroundColor: 'rgba(168,35,90,0.08)' },
  estadoModalItemText: { fontSize: 15, fontWeight: '400', color: colors.white },
  estadoModalItemTextActive: { fontWeight: '700', color: colors.primary },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
