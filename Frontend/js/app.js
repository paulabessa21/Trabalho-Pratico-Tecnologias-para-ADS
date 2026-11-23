// ---------- Navegação por endereço (#painel, #veiculos...) e teste de conexão ----------

const TELAS = [
  { chave: 'painel', titulo: 'Painel', desenhar: desenharPainel },
  { chave: 'veiculos', titulo: 'Veículos', desenhar: () => desenharTela(Veiculos) },
  { chave: 'clientes', titulo: 'Clientes', desenhar: () => desenharTela(Clientes) },
  { chave: 'alugueis', titulo: 'Aluguéis', desenhar: () => desenharTela(Alugueis) },
  { chave: 'fabricantes', titulo: 'Fabricantes', desenhar: () => desenharTela(Fabricantes) },
  { chave: 'categorias', titulo: 'Categorias', desenhar: () => desenharTela(Categorias) },
];

document.getElementById('menu-itens').innerHTML = TELAS.map((t) =>
  `<li class="nav-item"><a class="nav-link" href="#${t.chave}" data-tela="${t.chave}">${t.titulo}</a></li>`).join('');

function navegar() {
  const chave = location.hash.replace('#', '') || 'painel';
  const tela = TELAS.find((t) => t.chave === chave) || TELAS[0];
  document.querySelectorAll('#menu-itens .nav-link').forEach((a) => {
    if (a.dataset.tela === tela.chave) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = `${tela.titulo} — Locadora de Veículos`;
  const menu = document.getElementById('menu');
  if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
  tela.desenhar();
}
window.addEventListener('hashchange', navegar);

// Indicador de conexão no topo
(async function testarApi() {
  const el = document.getElementById('api-status');
  try {
    await Api.listar(ROTAS.categorias);
    el.textContent = 'API conectada';
    el.classList.add('conectada');
  } catch (erro) {
    el.textContent = 'API fora do ar';
    el.classList.add('desconectada');
  }
})();

navegar();
