// Script de diagnostico: mostra o status real do item na Pluggy
// e o que a API de contas (/accounts) esta devolvendo.
//
// Como usar:
//   1. Coloque este arquivo na pasta do NetoCash-main (mesma pasta do server.js)
//   2. No terminal, rode: node diagnostico-item.js

require('dotenv').config();

const ITEM_ID = (process.env.PLUGGY_ITEM_IDS || '').split(',')[0].trim();

async function main() {
  console.log('Item a verificar:', ITEM_ID);
  console.log('');

  console.log('1) Autenticando...');
  const authRes = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  const authData = await authRes.json();
  if (!authRes.ok) {
    console.error('❌ Falha ao autenticar:', authData);
    return;
  }
  const apiKey = authData.apiKey;
  console.log('✅ Autenticado.\n');

  console.log('2) Consultando status do item...');
  const itemRes = await fetch(`https://api.pluggy.ai/items/${ITEM_ID}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  const itemData = await itemRes.json();
  if (!itemRes.ok) {
    console.error('❌ Falha ao consultar o item:', itemData);
    return;
  }
  console.log('Status do item:', itemData.status);
  console.log('Status de execucao:', itemData.executionStatus);
  console.log('Ultima atualizacao:', itemData.lastUpdatedAt);
  if (itemData.error) {
    console.log('⚠️  Erro reportado pelo item:', JSON.stringify(itemData.error, null, 2));
  }
  console.log('');

  console.log('3) Consultando contas (accounts) vinculadas ao item...');
  const accRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${ITEM_ID}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  const accData = await accRes.json();
  if (!accRes.ok) {
    console.error('❌ Falha ao consultar contas:', accData);
    return;
  }
  console.log('Total de contas encontradas:', accData.results ? accData.results.length : 0);
  console.log(JSON.stringify(accData.results, null, 2));
}

main().catch((err) => console.error('Erro inesperado:', err));
