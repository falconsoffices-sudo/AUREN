import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleNotification } from './notifications';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Geração de relatório ────────────────────────────────────────────────────

export async function gerarRelatorioMensal(userId, mes, ano) {
  // mes: 1–12
  const pad = n => String(n).padStart(2, '0');
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const inicio = `${ano}-${pad(mes)}-01T00:00:00`;
  const fim    = `${ano}-${pad(mes)}-${pad(ultimoDia)}T23:59:59`;

  const [agendRes, finRes] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('valor, servicos(nome), clientes(nome)')
      .eq('profissional_id', userId)
      .in('status', ['finalizado', 'confirmado', 'pendente'])
      .gte('data_hora', inicio)
      .lte('data_hora', fim),
    supabase
      .from('financeiro')
      .select('tipo, valor')
      .eq('profissional_id', userId)
      .gte('created_at', inicio)
      .lte('created_at', fim),
  ]);

  const agendamentos = agendRes.data ?? [];
  const financeiro   = finRes.data ?? [];

  const faturamentoBruto = agendamentos.reduce((s, a) => s + Number(a.valor || 0), 0);
  const despesas = financeiro
    .filter(f => f.tipo === 'despesa')
    .reduce((s, f) => s + Number(f.valor || 0), 0);
  const lucroReal = faturamentoBruto - despesas;

  // Top 3 serviços por count, desempate por valor
  const porServico = {};
  for (const a of agendamentos) {
    const nome = a.servicos?.nome ?? 'Serviço';
    if (!porServico[nome]) porServico[nome] = { nome, count: 0, valor: 0 };
    porServico[nome].count++;
    porServico[nome].valor += Number(a.valor || 0);
  }
  const topServicos = Object.values(porServico)
    .sort((a, b) => b.count - a.count || b.valor - a.valor)
    .slice(0, 3);

  // Top 3 clientes por valor total
  const porCliente = {};
  for (const a of agendamentos) {
    const nome = a.clientes?.nome ?? 'Cliente';
    if (!porCliente[nome]) porCliente[nome] = { nome, count: 0, valor: 0 };
    porCliente[nome].count++;
    porCliente[nome].valor += Number(a.valor || 0);
  }
  const topClientes = Object.values(porCliente)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3);

  return { mes, ano, totalAtendimentos: agendamentos.length, faturamentoBruto, despesas, lucroReal, topServicos, topClientes };
}

// ─── Notificação do dia 28 ───────────────────────────────────────────────────

export async function agendarNotificacaoRelatorio() {
  try {
    const agora = new Date();
    if (agora.getDate() > 28) return;
    const mes = agora.getMonth();
    const ano = agora.getFullYear();
    const key = `auren:relatorio_notif_${ano}_${mes}`;
    if (await AsyncStorage.getItem(key)) return;
    const target = new Date(ano, mes, 28, 18, 0, 0);
    const secsUntil = (target.getTime() - Date.now()) / 1000;
    if (secsUntil <= 0) return;
    await scheduleNotification(
      `Relatório de ${MESES[mes]} pronto!`,
      `Seu relatório de ${MESES[mes]} está pronto! Toque para ver.`,
      secsUntil
    );
    await AsyncStorage.setItem(key, '1');
  } catch (_) {}
}
