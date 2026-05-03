import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '../lib/supabase';

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function initials(nome) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const EMPTY = () => ({ nome: '', fone: '', tipo: 'profissional' });

function isComplete(row) {
  return row.nome.trim().length > 0 && row.fone.trim().length > 0;
}

export default function IndicacaoModal({ visible, onClose, momento, title, subtitle, showImport }) {
  const [rows, setRows] = useState([EMPTY()]);
  const [saving, setSaving] = useState(false);
  const [contatoModal,       setContatoModal]       = useState(false);
  const [contatoRowIdx,      setContatoRowIdx]      = useState(0);
  const [todosContatos,      setTodosContatos]      = useState([]);
  const [contatoQuery,       setContatoQuery]       = useState('');
  const [carregandoContatos, setCarregandoContatos] = useState(false);

  // Accordion: when the last row becomes complete, append a new empty row
  useEffect(() => {
    if (rows.length === 0) return;
    const last = rows[rows.length - 1];
    if (isComplete(last)) {
      setRows(r => [...r, EMPTY()]);
    }
  }, [rows]);

  function reset() {
    setRows([EMPTY()]);
    setContatoModal(false);
    setTodosContatos([]);
    setContatoQuery('');
  }
  function handleClose() { reset(); onClose(false); }

  async function importarParaLinha(i) {
    setContatoRowIdx(i);
    setCarregandoContatos(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso aos contatos nas configurações do dispositivo.');
        return;
      }
      const { data: contacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      const validos = contacts
        .filter(c => c.name && c.phoneNumbers?.length > 0)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setTodosContatos(validos);
      setContatoQuery('');
      setContatoModal(true);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setCarregandoContatos(false);
    }
  }

  function selecionarContato(c) {
    updateRow(contatoRowIdx, 'nome', c.name ?? '');
    updateRow(contatoRowIdx, 'fone', formatPhone(c.phoneNumbers?.[0]?.number ?? ''));
    setContatoModal(false);
  }

  function updateRow(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  function removeRow(i) {
    setRows(r => {
      const next = r.filter((_, idx) => idx !== i);
      // Ensure there's always at least one empty row at the end
      if (next.length === 0 || isComplete(next[next.length - 1])) {
        return [...next, EMPTY()];
      }
      return next;
    });
  }

  const completedRows = rows.slice(0, rows.length - 1).filter(isComplete);
  const activeRow = rows[rows.length - 1];
  const activeIdx = rows.length - 1;
  const hasValidRows = rows.some(isComplete);

  async function enviar() {
    const validas = rows.filter(isComplete);
    if (validas.length === 0) {
      Alert.alert('Atenção', 'Preencha pelo menos um nome e telefone.');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const { error } = await supabase.from('indicacoes').insert(
        validas.map(r => ({
          profissional_id:  uid,
          indicado_nome:    r.nome.trim(),
          indicado_contato: r.fone.trim(),
          tipo:             r.tipo,
          momento,
          status:           'enviado',
        }))
      );
      if (error) throw error;

      for (const r of validas) {
        const msg = r.tipo === 'profissional'
          ? `Oi! Uma profissional te indicou o AUREN — app de gestão para nail pros. Saiba mais: auren.app`
          : `Oi! Te convidaram para agendar pelo AUREN, app das melhores nail pros. Acesse: auren.app`;
        console.log(`[SMS → ${r.fone}] ${msg}`);
      }

      reset();
      onClose(true);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Completed rows (compact cards) ── */}
              {rows.slice(0, rows.length - 1).map((row, i) => (
                isComplete(row) ? (
                  <View key={i} style={s.compactCard}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials(row.nome)}</Text>
                    </View>
                    <View style={s.compactInfo}>
                      <Text style={s.compactName} numberOfLines={1}>{row.nome}</Text>
                      <Text style={s.compactTipo}>{row.tipo === 'profissional' ? 'Profissional' : 'Cliente'}</Text>
                    </View>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeRow(i)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              ))}

              {/* ── Active (empty) row ── */}
              <View style={s.rowBlock}>
                <TouchableOpacity
                  style={[s.importBtn, carregandoContatos && contatoRowIdx === activeIdx && { opacity: 0.6 }]}
                  onPress={() => importarParaLinha(activeIdx)}
                  disabled={carregandoContatos}
                  activeOpacity={0.8}
                >
                  {carregandoContatos && contatoRowIdx === activeIdx
                    ? <ActivityIndicator color="#A8235A" size="small" />
                    : <Text style={s.importBtnText}>Importar da agenda</Text>}
                </TouchableOpacity>
                <TextInput
                  style={s.input}
                  placeholder="Nome"
                  placeholderTextColor="#C9A8B6"
                  value={activeRow.nome}
                  onChangeText={v => updateRow(activeIdx, 'nome', v)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <TextInput
                  style={s.input}
                  placeholder="Telefone"
                  placeholderTextColor="#C9A8B6"
                  value={activeRow.fone}
                  onChangeText={v => updateRow(activeIdx, 'fone', formatPhone(v))}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
                <View style={s.tipoRow}>
                  {[
                    { key: 'profissional', label: 'Profissional' },
                    { key: 'cliente',      label: 'Cliente' },
                  ].map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[s.tipoBtn, activeRow.tipo === t.key && s.tipoBtnActive]}
                      onPress={() => updateRow(activeIdx, 'tipo', t.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.tipoBtnText, activeRow.tipo === t.key && s.tipoBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[s.sendBtn, !hasValidRows && s.sendBtnDisabled]}
                onPress={enviar}
                disabled={saving || !hasValidRows}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.sendBtnText}>Enviar indicações</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.skipBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={s.skipBtnText}>Agora não</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={contatoModal} transparent animationType="slide" onRequestClose={() => setContatoModal(false)}>
          <View style={s.ctBackdrop}>
            <View style={s.ctContainer}>
              <View style={s.ctHeader}>
                <Text style={s.ctTitle}>Selecionar contato</Text>
                <TouchableOpacity onPress={() => setContatoModal(false)} activeOpacity={0.7}>
                  <Text style={s.ctClose}>Cancelar</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={s.ctSearch}
                placeholder="Buscar..."
                placeholderTextColor="#C9A8B6"
                value={contatoQuery}
                onChangeText={setContatoQuery}
                autoCorrect={false}
              />
              <FlatList
                data={todosContatos.filter(c =>
                  !contatoQuery.trim() || (c.name ?? '').toLowerCase().includes(contatoQuery.toLowerCase())
                )}
                keyExtractor={c => c.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: c }) => (
                  <TouchableOpacity style={s.ctItem} onPress={() => selecionarContato(c)} activeOpacity={0.7}>
                    <Text style={s.ctName}>{c.name}</Text>
                    <Text style={s.ctPhone}>{c.phoneNumbers?.[0]?.number ?? ''}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E0F11',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 12, maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 18,
  },
  title:    { fontSize: 20, fontWeight: '700', color: '#F5EDE8', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '400', color: '#C9A8B6', marginBottom: 18, lineHeight: 18 },

  // Compact card for completed rows
  compactCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1B1E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8, gap: 12,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  compactInfo: { flex: 1 },
  compactName: { fontSize: 14, fontWeight: '600', color: '#F5EDE8' },
  compactTipo: { fontSize: 11, fontWeight: '400', color: '#C9A8B6', marginTop: 2 },
  removeBtn:     { padding: 4 },
  removeBtnText: { fontSize: 16, fontWeight: '600', color: '#8A8A8E' },

  rowBlock: { marginBottom: 18 },

  input: {
    backgroundColor: '#1A1B1E', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#F5EDE8', marginBottom: 10,
  },

  tipoRow:           { flexDirection: 'row', gap: 10 },
  tipoBtn:           { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1B1E', alignItems: 'center' },
  tipoBtnActive:     { backgroundColor: '#A8235A' },
  tipoBtnText:       { fontSize: 13, fontWeight: '600', color: '#C9A8B6' },
  tipoBtnTextActive: { color: '#FFFFFF' },

  sendBtn:         { backgroundColor: '#A8235A', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sendBtnDisabled: { backgroundColor: '#5A1030', opacity: 0.5 },
  sendBtnText:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  skipBtn:     { alignItems: 'center', paddingVertical: 12 },
  skipBtnText: { fontSize: 14, fontWeight: '500', color: '#8A8A8E' },

  importBtn:     { borderWidth: 1, borderColor: '#A8235A', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 10, height: 36, justifyContent: 'center' },
  importBtnText: { fontSize: 12, fontWeight: '600', color: '#A8235A' },

  ctBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  ctContainer: { flex: 1, backgroundColor: '#0E0F11', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  ctHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  ctTitle:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  ctClose:     { fontSize: 15, fontWeight: '600', color: '#A8235A' },
  ctSearch:    { marginHorizontal: 20, marginBottom: 10, backgroundColor: '#1A1B1E', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#FFFFFF' },
  ctItem:      { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1B1E' },
  ctName:      { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  ctPhone:     { fontSize: 12, fontWeight: '400', color: '#C9A8B6', marginTop: 2 },
});
