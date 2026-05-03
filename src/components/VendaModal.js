import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_COPY = {
  'AUREN PRO':
    'Você acabou de dar um passo que a maioria nunca dá. Seu negócio nunca mais vai ser o mesmo.',
  'AUREN BUSINESS':
    'Você não é mais só uma profissional. Você é uma empresária. Bem-vinda ao próximo nível.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const EMPTY_ROW = () => ({ nome: '', fone: '', tipo: 'profissional' });

function isComplete(row) {
  return row.nome.trim().length > 0 && row.fone.trim().length > 0;
}

// ─── VendaModal ───────────────────────────────────────────────────────────────

export default function VendaModal({ visible, onClose, planName }) {
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [contatoModal, setContatoModal] = useState(false);
  const [todosContatos, setTodosContatos] = useState([]);
  const [contatoQuery, setContatoQuery] = useState('');
  const [selecionados, setSelecionados] = useState(new Set());

  // Accordion: when the last row becomes complete, append a new empty row
  useEffect(() => {
    if (rows.length === 0) return;
    const last = rows[rows.length - 1];
    if (isComplete(last)) {
      setRows(r => [...r, EMPTY_ROW()]);
    }
  }, [rows]);

  function reset() {
    setRows([EMPTY_ROW()]);
    setSaving(false);
    setCarregandoContatos(false);
    setContatoModal(false);
    setTodosContatos([]);
    setContatoQuery('');
    setSelecionados(new Set());
  }

  function handleClose() { reset(); onClose(false); }

  function updateRow(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  function removeRow(i) {
    setRows(r => {
      const next = r.filter((_, idx) => idx !== i);
      if (next.length === 0 || isComplete(next[next.length - 1])) {
        return [...next, EMPTY_ROW()];
      }
      return next;
    });
  }

  function toggleContato(id) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function importarAgenda() {
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
      setSelecionados(new Set());
      setContatoQuery('');
      setContatoModal(true);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setCarregandoContatos(false);
    }
  }

  function confirmarContatos() {
    const lista = todosContatos.filter(c => selecionados.has(c.id));
    const novos = lista.map(c => ({
      nome: c.name ?? '',
      fone: formatPhone(c.phoneNumbers?.[0]?.number ?? ''),
      tipo: 'profissional',
    }));
    setRows(prev => {
      // Replace the trailing empty row with imported contacts + new empty at end
      const withoutTrailing = isComplete(prev[prev.length - 1])
        ? prev
        : prev.slice(0, prev.length - 1);
      return [...withoutTrailing, ...novos, EMPTY_ROW()];
    });
    setContatoModal(false);
  }

  const activeIdx = rows.length - 1;
  const activeRow = rows[activeIdx];
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
          momento:          'venda',
          status:           'enviado',
        }))
      );
      if (error) throw error;
      for (const r of validas) {
        const msg = r.tipo === 'profissional'
          ? `Uma profissional te indicou o AUREN — app de gestao para nail pros. Saiba mais: auren.app`
          : `Te convidaram para agendar pelo AUREN, app das melhores nail pros. Acesse: auren.app`;
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

  const contatosFiltrados = todosContatos.filter(c =>
    !contatoQuery.trim() || (c.name ?? '').toLowerCase().includes(contatoQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={vstyles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={vstyles.sheet}>
            <View style={vstyles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={vstyles.title}>
                {planName === 'AUREN PRO' ? 'Bem-vinda ao AUREN PRO' : 'Bem-vinda ao AUREN BUSINESS'}
              </Text>
              <Text style={vstyles.planCopy}>{PLAN_COPY[planName] ?? ''}</Text>
              <Text style={vstyles.callout}>
                Você conhece outras profissionais incríveis que merecem chegar onde você chegou? Indica pelo menos 5 agora — é rapidinho.
              </Text>

              <TouchableOpacity
                style={[vstyles.importBtn, carregandoContatos && { opacity: 0.65 }]}
                onPress={importarAgenda}
                disabled={carregandoContatos}
                activeOpacity={0.8}
              >
                {carregandoContatos
                  ? <ActivityIndicator color="#A8235A" />
                  : <Text style={vstyles.importBtnText}>Importar da agenda</Text>}
              </TouchableOpacity>

              {/* ── Completed rows (compact cards) ── */}
              {rows.slice(0, rows.length - 1).map((row, i) => (
                isComplete(row) ? (
                  <View key={i} style={vstyles.compactCard}>
                    <View style={vstyles.avatar}>
                      <Text style={vstyles.avatarText}>{initials(row.nome)}</Text>
                    </View>
                    <View style={vstyles.compactInfo}>
                      <Text style={vstyles.compactName} numberOfLines={1}>{row.nome}</Text>
                      <Text style={vstyles.compactTipo}>{row.tipo === 'profissional' ? 'Profissional' : 'Cliente'}</Text>
                    </View>
                    <TouchableOpacity style={vstyles.removeBtn} onPress={() => removeRow(i)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={vstyles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              ))}

              {/* ── Active (empty) row ── */}
              <View style={vstyles.rowBlock}>
                <Text style={vstyles.rowNum}>INDICAÇÃO {rows.filter(isComplete).length + 1}</Text>
                <TextInput
                  style={vstyles.input}
                  placeholder="Nome"
                  placeholderTextColor="#C9A8B6"
                  value={activeRow.nome}
                  onChangeText={v => updateRow(activeIdx, 'nome', v)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <TextInput
                  style={vstyles.input}
                  placeholder="Telefone"
                  placeholderTextColor="#C9A8B6"
                  value={activeRow.fone}
                  onChangeText={v => updateRow(activeIdx, 'fone', formatPhone(v))}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
                <View style={vstyles.tipoRow}>
                  {[
                    { key: 'profissional', label: 'Profissional' },
                    { key: 'cliente',      label: 'Cliente' },
                  ].map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[vstyles.tipoBtn, activeRow.tipo === t.key && vstyles.tipoBtnActive]}
                      onPress={() => updateRow(activeIdx, 'tipo', t.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[vstyles.tipoBtnText, activeRow.tipo === t.key && vstyles.tipoBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[vstyles.sendBtn, !hasValidRows && vstyles.sendBtnDisabled]}
                onPress={enviar}
                disabled={saving || !hasValidRows}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={vstyles.sendBtnText}>Enviar</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={vstyles.skipBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={vstyles.skipBtnText}>Agora não</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* ── Contacts picker ── */}
      <Modal visible={contatoModal} transparent animationType="slide" onRequestClose={() => setContatoModal(false)}>
        <View style={ctStyles.backdrop}>
          <View style={ctStyles.container}>
            <View style={ctStyles.header}>
              <Text style={ctStyles.headerTitle}>Selecionar contatos</Text>
              <TouchableOpacity onPress={() => setContatoModal(false)} activeOpacity={0.7}>
                <Text style={ctStyles.closeBtn}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={ctStyles.search}
              placeholder="Buscar..."
              placeholderTextColor="#C9A8B6"
              value={contatoQuery}
              onChangeText={setContatoQuery}
              autoCorrect={false}
            />
            <FlatList
              data={contatosFiltrados}
              keyExtractor={c => c.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: c }) => {
                const sel = selecionados.has(c.id);
                return (
                  <TouchableOpacity style={ctStyles.item} onPress={() => toggleContato(c.id)} activeOpacity={0.7}>
                    <View style={[ctStyles.check, sel && ctStyles.checkSel]}>
                      {sel && <Text style={ctStyles.checkMark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ctStyles.name}>{c.name}</Text>
                      <Text style={ctStyles.phone}>{c.phoneNumbers?.[0]?.number ?? ''}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[ctStyles.confirmBtn, selecionados.size === 0 && { opacity: 0.4 }]}
              onPress={confirmarContatos}
              disabled={selecionados.size === 0}
              activeOpacity={0.85}
            >
              <Text style={ctStyles.confirmBtnText}>
                Confirmar ({selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const vstyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E0F11',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 12, maxHeight: '92%',
  },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 18 },
  title:    { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  planCopy: { fontSize: 15, fontWeight: '400', color: '#C9A8B6', lineHeight: 22, marginBottom: 14 },
  callout: {
    fontSize: 14, fontWeight: '600', color: '#F5EDE8', lineHeight: 20, marginBottom: 22,
    borderLeftWidth: 3, borderLeftColor: '#A8235A', paddingLeft: 12,
  },
  importBtn:     { borderWidth: 1, borderColor: '#A8235A', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 22, height: 46, justifyContent: 'center' },
  importBtnText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },

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
  avatarText:  { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  compactInfo: { flex: 1 },
  compactName: { fontSize: 14, fontWeight: '600', color: '#F5EDE8' },
  compactTipo: { fontSize: 11, fontWeight: '400', color: '#C9A8B6', marginTop: 2 },
  removeBtn:     { padding: 4 },
  removeBtnText: { fontSize: 16, fontWeight: '600', color: '#8A8A8E' },

  rowBlock: { marginBottom: 18 },
  rowNum:   { fontSize: 10, fontWeight: '700', color: '#A8235A', letterSpacing: 1.2, marginBottom: 8 },
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
});

const ctStyles = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  container:  { flex: 1, backgroundColor: '#0E0F11', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle:{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  closeBtn:   { fontSize: 15, fontWeight: '600', color: '#A8235A' },
  search: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: '#1A1B1E', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#FFFFFF',
  },
  item:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1B1E', gap: 14 },
  check:      { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: '#8A8A8E', alignItems: 'center', justifyContent: 'center' },
  checkSel:   { backgroundColor: '#A8235A', borderColor: '#A8235A' },
  checkMark:  { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  name:       { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  phone:      { fontSize: 12, fontWeight: '400', color: '#C9A8B6', marginTop: 2 },
  confirmBtn: { margin: 16, backgroundColor: '#A8235A', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
