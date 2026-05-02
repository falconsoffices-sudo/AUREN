import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ─── Níveis config (exported for GamificacaoScreen) ──────────────────────────

export const NIVEIS_CONFIG = [
  {
    nivel: 1, nome: 'Começando', emoji: '🌱',
    descricao: 'Você está dando os primeiros passos na AUREN.',
    criterios: [
      { key: 'totalAgend',  label: '1º agendamento',  meta: 1,    formato: 'count' },
    ],
  },
  {
    nivel: 2, nome: 'Em Ritmo', emoji: '⚡',
    descricao: 'Sua agenda está ganhando forma.',
    criterios: [
      { key: 'clientes',    label: 'Clientes',         meta: 15,   formato: 'count' },
      { key: 'agendaPct',   label: 'Agenda preenchida', meta: 60,  formato: 'pct'   },
      { key: 'faturamento', label: 'Faturamento/mês',  meta: 750,  formato: 'moeda' },
    ],
  },
  {
    nivel: 3, nome: 'Agenda Cheia', emoji: '📅',
    descricao: 'Sua agenda está bombando!',
    criterios: [
      { key: 'clientes',    label: 'Clientes',         meta: 38,   formato: 'count' },
      { key: 'agendaPct',   label: 'Agenda preenchida', meta: 100, formato: 'pct'   },
      { key: 'faturamento', label: 'Faturamento/mês',  meta: 2250, formato: 'moeda' },
    ],
  },
  {
    nivel: 4, nome: 'Profissional', emoji: '💎',
    descricao: 'Você é uma referência na sua área.',
    criterios: [
      { key: 'clientes',    label: 'Clientes',         meta: 75,   formato: 'count' },
      { key: 'agendaPct',   label: 'Agenda preenchida', meta: 100, formato: 'pct'   },
      { key: 'faturamento', label: 'Faturamento/mês',  meta: 5250, formato: 'moeda' },
    ],
  },
  {
    nivel: 5, nome: 'Elite AUREN', emoji: '👑',
    descricao: 'O topo da profissão. Você chegou lá!',
    criterios: [
      { key: 'clientes',    label: 'Clientes',         meta: 120,  formato: 'count' },
      { key: 'agendaPct',   label: 'Agenda preenchida', meta: 100, formato: 'pct'   },
      { key: 'faturamento', label: 'Faturamento/mês',  meta: 9000, formato: 'moeda' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_HORARIO = {
  dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  inicio: '08:00', fim: '17:00',
  almocoInicio: '12:00', almocoFim: '13:00',
};

const DIA_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function toMins(str) {
  const [h, m] = (str || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcCapacidade(horario, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workKeys    = horario.dias ?? DEFAULT_HORARIO.dias;

  let workDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (workKeys.includes(DIA_KEYS[new Date(year, month, d).getDay()])) workDays++;
  }

  const workMins    = toMins(horario.fim) - toMins(horario.inicio);
  const lunchMins   = toMins(horario.almocoFim) - toMins(horario.almocoInicio);
  const slotsPerDay = Math.max(Math.floor((workMins - lunchMins) / 60), 0);

  return workDays * slotsPerDay;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calcula o nível de gamificação real do profissional baseado em:
 * - Total de clientes ativos
 * - Faturamento do mês atual (agendamentos não cancelados)
 * - % da agenda preenchida no mês (baseado no horário de atendimento)
 *
 * Retorna { nivel, novoNivel, nivelAnterior, dados } e faz UPDATE no
 * profiles.nivel_gamificacao se o nível subiu.
 * Nunca rebaixa o nível (variações mensais não punem o usuário).
 */
export async function calcularNivel(userId) {
  if (!userId) return null;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const pad   = n => String(n).padStart(2, '0');
  const mesInicio = `${year}-${pad(month + 1)}-01T00:00:00`;
  const mesFim    = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}T23:59:59`;

  const [clientesRes, agendMesRes, totalAgendRes, profileRes, horarioRaw] = await Promise.all([
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('profissional_id', userId),
    supabase
      .from('agendamentos')
      .select('valor')
      .eq('profissional_id', userId)
      .neq('status', 'cancelado')
      .gte('data_hora', mesInicio)
      .lte('data_hora', mesFim),
    supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('profissional_id', userId),
    supabase
      .from('profiles')
      .select('nivel_gamificacao')
      .eq('id', userId)
      .single(),
    AsyncStorage.getItem('auren:horario_atendimento').catch(() => null),
  ]);

  const horario       = horarioRaw ? { ...DEFAULT_HORARIO, ...JSON.parse(horarioRaw) } : DEFAULT_HORARIO;
  const totalClientes = clientesRes.count ?? 0;
  const totalAgend    = totalAgendRes.count ?? 0;
  const agendMes      = agendMesRes.data ?? [];
  const agendMesCount = agendMes.length;
  const faturamento   = agendMes.reduce((s, r) => s + Number(r.valor || 0), 0);
  const capacidade    = calcCapacidade(horario, year, month);
  const agendaPct     = capacidade > 0
    ? Math.min(Math.round((agendMesCount / capacidade) * 100), 100)
    : 0;

  const dados = { totalClientes, totalAgend, faturamento, agendaPct, capacidade };

  // Determina o nível máximo cujos critérios foram todos atingidos
  let novoNivel = 1;
  if (totalClientes >= 15  && agendaPct >= 60  && faturamento >= 750)  novoNivel = 2;
  if (totalClientes >= 38  && agendaPct >= 100 && faturamento >= 2250) novoNivel = 3;
  if (totalClientes >= 75  && agendaPct >= 100 && faturamento >= 5250) novoNivel = 4;
  if (totalClientes >= 120 && agendaPct >= 100 && faturamento >= 9000) novoNivel = 5;

  const nivelAnterior = profileRes.data?.nivel_gamificacao ?? 1;
  const nivelFinal    = Math.max(novoNivel, nivelAnterior); // nunca rebaixa

  if (nivelFinal > nivelAnterior) {
    await supabase
      .from('profiles')
      .update({ nivel_gamificacao: nivelFinal })
      .eq('id', userId);
  }

  return { nivel: nivelFinal, novoNivel, nivelAnterior, dados };
}
