import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { db, auth, COLLECTION_NAME } from "./firebase-config.js";

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

let todasTransacoes = [];
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();

const formatBRL = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toDate(transacao) {
  if (transacao.criadoEm?.toDate) return transacao.criadoEm.toDate();
  if (transacao.data) return new Date(transacao.data);
  return new Date();
}

function filtrarPorMes(transacoes, mes, ano) {
  return transacoes.filter((t) => {
    const d = toDate(t);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });
}

function atualizarLabelMes() {
  document.getElementById("currentMonthLabel").textContent = `${MESES[mesAtual]} ${anoAtual}`;
}

function renderHero(transacoesMes) {
  const entradas = transacoesMes.filter((t) => t.tipo === "entrada");
  const saidas = transacoesMes.filter((t) => t.tipo === "saida");

  const totalEntradas = entradas.reduce((soma, t) => soma + Number(t.valor || 0), 0);
  const totalSaidas = saidas.reduce((soma, t) => soma + Number(t.valor || 0), 0);

  document.getElementById("totalMes").textContent = formatBRL(totalEntradas - totalSaidas);
  document.getElementById("totalEntradas").textContent = formatBRL(totalEntradas);
  document.getElementById("totalSaidas").textContent = formatBRL(totalSaidas);

  const porCategoria = {};
  saidas.forEach((t) => {
    const cat = t.categoria || "outros";
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor || 0);
  });
  return porCategoria;
}

function renderLedger(transacoesMes) {
  const body = document.getElementById("ledgerBody");
  const empty = document.getElementById("ledgerEmpty");

  if (transacoesMes.length === 0) {
    body.innerHTML = "";
    body.appendChild(empty);
    return;
  }

  const ordenadas = [...transacoesMes].sort((a, b) => toDate(b) - toDate(a));

  body.innerHTML = "";
  ordenadas.forEach((t) => {
    const row = document.createElement("div");
    row.className = "ledger-row";

    const tag = document.createElement("span");
    tag.className = `origem-tag ${t.origem === "cartao" ? "cartao" : "pix"}`;
    tag.title = t.origem === "cartao" ? "Compra no cartao" : "PIX";

    const descricao = document.createElement("span");
    descricao.className = "ledger-row-descricao";
    descricao.textContent = t.descricao || t.categoria || "sem descricao";

    const leader = document.createElement("span");
    leader.className = "ledger-row-leader";

    const valor = document.createElement("span");
    valor.className = `ledger-row-valor ${t.tipo === "entrada" ? "entrada" : "saida"}`;
    valor.textContent = `${t.tipo === "entrada" ? "+" : "-"} R$ ${formatBRL(t.valor)}`;

    row.append(tag, descricao, leader, valor);
    body.appendChild(row);
  });
}

function renderCategorias(porCategoria) {
  const container = document.getElementById("categoriaList");
  container.innerHTML = "";

  const entradas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  if (entradas.length === 0) {
    container.innerHTML = '<p class="ledger-empty" style="padding:0;">Sem dados neste mes.</p>';
    return;
  }

  const max = entradas[0][1];
  entradas.forEach(([categoria, valor]) => {
    const item = document.createElement("div");
    item.className = "categoria-item";

    const nome = document.createElement("span");
    nome.className = "categoria-item-nome";
    nome.textContent = categoria;

    const barraWrap = document.createElement("span");
    barraWrap.className = "categoria-item-barra";
    const barraFill = document.createElement("span");
    barraFill.className = "categoria-item-barra-fill";
    barraFill.style.width = `${(valor / max) * 100}%`;
    barraWrap.appendChild(barraFill);

    const valorEl = document.createElement("span");
    valorEl.className = "categoria-item-valor";
    valorEl.textContent = formatBRL(valor);

    item.append(nome, barraWrap, valorEl);
    container.appendChild(item);
  });
}

function renderTudo() {
  atualizarLabelMes();
  const transacoesMes = filtrarPorMes(todasTransacoes, mesAtual, anoAtual);
  const porCategoria = renderHero(transacoesMes);
  renderLedger(transacoesMes);
  renderCategorias(porCategoria);
}

// ---------- Status de sincronizacao ----------

async function atualizarStatusSync() {
  const statusEl = document.getElementById("syncStatus");
  const statusTextEl = document.getElementById("syncStatusText");

  try {
    const resp = await fetch("/status-sync");
    const data = await resp.json();

    if (data.sincronizando) {
      statusEl.className = "sync-status pendente";
      statusTextEl.textContent = "Sincronizando...";
    } else if (data.ultimaSincronizacao) {
      const data_ = new Date(data.ultimaSincronizacao);
      statusEl.className = "sync-status conectado";
      statusTextEl.textContent = `Ultima sincronizacao: ${data_.toLocaleTimeString("pt-BR")}`;
    } else {
      statusEl.className = "sync-status";
      statusTextEl.textContent = "Aguardando primeira sincronizacao...";
    }
  } catch (err) {
    statusEl.className = "sync-status pendente";
    statusTextEl.textContent = 'Servidor indisponivel (rode "npm start")';
  }
}

atualizarStatusSync();
setInterval(atualizarStatusSync, 10000);

document.getElementById("sincronizarBtn").addEventListener("click", async () => {
  const btn = document.getElementById("sincronizarBtn");
  btn.disabled = true;
  btn.textContent = "Sincronizando...";
  try {
    await fetch("/sincronizar-agora", { method: "POST" });
  } finally {
    btn.disabled = false;
    btn.textContent = "Sincronizar agora";
    atualizarStatusSync();
  }
});

// ---------- Autenticacao e dados ----------

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const q = query(collection(db, COLLECTION_NAME), orderBy("criadoEm", "desc"));
  onSnapshot(q, (snapshot) => {
    todasTransacoes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderTudo();
  });
});

signInAnonymously(auth).catch((err) => {
  console.error("Falha ao autenticar no Firebase:", err.message);
});

// ---------- Navegacao de mes ----------

document.getElementById("prevMonth").addEventListener("click", () => {
  mesAtual -= 1;
  if (mesAtual < 0) {
    mesAtual = 11;
    anoAtual -= 1;
  }
  renderTudo();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  mesAtual += 1;
  if (mesAtual > 11) {
    mesAtual = 0;
    anoAtual += 1;
  }
  renderTudo();
});
