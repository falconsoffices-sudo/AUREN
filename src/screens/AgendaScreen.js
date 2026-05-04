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
import { useTheme } from '../context/ThemeContext';
import { scheduleNotification } from '../lib/notifications';
import { sendSMS, applyTemplate } from '../lib/sms';
import { calcularNivel } from '../lib/gamificacao';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_LONG  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MONTHS     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_DISPLAY_LIGHT = {
  pendente:   { label: 'Aguardando', bg: '#FEF3C7', color: '#D97706' },
  confirmado: { label: 'Confirmada', bg: '#FEF9C3', color: '#92400E' },
  finalizado: { label: 'Finalizado', bg: '#F0FDF4', color: '#15803D' },
  cancelado:  { label: 'Cancelado',  bg: '#FEF2F2', color: '#DC2626' },
};

const STATUS_DISPLAY_DARK = {
  pendente:   { label: 'Aguardando', bg: '#2D1E07', color: '#F59E0B' },
  confirmado: { label: 'Confirmada', bg: '#2D2508', color: '#FBBF24' },
  finalizado: { label: 'Finalizado', bg: '#0A2218', color: '#4ade80' },
  cancelado:  { label: 'Cancelado',  bg: '#3B1212', color: '#F87171' },
};

const STATUS_OPTIONS = [
  { label: 'Pendente',   value: 'pendente'   },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Finalizado', value: 'finalizado' },
  { label: 'Cancelado',  value: 'cancelado'  },
];

const METODOS_FIN = [
  { key: 'zelle',    label: 'Zelle'    },
  { key: 'cartao',   label: 'Cartão'   },
  { key: 'dinheiro', label: 'Dinheiro' },
  { key: 'cheque',   label: 'Cheque'   },
  { key: 'venmo',    label: 'Venmo'    },
  { key: 'cashapp',  label: 'CashApp'  },
];

const TIPO_OPTIONS = [
  { label: 'Comercial',   value: 'comercial'   },
  { label: 'Residencial', value: 'residencial' },
  { label: 'A domicílio', value: 'domicilio'   },
];

const TIPO_LABELS = { comercial: 'Comercial', residencial: 'Residencial', domicilio: 'A domicílio' };

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
  if (!isoStr) return '';
  const [, timePart] = isoStr.split('T');
  if (!timePart) return '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = (h % 12) || 12;
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
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
  if (!isoStr) return '';
  const timePart = isoStr.split('T')[1] || '';
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = (h % 12) || 12;
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
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

function isFinalizavel(a) {
  if (a.status !== 'confirmado') return false;
  const dur = a.servicos?.duracao_minutos ?? 60;
  const end = new Date(new Date(a.data_hora).getTime() + dur * 60000);
  return end < new Date();
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
            <ActivityIndicator color="#A8235A" style={{ marginBottom: 20 }} />
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
      supabase.from('clientes').select('id, nome, telefone, endereco').eq('profissional_id', userId).order('nome'),
      supabase.from('servicos').select('id, nome, valor, duracao_minutos').eq('profissional_id', userId).order('nome'),
    ]).then(([cRes, sRes]) => {
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

  const doSave = async () => {
    setSaving(true);
    try {
      const novoInicio  = new Date(buildDataHoraFromInputs(isoToDateStr(selectedDate.toISOString()), time));
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
        data_hora:       buildDataHoraFromInputs(isoToDateStr(selectedDate.toISOString()), time),
        status:          'confirmado',
        valor:           selectedServico.valor ?? null,
        tipo_endereco:   tipoEndereco,
        observacoes:     observacoes.trim() || null,
      });
      if (error) throw error;

      // Busca perfil + endereço comercial para SMS e rota
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = user
        ? await supabase
            .from('profiles')
            .select('nome_completo, nome, endereco_comercial')
            .eq('id', user.id)
            .single()
        : { data: null };

      // envia SMS de confirmação para a cliente
      if (selectedCliente.telefone) {
        try {
          const stored = await AsyncStorage.getItem('auren:sms_templates');
          const templates = stored ? JSON.parse(stored) : {};
          const DEFAULT_CONFIRMACAO = 'Olá [nome]! Seu agendamento de [servico] está confirmado para [horario].';
          const templateText = templates.confirmacao || DEFAULT_CONFIRMACAO;
          const mensagem = applyTemplate(templateText, {
            nome:              selectedCliente.nome,
            horario:           formatTimeDisplay(buildDataHoraFromInputs(isoToDateStr(selectedDate.toISOString()), time)),
            servico:           selectedServico.nome,
            nome_profissional: prof?.nome_completo ?? prof?.nome ?? '',
          });
          sendSMS(selectedCliente.telefone, mensagem).catch(() => {});
        } catch (_) {}
      }

      // Determina endereço para link de rota
      const isDomicilio = tipoEndereco === 'domicilio';
      let enderecoRota = '';
      if (isDomicilio) {
        // Profissional vai até a cliente — usa endereço da cliente
        enderecoRota = selectedCliente.endereco ?? '';
      } else {
        // Cliente vai até a profissional — usa endereço comercial do perfil
        try {
          const ec = JSON.parse(prof?.endereco_comercial || '{}');
          enderecoRota = [ec.rua, ec.numero, ec.cidade, ec.estado].filter(Boolean).join(', ');
        } catch (_) {}
      }

      // Agenda notificações locais de lembrete
      const secsUntil    = (novoInicio.getTime() - Date.now()) / 1000;
      const horaFmt      = formatTimeDisplay(novoInicio.toISOString());
      const profNome     = prof?.nome_completo ?? prof?.nome ?? '';

      // 24h antes — lembrete simples
      if (secsUntil > 86400) {
        scheduleNotification(
          'Lembrete de agendamento',
          `${selectedCliente.nome} amanhã às ${horaFmt}`,
          secsUntil - 86400
        ).catch(() => {});
      }

      // 1h antes — lembrete + dados para disparar SMS com rota ao notificar
      if (secsUntil > 3600) {
        scheduleNotification(
          'Próximo atendimento',
          `${selectedCliente.nome} em 1 hora`,
          secsUntil - 3600,
          {
            type:             'sms_rota',
            telefone:         selectedCliente.telefone ?? null,
            profissionalNome: profNome,
            horario:          horaFmt,
            endereco:         enderecoRota,
            isDomicilio,
          }
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

  const handleSave = async () => {
    if (!selectedCliente) { Alert.alert('Campo obrigatório', 'Selecione uma cliente.'); return; }
    if (!selectedServico) { Alert.alert('Campo obrigatório', 'Selecione um serviço.'); return; }
    if (!/^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM)$/i.test(time.trim())) { Alert.alert('Horário inválido', 'Use o formato HH:MM AM/PM (ex: 2:30 PM)'); return; }

    let outsideHours = false;
    try {
      const weekDayMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const dayKey     = weekDayMap[selectedDate.getDay()];
      const [storedH, storedE] = await Promise.all([
        AsyncStorage.getItem('auren:horario_atendimento'),
        AsyncStorage.getItem('auren:horario_especial'),
      ]);
      const DEF = { dias: ['seg', 'ter', 'qua', 'qui', 'sex'], inicio: '08:00', fim: '17:00' };
      const h   = storedH ? { ...DEF, ...JSON.parse(storedH) } : DEF;
      const he  = storedE ? JSON.parse(storedE) : null;
      const upper = time.trim().toUpperCase();
      const parts = upper.split(/\s+/);
      const [hStr, mStr] = (parts[0] || '0:0').split(':');
      let hh = parseInt(hStr, 10) || 0;
      const mm = parseInt(mStr, 10) || 0;
      if (parts[1] === 'PM' && hh !== 12) hh += 12;
      if (parts[1] === 'AM' && hh === 12) hh = 0;
      const tMins = s => { const [a, b] = (s || '0:0').split(':').map(Number); return a * 60 + b; };
      const timeMins = hh * 60 + mm;
      const inReg = h.dias.includes(dayKey) && timeMins >= tMins(h.inicio) && timeMins < tMins(h.fim);
      const inSpe = he?.ativo && (he.dias ?? []).includes(dayKey) && timeMins >= tMins(he.inicio) && timeMins < tMins(he.fim);
      outsideHours = !inReg && !inSpe;
    } catch (_) {}

    if (outsideHours) {
      Alert.alert(
        'Fora do horário',
        'O horário está fora do seu horário de atendimento. Deseja continuar mesmo assim?',
        [
          { text: 'Corrigir', style: 'cancel' },
          { text: 'Confirmar', onPress: doSave },
        ]
      );
      return;
    }

    doSave();
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
                  <TextInput style={modal.input} placeholder="Buscar cliente..." placeholderTextColor="#C9A8B6" value={clienteSearch} onChangeText={setClienteSearch} autoCapitalize="words" />
                  {loadingClientes ? (
                    <ActivityIndicator color="#A8235A" style={{ marginBottom: 12 }} />
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
              <TextInput style={modal.input} placeholder="HH:MM AM/PM (ex: 2:30 PM)" placeholderTextColor="#C9A8B6" value={time} onChangeText={t => setTime(t.replace(/[^0-9:aAmMpP ]/g, '').slice(0, 8))} keyboardType="default" autoCapitalize="characters" maxLength={8} />

              <Text style={modal.sectionLabel}>LOCAL DE ATENDIMENTO</Text>
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
              <TextInput style={[modal.input, modal.inputMulti]} placeholder="Opcional" placeholderTextColor="#C9A8B6" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} textAlignVertical="top" />

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

    const novoInicio  = new Date(buildDataHoraFromInputs(dateStr, timeStr));
    const novoDuracao = selectedServico.duracao_minutos || 60;
    const novoFim     = new Date(novoInicio.getTime() + novoDuracao * 60 * 1000);
    const [_mm, _dd, _yyyy] = dateStr.split('/');
    const dayStart = new Date(`${_yyyy}-${_mm}-${_dd}T00:00:00`);
    const dayEnd   = new Date(`${_yyyy}-${_mm}-${_dd}T23:59:59`);
    const { data: existentes } = await supabase
      .from('agendamentos')
      .select('data_hora, servicos(duracao_minutos), clientes(nome)')
      .eq('profissional_id', userId)
      .neq('status', 'cancelado')
      .neq('id', agendamento.id)
      .gte('data_hora', dayStart.toISOString())
      .lte('data_hora', dayEnd.toISOString());
    if (existentes) {
      for (const a of existentes) {
        const existenteInicio  = new Date(a.data_hora);
        const existenteDuracao = a.servicos?.duracao_minutos || 60;
        const existenteFim     = new Date(existenteInicio.getTime() + existenteDuracao * 60 * 1000);
        if (novoInicio < existenteFim && novoFim > existenteInicio) {
          const proxDate = new Date(existenteFim.getTime() + 10 * 60 * 1000);
          const pad      = n => String(n).padStart(2, '0');
          const proxIso  = `${proxDate.getFullYear()}-${pad(proxDate.getMonth()+1)}-${pad(proxDate.getDate())}T${pad(proxDate.getHours())}:${pad(proxDate.getMinutes())}:00`;
          const proxFmt  = formatTimeDisplay(proxIso);
          Alert.alert(
            'Horário ocupado',
            `Você já tem ${a.clientes?.nome ?? 'uma cliente'} agendada neste horário. Próximo horário disponível: ${proxFmt}. Deseja marcar para este horário?`,
            [
              { text: 'Escolher outro horário', style: 'cancel' },
              { text: 'Sim', onPress: () => setTimeStr(proxFmt) },
            ]
          );
          return;
        }
      }
    }

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
                  <TextInput style={modal.input} placeholder="Buscar cliente..." placeholderTextColor="#C9A8B6" value={clienteSearch} onChangeText={setClienteSearch} autoCapitalize="words" />
                  {loadingClientes ? (
                    <ActivityIndicator color="#A8235A" style={{ marginBottom: 12 }} />
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
                placeholderTextColor="#C9A8B6"
                value={dateStr}
                onChangeText={t => setDateStr(formatDateInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />
              <TextInput
                style={modal.input}
                placeholder="HH:MM AM/PM (ex: 02:30 PM)"
                placeholderTextColor="#C9A8B6"
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
              <Text style={modal.sectionLabel}>LOCAL DE ATENDIMENTO</Text>
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
              <TextInput style={[modal.input, modal.inputMulti]} placeholder="Opcional" placeholderTextColor="#C9A8B6" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} textAlignVertical="top" />

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

// ─── Solicitacao Modal ────────────────────────────────────────────────────────

function SolicitacaoModal({ visible, agendamento, onClose, onSaved, onEditar }) {
  const [saving, setSaving] = useState(false);
  if (!agendamento) return null;

  const dataFmt = new Date(agendamento.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const horaFmt = formatTimeDisplay(agendamento.data_hora);

  async function aceitar() {
    setSaving(true);
    try {
      const { error } = await supabase.from('agendamentos').update({ status: 'confirmado' }).eq('id', agendamento.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }

  function recusar() {
    Alert.alert('Recusar solicitação', 'Deseja recusar este agendamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Recusar', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', agendamento.id);
            if (error) throw error;
            onSaved();
          } catch (err) {
            Alert.alert('Erro', err.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <View style={sol.badge}><Text style={sol.badgeText}>AGUARDANDO CONFIRMAÇÃO</Text></View>
          <Text style={modal.title}>Solicitação de Agendamento</Text>
          <View style={sol.infoCard}>
            <Text style={sol.infoCliente}>{agendamento.clientes?.nome ?? '—'}</Text>
            <Text style={sol.infoServico}>{agendamento.servicos?.nome ?? 'Serviço'}</Text>
            <Text style={sol.infoData}>{dataFmt} · {horaFmt}</Text>
            {agendamento.valor != null && (
              <Text style={sol.infoValor}>${parseFloat(agendamento.valor).toFixed(2)}</Text>
            )}
          </View>
          <TouchableOpacity style={[sol.aceitarBtn, saving && { opacity: 0.65 }]} onPress={aceitar} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={sol.aceitarBtnText}>Aceitar agendamento</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[sol.recusarBtn, saving && { opacity: 0.65 }]} onPress={recusar} disabled={saving} activeOpacity={0.85}>
            <Text style={sol.recusarBtnText}>Recusar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sol.editarBtn} onPress={onEditar} activeOpacity={0.75}>
            <Text style={sol.editarBtnText}>Editar detalhes</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

const sol = StyleSheet.create({
  badge:          { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText:      { fontSize: 10, fontWeight: '700', color: '#F59E0B', letterSpacing: 1 },
  infoCard:       { backgroundColor: '#1A1B1E', borderRadius: 14, padding: 16, marginBottom: 20 },
  infoCliente:    { fontSize: 18, fontWeight: '700', color: '#F5EDE8', marginBottom: 4 },
  infoServico:    { fontSize: 14, fontWeight: '400', color: '#C9A8B6', marginBottom: 6 },
  infoData:       { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },
  infoValor:      { fontSize: 20, fontWeight: '800', color: '#F5EDE8', marginTop: 8 },
  aceitarBtn:     { height: 52, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  aceitarBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  recusarBtn:     { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#F87171' },
  recusarBtnText: { fontSize: 16, fontWeight: '700', color: '#F87171' },
  editarBtn:      { alignItems: 'center', paddingVertical: 12 },
  editarBtnText:  { fontSize: 14, fontWeight: '500', color: '#8A8A8E' },
});

// ─── Finalizar Modal ─────────────────────────────────────────────────────────

function FinalizarModal({ visible, agendamento, userId, onClose, onSaved }) {
  const [step,    setStep]    = useState(1);
  const [metodo,  setMetodo]  = useState('zelle');
  const [valor,   setValor]   = useState('');
  const [gorjeta, setGorjeta] = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (visible && agendamento) {
      setStep(1);
      setMetodo('zelle');
      setValor(agendamento.valor != null ? parseFloat(agendamento.valor).toFixed(2) : '');
      setGorjeta('');
      setSaving(false);
    }
  }, [visible, agendamento]);

  async function handleConfirmar() {
    setSaving(true);
    try {
      const valorNum   = parseFloat(valor.replace(',',   '.')) || 0;
      const gorjetaNum = parseFloat(gorjeta.replace(',', '.')) || 0;
      const now        = new Date().toISOString();

      await supabase.from('agendamentos').update({ status: 'finalizado' }).eq('id', agendamento.id);

      if (valorNum > 0) {
        await supabase.from('financeiro').insert({
          profissional_id:  userId,
          valor:            valorNum,
          metodo_pagamento: metodo,
          tipo:             'receita',
          categoria:        agendamento.servicos?.nome ?? 'Serviço',
          cliente_id:       agendamento.cliente_id ?? null,
          created_at:       now,
        });
      }

      if (gorjetaNum > 0) {
        await supabase.from('financeiro').insert({
          profissional_id:  userId,
          valor:            gorjetaNum,
          metodo_pagamento: metodo,
          tipo:             'receita',
          categoria:        'gorjeta',
          cliente_id:       agendamento.cliente_id ?? null,
          created_at:       now,
        });
      }

      if (agendamento.cliente_id) {
        const { data: cData } = await supabase
          .from('clientes')
          .select('total_visitas')
          .eq('id', agendamento.cliente_id)
          .single();
        await supabase
          .from('clientes')
          .update({ total_visitas: (cData?.total_visitas ?? 0) + 1 })
          .eq('id', agendamento.cliente_id);
      }

      await AsyncStorage.setItem('auren:caixa_needs_refresh', 'true');
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao finalizar', err.message);
      setSaving(false);
    }
  }

  if (!agendamento) return null;
  const nomeCliente = agendamento.clientes?.nome ?? '—';
  const nomeServico = agendamento.servicos?.nome ?? 'Serviço';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={finSheet.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={finSheet.sheet}>
            <View style={finSheet.handle} />
            {step === 1 ? (
              <>
                <Text style={finSheet.title}>Serviço concluído?</Text>
                <View style={finSheet.infoCard}>
                  <Text style={finSheet.infoCliente}>{nomeCliente}</Text>
                  <Text style={finSheet.infoServico}>{nomeServico}</Text>
                </View>
                <TouchableOpacity style={finSheet.primaryBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
                  <Text style={finSheet.primaryBtnText}>Sim, finalizar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={finSheet.ghostBtn} onPress={onClose} activeOpacity={0.75}>
                  <Text style={finSheet.ghostBtnText}>Ainda não</Text>
                </TouchableOpacity>
                <View style={{ height: 8 }} />
              </>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={finSheet.title}>Registrar pagamento</Text>

                <Text style={finSheet.label}>MÉTODO DE PAGAMENTO</Text>
                <View style={finSheet.metodoGrid}>
                  {METODOS_FIN.map(m => {
                    const active = metodo === m.key;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[finSheet.metodoBtn, active && finSheet.metodoBtnActive]}
                        onPress={() => setMetodo(m.key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[finSheet.metodoBtnText, active && finSheet.metodoBtnTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={finSheet.label}>VALOR (USD)</Text>
                <View style={finSheet.prefixRow}>
                  <View style={finSheet.prefix}><Text style={finSheet.prefixText}>$</Text></View>
                  <TextInput
                    style={[finSheet.input, { flex: 1, marginBottom: 0 }]}
                    value={valor}
                    onChangeText={setValor}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#C9A8B6"
                  />
                </View>

                <Text style={finSheet.label}>GORJETA (OPCIONAL)</Text>
                <View style={finSheet.prefixRow}>
                  <View style={finSheet.prefix}><Text style={finSheet.prefixText}>$</Text></View>
                  <TextInput
                    style={[finSheet.input, { flex: 1, marginBottom: 0 }]}
                    value={gorjeta}
                    onChangeText={setGorjeta}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#C9A8B6"
                  />
                </View>

                <TouchableOpacity
                  style={[finSheet.primaryBtn, saving && { opacity: 0.7 }]}
                  onPress={handleConfirmar}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={finSheet.primaryBtnText}>Confirmar e finalizar</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={finSheet.ghostBtn} onPress={() => setStep(1)} activeOpacity={0.75} disabled={saving}>
                  <Text style={finSheet.ghostBtnText}>← Voltar</Text>
                </TouchableOpacity>
                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({ data_hora, clientes: cliente, servicos: servico, status, valor, tipo_endereco, onPress, finalizavel }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const SD     = isDark ? STATUS_DISPLAY_DARK : STATUS_DISPLAY_LIGHT;
  const s      = SD[status] ?? SD.confirmado;
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
        {finalizavel ? (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(168,35,90,0.15)' }]}>
            <Text style={[styles.statusText, { color: '#A8235A', fontWeight: '700' }]}>Finalizar</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        )}
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
          {tipo_endereco && (
            <Text style={styles.locationTag}>📍 {TIPO_LABELS[tipo_endereco] ?? tipo_endereco}</Text>
          )}
        </View>
        {valor != null && (
          <Text style={styles.apptValue}>
            ${parseFloat(valor).toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const [weekOffset,      setWeekOffset]      = useState(0);
  const [selected,        setSelected]        = useState(TODAY);
  const [agendamentos,    setAgendamentos]    = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [modalVisible,         setModalVisible]         = useState(false);
  const [editAgendamento,      setEditAgendamento]      = useState(null);
  const [editVisible,          setEditVisible]          = useState(false);
  const [solicitacaoVisible,   setSolicitacaoVisible]   = useState(false);
  const [solicitacaoAgend,     setSolicitacaoAgend]     = useState(null);
  const [userId,               setUserId]               = useState(null);
  const [licencaExpiracao,     setLicencaExpiracao]     = useState(null);
  const [finalizarVisible,     setFinalizarVisible]     = useState(false);
  const [finalizarAgend,       setFinalizarAgend]       = useState(null);

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
      if (!uid) return;
      setUserId(uid);
      const { data: profile } = await supabase
        .from('profiles')
        .select('licenca_expiracao')
        .eq('id', uid)
        .single();
      if (profile?.licenca_expiracao) setLicencaExpiracao(profile.licenca_expiracao);
    })();
  }, []);

  useEffect(() => {
    if (userId) fetchAgendamentos(userId, selected);
  }, [userId, selected]);

  const openEdit = (a) => {
    if (a.status === 'pendente') {
      setSolicitacaoAgend(a); setSolicitacaoVisible(true);
    } else {
      setEditAgendamento(a); setEditVisible(true);
    }
  };
  const closeEdit    = () => { setEditVisible(false); setEditAgendamento(null); };
  const closeSolicit = () => { setSolicitacaoVisible(false); setSolicitacaoAgend(null); };

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
          <ActivityIndicator color="#A8235A" style={{ marginTop: 40 }} />
        ) : agendamentos.length > 0 ? (
          agendamentos.map(a => {
            const canFinalize = isFinalizavel(a);
            return (
              <AppointmentCard
                key={a.id}
                {...a}
                finalizavel={canFinalize}
                onPress={() => {
                  if (canFinalize) { setFinalizarAgend(a); setFinalizarVisible(true); }
                  else openEdit(a);
                }}
              />
            );
          })
        ) : (
          <View style={styles.emptyState}><Text style={styles.emptyText}>Nenhum agendamento para este dia.</Text></View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          if (licencaExpiracao) {
            const [y, mo, d] = licencaExpiracao.split('-').map(Number);
            const exp = new Date(y, mo - 1, d);
            exp.setHours(23, 59, 59, 999);
            if (exp < new Date()) {
              Alert.alert(
                'Licença expirada',
                'Atualize sua licença em Perfil → Meus Dados para criar novos agendamentos.'
              );
              return;
            }
          }
          setModalVisible(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddAgendamentoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          setModalVisible(false);
          fetchAgendamentos(userId, selected);
          calcularNivel(userId).catch(() => {});
        }}
        selectedDate={selected}
        userId={userId}
      />

      <EditAgendamentoModal
        visible={editVisible}
        agendamento={editAgendamento}
        userId={userId}
        onClose={closeEdit}
        onSaved={() => {
          closeEdit();
          fetchAgendamentos(userId, selected);
          calcularNivel(userId).catch(() => {});
        }}
      />

      <SolicitacaoModal
        visible={solicitacaoVisible}
        agendamento={solicitacaoAgend}
        onClose={closeSolicit}
        onSaved={() => {
          closeSolicit();
          fetchAgendamentos(userId, selected);
          calcularNivel(userId).catch(() => {});
        }}
        onEditar={() => {
          const a = solicitacaoAgend;
          closeSolicit();
          setEditAgendamento(a); setEditVisible(true);
        }}
      />

      <FinalizarModal
        visible={finalizarVisible}
        agendamento={finalizarAgend}
        userId={userId}
        onClose={() => setFinalizarVisible(false)}
        onSaved={() => {
          setFinalizarVisible(false);
          fetchAgendamentos(userId, selected);
          calcularNivel(userId).catch(() => {});
        }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(isDark) {
  const bg   = isDark ? '#0E0F11' : '#F5EDE8';
  const card = isDark ? '#1A1B1E' : '#FFFFFF';
  const text = isDark ? '#F5EDE8' : '#1A0A14';
  const sub  = isDark ? '#C9A8B6' : '#6B4A58';

  const CARD_SHADOW = {
    shadowColor: '#0E0F11',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.07,
    shadowRadius: 6,
    elevation: isDark ? 0 : 3,
  };

  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: bg },
    header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 28, marginBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: text },
    headerMonth: { fontSize: 14, fontWeight: '400', color: sub, paddingBottom: 3 },
    weekRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 16 },
    navBtn:      { width: 28, alignItems: 'center', justifyContent: 'center' },
    navBtnText:  { fontSize: 26, fontWeight: '400', color: sub, lineHeight: 30 },
    dayItem:       { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
    dayItemActive: { backgroundColor: '#A8235A' },
    dayShort:      { fontSize: 10, fontWeight: '600', color: sub, marginBottom: 5, letterSpacing: 0.3 },
    dayNum:        { fontSize: 15, fontWeight: '700', color: sub },
    dayTextActive: { color: '#FFFFFF' },
    dayTitle:      { fontSize: 14, fontWeight: '600', color: text, paddingHorizontal: 20, marginBottom: 16 },
    scroll:        { paddingHorizontal: 20, paddingBottom: 110 },
    apptCard:           { backgroundColor: card, borderRadius: 16, padding: 16, marginBottom: 10, ...CARD_SHADOW },
    apptCardHighlight:  { borderWidth: 1, borderColor: 'rgba(168,35,90,0.35)' },
    apptTopRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    apptTime:           { fontSize: 12, fontWeight: '600', color: sub, letterSpacing: 0.3 },
    statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText:         { fontSize: 11, fontWeight: '700' },
    apptClientRow:      { flexDirection: 'row', alignItems: 'center' },
    avatar:             { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(168,35,90,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText:         { fontSize: 14, fontWeight: '700', color: '#A8235A' },
    apptInfo:           { flex: 1 },
    nameRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    clientName:         { fontSize: 15, fontWeight: '700', color: text },
    vipBadge:           { backgroundColor: 'rgba(168,35,90,0.08)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(168,35,90,0.25)' },
    vipText:            { fontSize: 9, fontWeight: '800', color: '#A8235A', letterSpacing: 0.8 },
    serviceText:        { fontSize: 12, fontWeight: '400', color: sub },
    locationTag:        { fontSize: 11, fontWeight: '400', color: '#8A8A8E', marginTop: 3 },
    apptValue:          { fontSize: 16, fontWeight: '700', color: text, marginLeft: 8 },
    emptyState:         { alignItems: 'center', paddingTop: 60 },
    emptyText:          { fontSize: 14, fontWeight: '400', color: sub },
    fab:     { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', shadowColor: '#A8235A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
    fabText: { fontSize: 30, fontWeight: '400', color: '#FFFFFF', lineHeight: 34 },
  });
}

// ─── Finalizar styles ────────────────────────────────────────────────────────

const finSheet = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#0E0F11', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12 },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 20 },
  title:           { fontSize: 20, fontWeight: '700', color: '#F5EDE8', marginBottom: 16 },
  infoCard:        { backgroundColor: '#1A1B1E', borderRadius: 14, padding: 16, marginBottom: 20 },
  infoCliente:     { fontSize: 17, fontWeight: '700', color: '#F5EDE8', marginBottom: 4 },
  infoServico:     { fontSize: 14, fontWeight: '400', color: '#C9A8B6' },
  label:           { fontSize: 10, fontWeight: '700', color: '#C9A8B6', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  input:           { backgroundColor: '#1A1B1E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#F5EDE8', marginBottom: 14 },
  prefixRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  prefix:          { backgroundColor: '#1A1B1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginRight: 8 },
  prefixText:      { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },
  metodoGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metodoBtn:       { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1A1B1E' },
  metodoBtnActive: { backgroundColor: '#A8235A' },
  metodoBtnText:       { fontSize: 13, fontWeight: '600', color: '#C9A8B6' },
  metodoBtnTextActive: { color: '#FFFFFF' },
  primaryBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  ghostBtn:       { height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  ghostBtnText:   { fontSize: 14, fontWeight: '500', color: '#C9A8B6' },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const INPUT_BG = '#1A1B1E';
const SUBTLE   = '#2A2A2A';

const modal = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#0E0F11', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, maxHeight: '92%' },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: SUBTLE, alignSelf: 'center', marginBottom: 20 },
  title:        { fontSize: 20, fontWeight: '700', color: '#F5EDE8', marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#C9A8B6', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  input:        { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '400', color: '#F5EDE8', marginBottom: 12 },
  inputMulti:   { height: 80, paddingTop: 14 },

  selectedRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, gap: 10 },
  selectedAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#252525', alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { fontSize: 11, fontWeight: '700', color: '#F5EDE8' },
  selectedText:       { flex: 1, fontSize: 15, fontWeight: '600', color: '#F5EDE8' },
  clearBtn:           { fontSize: 16, color: '#C9A8B6', fontWeight: '600' },

  listBox:        { backgroundColor: INPUT_BG, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  listItem:       { paddingHorizontal: 16, paddingVertical: 13 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  listItemText:   { fontSize: 14, fontWeight: '500', color: '#F5EDE8' },
  emptyHint:      { fontSize: 13, fontWeight: '400', color: '#C9A8B6', marginBottom: 12, paddingLeft: 4 },

  servicoRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 8 },
  servicoRowSelected: { backgroundColor: 'rgba(168,35,90,0.18)', borderWidth: 1, borderColor: 'rgba(168,35,90,0.5)' },
  servicoNome:        { fontSize: 14, fontWeight: '600', color: '#C9A8B6' },
  servicoNomeSel:     { color: '#F5EDE8' },
  servicoMeta:        { fontSize: 11, fontWeight: '400', color: '#C9A8B6', marginTop: 2 },
  servicoValor:       { fontSize: 16, fontWeight: '700', color: '#C9A8B6', marginLeft: 8 },
  servicoValorSel:    { color: '#F5EDE8' },

  dateBox:  { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  dateText: { fontSize: 14, fontWeight: '500', color: '#C9A8B6' },

  statusRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBtn:           { paddingVertical: 11, borderRadius: 10, width: '48%', alignItems: 'center', backgroundColor: INPUT_BG },
  statusBtnActive:     { backgroundColor: '#A8235A' },
  statusBtnText:       { fontSize: 12, fontWeight: '600', color: '#C9A8B6' },
  statusBtnTextActive: { color: '#FFFFFF' },

  tipoRow:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tipoBtn:           { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: INPUT_BG },
  tipoBtnActive:     { backgroundColor: '#A8235A' },
  tipoBtnText:       { fontSize: 12, fontWeight: '600', color: '#C9A8B6' },
  tipoBtnTextActive: { color: '#FFFFFF' },

  saveBtn:       { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn:     { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderColor: '#F87171' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#F87171' },

  pickerField:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  pickerFieldText:        { fontSize: 15, color: '#F5EDE8', flex: 1 },
  pickerFieldPlaceholder: { fontSize: 15, color: '#C9A8B6', flex: 1 },
  pickerFieldArrow:       { fontSize: 11, color: '#C9A8B6', marginLeft: 8 },
  pickerItem:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pickerItemBorder:       { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  pickerItemNome:         { fontSize: 15, fontWeight: '600', color: '#F5EDE8' },
  pickerItemMeta:         { fontSize: 12, color: '#C9A8B6', marginTop: 2 },
  pickerItemValor:        { fontSize: 16, fontWeight: '700', color: '#F5EDE8', marginLeft: 12 },
});
