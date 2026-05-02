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
import US_STATES from '../constants/usStates';

// ─── Constants ────────────────────────────────────────────────────────────────

const GENEROS = [
  { label: 'Feminino',  value: 'feminino'  },
  { label: 'Masculino', value: 'masculino' },
];

const LICENCA_TIPOS = ['Nail Specialist', 'Cosmetologist', 'Esthetician', 'Outro'];

const EMPTY_ADDR = { street: '', apt: '', city: '', state: '', zip: '' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function stateLabel(sigla) {
  if (!sigla) return '';
  const found = US_STATES.find(s => s.sigla === sigla);
  return found ? `${found.sigla} — ${found.nome}` : sigla;
}

function parseAddress(jsonStr) {
  if (!jsonStr) return { ...EMPTY_ADDR };
  try {
    const raw = JSON.parse(jsonStr);
    return {
      street: raw.street ?? raw.rua    ?? '',
      apt:    raw.apt    ?? raw.numero  ?? '',
      city:   raw.city   ?? raw.cidade  ?? '',
      state:  raw.state  ?? raw.estado  ?? '',
      zip:    raw.zip    ?? '',
    };
  } catch { return { ...EMPTY_ADDR }; }
}

function formatEIN(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function formatExpiracao(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function validateExpiracao(val) {
  if (!val) return null;
  if (!/^\d{2}\/\d{4}$/.test(val)) return 'Licença expirada ou data inválida';
  const mes = parseInt(val.slice(0, 2), 10);
  const ano = parseInt(val.slice(3), 10);
  if (mes < 1 || mes > 12) return 'Licença expirada ou data inválida';
  const agora     = new Date();
  const anoAtual  = agora.getFullYear();
  const mesAtual  = agora.getMonth() + 1;
  if (ano < anoAtual) return 'Licença expirada ou data inválida';
  if (ano === anoAtual && mes < mesAtual) return 'Licença expirada ou data inválida';
  return null;
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

function Toggle({ options, value, onChange, editing }) {
  return (
    <View style={styles.toggleRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, active && styles.toggleBtnActive, !editing && styles.toggleBtnReadonly]}
            onPress={() => editing && onChange(opt.value)}
            activeOpacity={editing ? 0.75 : 1}
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

function StatePickerModal({ visible, title, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ marginBottom: 32 }}>
            {US_STATES.map((st, idx) => (
              <TouchableOpacity
                key={st.sigla}
                style={[
                  styles.modalItem,
                  idx < US_STATES.length - 1 && styles.modalItemBorder,
                  value === st.sigla && styles.modalItemActive,
                ]}
                onPress={() => { onSelect(st.sigla); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalItemText, value === st.sigla && styles.modalItemTextActive]}>
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

function LicencaTipoDropdown({ value, onChange, editing }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger, !editing && styles.inputReadonly]}
        onPress={() => editing && setOpen(o => !o)}
        activeOpacity={editing ? 0.8 : 1}
      >
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {value || 'Selecione o tipo'}
        </Text>
        {editing && <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>}
      </TouchableOpacity>

      {open && editing && (
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MeusDadosScreen({ navigation }) {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [userId,   setUserId]   = useState(null);

  // Auth
  const [email, setEmail] = useState('');

  // Dados pessoais
  const [nome,        setNome]        = useState('');
  const [telefone,    setTelefone]    = useState('');
  const [endComercial, setEndComercial] = useState({ ...EMPTY_ADDR });
  const [genero,      setGenero]      = useState('feminino');

  // Licença
  const [licencaNumero,    setLicencaNumero]    = useState('');
  const [licencaTipo,      setLicencaTipo]      = useState('');
  const [licencaEstado,    setLicencaEstado]    = useState('');
  const [licencaExpiracao, setLicencaExpiracao] = useState('');

  // Negócio
  const [ein, setEin] = useState('');

  // Modal visibility
  const [endStateModalVisible,      setEndStateModalVisible]      = useState(false);
  const [licencaEstadoModalVisible, setLicencaEstadoModalVisible] = useState(false);

  // Validation errors
  const [expiracaoErro, setExpiracaoErro] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);
      setEmail(authData.user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (data) {
        setNome(data.nome ?? '');
        const rawPhone = data.telefone ?? '';
        const digits = rawPhone.replace(/\D/g, '').slice(-10);
        setTelefone(digits ? formatPhone(digits) : '');
        setEndComercial(parseAddress(data.endereco_comercial));
        setGenero(data.genero   ?? 'feminino');
        setLicencaNumero(data.licenca_numero     ?? '');
        setLicencaTipo(data.licenca_tipo         ?? '');
        setLicencaEstado(data.licenca_estado     ?? '');
        setLicencaExpiracao(data.licenca_expiracao ?? '');
        setEin(data.ein ?? '');
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
    if (endComercial.zip && !/^\d{5}$/.test(endComercial.zip)) {
      Alert.alert('ZIP Code inválido', 'O ZIP Code deve ter 5 dígitos.');
      return;
    }
    if (telefone && telefone.replace(/\D/g, '').length < 10) {
      Alert.alert('Telefone inválido', 'O número de telefone deve ter 10 dígitos.');
      return;
    }
    if (ein && !/^\d{2}-\d{7}$/.test(ein)) {
      Alert.alert('EIN inválido', 'O EIN deve estar no formato XX-XXXXXXX (ex: 12-3456789).');
      return;
    }
    const erroExp = validateExpiracao(licencaExpiracao);
    if (erroExp) {
      setExpiracaoErro(erroExp);
      Alert.alert('Data inválida', erroExp);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id:                userId,
          nome:              nome.trim(),
          telefone:          telefone ? `+1${telefone.replace(/\D/g, '')}` : null,
          endereco_comercial: JSON.stringify(endComercial),
          genero,
          licenca_numero:    licencaNumero.trim()    || null,
          licenca_tipo:      licencaTipo             || null,
          licenca_estado:    licencaEstado           || null,
          licenca_expiracao: licencaExpiracao.trim() || null,
          ein:               ein.trim()              || null,
        });
      if (error) throw error;
      Alert.alert('Salvo!', 'Seus dados foram atualizados.');
      setEditing(false);
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

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
        {editing ? (
          <TouchableOpacity
            style={[styles.editBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.editBtnText}>Salvar</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Email (somente leitura) ── */}
        <Field label="Email">
          <View style={[styles.input, styles.inputReadonly]}>
            <Text style={styles.inputText} numberOfLines={1}>{email || '—'}</Text>
          </View>
        </Field>

        {/* ── Dados pessoais ── */}
        <Field label="Nome completo">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.gray}
            value={nome}
            onChangeText={setNome}
            editable={editing}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="Telefone">
          <View style={styles.phoneRow}>
            <View style={[styles.phonePrefix, !editing && styles.phonePrefixReadonly]}>
              <Text style={styles.phonePrefixText}>+1</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputText, styles.phoneInput, !editing && styles.inputReadonly]}
              placeholder="(305) 555-0100"
              placeholderTextColor={colors.gray}
              value={telefone}
              onChangeText={raw => setTelefone(formatPhone(raw))}
              editable={editing}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>
        </Field>

        {/* ── Endereço comercial ── */}
        <Field label="Street Address">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="Ex: 123 Collins Ave"
            placeholderTextColor={colors.gray}
            value={endComercial.street}
            onChangeText={t => setEndComercial(a => ({ ...a, street: t }))}
            editable={editing}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="Apt / Suite / Unit">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="Opcional"
            placeholderTextColor={colors.gray}
            value={endComercial.apt}
            onChangeText={t => setEndComercial(a => ({ ...a, apt: t }))}
            editable={editing}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="City">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="Ex: Miami"
            placeholderTextColor={colors.gray}
            value={endComercial.city}
            onChangeText={t => setEndComercial(a => ({ ...a, city: t }))}
            editable={editing}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="State">
          <TouchableOpacity
            style={[styles.input, styles.dropdownTrigger, !editing && styles.inputReadonly]}
            onPress={() => editing && setEndStateModalVisible(true)}
            activeOpacity={editing ? 0.8 : 1}
          >
            <Text style={endComercial.state ? styles.inputText : styles.inputPlaceholder}>
              {stateLabel(endComercial.state) || 'Selecione o estado'}
            </Text>
            {editing && <Text style={styles.dropdownArrow}>▼</Text>}
          </TouchableOpacity>
        </Field>

        <Field label="ZIP Code">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="33101"
            placeholderTextColor={colors.gray}
            value={endComercial.zip}
            onChangeText={t => setEndComercial(a => ({ ...a, zip: t.replace(/\D/g, '').slice(0, 5) }))}
            editable={editing}
            keyboardType="numeric"
            maxLength={5}
            returnKeyType="next"
          />
        </Field>

        <Field label="Gênero">
          <Toggle options={GENEROS} value={genero} onChange={setGenero} editing={editing} />
        </Field>

        {/* ── Licença ── */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Licença profissional</Text>

        <Field label="Número da licença">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="Ex: 0123456"
            placeholderTextColor={colors.gray}
            value={licencaNumero}
            onChangeText={setLicencaNumero}
            editable={editing}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </Field>

        <Field label="Tipo de licença">
          <LicencaTipoDropdown value={licencaTipo} onChange={setLicencaTipo} editing={editing} />
        </Field>

        <Field label="Estado da licença">
          <TouchableOpacity
            style={[styles.input, styles.dropdownTrigger, !editing && styles.inputReadonly]}
            onPress={() => editing && setLicencaEstadoModalVisible(true)}
            activeOpacity={editing ? 0.8 : 1}
          >
            <Text style={licencaEstado ? styles.inputText : styles.inputPlaceholder}>
              {stateLabel(licencaEstado) || 'Selecione o estado'}
            </Text>
            {editing && <Text style={styles.dropdownArrow}>▼</Text>}
          </TouchableOpacity>
        </Field>

        <Field label="Data de expiração">
          <TextInput
            style={[
              styles.input, styles.inputText,
              !editing && styles.inputReadonly,
              expiracaoErro && editing && styles.inputError,
            ]}
            placeholder="MM/YYYY"
            placeholderTextColor={colors.gray}
            value={licencaExpiracao}
            onChangeText={raw => {
              const formatted = formatExpiracao(raw);
              setLicencaExpiracao(formatted);
              setExpiracaoErro(validateExpiracao(formatted));
            }}
            editable={editing}
            keyboardType="numeric"
            maxLength={7}
            returnKeyType="done"
          />
          {expiracaoErro && editing && (
            <Text style={styles.fieldError}>{expiracaoErro}</Text>
          )}
        </Field>

        <TouchableOpacity
          style={styles.licencaStatusLink}
          onPress={() => navigation.navigate('Licenca')}
          activeOpacity={0.75}
        >
          <Text style={styles.licencaStatusLinkText}>Ver status da licença →</Text>
        </TouchableOpacity>

        {/* ── Informações do negócio ── */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Informações do negócio</Text>

        <Field label="EIN (Employer Identification Number)">
          <TextInput
            style={[styles.input, styles.inputText, !editing && styles.inputReadonly]}
            placeholder="12-3456789"
            placeholderTextColor={colors.gray}
            value={ein}
            onChangeText={raw => setEin(formatEIN(raw))}
            editable={editing}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="done"
          />
        </Field>

        {editing && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <StatePickerModal
        visible={endStateModalVisible}
        title="Estado (Endereço)"
        value={endComercial.state}
        onSelect={s => setEndComercial(a => ({ ...a, state: s }))}
        onClose={() => setEndStateModalVisible(false)}
      />

      <StatePickerModal
        visible={licencaEstadoModalVisible}
        title="Estado da licença"
        value={licencaEstado}
        onSelect={setLicencaEstado}
        onClose={() => setLicencaEstadoModalVisible(false)}
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
  backBtn:     { width: 48, alignItems: 'flex-start' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  editBtn:     { width: 64, alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  sectionDivider: { height: 1, backgroundColor: SUBTLE, marginBottom: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 20,
  },

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
  inputReadonly:    { backgroundColor: '#1A1A1A' },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  phonePrefix: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    flexShrink: 0,
  },
  phonePrefixReadonly: { backgroundColor: '#1A1A1A' },
  phonePrefixText:     { fontSize: 15, fontWeight: '600', color: colors.gray },
  phoneInput:          { flex: 1 },

  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownArrow: { fontSize: 11, color: colors.gray },
  dropdownList: {
    backgroundColor: CARD_BG, borderRadius: 12, marginTop: 6, overflow: 'hidden',
  },
  dropdownItem:           { paddingHorizontal: 16, paddingVertical: 14 },
  dropdownItemBorder:     { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  dropdownItemActive:     { backgroundColor: 'rgba(168,35,90,0.15)' },
  dropdownItemText:       { fontSize: 15, fontWeight: '400', color: colors.white },
  dropdownItemTextActive: { fontWeight: '700', color: colors.primary },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: INPUT_BG,
  },
  toggleBtnActive:   { backgroundColor: colors.primary },
  toggleBtnReadonly: { backgroundColor: '#1A1A1A' },
  toggleText:        { fontSize: 14, fontWeight: '600', color: colors.gray },
  toggleTextActive:  { color: colors.white },

  inputError: { borderWidth: 1.5, borderColor: '#EF4444' },

  fieldError: {
    fontSize: 11, fontWeight: '600', color: '#EF4444',
    marginTop: 6, letterSpacing: 0.2,
  },

  licencaStatusLink:     { paddingVertical: 12, alignItems: 'flex-end' },
  licencaStatusLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: SUBTLE, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:             { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 16 },
  modalItem:              { paddingVertical: 14 },
  modalItemBorder:        { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  modalItemActive:        { backgroundColor: 'rgba(168,35,90,0.08)' },
  modalItemText:          { fontSize: 15, fontWeight: '400', color: colors.white },
  modalItemTextActive:    { fontWeight: '700', color: colors.primary },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
