// Script de teste: conecta sua conta REAL do Meu Pluggy via Conector 200
// Como usar:
//   1. Coloque este arquivo na pasta do seu projeto NetoCash-main (mesma pasta do server.js)
//   2. No terminal, rode: node conectar-conta-real.js
//   3. Copie o "itemId" que aparecer no final e cole no seu .env em PLUGGY_ITEM_IDS

require('dotenv').config();

const CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

// Troque pelo seu CPF real (o mesmo que apareceu no Meu Pluggy), só números
const CPF = '07147590317';

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não encontrados no .env');
    return;
  }

  console.log('1) Autenticando na Pluggy...');
  const authRes = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET })
  });
  const authData = await authRes.json();

  if (!authRes.ok) {
    console.error('❌ Falha na autenticação:', authData);
    return;
  }

  const apiKey = authData.apiKey;
  console.log('✅ API Key obtida com sucesso.\n');

  console.log('2) Consultando o Conector 200 (Meu Pluggy)...');
  const connectorRes = await fetch('https://api.pluggy.ai/connectors/200', {
    headers: { 'X-API-KEY': apiKey }
  });
  const connectorData = await connectorRes.json();

  if (!connectorRes.ok) {
    console.error('❌ Falha ao consultar o conector 200:', connectorData);
    console.log('\nIsso pode significar que o Conector 200 não está disponível para este CLIENT_ID/app. Nesse caso, me manda essa mensagem de erro.');
    return;
  }

  console.log('✅ Conector encontrado:', connectorData.name);
  console.log('   Credenciais que ele espera:', JSON.stringify(connectorData.credentials, null, 2));
  console.log('');

  console.log('3) Criando o Item real (usando seu CPF)...');
  const itemRes = await fetch('https://api.pluggy.ai/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({
      connectorId: 200,
      parameters: { cpf: CPF }
    })
  });
  const itemData = await itemRes.json();

  if (!itemRes.ok) {
    console.error('❌ Falha ao criar o item:', itemData);
    return;
  }

  console.log('\n🎉 Item criado com sucesso!');
  console.log('itemId:', itemData.id);
  console.log('\n👉 Copie esse itemId e coloque no seu .env assim:');
  console.log(`PLUGGY_ITEM_IDS=${itemData.id}`);
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
});
