const fs = require('fs');
const path = require('path');

// parse .env manually — no external deps needed
const envPath = path.join(__dirname, '.env');
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });

const SID   = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM  = process.env.TWILIO_PHONE;
const TO    = '+15618750648';
const BODY  = 'Teste AUREN - SMS funcionando!';

async function main() {
  const credentials = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;

  console.log(`Enviando SMS de ${FROM} para ${TO}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: TO, From: FROM, Body: BODY }).toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('ERRO Twilio:', data.message || JSON.stringify(data));
    process.exit(1);
  }

  console.log('SMS enviado com sucesso!');
  console.log('  SID da mensagem:', data.sid);
  console.log('  Status:', data.status);
}

main().catch(err => { console.error(err); process.exit(1); });
