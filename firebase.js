const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(
  process.cwd(),
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'transacoes';

// Salva uma transacao nova (PIX recebido/enviado, compra no cartao, etc)
async function salvarTransacao(transacao) {
  const ref = await db.collection(COLLECTION_NAME).add({
    ...transacao,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// Verifica se uma transacao com esse id externo (da Pluggy) ja foi salva,
// pra evitar duplicar quando sincronizarmos de novo.
async function transacaoExiste(idExterno) {
  const snap = await db
    .collection(COLLECTION_NAME)
    .where('idExterno', '==', idExterno)
    .limit(1)
    .get();
  return !snap.empty;
}

module.exports = { db, salvarTransacao, transacaoExiste, COLLECTION_NAME };
