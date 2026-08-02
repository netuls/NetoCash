// Servidor temporario so para conectar a conta real via widget da Pluggy.
// Resolve o problema de CORS: a autenticacao precisa ser feita no backend (Node),
// nao direto no navegador.
//
// Como usar:
//   1. Coloque este arquivo na pasta do NetoCash-main (mesma pasta do server.js)
//   2. No terminal, rode: node servidor-conexao-real.js
//   3. Abra no navegador: http://localhost:4000
//   4. Clique em "Conectar minha conta real"

require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 4000;

app.get('/connect-token', async (req, res) => {
  try {
    const authResp = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.PLUGGY_CLIENT_ID,
        clientSecret: process.env.PLUGGY_CLIENT_SECRET,
      }),
    });
    const authData = await authResp.json();
    if (!authResp.ok) {
      return res.status(500).json({ erro: 'Falha ao autenticar', detalhe: authData });
    }

    const tokenResp = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': authData.apiKey },
      body: JSON.stringify({}),
    });
    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(500).json({ erro: 'Falha ao gerar connect token', detalhe: tokenData });
    }

    res.json({ accessToken: tokenData.accessToken });
  } catch (err) {
    res.status(500).json({ erro: 'Erro inesperado', detalhe: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Conectar conta real - NetoCash</title>
  <style>
    body { font-family: sans-serif; background: #111; color: #eee; padding: 40px; text-align: center; }
    button { background: #a3195b; color: white; border: none; padding: 14px 28px; font-size: 16px; border-radius: 8px; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #resultado { margin-top: 30px; padding: 20px; background: #222; border-radius: 8px; white-space: pre-wrap; text-align: left; display: none; }
    #status { margin-top: 15px; color: #aaa; }
  </style>
</head>
<body>
  <h1>Conectar conta real (Conector 200)</h1>
  <p>Isso abre o widget oficial da Pluggy. Se pedir alguma confirmacao extra, resolva na hora.</p>
  <button id="btnConectar">Conectar minha conta real</button>
  <div id="status"></div>
  <pre id="resultado"></pre>

  <script type="module">
    import { PluggyConnect } from 'https://cdn.jsdelivr.net/npm/pluggy-connect-sdk/+esm';

    const statusEl = document.getElementById('status');
    const resultadoEl = document.getElementById('resultado');
    const btn = document.getElementById('btnConectar');

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      statusEl.textContent = 'Gerando token de conexao...';
      resultadoEl.style.display = 'none';

      try {
        const resp = await fetch('/connect-token');
        const data = await resp.json();
        if (!resp.ok) throw new Error(JSON.stringify(data));

        statusEl.textContent = 'Abrindo widget...';

        const pluggyConnect = new PluggyConnect({
          connectToken: data.accessToken,
          includeSandbox: false,
          connectorIds: [200],
          onSuccess: (itemData) => {
            statusEl.textContent = 'Conectado com sucesso!';
            resultadoEl.style.display = 'block';
            resultadoEl.textContent =
              'itemId: ' + itemData.item.id + '\\n\\n' +
              'Copie esse itemId e coloque no seu .env assim:\\n' +
              'PLUGGY_ITEM_IDS=' + itemData.item.id;
            btn.disabled = false;
          },
          onError: (error) => {
            statusEl.textContent = 'Erro no widget.';
            resultadoEl.style.display = 'block';
            resultadoEl.textContent = JSON.stringify(error, null, 2);
            btn.disabled = false;
          },
          onClose: () => {
            if (btn.disabled) btn.disabled = false;
          }
        });

        pluggyConnect.init();
      } catch (err) {
        statusEl.textContent = 'Erro.';
        resultadoEl.style.display = 'block';
        resultadoEl.textContent = err.message;
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Servidor de conexao no ar em http://localhost:${PORT}`);
  console.log('Abra esse endereco no navegador e clique em "Conectar minha conta real".');
});
