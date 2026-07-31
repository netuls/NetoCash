const fetch = require('node-fetch');

const PLUGGY_API_URL = 'https://api.pluggy.ai';

let apiKeyCache = null;
let apiKeyExpiraEm = 0;

// A Pluggy usa um "apiKey" de curta duracao, gerado a partir do client id/secret.
// Guardamos em cache e so gera um novo quando expira, pra nao autenticar toda hora.
async function obterApiKey() {
  if (apiKeyCache && Date.now() < apiKeyExpiraEm) {
    return apiKeyCache;
  }

  const resp = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Falha ao autenticar na Pluggy: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  apiKeyCache = data.apiKey;
  // A validade tipica do apiKey da Pluggy e de 2 horas; renovamos com folga.
  apiKeyExpiraEm = Date.now() + 100 * 60 * 1000;
  return apiKeyCache;
}

async function chamarPluggy(endpoint) {
  const apiKey = await obterApiKey();
  const resp = await fetch(`${PLUGGY_API_URL}${endpoint}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!resp.ok) {
    throw new Error(`Erro na API da Pluggy (${endpoint}): ${resp.status} ${await resp.text()}`);
  }

  return resp.json();
}

// Lista as contas (corrente, cartao de credito, etc) de um item (conexao com um banco).
async function listarContas(itemId) {
  const data = await chamarPluggy(`/accounts?itemId=${itemId}`);
  return data.results || [];
}

// Lista transacoes de uma conta especifica, com filtro opcional por data.
async function listarTransacoes(accountId, dataInicial) {
  let endpoint = `/transactions?accountId=${accountId}&pageSize=200`;
  if (dataInicial) {
    endpoint += `&from=${dataInicial}`;
  }
  const data = await chamarPluggy(endpoint);
  return data.results || [];
}

// Busca todas as transacoes novas de todos os itens configurados no .env.
// Retorna uma lista normalizada, pronta pra salvar no Firestore.
async function buscarTransacoesNovas(dataInicial) {
  const itemIds = (process.env.PLUGGY_ITEM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (itemIds.length === 0) {
    console.warn('[pluggy] Nenhum PLUGGY_ITEM_IDS configurado no .env ainda.');
    return [];
  }

  const todasTransacoes = [];

  for (const itemId of itemIds) {
    const contas = await listarContas(itemId);

    for (const conta of contas) {
      const transacoes = await listarTransacoes(conta.id, dataInicial);

      for (const t of transacoes) {
        todasTransacoes.push({
          idExterno: t.id,
          valor: Math.abs(t.amount),
          tipo: t.amount < 0 ? 'saida' : 'entrada',
          descricao: t.description,
          categoria: t.category || 'outros',
          origem: conta.type === 'CREDIT' ? 'cartao' : 'pix',
          instituicao: conta.institution || conta.name,
          data: t.date,
        });
      }
    }
  }

  return todasTransacoes;
}

module.exports = { buscarTransacoesNovas };
