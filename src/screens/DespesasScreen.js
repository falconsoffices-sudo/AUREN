import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const CATEGORIAS = [
  'Produtos/materiais',
  'Aluguel do espaço',
  'Energia elétrica',
  'Água',
  'Transporte',
  'Ferramentas/equipamentos',
  'Taxa do app',
  'Curso/capacitação',
  'Marketing/divulgação',
  'Equipamentos estéticos',
  'Seguro de saúde',
  'Outros',
];

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val) {
  if (val == null) return '$0.00';
  return `$${parseFloat(val).toFixed(2)}`;
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0,0,0,0);
  return d;
}

function endOfMonth() {
  const d = new Date();
  d.setMonth(d.getMonth()+1, 0); d.setHours(23,59,59,999);
  return d;
}

// ─── Category Dropdown ───────────────────────────────────────────────────────

function CategoriaDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[modal.input, modal.dropdownTrigger]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={value ? modal.inputText : modal.inputPlaceholder}>
          {value || 'Selecione a categoria'}
        </Text>
        <Text style={modal.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={modal.dropdownList}>
          <ScrollView
            style={{ maxHeight: 200 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {CATEGORIAS.map((cat, idx) => (
              <TouchableOpacity
                key={cat}
                style={[
                  modal.dropdownItem,
                  idx < CATEGORIAS.length - 1 && modal.dropdownItemBorder,
                  value === cat && modal.dropdownItemActive,
                ]}
                onPress={() => { onChange(cat); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[modal.dropdownItemText, value === cat && modal.dropdownItemTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Add Despesa Modal ───────────────────────────────────────────────────────

function AddDespesaModal({ visible, onClose, onSaved, userId }) {
  const [categoria, setCategoria] = useState('');
  const [valor,     setValor]     = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving,    setSaving]    = useState(false);

  const reset = () => { setCategoria(''); setValor(''); setDescricao(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!categoria) {
      Alert.alert('Campo obrigatório', 'Selecione uma categoria.'); return;
    }
    if (!valor || parseFloat(valor.replace(/[^0-9.]/g,'')) <= 0) {
      Alert.alert('Campo obrigatório', 'Informe um valor válido.'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('financeiro').insert({
        profissional_id: userId,
        tipo:            'despesa',
        categoria,
        valor:           parseFloat(valor.replace(/[^0-9.]/g,'')),
        descricao:       descricao.trim() || null,
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
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Nova Despesa</Text>

            <Text style={modal.label}>CATEGORIA</Text>
            <CategoriaDropdown value={categoria} onChange={setCategoria} />

            <Text style={modal.label}>VALOR ($)</Text>
            <TextInput
              style={modal.input}
              placeholder="0.00"
              placeholderTextColor="#6B4A58"
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={modal.label}>DESCRIÇÃO</Text>
            <TextInput
              style={[modal.input, modal.inputMulti]}
              placeholder="Opcional"
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
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Despesa Card ─────────────────────────────────────────────────────────────

function DespesaCard({ categoria, valor, descricao, created_at }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardCategoria} numberOfLines={1}>{categoria}</Text>
        {descricao ? (
          <Text style={styles.cardDescricao} numberOfLines={1}>{descricao}</Text>
        ) : null}
        <Text style={styles.cardDate}>{formatDate(created_at)}</Text>
      </View>
      <Text style={styles.cardValor}>{formatCurrency(valor)}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DespesasScreen({ navigation }) {
  const [despesas,     setDespesas]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId,       setUserId]       = useState(null);

  const fetchDespesas = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .eq('profissional_id', id)
      .eq('tipo', 'despesa')
      .order('created_at', { ascending: false });
    if (!error && data) setDespesas(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) { setUserId(uid); await fetchDespesas(uid); }
      else setLoading(false);
    })();
  }, []);

  const totalMes = useMemo(() => {
    const start = startOfMonth();
    const end   = endOfMonth();
    return despesas
      .filter(d => {
        const dt = new Date(d.created_at);
        return dt >= start && dt <= end;
      })
      .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
  }, [despesas]);

  const mesLabel = `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Despesas</Text>
        <View style={styles.headerRight} />
      </View>

      {/* ── Total do mês ── */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total em {mesLabel}</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalMes)}</Text>
      </View>

      {/* ── Lista ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : despesas.length > 0 ? (
          despesas.map(d => <DespesaCard key={d.id} {...d} />)
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma despesa registrada ainda.</Text>
            <Text style={styles.emptyHint}>Toque no + para adicionar.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddDespesaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => { setModalVisible(false); fetchDespesas(); }}
        userId={userId}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 20,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight: { width: 32 },

  totalCard: {
    backgroundColor: colors.primary,
    marginHorizontal: 20, borderRadius: 16,
    paddingVertical: 20, paddingHorizontal: 20,
    marginBottom: 20,
  },
  totalLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  totalValue: { fontSize: 36, fontWeight: '800', color: colors.white },

  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  card: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 16,
    marginBottom: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  cardLeft:      { flex: 1, marginRight: 12 },
  cardCategoria: { fontSize: 15, fontWeight: '600', color: colors.white, marginBottom: 2 },
  cardDescricao: { fontSize: 12, fontWeight: '400', color: colors.gray, marginBottom: 3 },
  cardDate:      { fontSize: 11, fontWeight: '400', color: '#444444' },
  cardValor:     { fontSize: 17, fontWeight: '800', color: '#F87171' },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '500', color: colors.gray, marginBottom: 6 },
  emptyHint: { fontSize: 13, fontWeight: '400', color: '#444444' },

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

const INPUT_BG = '#2D1020';
const SUBTLE   = '#3D1020';

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1A0A14',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: SUBTLE, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  label: {
    fontSize: 10, fontWeight: '700', color: '#6B4A58',
    letterSpacing: 1.2, marginBottom: 8, marginTop: 4,
  },
  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '400', color: '#FFFFFF',
    marginBottom: 12,
  },
  inputText:        { color: '#FFFFFF' },
  inputPlaceholder: { color: '#6B4A58' },
  inputMulti: { height: 80, paddingTop: 14 },

  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownArrow: { fontSize: 11, color: '#6B4A58' },
  dropdownList: {
    backgroundColor: INPUT_BG, borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  dropdownItem:       { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  dropdownItemActive: { backgroundColor: 'rgba(168,35,90,0.2)' },
  dropdownItemText:       { fontSize: 14, fontWeight: '400', color: '#FFFFFF' },
  dropdownItemTextActive: { fontWeight: '700', color: colors.primary },

  saveBtn: {
    height: 52, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
