// ---------- Funções de apoio: texto seguro, formatação e avisos ----------

// Escapa HTML para que dados digitados nunca virem código na tela
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR');

function formatarMoeda(v) { return v == null ? '—' : moeda.format(Number(v)); }
function formatarKm(v) { return v == null ? '—' : numero.format(Number(v)) + ' km'; }

// A API devolve datas como "2026-11-19T00:00:00". Fatiamos o texto (em vez de usar
// new Date) para o fuso horário nunca deslocar o dia.
function dataISO(v) { return v ? String(v).slice(0, 10) : ''; }
function formatarData(v) {
  const d = dataISO(v);
  return d ? d.split('-').reverse().join('/') : '—';
}
function hojeISO() {
  const h = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${dois(h.getMonth() + 1)}-${dois(h.getDate())}`;
}

function formatarCpf(cpf) {
  const d = String(cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : esc(cpf);
}

// Remove acentos e maiúsculas para a busca por texto
function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Placa no formato visual de placa de carro (detalhe do tema)
function placaHTML(placa) {
  return `<span class="placa">${esc(String(placa).toUpperCase())}</span>`;
}

const ROTULO_STATUS = { Disponivel: 'Disponível', Alugado: 'Alugado', Manutencao: 'Manutenção' };
function statusHTML(status) {
  const classe = { Disponivel: 'ok', Alugado: 'uso', Manutencao: 'manut' }[status] || 'ok';
  return `<span class="selo selo-${classe}">${esc(ROTULO_STATUS[status] || status)}</span>`;
}

function mostrarAviso(texto, tipo = 'sucesso') {
  const el = document.createElement('div');
  el.className = `toast align-items-center border-0 toast-aviso toast-${tipo}`;
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.innerHTML = '<div class="d-flex"><div class="toast-body"></div>' +
    '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button></div>';
  el.querySelector('.toast-body').textContent = texto;
  document.getElementById('avisos').appendChild(el);
  el.addEventListener('hidden.bs.toast', () => el.remove());
  new bootstrap.Toast(el, { delay: tipo === 'erro' ? 7000 : 4000 }).show();
}
