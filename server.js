require('dotenv').config();

const path = require('path');
const express = require('express');

const { salvarTransacao, transacaoExiste } = require('./firebase');
const { buscarTransacoesNovas } = require('./pluggy');

const PORT = process.env.PORT || 3000;
const INTERVALO_MS = (Number(process.env.SYNC_INTERVAL_MINUTOS) || 30) * 60 * 1000;

let ultimaSincronizacao = null;
let sincronizando = false;

// ---------- Site (Express) ----------

function iniciarSite() {
  const app = express();

  // Estrutura sem subpastas: servimos so os arquivos do site, um a um,
  // pra nao expor server.js, firebase.js, pluggy.js ou o .env pela web.
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
  app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
  app.get('/firebase-config.js', (req, res) => res.sendFile(path.join(__dirname, 'firebase-config.js')));

  app.get('/status-sync', (req, res) => {
    res.json({ ultimaSincronizacao, sincronizando });
  });

  // Permite forcar uma sincronizacao manual pelo site, sem esperar o intervalo automatico.
  app.post('/sincronizar-agora', async (req, res) => {
    try {
      const total = await sincronizar();
      res.json({ ok: true, novasTransacoes: total });
    } catch (err) {
      console.error('[sync manual] erro:', err.message);
      res.status(500).json({ ok: false, erro: err.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Neto Financeiro no ar em http://localhost:${PORT}`);
  });
}

// ---------- Sincronizacao com a Pluggy ----------

async function sincronizar() {
  if (sincronizando) return 0;
  sincronizando = true;

  try {
    console.log('[sync] Buscando transacoes novas na Pluggy...');

    // So busca transacoes dos ultimos 3 dias, em vez do historico inteiro toda vez.
    // Isso evita reprocessar milhares de transacoes antigas a cada ciclo.
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    const dataInicial = tresDiasAtras.toISOString().slice(0, 10); // formato YYYY-MM-DD

    const transacoes = await buscarTransacoesNovas(dataInicial);

    let salvas = 0;
    for (const t of transacoes) {
      const jaExiste = await transacaoExiste(t.idExterno);
      if (jaExiste) continue;

      await salvarTransacao(t);
      salvas += 1;
      console.log(`[sync] Nova transacao salva: ${t.descricao} - R$ ${t.valor.toFixed(2)} (${t.tipo})`);
    }

    ultimaSincronizacao = new Date().toISOString();
    console.log(`[sync] Concluido. ${salvas} transacao(oes) nova(s) de ${transacoes.length} verificada(s).`);
    return salvas;
  } finally {
    sincronizando = false;
  }
}

function iniciarSincronizacaoAutomatica() {
  // Roda uma vez assim que o servidor sobe...
  sincronizar().catch((err) => console.error('[sync] erro na sincronizacao inicial:', err.message));

  // ...e depois repete no intervalo configurado (padrao: 30 minutos).
  setInterval(() => {
    sincronizar().catch((err) => console.error('[sync] erro na sincronizacao periodica:', err.message));
  }, INTERVALO_MS);
}

// ---------- Sobe tudo junto ----------

iniciarSite();
iniciarSincronizacaoAutomatica();
