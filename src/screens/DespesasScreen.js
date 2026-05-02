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
import { scheduleNotification } from '../lib/notifications';
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

function dateToMDY(d) {
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatDateInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function mdyToISO(str) {
  const [mm, dd, yyyy] = str.split('/');
  if (!yyyy || yyyy.length < 4) return null;
  return `${yyyy}-${(mm||'01').padStart(2,'0')}-${(dd||'01').padStart(2,'0')}`;
}

// "YYYY-MM-DD" → same day next month
function addOneMonth(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Today as "YYYY-MM-DD"
function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
}
function endOfMonth() {
  const d = new Date(); d.setMonth(d.getMonth()+1, 0); d.setHours(23,59,59,999); return d;
}

// ─── Category Dropdown ───────────────────────────────────────────────────────

function CategoriaDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={[modal.input, modal.dropdownTrigger]} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={value ? modal.inputText : modal.inputPlaceholder}>
          {value || 'Selecione a categoria'}
        </Text>
        <Text style={modal.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={modal.dropdownList}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {CATEGORIAS.map((cat, idx) => (
              <TouchableOpacity
                key={cat}
                style={[modal.dropdownItem, idx < CATEGORIAS.length-1 && modal.dropdownItemBorder, value === cat && modal.dropdownItemActive]}
                onPress={() => { onChange(cat); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[modal.dropdownItemText, value === cat && modal.dropdownItemTextActive]}>{cat}</Text>
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
  const [categoria,       setCategoria]       = useState('');
  const [valor,           setValor]           = useState('');
  const [descricao,       setDescricao]       = useState('');
  const [recorrencia,     setRecorrencia]     = useState('variavel');
  const [statusPagamento, setStatusPagamento] = useState('em_aberto');
  const [parcelaAtual,    setParcelaAtual]    = useState('');
  const [totalParcelas,   setTotalParcelas]   = useState('');
  const [saving,          setSaving]          = useState(false);

  const reset = () => {
    setCategoria(''); setValor(''); setDescricao('');
    setRecorrencia('variavel'); setStatusPagamento('em_aberto');
    setParcelaAtual(''); setTotalParcelas('');
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!categoria) { Alert.alert('Campo obrigatório', 'Selecione uma categoria.'); return; }
    if (!valor || parseFloat(valor.replace(/[^0-9.]/g,'')) <= 0) { Alert.alert('Campo obrigatório', 'Informe um valor válido.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('financeiro').insert({
        profissional_id:  userId,
        tipo:             'despesa',
        categoria,
        valor:            parseFloat(valor.replace(/[^0-9.]/g,'')),
        descricao:        descricao.trim() || null,
        recorrencia,
        status_pagamento: statusPagamento,
        data_despesa:     todayISO(),
        parcela_atual:    recorrencia === 'parcelada' ? (parseInt(parcelaAtual, 10) || null) : null,
        total_parcelas:   recorrencia === 'parcelada' ? (parseInt(totalParcelas, 10) || null) : null,
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
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={modal.handle} />
              <Text style={modal.title}>Nova Despesa</Text>

              <Text style={modal.label}>CATEGORIA</Text>
              <CategoriaDropdown value={categoria} onChange={setCategoria} />

              <Text style={modal.label}>VALOR ($)</Text>
              <TextInput style={modal.input} placeholder="0.00" placeholderTextColor="#6B4A58" value={valor} onChangeText={setValor} keyboardType="decimal-pad" returnKeyType="next" />

              <Text style={modal.label}>DESCRIÇÃO</Text>
              <TextInput style={[modal.input, modal.inputMulti]} placeholder="Opcional" placeholderTextColor="#6B4A58" value={descricao} onChangeText={setDescricao} multiline numberOfLines={3} textAlignVertical="top" />

              <Text style={modal.label}>RECORRÊNCIA</Text>
              <View style={modal.toggleRow}>
                {[
                  { label: 'Variável',  value: 'variavel'  },
                  { label: 'Fixa',      value: 'fixa'      },
                  { label: 'Parcelada', value: 'parcelada' },
                ].map(opt => {
                  const active = recorrencia === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.toggleBtn, active && modal.toggleBtnActive]} onPress={() => setRecorrencia(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.toggleBtnText, active && modal.toggleBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {recorrencia === 'parcelada' && (
                <>
                  <Text style={modal.label}>PARCELAS</Text>
                  <View style={modal.parcelasRow}>
                    <TextInput
                      style={[modal.input, modal.parcelaInput]}
                      placeholder="Atual (ex: 3)"
                      placeholderTextColor="#6B4A58"
                      value={parcelaAtual}
                      onChangeText={t => setParcelaAtual(t.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={modal.parcelasDe}>de</Text>
                    <TextInput
                      style={[modal.input, modal.parcelaInput]}
                      placeholder="Total (ex: 12)"
                      placeholderTextColor="#6B4A58"
                      value={totalParcelas}
                      onChangeText={t => setTotalParcelas(t.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </>
              )}

              <Text style={modal.label}>STATUS DE PAGAMENTO</Text>
              <View style={modal.toggleRow}>
                {[
                  { label: 'Paga',      value: 'paga'      },
                  { label: 'Em aberto', value: 'em_aberto' },
                  { label: 'Em atraso', value: 'em_atraso' },
                ].map(opt => {
                  const active = statusPagamento === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.toggleBtn, active && modal.toggleBtnActive]} onPress={() => setStatusPagamento(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.toggleBtnText, active && modal.toggleBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[modal.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Edit Despesa Modal ──────────────────────────────────────────────────────

function EditDespesaModal({ visible, despesa, onClose, onSaved }) {
  const [categoria,       setCategoria]       = useState('');
  const [valor,           setValor]           = useState('');
  const [descricao,       setDescricao]       = useState('');
  const [dataDespesa,     setDataDespesa]     = useState('');
  const [recorrencia,     setRecorrencia]     = useState('variavel');
  const [statusPagamento, setStatusPagamento] = useState('em_aberto');
  const [parcelaAtual,    setParcelaAtual]    = useState('');
  const [totalParcelas,   setTotalParcelas]   = useState('');
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    if (despesa) {
      setCategoria(despesa.categoria ?? '');
      setValor(despesa.valor ? String(parseFloat(despesa.valor).toFixed(2)) : '');
      setDescricao(despesa.descricao ?? '');
      const baseDate = despesa.data_despesa
        ? new Date(`${despesa.data_despesa}T12:00:00`)
        : new Date(despesa.created_at);
      setDataDespesa(dateToMDY(baseDate));
      setRecorrencia(despesa.recorrencia ?? 'variavel');
      setStatusPagamento(despesa.status_pagamento ?? 'em_aberto');
      setParcelaAtual(despesa.parcela_atual != null ? String(despesa.parcela_atual) : '');
      setTotalParcelas(despesa.total_parcelas != null ? String(despesa.total_parcelas) : '');
    }
  }, [despesa]);

  const handleSave = async () => {
    if (!categoria) { Alert.alert('Campo obrigatório', 'Selecione uma categoria.'); return; }
    if (!valor || parseFloat(valor.replace(/[^0-9.]/g,'')) <= 0) { Alert.alert('Campo obrigatório', 'Informe um valor válido.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('financeiro')
        .update({
          categoria,
          valor:            parseFloat(valor.replace(/[^0-9.]/g,'')),
          descricao:        descricao.trim() || null,
          data_despesa:     mdyToISO(dataDespesa) || null,
          recorrencia,
          status_pagamento: statusPagamento,
          parcela_atual:    recorrencia === 'parcelada' ? (parseInt(parcelaAtual, 10) || null) : null,
          total_parcelas:   recorrencia === 'parcelada' ? (parseInt(totalParcelas, 10) || null) : null,
        })
        .eq('id', despesa.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = () => {
    Alert.alert(
      'Excluir despesa',
      'Esta ação não pode ser desfeita. Deseja excluir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.from('financeiro').delete().eq('id', despesa.id);
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

  if (!despesa) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[modal.sheet, { paddingBottom: 0, maxHeight: '92%' }]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={modal.handle} />
              <Text style={modal.title}>Editar Despesa</Text>

              <Text style={modal.label}>CATEGORIA</Text>
              <CategoriaDropdown value={categoria} onChange={setCategoria} />

              <Text style={modal.label}>VALOR ($)</Text>
              <TextInput style={modal.input} placeholder="0.00" placeholderTextColor="#6B4A58" value={valor} onChangeText={setValor} keyboardType="decimal-pad" returnKeyType="next" />

              <Text style={modal.label}>DESCRIÇÃO</Text>
              <TextInput style={[modal.input, modal.inputMulti]} placeholder="Opcional" placeholderTextColor="#6B4A58" value={descricao} onChangeText={setDescricao} multiline numberOfLines={3} textAlignVertical="top" />

              <Text style={modal.label}>DATA DA DESPESA</Text>
              <TextInput
                style={modal.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#6B4A58"
                value={dataDespesa}
                onChangeText={t => setDataDespesa(formatDateInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={modal.label}>RECORRÊNCIA</Text>
              <View style={modal.toggleRow}>
                {[
                  { label: 'Variável',   value: 'variavel'   },
                  { label: 'Fixa',       value: 'fixa'       },
                  { label: 'Parcelada',  value: 'parcelada'  },
                ].map(opt => {
                  const active = recorrencia === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.toggleBtn, active && modal.toggleBtnActive]} onPress={() => setRecorrencia(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.toggleBtnText, active && modal.toggleBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {recorrencia === 'parcelada' && (
                <>
                  <Text style={modal.label}>PARCELAS</Text>
                  <View style={modal.parcelasRow}>
                    <TextInput
                      style={[modal.input, modal.parcelaInput]}
                      placeholder="Atual (ex: 3)"
                      placeholderTextColor="#6B4A58"
                      value={parcelaAtual}
                      onChangeText={t => setParcelaAtual(t.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={modal.parcelasDe}>de</Text>
                    <TextInput
                      style={[modal.input, modal.parcelaInput]}
                      placeholder="Total (ex: 12)"
                      placeholderTextColor="#6B4A58"
                      value={totalParcelas}
                      onChangeText={t => setTotalParcelas(t.replace(/\D/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </>
              )}

              <Text style={modal.label}>STATUS DE PAGAMENTO</Text>
              <View style={modal.toggleRow}>
                {[
                  { label: 'Paga',      value: 'paga'      },
                  { label: 'Em aberto', value: 'em_aberto' },
                  { label: 'Em atraso', value: 'em_atraso' },
                ].map(opt => {
                  const active = statusPagamento === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.toggleBtn, active && modal.toggleBtnActive]} onPress={() => setStatusPagamento(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.toggleBtnText, active && modal.toggleBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[modal.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[modal.deleteBtn, saving && { opacity: 0.7 }]} onPress={handleExcluir} disabled={saving} activeOpacity={0.85}>
                <Text style={modal.deleteBtnText}>Excluir despesa</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Despesa Card ─────────────────────────────────────────────────────────────

function DespesaCard({ categoria, valor, descricao, data_despesa, created_at, recorrencia, status_pagamento, parcela_atual, total_parcelas, onPress, onPagar }) {
  const canPagar = status_pagamento === 'em_aberto' || status_pagamento === 'em_atraso';
  const dataRef  = data_despesa
    ? formatDate(`${data_despesa}T12:00:00`)
    : formatDate(created_at);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardCategoria} numberOfLines={1}>{categoria}</Text>
          {recorrencia === 'variavel' && (
            <View style={[styles.badge, styles.badgeNeutro]}><Text style={styles.badgeText}>Variável</Text></View>
          )}
          {recorrencia === 'fixa' && (
            <View style={styles.badge}><Text style={styles.badgeText}>Fixa</Text></View>
          )}
          {recorrencia === 'parcelada' && (
            <View style={styles.badge}><Text style={styles.badgeText}>Parcelada</Text></View>
          )}
          {status_pagamento === 'paga' && (
            <View style={[styles.badge, styles.badgePago]}><Text style={styles.badgeText}>Paga</Text></View>
          )}
          {status_pagamento === 'em_aberto' && (
            <View style={[styles.badge, styles.badgeNeutro]}><Text style={styles.badgeText}>Em aberto</Text></View>
          )}
          {status_pagamento === 'em_atraso' && (
            <View style={[styles.badge, styles.badgeAtraso]}><Text style={styles.badgeText}>Em atraso</Text></View>
          )}
        </View>
        {recorrencia === 'parcelada' && parcela_atual != null && total_parcelas != null && (
          <Text style={styles.cardParcelas}>{parcela_atual}/{total_parcelas} parcelas</Text>
        )}
        {descricao ? <Text style={styles.cardDescricao} numberOfLines={1}>{descricao}</Text> : null}
        <Text style={styles.cardDate}>{dataRef}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardValor}>{formatCurrency(valor)}</Text>
        {canPagar && onPagar && (
          <TouchableOpacity style={styles.pagarBtn} onPress={onPagar} activeOpacity={0.8}>
            <Text style={styles.pagarBtnText}>Pagar ✓</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DespesasScreen({ navigation }) {
  const [despesas,          setDespesas]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [addVisible,        setAddVisible]        = useState(false);
  const [editVisible,       setEditVisible]       = useState(false);
  const [selectedDespesa,   setSelectedDespesa]   = useState(null);
  const [userId,            setUserId]            = useState(null);
  const [concluidasVisible, setConcluidasVisible] = useState(false);

  const fetchDespesas = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .eq('profissional_id', id)
      .eq('tipo', 'despesa')
      .order('data_despesa', { ascending: false, nullsFirst: false });
    if (!error && data) setDespesas(data);
    setLoading(false);
    return data ?? [];
  }, [userId]);

  // Checks em_aberto with past data_despesa → updates to em_atraso + push notification
  const verificarAtrasos = useCallback(async (uid, lista) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const atrasadas = lista.filter(d =>
      d.status_pagamento === 'em_aberto' &&
      d.data_despesa &&
      new Date(`${d.data_despesa}T12:00:00`) < hoje
    );
    if (atrasadas.length === 0) return;

    for (const d of atrasadas) {
      const { error } = await supabase
        .from('financeiro')
        .update({ status_pagamento: 'em_atraso' })
        .eq('id', d.id);
      if (!error) {
        scheduleNotification(
          'Despesa em atraso',
          `Você tem uma despesa em atraso: ${d.categoria} de ${formatCurrency(d.valor)}`,
          1,
        ).catch(() => {});
      }
    }
    await fetchDespesas(uid);
  }, [fetchDespesas]);

  // Marks a despesa as paid and runs recorrência automation
  const marcarComoPaga = useCallback(async (d) => {
    const rec = d.recorrencia ?? 'variavel';
    try {
      if (rec === 'fixa') {
        const { error: updErr } = await supabase
          .from('financeiro')
          .update({ status_pagamento: 'paga' })
          .eq('id', d.id);
        if (updErr) throw updErr;

        const proximaData = addOneMonth(d.data_despesa);
        const { error: insErr } = await supabase.from('financeiro').insert({
          profissional_id:  d.profissional_id,
          tipo:             'despesa',
          categoria:        d.categoria,
          valor:            d.valor,
          recorrencia:      'fixa',
          status_pagamento: 'em_aberto',
          data_despesa:     proximaData,
          descricao:        d.descricao ?? null,
        });
        if (insErr) throw insErr;

      } else if (rec === 'parcelada') {
        const novaParcelaAtual = (d.parcela_atual ?? 1) + 1;
        const total = d.total_parcelas ?? 1;

        if (novaParcelaAtual >= total) {
          const { error } = await supabase
            .from('financeiro')
            .update({ status_pagamento: 'concluida', parcela_atual: novaParcelaAtual })
            .eq('id', d.id);
          if (error) throw error;
        } else {
          const proximaData = addOneMonth(d.data_despesa);
          const { error } = await supabase
            .from('financeiro')
            .update({
              parcela_atual:    novaParcelaAtual,
              status_pagamento: 'em_aberto',
              data_despesa:     proximaData,
            })
            .eq('id', d.id);
          if (error) throw error;
        }

      } else {
        const { error } = await supabase
          .from('financeiro')
          .update({ status_pagamento: 'paga' })
          .eq('id', d.id);
        if (error) throw error;
      }

      await fetchDespesas(userId);
    } catch (err) {
      Alert.alert('Erro ao registrar pagamento', err.message);
    }
  }, [userId, fetchDespesas]);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) {
        setUserId(uid);
        const lista = await fetchDespesas(uid);
        if (lista) await verificarAtrasos(uid, lista);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const despesasAtivas = useMemo(() =>
    despesas.filter(d => d.status_pagamento !== 'concluida'),
  [despesas]);

  const despesasConcluidas = useMemo(() =>
    despesas.filter(d => d.status_pagamento === 'concluida'),
  [despesas]);

  const totalMes = useMemo(() => {
    const start = startOfMonth();
    const end   = endOfMonth();
    return despesasAtivas
      .filter(d => {
        const ref = d.data_despesa
          ? new Date(`${d.data_despesa}T12:00:00`)
          : new Date(d.created_at);
        return ref >= start && ref <= end;
      })
      .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
  }, [despesasAtivas]);

  const mesLabel = `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;

  const openEdit  = d => { setSelectedDespesa(d); setEditVisible(true); };
  const closeEdit = () => { setEditVisible(false); setSelectedDespesa(null); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Despesas</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total em {mesLabel}</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalMes)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : despesasAtivas.length > 0 ? (
          despesasAtivas.map(d => (
            <DespesaCard
              key={d.id}
              {...d}
              onPress={() => openEdit(d)}
              onPagar={() => marcarComoPaga(d)}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma despesa registrada ainda.</Text>
            <Text style={styles.emptyHint}>Toque no + para adicionar.</Text>
          </View>
        )}

        {despesasConcluidas.length > 0 && (
          <TouchableOpacity
            style={styles.concluidasHeader}
            onPress={() => setConcluidasVisible(v => !v)}
            activeOpacity={0.75}
          >
            <Text style={styles.concluidasHeaderText}>
              Concluídas ({despesasConcluidas.length})
            </Text>
            <Text style={styles.concluidasArrow}>{concluidasVisible ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}

        {concluidasVisible && despesasConcluidas.map(d => (
          <DespesaCard
            key={d.id}
            {...d}
            onPress={() => openEdit(d)}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setAddVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddDespesaModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSaved={() => { setAddVisible(false); fetchDespesas(); }}
        userId={userId}
      />

      <EditDespesaModal
        visible={editVisible}
        despesa={selectedDespesa}
        onClose={closeEdit}
        onSaved={() => { closeEdit(); fetchDespesas(); }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, marginBottom: 20 },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight: { width: 32 },
  totalCard:   { backgroundColor: colors.primary, marginHorizontal: 20, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 20 },
  totalLabel:  { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  totalValue:  { fontSize: 36, fontWeight: '800', color: colors.white },
  scroll:      { paddingHorizontal: 20, paddingBottom: 110 },
  card:        { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft:    { flex: 1, marginRight: 12 },
  cardRight:   { alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  cardTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  cardCategoria:   { fontSize: 15, fontWeight: '600', color: colors.white },
  badge:           { backgroundColor: 'rgba(168,35,90,0.2)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(168,35,90,0.4)' },
  badgePago:       { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.3)' },
  badgeAtraso:     { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.3)' },
  badgeNeutro:     { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' },
  badgeText:       { fontSize: 9, fontWeight: '700', color: colors.white, letterSpacing: 0.4 },
  cardParcelas:    { fontSize: 11, fontWeight: '500', color: '#555555', marginBottom: 3 },
  cardDescricao:   { fontSize: 12, fontWeight: '400', color: colors.gray, marginBottom: 3 },
  cardDate:        { fontSize: 11, fontWeight: '400', color: '#444444' },
  cardValor:       { fontSize: 17, fontWeight: '800', color: '#F87171' },
  pagarBtn:        { backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  pagarBtnText:    { fontSize: 11, fontWeight: '700', color: '#4ade80' },
  empty:           { alignItems: 'center', paddingTop: 60 },
  emptyText:       { fontSize: 15, fontWeight: '500', color: colors.gray, marginBottom: 6 },
  emptyHint:       { fontSize: 13, fontWeight: '400', color: '#444444' },
  concluidasHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, marginTop: 8, marginBottom: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  concluidasHeaderText: { fontSize: 13, fontWeight: '700', color: colors.gray, letterSpacing: 0.4 },
  concluidasArrow:      { fontSize: 11, color: colors.gray },
  fab:     { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  fabText: { fontSize: 30, fontWeight: '400', color: colors.white, lineHeight: 34 },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const INPUT_BG = '#1A1B1E';
const SUBTLE   = '#3D1020';

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#0E0F11', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: SUBTLE, alignSelf: 'center', marginBottom: 20 },
  title:    { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  label:    { fontSize: 10, fontWeight: '700', color: '#6B4A58', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  input:    { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '400', color: '#FFFFFF', marginBottom: 12 },
  inputText:        { color: '#FFFFFF' },
  inputPlaceholder: { color: '#6B4A58' },
  inputMulti: { height: 80, paddingTop: 14 },

  dropdownTrigger:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownArrow:          { fontSize: 11, color: '#6B4A58' },
  dropdownList:           { backgroundColor: INPUT_BG, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  dropdownItem:           { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder:     { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  dropdownItemActive:     { backgroundColor: 'rgba(168,35,90,0.2)' },
  dropdownItemText:       { fontSize: 14, fontWeight: '400', color: '#FFFFFF' },
  dropdownItemTextActive: { fontWeight: '700', color: colors.primary },

  parcelasRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  parcelaInput:  { flex: 1, marginBottom: 0 },
  parcelasDe:    { fontSize: 14, fontWeight: '500', color: '#6B4A58' },

  toggleRow:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn:           { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: INPUT_BG },
  toggleBtnActive:     { backgroundColor: colors.primary },
  toggleBtnText:       { fontSize: 13, fontWeight: '600', color: '#6B4A58' },
  toggleBtnTextActive: { color: '#FFFFFF' },

  saveBtn:       { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  deleteBtn:     { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderColor: '#F87171' },
  deleteBtnText: { fontSize: 16, fontWeight: '700', color: '#F87171' },
});
