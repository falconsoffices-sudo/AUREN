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
import { scheduleNotification } from '../lib/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_LONG  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MONTHS     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_DISPLAY = {
  pendente:   { label: 'Pendente',   bg: '#1A1A2E', color: '#93C5FD' },
  confirmado: { label: 'Confirmada', bg: '#2C2000', color: '#FACC15' },
  finalizado: { label: 'Finalizado', bg: '#0D2B14', color: '#4ade80' },
  cancelado:  { label: 'Cancelado',  bg: '#2B0A0A', color: '#F87171' },
};

const STATUS_OPTIONS = [
  { label: 'Pendente',   value: 'pendente'   },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Finalizado', value: 'finalizado' },
  { label: 'Cancelado',  value: 'cancelado'  },
];

const TIPO_OPTIONS = [
  { label: 'Comercial',   value: 'comercial'   },
  { label: 'Residencial', value: 'residencial' },
  { label: 'A domicílio', value: 'domicilio'   },
];

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function getWeekDays(baseDate, weekOffset) {
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - baseDate.getDay() + weekOffset * 7);
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatTimeDisplay(isoStr) {
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = (h % 12) || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDuration(mins) {
  if (!mins) return '';
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function formatTimeInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// Auto-format MM/DD/YYYY as digits are typed
function formatDateInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// ISO → "MM/DD/YYYY"
function isoToDateStr(isoStr) {
  const d = new Date(isoStr);
  return `${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
}

// ISO → "HH:MM AM/PM"
function isoToTimeAMPM(isoStr) {
  const d = new Date(isoStr);
  const h   = d.getHours();
  const m   = String(d.getMinutes()).padStart(2, '0');
  const h12 = (h % 12) || 12;
  return `${String(h12).padStart(2,'0')}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

// "MM/DD/YYYY" + "HH:MM AM/PM" (or "HH:MM") → string local sem conversão UTC
function buildDataHoraFromInputs(dateStr, timeStr) {
  const [mm, dd, yyyy] = dateStr.split('/').map(s => parseInt(s, 10) || 0);
  const upper = timeStr.trim().toUpperCase();
  const parts  = upper.split(/\s+/);
  const [hStr, mStr] = (parts[0] || '0:0').split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const ampm = parts[1];
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const pad  = n => String(n).padStart(2, '0');
  const year = yyyy || new Date().getFullYear();
  return `${year}-${pad(mm || 1)}-${pad(dd || 1)}T${pad(h)}:${pad(m)}:00`;
}

function buildDataHora(date, timeStr) {
  const [hh, mm] = timeStr.split(':');
  const d = new Date(date);
  d.setHours(parseInt(hh || '0', 10), parseInt(mm || '0', 10), 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function normalize(str = '') {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─── Servico Picker Modal ─────────────────────────────────────────────────────

function ServicoPickerModal({ visible, servicos, loadingServicos, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[modal.sheet, { maxHeight: '70%' }]}>
          <View style={modal.handle} />
          <Text style={modal.title}>Selecionar Serviço</Text>
          {loadingServicos ? (
            <ActivityIndicator color={colors.primary} style={{ marginBottom: 20 }} />
          ) : servicos.length === 0 ? (
            <Text style={modal.emptyHint}>Cadastre seus serviços no Perfil primeiro.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {servicos.map((s, idx) => (
                <TouchableOpacity
                  key={s.id}
                  style={[modal.pickerItem, idx < servicos.length - 1 && modal.pickerItemBorder]}
                  onPress={() => onSelect(s)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={modal.pickerItemNome}>{s.nome}</Text>
                    {s.duracao_minutos ? <Text style={modal.pickerItemMeta}>{formatDuration(s.duracao_minutos)}</Text> : null}
                  </View>
                  {s.valor != null && <Text style={modal.pickerItemValor}>${parseFloat(s.valor).toFixed(2)}</Text>}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Add Agendamento Modal ────────────────────────────────────────────────────

function AddAgendamentoModal({ visible, onClose, onSaved, selectedDate, userId }) {
  const [clienteSearch,   setClienteSearch]   = useState('');
  const [clientes,        setClientes]        = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [servicos,        setServicos]        = useState([]);
  const [selectedServico, setSelectedServico] = useState(null);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [pickerVisible,   setPickerVisible]   = useState(false);
  const [time,            setTime]            = useState('');
  const [tipoEndereco,    setTipoEndereco]    = useState('comercial');
  const [observacoes,     setObservacoes]     = useState('');
  const [saving,          setSaving]          = useState(false);

  const reset = () => {
    setClienteSearch(''); setClientes([]); setSelectedCliente(null);
    setServicos([]);      setSelectedServico(null); setPickerVisible(false);
    setTime('');          setTipoEndereco('comercial'); setObservacoes('');
  };
  const handleClose = () => { reset(); onClose(); };

  useEffect(() => {
    if (!visible || !userId) return;
    setLoadingClientes(true);
    setLoadingServicos(true);
    Promise.all([
      supabase.from('clientes').select('id, nome').eq('profissional_id', userId).order('nome'),
      supabase.from('servicos').select('id, nome, valor, duracao_minutos').eq('profissional_id', userId).order('nome'),
    ]).then(([cRes, sRes]) => {
      console.log('[AddModal] servicos userId:', userId, '| data:', sRes.data, '| error:', sRes.error);
      if (cRes.data) setClientes(cRes.data);
      if (sRes.data) setServicos(sRes.data);
      setLoadingClientes(false);
      setLoadingServicos(false);
    });
  }, [visible, userId]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const q = normalize(clienteSearch);
    return clientes.filter(c => normalize(c.nome).includes(q));
  }, [clientes, clienteSearch]);

  const handleSave = async () => {
    if (!selectedCliente) { Alert.alert('Campo obrigatório', 'Selecione uma cliente.'); return; }
    if (!selectedServico) { Alert.alert('Campo obrigatório', 'Selecione um serviço.'); return; }
    if (!time || time.length < 3) { Alert.alert('Campo obrigatório', 'Informe o horário no formato HH:MM.'); return; }
    setSaving(true);
    try {
      const novoInicio  = new Date(buildDataHora(selectedDate, time));
      const novoDuracao = selectedServico.duracao_minutos || 60;
      const novoFim     = new Date(novoInicio.getTime() + novoDuracao * 60 * 1000);

      const dayStart = new Date(selectedDate); dayStart.setHours(0,  0,  0,   0);
      const dayEnd   = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);

      const { data: existentes } = await supabase
        .from('agendamentos')
        .select('data_hora, servicos(duracao_minutos)')
        .eq('profissional_id', userId)
        .neq('status', 'cancelado')
        .gte('data_hora', dayStart.toISOString())
        .lte('data_hora', dayEnd.toISOString());

      if (existentes) {
        for (const a of existentes) {
          const existenteInicio  = new Date(a.data_hora);
          const existenteDuracao = a.servicos?.duracao_minutos || 60;
          const existenteFim     = new Date(existenteInicio.getTime() + existenteDuracao * 60 * 1000);
          if (novoInicio < existenteFim && novoFim > existenteInicio) {
            Alert.alert(
              'Horário indisponível',
              `Você já tem um agendamento às ${formatTimeDisplay(a.data_hora)} neste horário.`
            );
            setSaving(false);
            return;
          }
        }
      }

      const { error } = await supabase.from('agendamentos').insert({
        profissional_id: userId,
        cliente_id:      selectedCliente.id,
        servico_id:      selectedServico.id,
        data_hora:       buildDataHora(selectedDate, time),
        status:          'confirmado',
        valor:           selectedServico.valor ?? null,
        tipo_endereco:   tipoEndereco,
        observacoes:     observacoes.trim() || null,
      });
      if (error) throw error;

      // agenda notificações locais de lembrete
      const secsUntil = (novoInicio.getTime() - Date.now()) / 1000;
      const horaFmt   = formatTimeDisplay(novoInicio.toISOString());
      if (secsUntil > 3600) {
        scheduleNotification(
          'Lembrete de agendamento',
          `${selectedCliente.nome} amanhã às ${horaFmt}`,
          secsUntil - 86400 > 60 ? secsUntil - 86400 : secsUntil - 3600
        ).catch(() => {});
      }
      if (secsUntil > 3600) {
        scheduleNotification(
          'Próximo atendimento',
          `${selectedCliente.nome} em 1 hora`,
          secsUntil - 3600
        ).catch(() => {});
      }

      reset();
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = `${DAYS_LONG[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Novo Agendamento</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={modal.sectionLabel}>CLIENTE</Text>
              {selectedCliente ? (
                <View style={modal.selectedRow}>
                  <View style={modal.selectedAvatar}>
                    <Text style={modal.selectedAvatarText}>{getInitials(selectedCliente.nome)}</Text>
                  </View>
                  <Text style={modal.selectedText} numberOfLines={1}>{selectedCliente.nome}</Text>
                  <TouchableOpacity onPress={() => { setSelectedCliente(null); setClienteSearch(''); }} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                    <Text style={modal.clearBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput style={modal.input} placeholder="Buscar cliente..." placeholderTextColor="#6B4A58" value={clienteSearch} onChangeText={setClienteSearch} autoCapitalize="words" />
                  {loadingClientes ? (
                    <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />
                  ) : filteredClientes.length > 0 ? (
                    <View style={modal.listBox}>
                      {filteredClientes.slice(0, 5).map((c, idx) => (
                        <TouchableOpacity key={c.id} style={[modal.listItem, idx < Math.min(filteredClientes.length,5)-1 && modal.listItemBorder]} onPress={() => { setSelectedCliente(c); setClienteSearch(''); }} activeOpacity={0.7}>
                          <Text style={modal.listItemText}>{c.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : clienteSearch.trim() ? <Text style={modal.emptyHint}>Nenhuma cliente encontrada.</Text> : null}
                </>
              )}

              <Text style={modal.sectionLabel}>SERVIÇO</Text>
              <TouchableOpacity style={modal.pickerField} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
                <Text style={selectedServico ? modal.pickerFieldText : modal.pickerFieldPlaceholder} numberOfLines={1}>
                  {selectedServico
                    ? `${selectedServico.nome}${selectedServico.valor != null ? '  ·  $' + parseFloat(selectedServico.valor).toFixed(2) : ''}`
                    : 'Selecionar serviço...'}
                </Text>
                <Text style={modal.pickerFieldArrow}>▼</Text>
              </TouchableOpacity>
              <ServicoPickerModal
                visible={pickerVisible}
                servicos={servicos}
                loadingServicos={loadingServicos}
                onSelect={s => { setSelectedServico(s); setPickerVisible(false); }}
                onClose={() => setPickerVisible(false)}
              />

              <Text style={modal.sectionLabel}>DATA E HORA</Text>
              <View style={modal.dateBox}><Text style={modal.dateText}>{dateLabel}</Text></View>
              <TextInput style={modal.input} placeholder="Horário — HH:MM (ex: 14:30)" placeholderTextColor="#6B4A58" value={time} onChangeText={t => setTime(formatTimeInput(t))} keyboardType="numeric" maxLength={5} />

              <Text style={modal.sectionLabel}>LOCAL</Text>
              <View style={modal.tipoRow}>
                {TIPO_OPTIONS.map(opt => {
                  const active = tipoEndereco === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.tipoBtn, active && modal.tipoBtnActive]} onPress={() => setTipoEndereco(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.tipoBtnText, active && modal.tipoBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={modal.sectionLabel}>OBSERVAÇÕES</Text>
              <TextInput style={[modal.input, modal.inputMulti]} placeholder="Opcional" placeholderTextColor="#6B4A58" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} textAlignVertical="top" />

              <TouchableOpacity style={[modal.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={modal.saveBtnText}>Agendar</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Edit Agendamento Modal ───────────────────────────────────────────────────

function EditAgendamentoModal({ visible, agendamento, userId, onClose, onSaved }) {
  const [clienteSearch,   setClienteSearch]   = useState('');
  const [clientes,        setClientes]        = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [servicos,        setServicos]        = useState([]);
  const [selectedServico, setSelectedServico] = useState(null);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [pickerVisible,   setPickerVisible]   = useState(false);
  const [dateStr,         setDateStr]         = useState('');
  const [timeStr,         setTimeStr]         = useState('');
  const [status,          setStatus]          = useState('confirmado');
  const [tipoEndereco,    setTipoEndereco]    = useState('comercial');
  const [observacoes,     setObservacoes]     = useState('');
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    if (!visible || !agendamento || !userId) return;

    // Pre-fill text fields
    setDateStr(isoToDateStr(agendamento.data_hora));
    setTimeStr(isoToTimeAMPM(agendamento.data_hora));
    setStatus(agendamento.status           ?? 'confirmado');
    setTipoEndereco(agendamento.tipo_endereco ?? 'comercial');
    setObservacoes(agendamento.observacoes  ?? '');
    setClienteSearch('');

    // Pre-select current client from joined data
    if (agendamento.clientes) setSelectedCliente(agendamento.clientes);

    // Load full lists and pre-select service
    setLoadingClientes(true);
    setLoadingServicos(true);
    Promise.all([
      supabase.from('clientes').select('id, nome').eq('profissional_id', userId).order('nome'),
      supabase.from('servicos').select('id, nome, valor, duracao_minutos').eq('profissional_id', userId).order('nome'),
    ]).then(([cRes, sRes]) => {
      console.log('[EditModal] servicos userId:', userId, '| data:', sRes.data, '| error:', sRes.error);
      if (cRes.data) setClientes(cRes.data);
      if (sRes.data) {
        setServicos(sRes.data);
        const cur = sRes.data.find(s => s.id === agendamento.servico_id);
        if (cur) setSelectedServico(cur);
        else if (agendamento.servicos) setSelectedServico(agendamento.servicos);
      }
      setLoadingClientes(false);
      setLoadingServicos(false);
    });
  }, [visible, agendamento, userId]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const q = normalize(clienteSearch);
    return clientes.filter(c => normalize(c.nome).includes(q));
  }, [clientes, clienteSearch]);

  const handleSave = async () => {
    if (!selectedCliente) { Alert.alert('Campo obrigatório', 'Selecione uma cliente.'); return; }
    if (!selectedServico) { Alert.alert('Campo obrigatório', 'Selecione um serviço.'); return; }
    if (dateStr.length < 10) { Alert.alert('Campo obrigatório', 'Informe a data no formato MM/DD/YYYY.'); return; }
    if (!timeStr.trim()) { Alert.alert('Campo obrigatório', 'Informe o horário.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          cliente_id:    selectedCliente.id,
          servico_id:    selectedServico.id,
          valor:         selectedServico.valor ?? null,
          data_hora:     buildDataHoraFromInputs(dateStr, timeStr),
          status,
          tipo_endereco: tipoEndereco,
          observacoes:   observacoes.trim() || null,
        })
        .eq('id', agendamento.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    Alert.alert(
      'Cancelar agendamento',
      'Deseja cancelar este agendamento?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase
                .from('agendamentos')
                .update({ status: 'cancelado' })
                .eq('id', agendamento.id);
              if (error) throw error;
              onSaved();
            } catch (err) {
              Alert.alert('Erro', err.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (!agendamento) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <Text style={modal.title}>Editar Agendamento</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Cliente ── */}
              <Text style={modal.sectionLabel}>CLIENTE</Text>
              {selectedCliente ? (
                <View style={modal.selectedRow}>
                  <View style={modal.selectedAvatar}>
                    <Text style={modal.selectedAvatarText}>{getInitials(selectedCliente.nome)}</Text>
                  </View>
                  <Text style={modal.selectedText} numberOfLines={1}>{selectedCliente.nome}</Text>
                  <TouchableOpacity onPress={() => { setSelectedCliente(null); setClienteSearch(''); }} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                    <Text style={modal.clearBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput style={modal.input} placeholder="Buscar cliente..." placeholderTextColor="#6B4A58" value={clienteSearch} onChangeText={setClienteSearch} autoCapitalize="words" />
                  {loadingClientes ? (
                    <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />
                  ) : filteredClientes.length > 0 ? (
                    <View style={modal.listBox}>
                      {filteredClientes.slice(0, 5).map((c, idx) => (
                        <TouchableOpacity key={c.id} style={[modal.listItem, idx < Math.min(filteredClientes.length,5)-1 && modal.listItemBorder]} onPress={() => { setSelectedCliente(c); setClienteSearch(''); }} activeOpacity={0.7}>
                          <Text style={modal.listItemText}>{c.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : clienteSearch.trim() ? <Text style={modal.emptyHint}>Nenhuma cliente encontrada.</Text> : null}
                </>
              )}

              {/* ── Serviço ── */}
              <Text style={modal.sectionLabel}>SERVIÇO</Text>
              <TouchableOpacity style={modal.pickerField} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
                <Text style={selectedServico ? modal.pickerFieldText : modal.pickerFieldPlaceholder} numberOfLines={1}>
                  {selectedServico
                    ? `${selectedServico.nome}${selectedServico.valor != null ? '  ·  $' + parseFloat(selectedServico.valor).toFixed(2) : ''}`
                    : 'Selecionar serviço...'}
                </Text>
                <Text style={modal.pickerFieldArrow}>▼</Text>
              </TouchableOpacity>
              <ServicoPickerModal
                visible={pickerVisible}
                servicos={servicos}
                loadingServicos={loadingServicos}
                onSelect={s => { setSelectedServico(s); setPickerVisible(false); }}
                onClose={() => setPickerVisible(false)}
              />

              {/* ── Data e Hora ── */}
              <Text style={modal.sectionLabel}>DATA E HORA</Text>
              <TextInput
                style={modal.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#6B4A58"
                value={dateStr}
                onChangeText={t => setDateStr(formatDateInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={modal.input}
                placeholder="HH:MM AM/PM (ex: 02:30 PM)"
                placeholderTextColor="#6B4A58"
                value={timeStr}
                onChangeText={t => setTimeStr(t.replace(/[^0-9:aAmMpP ]/g, '').slice(0, 8))}
                autoCapitalize="characters"
                maxLength={8}
              />

              {/* ── Status ── */}
              <Text style={modal.sectionLabel}>STATUS</Text>
              <View style={modal.statusRow}>
                {STATUS_OPTIONS.map(opt => {
                  const active = status === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.statusBtn, active && modal.statusBtnActive]} onPress={() => setStatus(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.statusBtnText, active && modal.statusBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Local ── */}
              <Text style={modal.sectionLabel}>LOCAL</Text>
              <View style={modal.tipoRow}>
                {TIPO_OPTIONS.map(opt => {
                  const active = tipoEndereco === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[modal.tipoBtn, active && modal.tipoBtnActive]} onPress={() => setTipoEndereco(opt.value)} activeOpacity={0.75}>
                      <Text style={[modal.tipoBtnText, active && modal.tipoBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Observações ── */}
              <Text style={modal.sectionLabel}>OBSERVAÇÕES</Text>
              <TextInput style={[modal.input, modal.inputMulti]} placeholder="Opcional" placeholderTextColor="#6B4A58" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} textAlignVertical="top" />

              <TouchableOpacity style={[modal.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[modal.cancelBtn, saving && { opacity: 0.7 }]} onPress={handleCancelar} disabled={saving} activeOpacity={0.85}>
                <Text style={modal.cancelBtnText}>Cancelar agendamento</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({ data_hora, clientes: cliente, servicos: servico, status, valor, onPress }) {
  const s      = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.confirmado;
  const isNext = status === 'confirmado';
  const name   = cliente?.nome ?? '—';

  return (
    <TouchableOpacity
      style={[styles.apptCard, isNext && styles.apptCardHighlight]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.apptTopRow}>
        <Text style={styles.apptTime}>{formatTimeDisplay(data_hora)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>
      <View style={styles.apptClientRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.apptInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.clientName} numberOfLines={1}>{name}</Text>
            {cliente?.vip && (
              <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>
            )}
          </View>
          <Text style={styles.serviceText}>
            {servico?.nome ?? '—'}
            {servico?.duracao_minutos ? ` · ${formatDuration(servico.duracao_minutos)}` : ''}
          </Text>
        </View>
        {valor != null && (
          <Text style={[styles.apptValue, isNext && { color: colors.primary }]}>
            ${parseFloat(valor).toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const [weekOffset,      setWeekOffset]      = useState(0);
  const [selected,        setSelected]        = useState(TODAY);
  const [agendamentos,    setAgendamentos]    = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [modalVisible,    setModalVisible]    = useState(false);
  const [editAgendamento, setEditAgendamento] = useState(null);
  const [editVisible,     setEditVisible]     = useState(false);
  const [userId,          setUserId]          = useState(null);

  const weekDays   = getWeekDays(TODAY, weekOffset);
  const monthLabel = `${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`;
  const dayLabel   = `${DAYS_LONG[selected.getDay()]}, ${selected.getDate()} de ${MONTHS[selected.getMonth()]}`;

  const fetchAgendamentos = useCallback(async (uid, date) => {
    if (!uid) return;
    setLoading(true);
    const start = new Date(date); start.setHours(0,  0,  0,   0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id, data_hora, status, valor, tipo_endereco, observacoes,
        cliente_id, servico_id,
        clientes(id, nome, vip),
        servicos(id, nome, duracao_minutos)
      `)
      .eq('profissional_id', uid)
      .gte('data_hora', start.toISOString())
      .lte('data_hora', end.toISOString())
      .order('data_hora');
    if (!error && data) setAgendamentos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (uid) setUserId(uid);
    })();
  }, []);

  useEffect(() => {
    if (userId) fetchAgendamentos(userId, selected);
  }, [userId, selected]);

  const openEdit = (a) => { setEditAgendamento(a); setEditVisible(true); };
  const closeEdit = () => { setEditVisible(false); setEditAgendamento(null); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <Text style={styles.headerMonth}>{monthLabel}</Text>
      </View>

      <View style={styles.weekRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setWeekOffset(o => o - 1)} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        {weekDays.map((day, i) => {
          const active = isSameDay(day, selected);
          return (
            <TouchableOpacity key={i} style={[styles.dayItem, active && styles.dayItemActive]} onPress={() => setSelected(day)} activeOpacity={0.75}>
              <Text style={[styles.dayShort, active && styles.dayTextActive]}>{DAYS_SHORT[day.getDay()]}</Text>
              <Text style={[styles.dayNum,   active && styles.dayTextActive]}>{day.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.navBtn} onPress={() => setWeekOffset(o => o + 1)} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.dayTitle}>
        {dayLabel}
        {agendamentos.length > 0 ? `  ·  ${agendamentos.length} Agendamento${agendamentos.length !== 1 ? 's' : ''}` : ''}
      </Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : agendamentos.length > 0 ? (
          agendamentos.map(a => <AppointmentCard key={a.id} {...a} onPress={() => openEdit(a)} />)
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyText}>Nenhum agendamento para este dia.</Text></View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddAgendamentoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => { setModalVisible(false); fetchAgendamentos(userId, selected); }}
        selectedDate={selected}
        userId={userId}
      />

      <EditAgendamentoModal
        visible={editVisible}
        agendamento={editAgendamento}
        userId={userId}
        onClose={closeEdit}
        onSaved={() => { closeEdit(); fetchAgendamentos(userId, selected); }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 28, marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.white },
  headerMonth: { fontSize: 14, fontWeight: '400', color: colors.gray, paddingBottom: 3 },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 20 },
  navBtn:     { width: 28, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 26, fontWeight: '400', color: colors.gray, lineHeight: 30 },
  dayItem:       { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  dayItemActive: { backgroundColor: colors.primary },
  dayShort:      { fontSize: 10, fontWeight: '600', color: colors.gray, marginBottom: 5, letterSpacing: 0.3 },
  dayNum:        { fontSize: 15, fontWeight: '700', color: colors.gray },
  dayTextActive: { color: colors.white },
  dayTitle:      { fontSize: 14, fontWeight: '600', color: colors.white, paddingHorizontal: 20, marginBottom: 16 },
  scroll:        { paddingHorizontal: 20, paddingBottom: 110 },
  apptCard:           { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 10 },
  apptCardHighlight:  { borderWidth: 1, borderColor: 'rgba(168,35,90,0.45)' },
  apptTopRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  apptTime:           { fontSize: 12, fontWeight: '600', color: colors.gray, letterSpacing: 0.3 },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:         { fontSize: 11, fontWeight: '700' },
  apptClientRow:      { flexDirection: 'row', alignItems: 'center' },
  avatar:             { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2E2E2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:         { fontSize: 14, fontWeight: '700', color: colors.cream },
  apptInfo:           { flex: 1 },
  nameRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  clientName:         { fontSize: 15, fontWeight: '700', color: colors.white },
  vipBadge:           { backgroundColor: 'rgba(232,196,160,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,196,160,0.3)' },
  vipText:            { fontSize: 9, fontWeight: '800', color: colors.cream, letterSpacing: 0.8 },
  serviceText:        { fontSize: 12, fontWeight: '400', color: colors.gray },
  apptValue:          { fontSize: 16, fontWeight: '700', color: colors.white, marginLeft: 8 },
  emptyState:         { alignItems: 'center', paddingTop: 60 },
  emptyText:          { fontSize: 14, fontWeight: '400', color: colors.gray },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  fabText: { fontSize: 30, fontWeight: '400', color: colors.white, lineHeight: 34 },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const INPUT_BG = '#2D1020';
const SUBTLE   = '#3D1020';

const modal = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#1A0A14', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, maxHeight: '92%' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: SUBTLE, alignSelf: 'center', marginBottom: 20 },
  title:      { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#6B4A58', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  input:      { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '400', color: '#FFFFFF', marginBottom: 12 },
  inputMulti: { height: 80, paddingTop: 14 },

  selectedRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, gap: 10 },
  selectedAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4A1028', alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { fontSize: 11, fontWeight: '700', color: colors.cream },
  selectedText:       { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  clearBtn:           { fontSize: 16, color: '#6B4A58', fontWeight: '600' },

  listBox:        { backgroundColor: INPUT_BG, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  listItem:       { paddingHorizontal: 16, paddingVertical: 13 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  listItemText:   { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  emptyHint:      { fontSize: 13, fontWeight: '400', color: '#6B4A58', marginBottom: 12, paddingLeft: 4 },

  servicoRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 8 },
  servicoRowSelected: { backgroundColor: 'rgba(168,35,90,0.18)', borderWidth: 1, borderColor: 'rgba(168,35,90,0.5)' },
  servicoNome:        { fontSize: 14, fontWeight: '600', color: '#CCCCCC' },
  servicoNomeSel:     { color: '#FFFFFF' },
  servicoMeta:        { fontSize: 11, fontWeight: '400', color: '#6B4A58', marginTop: 2 },
  servicoValor:       { fontSize: 16, fontWeight: '700', color: '#AAAAAA', marginLeft: 8 },
  servicoValorSel:    { color: colors.cream },

  dateBox:  { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  dateText: { fontSize: 14, fontWeight: '500', color: '#CCCCCC' },

  statusRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBtn:           { paddingVertical: 11, borderRadius: 10, width: '48%', alignItems: 'center', backgroundColor: INPUT_BG },
  statusBtnActive:     { backgroundColor: colors.primary },
  statusBtnText:       { fontSize: 12, fontWeight: '600', color: '#6B4A58' },
  statusBtnTextActive: { color: '#FFFFFF' },

  tipoRow:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tipoBtn:           { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: INPUT_BG },
  tipoBtnActive:     { backgroundColor: colors.primary },
  tipoBtnText:       { fontSize: 12, fontWeight: '600', color: '#6B4A58' },
  tipoBtnTextActive: { color: '#FFFFFF' },

  saveBtn:       { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn:     { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderColor: '#F87171' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#F87171' },

  pickerField:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  pickerFieldText:        { fontSize: 15, color: '#FFFFFF', flex: 1 },
  pickerFieldPlaceholder: { fontSize: 15, color: '#6B4A58', flex: 1 },
  pickerFieldArrow:       { fontSize: 11, color: '#6B4A58', marginLeft: 8 },
  pickerItem:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pickerItemBorder:       { borderBottomWidth: 1, borderBottomColor: '#3D1020' },
  pickerItemNome:         { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  pickerItemMeta:         { fontSize: 12, color: '#6B4A58', marginTop: 2 },
  pickerItemValor:        { fontSize: 16, fontWeight: '700', color: colors.cream, marginLeft: 12 },
});
