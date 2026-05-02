import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATALOGO = [
  { nome: 'Manicure Básica',                refValor: 35,  refDuracao: 60  },
  { nome: 'Gel Manicure',                   refValor: 55,  refDuracao: 90  },
  { nome: 'Acrylic Nails',                  refValor: 85,  refDuracao: 120 },
  { nome: 'Dip Powder',                     refValor: 65,  refDuracao: 90  },
  { nome: 'Nail Art',                       refValor: 75,  refDuracao: 90  },
  { nome: 'Pedicure',                       refValor: 45,  refDuracao: 60  },
  { nome: 'Spa/Deluxe Manicure & Pedicure', refValor: 95,  refDuracao: 120 },
  { nome: 'Remoção e Manutenção',           refValor: 40,  refDuracao: 60  },
];

const CATALOGO_NOMES = CATALOGO.map(c => c.nome);

const SERVICOS_OPCOES = [...CATALOGO_NOMES, 'Outro'];

// ─── Add Servico Modal ────────────────────────────────────────────────────────

function AddServicoModal({ visible, onClose, onSaved, initialValues = null }) {
  const [nomeOpcao,   setNomeOpcao]   = useState('');
  const [nomeOutro,   setNomeOutro]   = useState('');
  const [opcaoAberta, setOpcaoAberta] = useState(false);
  const [valor,       setValor]       = useState('');
  const [duracao,     setDuracao]     = useState('');
  const [descricao,   setDescricao]   = useState('');
  const [saving,      setSaving]      = useState(false);

  const reset = () => {
    setNomeOpcao(''); setNomeOutro(''); setOpcaoAberta(false);
    setValor(''); setDuracao(''); setDescricao('');
  };

  useEffect(() => {
    if (visible && initialValues) {
      setNomeOpcao(initialValues.nome);
      setValor(String(initialValues.refValor));
      setDuracao(String(initialValues.refDuracao));
      setNomeOutro('');
      setOpcaoAberta(false);
      setDescricao('');
    } else if (!visible) {
      reset();
    }
  }, [visible]);

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    const nomeFinal = nomeOpcao === 'Outro' ? nomeOutro.trim() : nomeOpcao;
    if (!nomeFinal) {
      Alert.alert('Campo obrigatório', 'Selecione ou informe o nome do serviço.');
      return;
    }
    if (!valor || parseFloat(valor.replace(/[^0-9.]/g, '')) <= 0) {
      Alert.alert('Campo obrigatório', 'Informe o valor do serviço.');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado.');

      const { error } = await supabase.from('servicos').insert({
        profissional_id:  userId,
        nome:             nomeFinal,
        valor:            valor   ? parseFloat(valor.replace(/[^0-9.]/g, ''))   : null,
        duracao_minutos:  duracao ? parseInt(duracao.replace(/\D/g, ''), 10)    : null,
        descricao:        descricao.trim() || null,
      });
      if (error) throw error;

      reset();
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[modal.sheet, { paddingBottom: 0, maxHeight: '92%' }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={modal.handle} />
              <Text style={modal.title}>Novo serviço</Text>

              <TouchableOpacity
                style={[modal.input, modal.dropdownTrigger]}
                onPress={() => setOpcaoAberta(o => !o)}
                activeOpacity={0.8}
              >
                <Text style={nomeOpcao ? modal.dropdownValueText : modal.dropdownPlaceholderText}>
                  {nomeOpcao || 'Selecione o serviço *'}
                </Text>
                <Text style={modal.dropdownArrow}>{opcaoAberta ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {opcaoAberta && (
                <View style={modal.dropdownList}>
                  <ScrollView bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {SERVICOS_OPCOES.map((opt, idx) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          modal.dropdownItem,
                          idx < SERVICOS_OPCOES.length - 1 && modal.dropdownItemBorder,
                          nomeOpcao === opt && modal.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setNomeOpcao(opt);
                          setOpcaoAberta(false);
                          // Pre-fill reference value when selecting from catalog
                          const cat = CATALOGO.find(c => c.nome === opt);
                          if (cat && !valor) {
                            setValor(String(cat.refValor));
                            setDuracao(String(cat.refDuracao));
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[modal.dropdownItemText, nomeOpcao === opt && modal.dropdownItemTextActive]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {nomeOpcao === 'Outro' && (
                <TextInput
                  style={modal.input}
                  placeholder="Nome do serviço *"
                  placeholderTextColor="#6B4A58"
                  value={nomeOutro}
                  onChangeText={setNomeOutro}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}

              {initialValues && (
                <Text style={modal.refHint}>
                  Valor de referência: ${initialValues.refValor} · {initialValues.refDuracao} min
                </Text>
              )}

              <View style={modal.row}>
                <TextInput
                  style={[modal.input, modal.halfInput]}
                  placeholder="Valor ($)"
                  placeholderTextColor="#6B4A58"
                  value={valor}
                  onChangeText={setValor}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <TextInput
                  style={[modal.input, modal.halfInput, { marginRight: 0 }]}
                  placeholder="Duração (min)"
                  placeholderTextColor="#6B4A58"
                  value={duracao}
                  onChangeText={t => setDuracao(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>

              <TextInput
                style={[modal.input, modal.inputMulti]}
                placeholder="Descrição (opcional)"
                placeholderTextColor="#6B4A58"
                value={descricao}
                onChangeText={setDescricao}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[modal.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={modal.saveBtnText}>Salvar</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Edit Servico Modal ───────────────────────────────────────────────────────

function EditServicoModal({ visible, servico, onClose, onSaved }) {
  const [nomeOpcao,   setNomeOpcao]   = useState('');
  const [nomeOutro,   setNomeOutro]   = useState('');
  const [opcaoAberta, setOpcaoAberta] = useState(false);
  const [valor,       setValor]       = useState('');
  const [duracao,     setDuracao]     = useState('');
  const [descricao,   setDescricao]   = useState('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!visible || !servico) return;
    const opcaoConhecida = SERVICOS_OPCOES.includes(servico.nome);
    setNomeOpcao(opcaoConhecida ? servico.nome : 'Outro');
    setNomeOutro(opcaoConhecida ? '' : servico.nome);
    setOpcaoAberta(false);
    setValor(servico.valor != null ? String(servico.valor) : '');
    setDuracao(servico.duracao_minutos != null ? String(servico.duracao_minutos) : '');
    setDescricao(servico.descricao ?? '');
  }, [visible, servico]);

  const handleSave = async () => {
    const nomeFinal = nomeOpcao === 'Outro' ? nomeOutro.trim() : nomeOpcao;
    if (!nomeFinal) { Alert.alert('Campo obrigatório', 'Informe o nome do serviço.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('servicos').update({
        nome:            nomeFinal,
        valor:           valor   ? parseFloat(valor.replace(/[^0-9.]/g, ''))   : null,
        duracao_minutos: duracao ? parseInt(duracao.replace(/\D/g, ''), 10)    : null,
        descricao:       descricao.trim() || null,
      }).eq('id', servico.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir serviço',
      `Deseja excluir "${servico?.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.from('servicos').delete().eq('id', servico.id);
              if (error) throw error;
              onSaved();
            } catch (err) {
              Alert.alert('Erro ao excluir', err.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (!servico) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[modal.sheet, { paddingBottom: 0, maxHeight: '92%' }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={modal.handle} />
              <Text style={modal.title}>Editar serviço</Text>

              <TouchableOpacity
                style={[modal.input, modal.dropdownTrigger]}
                onPress={() => setOpcaoAberta(o => !o)}
                activeOpacity={0.8}
              >
                <Text style={nomeOpcao ? modal.dropdownValueText : modal.dropdownPlaceholderText}>
                  {nomeOpcao || 'Selecione o serviço *'}
                </Text>
                <Text style={modal.dropdownArrow}>{opcaoAberta ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {opcaoAberta && (
                <View style={modal.dropdownList}>
                  <ScrollView bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {SERVICOS_OPCOES.map((opt, idx) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          modal.dropdownItem,
                          idx < SERVICOS_OPCOES.length - 1 && modal.dropdownItemBorder,
                          nomeOpcao === opt && modal.dropdownItemActive,
                        ]}
                        onPress={() => { setNomeOpcao(opt); setOpcaoAberta(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[modal.dropdownItemText, nomeOpcao === opt && modal.dropdownItemTextActive]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {nomeOpcao === 'Outro' && (
                <TextInput
                  style={modal.input}
                  placeholder="Nome do serviço *"
                  placeholderTextColor="#6B4A58"
                  value={nomeOutro}
                  onChangeText={setNomeOutro}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}

              <View style={modal.row}>
                <TextInput
                  style={[modal.input, modal.halfInput]}
                  placeholder="Valor ($)"
                  placeholderTextColor="#6B4A58"
                  value={valor}
                  onChangeText={setValor}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <TextInput
                  style={[modal.input, modal.halfInput, { marginRight: 0 }]}
                  placeholder="Duração (min)"
                  placeholderTextColor="#6B4A58"
                  value={duracao}
                  onChangeText={t => setDuracao(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
              </View>

              <TextInput
                style={[modal.input, modal.inputMulti]}
                placeholder="Descrição (opcional)"
                placeholderTextColor="#6B4A58"
                value={descricao}
                onChangeText={setDescricao}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[modal.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[modal.deleteBtn, saving && { opacity: 0.7 }]}
                onPress={handleDelete}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={modal.deleteBtnText}>Excluir serviço</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Catalog Card ─────────────────────────────────────────────────────────────

function CatalogCard({ catalogItem, servicoAtivo, onPress }) {
  const ativo = !!servicoAtivo;
  return (
    <TouchableOpacity
      style={[styles.card, !ativo && styles.cardInativo]}
      onPress={onPress}
      activeOpacity={ativo ? 0.75 : 0.6}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardName, !ativo && styles.cardNameInativo]} numberOfLines={1}>
          {catalogItem.nome}
        </Text>
        {ativo && servicoAtivo.valor != null ? (
          <Text style={styles.cardPrice}>${parseFloat(servicoAtivo.valor).toFixed(2)}</Text>
        ) : (
          <Text style={styles.cardPriceRef}>${catalogItem.refValor}</Text>
        )}
      </View>
      {ativo && servicoAtivo.duracao_minutos != null ? (
        <Text style={styles.cardMeta}>{servicoAtivo.duracao_minutos} min</Text>
      ) : (
        <Text style={[styles.cardMeta, styles.cardMetaRef]}>{catalogItem.refDuracao} min · referência</Text>
      )}
      {!ativo && (
        <View style={styles.inativoBadge}>
          <Text style={styles.inativoBadgeText}>NÃO HABILITADO</Text>
        </View>
      )}
      {ativo && servicoAtivo.descricao ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{servicoAtivo.descricao}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function ServicoCard({ nome, valor, duracao_minutos, descricao, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Text style={styles.cardName} numberOfLines={1}>{nome}</Text>
        {valor != null && (
          <Text style={styles.cardPrice}>${parseFloat(valor).toFixed(2)}</Text>
        )}
      </View>
      {duracao_minutos != null && (
        <Text style={styles.cardMeta}>{duracao_minutos} min</Text>
      )}
      {descricao ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{descricao}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ServicosScreen({ navigation }) {
  const [servicos,      setServicos]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [editServico,   setEditServico]   = useState(null);
  const [editVisible,   setEditVisible]   = useState(false);
  const [userId,        setUserId]        = useState(null);
  const [initialValues, setInitialValues] = useState(null);

  const fetchServicos = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) return;
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('profissional_id', id)
      .order('nome');
    if (!error && data) setServicos(data);
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        setUserId(uid);
        await fetchServicos(uid);
      }
      setLoading(false);
    })();
  }, []);

  // Map catalog items to their active service (if enabled)
  const servicoByNome = Object.fromEntries(servicos.map(s => [s.nome, s]));
  const customServicos = servicos.filter(s => !CATALOGO_NOMES.includes(s.nome));

  function handleCatalogPress(catalogItem) {
    const ativo = servicoByNome[catalogItem.nome];
    if (ativo) {
      setEditServico(ativo);
      setEditVisible(true);
    } else {
      Alert.alert(
        'Serviço não habilitado',
        'Habilite este serviço em Meus Serviços para usá-lo.',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Habilitar',
            onPress: () => {
              setInitialValues(catalogItem);
              setModalVisible(true);
            },
          },
        ]
      );
    }
  }

  const handleModalClose = () => { setInitialValues(null); setModalVisible(false); };
  const handleModalSaved = () => { setInitialValues(null); setModalVisible(false); fetchServicos(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Serviços</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>CATÁLOGO AUREN</Text>
            {CATALOGO.map(cat => (
              <CatalogCard
                key={cat.nome}
                catalogItem={cat}
                servicoAtivo={servicoByNome[cat.nome] ?? null}
                onPress={() => handleCatalogPress(cat)}
              />
            ))}

            {customServicos.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>PERSONALIZADOS</Text>
                {customServicos.map(s => (
                  <ServicoCard
                    key={s.id}
                    {...s}
                    onPress={() => { setEditServico(s); setEditVisible(true); }}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => { setInitialValues(null); setModalVisible(true); }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddServicoModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
        initialValues={initialValues}
      />

      <EditServicoModal
        visible={editVisible}
        servico={editServico}
        onClose={() => { setEditVisible(false); setEditServico(null); }}
        onSaved={() => { setEditVisible(false); setEditServico(null); fetchServicos(); }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#222222';
const INPUT_BG = '#1A1B1E';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 20,
  },
  backBtn:    { width: 32, alignItems: 'center' },
  backArrow:  { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle:{ fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight:{ width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.3, marginBottom: 10,
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardInativo: { opacity: 0.4 },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardName:       { fontSize: 16, fontWeight: '700', color: colors.white, flex: 1, marginRight: 8 },
  cardNameInativo:{ color: colors.gray },
  cardPrice:      { fontSize: 18, fontWeight: '800', color: colors.cream },
  cardPriceRef:   { fontSize: 16, fontWeight: '600', color: colors.gray },
  cardMeta:       { fontSize: 12, fontWeight: '400', color: colors.gray, marginBottom: 4 },
  cardMetaRef:    { fontStyle: 'italic' },
  cardDesc:       { fontSize: 13, fontWeight: '400', color: '#555555', marginTop: 4 },

  inativoBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  inativoBadgeText: { fontSize: 9, fontWeight: '700', color: '#666666', letterSpacing: 0.8 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  fabText: { fontSize: 30, fontWeight: '400', color: colors.white, lineHeight: 34 },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0E0F11',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#3D1020',
    alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },

  refHint: {
    fontSize: 12, fontWeight: '500', color: '#A8235A',
    marginTop: -8, marginBottom: 12,
  },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '400', color: '#FFFFFF',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  halfInput: { flex: 1, marginBottom: 0 },
  inputMulti: { height: 80, paddingTop: 14 },

  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownArrow:           { fontSize: 11, color: '#6B4A58' },
  dropdownValueText:       { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  dropdownPlaceholderText: { fontSize: 15, fontWeight: '400', color: '#6B4A58' },
  dropdownList: {
    backgroundColor: '#150810',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 12,
    maxHeight: 260,
    overflow: 'hidden',
  },
  dropdownItem:           { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder:     { borderBottomWidth: 1, borderBottomColor: '#1A1B1E' },
  dropdownItemActive:     { backgroundColor: 'rgba(168,35,90,0.15)' },
  dropdownItemText:       { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  dropdownItemTextActive: { fontWeight: '700', color: '#A8235A' },

  saveBtn: {
    height: 52, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  deleteBtn:     { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderColor: '#F87171' },
  deleteBtnText: { fontSize: 16, fontWeight: '700', color: '#F87171' },
});
