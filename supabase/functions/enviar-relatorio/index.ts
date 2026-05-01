import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function fmt(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────

interface ReportData {
  primeiroNome: string
  nomeMes: string
  ano: number
  totalAtendimentos: number
  faturamentoBruto: number
  totalDespesas: number
  lucroReal: number
  topServicos: Array<{ nome: string; count: number; valor: number }>
  topClientes: Array<{ nome: string; count: number; valor: number }>
  mensagem: string
  nivelNome: string
  nivelNum: number
}

function buildHTML(d: ReportData): string {
  const lucroColor = d.lucroReal >= 0 ? '#A8235A' : '#DC2626'

  const rankRow = (i: number, nome: string, sub: string, valor: string) => `
    <tr>
      <td style="padding:11px 0; border-bottom:1px solid #EDE4DC;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="display:inline-block;width:22px;height:22px;background:#A8235A;border-radius:50%;text-align:center;line-height:22px;font-size:10px;font-weight:800;color:#fff;">${i}</span>
              &nbsp;
              <span style="font-size:14px;font-weight:600;color:#1A0A14;">${nome}</span>
              &nbsp;
              <span style="font-size:12px;color:#6B4A58;">${sub}</span>
            </td>
            <td align="right" style="white-space:nowrap;">
              <strong style="font-size:14px;font-weight:700;color:#A8235A;">${valor}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  const svcRows = d.topServicos.map((s, i) =>
    rankRow(i + 1, s.nome, `${s.count} realizado${s.count !== 1 ? 's' : ''}`, fmt(s.valor))
  ).join('')

  const cliRows = d.topClientes.map((c, i) =>
    rankRow(i + 1, c.nome, `${c.count} visita${c.count !== 1 ? 's' : ''}`, fmt(c.valor))
  ).join('')

  const svcSection = d.topServicos.length === 0 ? '' : `
    <tr>
      <td style="padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F9F5F2" style="border-radius:14px;">
          <tr><td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#6B4A58;">
              Seus Serviços Mais Realizados
            </p>
          </td></tr>
          <tr><td style="padding:0 20px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">${svcRows}</table>
          </td></tr>
        </table>
      </td>
    </tr>`

  const cliSection = d.topClientes.length === 0 ? '' : `
    <tr>
      <td style="padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F9F5F2" style="border-radius:14px;">
          <tr><td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#6B4A58;">
              Clientes que Mais Investiram em Você
            </p>
          </td></tr>
          <tr><td style="padding:0 20px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">${cliRows}</table>
          </td></tr>
        </table>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Relatório de ${d.nomeMes} ${d.ano} — AUREN</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EDE8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5EDE8">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td bgcolor="#0E0F11" style="padding:36px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:4px;color:#A8235A;">AUREN</p>
            <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">
              Relatório de ${d.nomeMes}
            </h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);">${d.ano}</p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="padding:28px 32px 16px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1A0A14;">
              Olá, ${d.primeiroNome}!
            </p>
            <p style="margin:0;font-size:14px;color:#6B4A58;line-height:1.6;">
              Aqui está um resumo completo do seu mês. Cada número representa dedicação, talento e muito trabalho.
            </p>
          </td>
        </tr>

        <tr><td style="padding:0 32px;"><div style="height:1px;background:#EDE4DC;"></div></td></tr>

        <!-- STATS 2x2 -->
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Atendimentos -->
                <td width="50%" style="padding:0 6px 10px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5EDE8" style="border-radius:14px;">
                    <tr><td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6B4A58;">Atendimentos</p>
                      <p style="margin:0;font-size:36px;font-weight:800;color:#1A0A14;line-height:1;">${d.totalAtendimentos}</p>
                    </td></tr>
                  </table>
                </td>
                <!-- Faturamento -->
                <td width="50%" style="padding:0 0 10px 6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#1A0A14" style="border-radius:14px;">
                    <tr><td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C9A8B6;">Faturamento</p>
                      <p style="margin:0;font-size:26px;font-weight:800;color:#A8235A;line-height:1;">${fmt(d.faturamentoBruto)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <!-- Despesas -->
                <td width="50%" style="padding:0 6px 0 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5EDE8" style="border-radius:14px;">
                    <tr><td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6B4A58;">Despesas</p>
                      <p style="margin:0;font-size:26px;font-weight:800;color:#1A0A14;line-height:1;">${fmt(d.totalDespesas)}</p>
                    </td></tr>
                  </table>
                </td>
                <!-- Lucro Real -->
                <td width="50%" style="padding:0 0 0 6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5EDE8" style="border-radius:14px;border:2px solid #A8235A;">
                    <tr><td style="padding:16px 18px;">
                      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#A8235A;">Lucro Real</p>
                      <p style="margin:0;font-size:26px;font-weight:800;color:${lucroColor};line-height:1;">${fmt(d.lucroReal)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TOP SERVIÇOS -->
        ${svcSection}

        <!-- TOP CLIENTES -->
        ${cliSection}

        <!-- MOTIVACIONAL -->
        <tr>
          <td style="padding:0 32px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#1A0A14" style="border-radius:14px;">
              <tr><td style="padding:24px 24px;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#A8235A;">
                  Nível ${d.nivelNum} — ${d.nivelNome}
                </p>
                <p style="margin:0;font-size:15px;font-weight:500;color:#F5EDE8;line-height:1.6;">
                  ${d.mensagem}
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#F9F5F2" style="padding:20px 32px;text-align:center;border-top:1px solid #EDE4DC;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:2.5px;color:#A8235A;">AUREN</p>
            <p style="margin:0;font-size:11px;color:#B09AA8;">Sua plataforma de gestão profissional</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { userId, mes, ano } = await req.json()

    if (!userId || !mes || !ano) {
      return json({ error: 'userId, mes e ano são obrigatórios' }, 400)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return json({ error: 'RESEND_API_KEY não configurada' }, 500)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Busca usuário + perfil + dados em paralelo ────────────────────────────
    const mesStr  = pad(mes)
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const mesInicio = `${ano}-${mesStr}-01T00:00:00`
    const mesFim    = `${ano}-${mesStr}-${pad(ultimoDia)}T23:59:59`

    const [userRes, profileRes, agendRes, despesasRes] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('profiles').select('nome, nivel_gamificacao').eq('id', userId).single(),
      supabase
        .from('agendamentos')
        .select('valor, servicos(nome), clientes(nome)')
        .eq('profissional_id', userId)
        .neq('status', 'cancelado')
        .gte('data_hora', mesInicio)
        .lte('data_hora', mesFim),
      supabase
        .from('financeiro')
        .select('valor')
        .eq('profissional_id', userId)
        .eq('tipo', 'despesa')
        .gte('data', `${ano}-${mesStr}-01`)
        .lte('data', `${ano}-${mesStr}-${pad(ultimoDia)}`),
    ])

    const email = userRes.data?.user?.email
    if (!email) return json({ error: 'Usuário não encontrado' }, 404)

    // ── Cálculos ──────────────────────────────────────────────────────────────
    const agendamentos     = agendRes.data ?? []
    const totalAtendimentos = agendamentos.length
    const faturamentoBruto  = agendamentos.reduce((s, a) => s + Number(a.valor || 0), 0)
    const totalDespesas     = (despesasRes.data ?? []).reduce((s, d) => s + Number(d.valor || 0), 0)
    const lucroReal         = faturamentoBruto - totalDespesas

    // Top serviços por count
    const bySvc: Record<string, { nome: string; count: number; valor: number }> = {}
    for (const a of agendamentos) {
      const nome = (a.servicos as any)?.nome ?? 'Serviço'
      if (!bySvc[nome]) bySvc[nome] = { nome, count: 0, valor: 0 }
      bySvc[nome].count++
      bySvc[nome].valor += Number(a.valor || 0)
    }
    const topServicos = Object.values(bySvc).sort((a, b) => b.count - a.count).slice(0, 3)

    // Top clientes por valor
    const byCli: Record<string, { nome: string; count: number; valor: number }> = {}
    for (const a of agendamentos) {
      const nome = (a.clientes as any)?.nome ?? 'Cliente'
      if (!byCli[nome]) byCli[nome] = { nome, count: 0, valor: 0 }
      byCli[nome].count++
      byCli[nome].valor += Number(a.valor || 0)
    }
    const topClientes = Object.values(byCli).sort((a, b) => b.valor - a.valor).slice(0, 3)

    // ── Metadados de nível ────────────────────────────────────────────────────
    const nivel = profileRes.data?.nivel_gamificacao ?? 1
    const NIVEL_NOMES = ['Começando', 'Em Ritmo', 'Agenda Cheia', 'Profissional', 'Elite AUREN']
    const MENSAGENS   = [
      'Cada atendimento é um passo em direção ao seu sonho. Continue crescendo!',
      'Você está no ritmo certo. Esse mês mostrou sua dedicação!',
      'Agenda cheia, futuro brilhante. Você está arrasando!',
      'Você é uma profissional de referência. Que mês incrível!',
      'Elite AUREN! O topo da profissão te pertence. Mês histórico!',
    ]
    const idx = Math.min(nivel - 1, 4)

    const nome         = profileRes.data?.nome ?? 'Profissional'
    const primeiroNome = nome.trim().split(' ')[0]
    const nomeMes      = MESES[mes - 1] ?? ''

    // ── Monta e envia ─────────────────────────────────────────────────────────
    const html = buildHTML({
      primeiroNome, nomeMes, ano,
      totalAtendimentos, faturamentoBruto, totalDespesas, lucroReal,
      topServicos, topClientes,
      mensagem:  MENSAGENS[idx],
      nivelNome: NIVEL_NOMES[idx],
      nivelNum:  nivel,
    })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AUREN <onboarding@resend.dev>',
        to: [email],
        subject: `Seu Relatório de ${nomeMes} ${ano} — AUREN`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      return json({ error: `Resend: ${errText}` }, 502)
    }

    return json({ ok: true })

  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
