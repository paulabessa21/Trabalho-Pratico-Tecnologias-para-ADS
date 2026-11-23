// ---------- Painel: números gerais + duas consultas da API mostradas como resultado ----------

async function desenharPainel() {
  const minha = ++geracaoTela;
  const tela = document.getElementById('tela');
  const inicioAno = `${new Date().getFullYear()}-01-01`;

  tela.innerHTML = `
    <div class="tela-cabecalho">
      <div><h1>Painel</h1><p class="text-body-secondary mb-0">Visão geral da locadora, direto do banco de dados.</p></div>
    </div>
    <section class="resumo" id="resumo" aria-label="Resumo"><div class="estado-vazio" role="status">Carregando…</div></section>

    <div class="row g-4 mt-1">
      <section class="col-lg-6" aria-labelledby="t-fat">
        <h2 class="secao-titulo" id="t-fat">Faturamento por cliente</h2>
        <form class="row g-2 align-items-end mb-1" id="form-fat">
          <div class="col-6 col-sm-4"><label class="form-label mb-1" for="fat-ini">De</label><input class="form-control form-control-sm" type="date" id="fat-ini" value="${inicioAno}" required></div>
          <div class="col-6 col-sm-4"><label class="form-label mb-1" for="fat-fim">Até</label><input class="form-control form-control-sm" type="date" id="fat-fim" value="${hojeISO()}" required></div>
          <div class="col-12 col-sm-4"><button class="btn btn-sm btn-marca w-100" type="submit">Consultar</button></div>
        </form>
        <p class="consulta-rota" id="rota-fat"></p>
        <div id="res-fat"></div>
      </section>

      <section class="col-lg-6" aria-labelledby="t-tot">
        <h2 class="secao-titulo" id="t-tot">Quantas vezes cada veículo foi alugado</h2>
        <p class="consulta-rota">Consulta: <code>GET /api/veiculos/com-total-alugueis</code></p>
        <div id="res-tot"></div>
      </section>
    </div>

    <section class="mt-4" aria-labelledby="t-ab">
      <h2 class="secao-titulo" id="t-ab">Devoluções pendentes</h2>
      <p class="consulta-rota">Consulta: <code>GET /api/alugueis/em-aberto</code></p>
      <div id="res-ab"></div>
    </section>`;

  const ativo = () => minha === geracaoTela;
  const falha = (el, erro) => {
    el.innerHTML = '<div class="estado-vazio" role="alert"><p class="mb-0" data-msg></p></div>';
    el.querySelector('[data-msg]').textContent = erro.message;
  };

  // Resumo
  try {
    const [veiculos, clientes, abertos] = await Promise.all([
      Api.listar(ROTAS.veiculos), Api.listar(ROTAS.clientes), Api.listar(`${ROTAS.alugueis}/em-aberto`)]);
    if (!ativo()) return;
    const conta = (s) => veiculos.filter((v) => v.status === s).length;
    const cartao = (n, t, href) => `<a class="numero" href="${href}"><span class="numero-valor">${n}</span><span class="numero-rotulo">${t}</span></a>`;
    document.getElementById('resumo').innerHTML =
      cartao(veiculos.length, 'veículos na frota', '#veiculos') +
      cartao(conta('Disponivel'), 'disponíveis', '#veiculos') +
      cartao(conta('Alugado'), 'alugados agora', '#alugueis') +
      cartao(conta('Manutencao'), 'em manutenção', '#veiculos') +
      cartao(clientes.length, 'clientes', '#clientes');

    // Devoluções pendentes (as 5 mais próximas)
    const resAb = document.getElementById('res-ab');
    if (!abertos.length) {
      resAb.innerHTML = '<div class="estado-vazio"><p class="mb-0 text-body-secondary">Nenhum aluguel em aberto.</p></div>';
    } else {
      resAb.innerHTML = `<div class="table-responsive tabela-caixa"><table class="table align-middle mb-0"><thead><tr>
        <th scope="col">Cliente</th><th scope="col">Veículo</th><th scope="col" class="num">Devolução prevista</th><th scope="col">Situação</th></tr></thead><tbody>${
        abertos.slice(0, 5).map((a) => `<tr><td>${esc(a.clienteNome)}</td><td>${esc(a.veiculoModelo)} ${placaHTML(a.veiculoPlaca)}</td>
          <td class="num">${formatarData(a.dataPrevistaDevolucao)}</td><td>${situacaoAluguelHTML(a)}</td></tr>`).join('')}</tbody></table></div>
        ${abertos.length > 5 ? `<p class="contagem mt-2">Mostrando 5 de ${abertos.length}. <a href="#alugueis">Ver todos os aluguéis</a></p>` : ''}`;
    }
  } catch (erro) {
    if (!ativo()) return;
    falha(document.getElementById('resumo'), erro);
    falha(document.getElementById('res-ab'), erro);
  }

  // Consulta 1: faturamento por período
  async function consultarFaturamento() {
    const ini = document.getElementById('fat-ini').value, fim = document.getElementById('fat-fim').value;
    const alvo = document.getElementById('res-fat');
    document.getElementById('rota-fat').innerHTML = `Consulta: <code>GET /api/alugueis/faturamento-por-periodo?dataInicio=${esc(ini)}&amp;dataFim=${esc(fim)}</code>`;
    alvo.innerHTML = '<div class="estado-vazio" role="status">Consultando…</div>';
    try {
      const dados = await Api.listar(`${ROTAS.alugueis}/faturamento-por-periodo`, { dataInicio: ini, dataFim: fim });
      if (!ativo()) return;
      if (!dados.length) { alvo.innerHTML = '<div class="estado-vazio"><p class="mb-0 text-body-secondary">Nenhum aluguel devolvido neste período.</p></div>'; return; }
      const maior = Math.max(...dados.map((d) => d.valorTotalFaturado));
      const total = dados.reduce((s, d) => s + d.valorTotalFaturado, 0);
      alvo.innerHTML = `<div class="tabela-caixa"><table class="table align-middle mb-0"><thead><tr>
        <th scope="col">Cliente</th><th scope="col" class="num">Aluguéis</th><th scope="col" class="num">Faturado</th></tr></thead><tbody>${
        dados.map((d) => `<tr><td>${esc(d.clienteNome)}<div class="barra"><span style="width:${maior ? (d.valorTotalFaturado / maior) * 100 : 0}%"></span></div></td>
          <td class="num">${d.quantidadeAlugueis}</td><td class="num">${formatarMoeda(d.valorTotalFaturado)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row">Total do período</th><td></td><td class="num">${formatarMoeda(total)}</td></tr></tfoot></table></div>`;
    } catch (erro) { if (ativo()) falha(alvo, erro); }
  }
  document.getElementById('form-fat').addEventListener('submit', (e) => { e.preventDefault(); consultarFaturamento(); });
  consultarFaturamento();

  // Consulta 2: veículos com total de aluguéis (LEFT JOIN: inclui quem nunca foi alugado)
  const alvoTot = document.getElementById('res-tot');
  try {
    const dados = await Api.listar(`${ROTAS.veiculos}/com-total-alugueis`);
    if (!ativo()) return;
    dados.sort((a, b) => b.totalAlugueis - a.totalAlugueis || a.modelo.localeCompare(b.modelo, 'pt-BR'));
    const maior = Math.max(1, ...dados.map((d) => d.totalAlugueis));
    alvoTot.innerHTML = dados.length ? `<div class="tabela-caixa rolagem"><table class="table align-middle mb-0"><thead><tr>
      <th scope="col">Veículo</th><th scope="col" class="num">Aluguéis</th></tr></thead><tbody>${
      dados.map((d) => `<tr><td>${esc(d.modelo)} ${placaHTML(d.placa)}<div class="barra"><span style="width:${(d.totalAlugueis / maior) * 100}%"></span></div></td>
        <td class="num">${d.totalAlugueis}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="estado-vazio"><p class="mb-0 text-body-secondary">Nenhum veículo cadastrado.</p></div>';
  } catch (erro) { if (ativo()) falha(alvoTot, erro); }
}
