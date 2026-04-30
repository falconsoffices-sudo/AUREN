const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE       = process.env.TWILIO_PHONE;

const SIMULATION_MODE = true;

export async function sendSMS(to, body) {
  if (SIMULATION_MODE) {
    console.log(`[SMS simulado] Para: ${to} | Mensagem: ${body}`);
    return { success: true, simulated: true };
  }

  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: TWILIO_PHONE, Body: body }).toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Twilio error ${res.status}`);
  }

  return { success: true, simulated: false };
}

export function applyTemplate(template, vars) {
  return template
    .replace(/\[nome\]/g,               vars.nome               ?? '')
    .replace(/\[horario\]/g,            vars.horario            ?? '')
    .replace(/\[servico\]/g,            vars.servico            ?? '')
    .replace(/\[nome_profissional\]/g,  vars.nome_profissional  ?? '');
}
