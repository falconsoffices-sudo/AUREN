const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE       = process.env.TWILIO_PHONE;

const SIMULATION_MODE = true;

export async function sendSMS(to, body) {
  if (SIMULATION_MODE) {
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

/**
 * Envia SMS com link de rota do Google Maps 1h antes do agendamento.
 * isDomicilio=true → endereço é da cliente (profissional vai até ela).
 * isDomicilio=false → endereço é do estabelecimento (cliente vai até a prof.).
 */
export async function enviarSMSRota(clienteTelefone, profissionalNome, horario, endereco, isDomicilio = false) {
  if (!clienteTelefone) return { success: false, motivo: 'sem telefone' };

  const mapsLink = endereco
    ? `https://maps.google.com/?q=${encodeURIComponent(endereco)}`
    : 'https://maps.google.com/';

  const TEMPLATE_KEY = isDomicilio ? 'auren_template_1h_domicilio' : 'auren_template_1h';
  const TEMPLATE_PADRAO = isDomicilio
    ? 'Olá! [nome] chegará às [hora] no seu endereço. Confirme aqui: [link]'
    : 'Olá! Seu horário com [nome] é hoje às [hora]. Clique para o caminho: [link]';

  let template = TEMPLATE_PADRAO;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const stored = await AsyncStorage.getItem(TEMPLATE_KEY);
    if (stored) template = stored;
  } catch (_) {}

  const mensagem = template
    .replace(/\[nome\]/g,    profissionalNome)
    .replace(/\[hora\]/g,    horario)
    .replace(/\[horario\]/g, horario)
    .replace(/\[link\]/g,    mapsLink);

  return sendSMS(clienteTelefone, mensagem);
}
