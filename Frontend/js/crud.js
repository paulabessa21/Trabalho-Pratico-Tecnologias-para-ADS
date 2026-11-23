// ---------- Motor de telas CRUD: lista + filtros + formulário (modal) + exclusão ----------
// Cada entidade (veículos, clientes...) é descrita em entidades.js; aqui fica o que é comum.

const modalForm = new bootstrap.Modal(document.getElementById('modal-form'));
const modalExcluir = new bootstrap.Modal(document.getElementById('modal-excluir'));
const elForm = document.getElementById('form');
const elFormErro = document.getElementById('form-erro');
const elFormSalvar = document.getElementById('form-salvar');
const elExcluirErro = document.getElementById('excluir-erro');
const elExcluirConfirmar = document.getElementById('excluir-confirmar');

function mostrarErro(el, erro) {
  if (!erro) { el.classList.add('d-none'); el.textContent = ''; return; }
  el.classList.remove('d-none');
  const extras = (erro.detalhes || []).slice(1);
  el.innerHTML = `<div></div>${extras.length ? '<ul class="mb-0 mt-1"></ul>' : ''}`;
  el.firstElementChild.textContent = erro.message || String(erro);
  extras.forEach((t) => { const li = document.createElement('li'); li.textContent = t; el.querySelector('ul').appendChild(li); });
}

// ---------- Formulário em modal ----------
// opcoes: { titulo, campos, valores, textoBotao, enviar(dados) -> Promise, aoConcluir() }
function campoHTML(c, valor) {
  const id = `campo-${c.nome}`;
  const obrig = c.obrigatorio ? ' required' : '';
  const attrs = Object.entries(c.attrs || {}).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  const ro = c.somenteLeitura ? ' readonly' : '';
  let controle;
  if (c.tipo === 'select') {
    const itens = (c.opcoes || []).map((o) => `<option value="${esc(o.valor)}"${String(o.valor) === String(valor ?? '') ? ' selected' : ''}>${esc(o.rotulo)}</option>`).join('');
    controle = `<select class="form-select" id="${id}" name="${c.nome}"${obrig}><option value="">Selecione…</option>${itens}</select>`;
  } else {
    controle = `<input class="form-control" id="${id}" name="${c.nome}" type="${c.tipo || 'text'}" value="${esc(valor ?? '')}"${obrig}${ro}${attrs}>`;
  }
  return `<div class="col-md-${c.col || 12}">
    <label class="form-label" for="${id}">${esc(c.rotulo)}${c.obrigatorio ? '' : ' <span class="text-body-secondary fw-normal">(opcional)</span>'}</label>
    ${controle}
    ${c.dica ? `<div class="form-text">${esc(c.dica)}</div>` : ''}
    <div class="invalid-feedback">${esc(c.erro || 'Preencha este campo corretamente.')}</div>
  </div>`;
}

function lerFormulario(campos) {
  const dados = {};
  campos.forEach((c) => {
    const bruto = elForm.elements[c.nome].value.trim();
    if (bruto === '') { dados[c.nome] = c.converter === 'texto' || !c.converter ? (c.obrigatorio ? '' : null) : null; return; }
    if (c.converter === 'inteiro') dados[c.nome] = parseInt(bruto, 10);
    else if (c.converter === 'decimal') dados[c.nome] = parseFloat(bruto.replace(',', '.'));
    else if (c.converter === 'cpf') dados[c.nome] = bruto.replace(/\D/g, '');
    else if (c.converter === 'maiuscula') dados[c.nome] = bruto.toUpperCase();
    else dados[c.nome] = bruto;
  });
  return dados;
}

let envioAtual = null;
function abrirFormulario(opcoes) {
  document.getElementById('modal-form-titulo').textContent = opcoes.titulo;
  elFormSalvar.textContent = opcoes.textoBotao || 'Salvar';
  elForm.classList.remove('was-validated');
  mostrarErro(elFormErro, null);
  const valores = opcoes.valores || {};
  document.getElementById('form-campos').innerHTML = opcoes.campos.map((c) => campoHTML(c, valores[c.nome])).join('');
  if (opcoes.aoMontar) opcoes.aoMontar(elForm);
  envioAtual = opcoes;
  modalForm.show();
}

document.getElementById('modal-form').addEventListener('shown.bs.modal', () => {
  const primeiro = elForm.querySelector('input:not([readonly]), select');
  if (primeiro) primeiro.focus();
});

elForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!envioAtual) return;
  mostrarErro(elFormErro, null);
  elForm.classList.add('was-validated');
  if (!elForm.checkValidity()) return;

  const rotuloOriginal = elFormSalvar.textContent;
  elFormSalvar.disabled = true;
  elFormSalvar.textContent = 'Salvando…';
  try {
    const mensagem = await envioAtual.enviar(lerFormulario(envioAtual.campos));
    modalForm.hide();
    if (mensagem) mostrarAviso(mensagem);
    if (envioAtual.aoConcluir) envioAtual.aoConcluir();
  } catch (erro) {
    mostrarErro(elFormErro, erro);
  } finally {
    elFormSalvar.disabled = false;
    elFormSalvar.textContent = rotuloOriginal;
  }
});

// ---------- Exclusão com confirmação ----------
let exclusaoAtual = null;
function confirmarExclusao(texto, executar, aoConcluir) {
  document.getElementById('excluir-texto').textContent = texto;
  mostrarErro(elExcluirErro, null);
  exclusaoAtual = { executar, aoConcluir };
  modalExcluir.show();
}
elExcluirConfirmar.addEventListener('click', async () => {
  if (!exclusaoAtual) return;
  mostrarErro(elExcluirErro, null);
  elExcluirConfirmar.disabled = true;
  elExcluirConfirmar.textContent = 'Excluindo…';
  try {
    const mensagem = await exclusaoAtual.executar();
    modalExcluir.hide();
    mostrarAviso(mensagem || 'Registro excluído.');
    exclusaoAtual.aoConcluir();
  } catch (erro) {
    mostrarErro(elExcluirErro, erro); // ex.: 409 "existem veículos cadastrados com ela"
  } finally {
    elExcluirConfirmar.disabled = false;
    elExcluirConfirmar.textContent = 'Excluir';
  }
});

// ---------- Tela de listagem ----------
let geracaoTela = 0; // evita que uma resposta atrasada desenhe na tela errada

async function desenharTela(ent) {
  const minha = ++geracaoTela;
  const tela = document.getElementById('tela');
  const estado = { valores: {}, lista: [], ultimaChave: null, ordem: { col: 0, dir: 1 } };
  tela.innerHTML = '<div class="estado-vazio" role="status">Carregando…</div>';

  // Opções dos filtros do tipo select (podem vir da API)
  let opcoesFiltros = {};
  try {
    if (ent.opcoesFiltros) opcoesFiltros = await ent.opcoesFiltros();
  } catch (erro) {
    mostrarAviso(erro.message, 'erro');
  }
  if (minha !== geracaoTela) return;

  const filtrosHTML = ent.filtros.map((f) => {
    const id = `filtro-${f.nome}`;
    if (f.tipo === 'check') {
      return `<div class="col-12 col-md-auto d-flex align-items-end"><div class="form-check form-switch mb-2">
        <input class="form-check-input" type="checkbox" role="switch" id="${id}" data-filtro="${f.nome}">
        <label class="form-check-label" for="${id}">${esc(f.rotulo)}</label></div></div>`;
    }
    let controle;
    if (f.tipo === 'select') {
      const itens = (f.opcoes || opcoesFiltros[f.nome] || []).map((o) => `<option value="${esc(o.valor)}">${esc(o.rotulo)}</option>`).join('');
      controle = `<select class="form-select form-select-sm" id="${id}" data-filtro="${f.nome}"><option value="">${esc(f.todos || 'Todos')}</option>${itens}</select>`;
    } else {
      controle = `<input class="form-control form-control-sm" id="${id}" data-filtro="${f.nome}" type="${f.tipo || 'text'}" placeholder="${esc(f.dica || '')}"${f.tipo === 'number' ? ' min="0"' : ''}>`;
    }
    return `<div class="col-6 col-md-${f.col || 3}"><label class="form-label mb-1" for="${id}">${esc(f.rotulo)}</label>${controle}</div>`;
  }).join('');

  tela.innerHTML = `
    <div class="tela-cabecalho">
      <div>
        <h1>${esc(ent.titulo)}</h1>
        <p class="text-body-secondary mb-0">${esc(ent.descricao)}</p>
      </div>
      ${ent.permiteCriar === false ? '' : `<button type="button" class="btn btn-marca" id="btn-novo">Novo ${esc(ent.singular)}</button>`}
    </div>
    <form class="filtros row g-2 align-items-end" id="filtros" aria-label="Filtros de ${esc(ent.titulo.toLowerCase())}">
      ${filtrosHTML}
      <div class="col-12 col-md-auto"><button type="button" class="btn btn-sm btn-outline-secondary" id="limpar">Limpar filtros</button></div>
    </form>
    <p class="consulta-rota" id="rota-usada" aria-live="polite"></p>
    <div id="area-lista" aria-live="polite"></div>`;

  const area = document.getElementById('area-lista');
  const rotaUsada = document.getElementById('rota-usada');

  function lerFiltros() {
    const v = {};
    tela.querySelectorAll('[data-filtro]').forEach((el) => {
      v[el.dataset.filtro] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return v;
  }

  function desenharTabela() {
    const filtrada = ent.filtrar(estado.lista, estado.valores);
    const col = ent.colunas[estado.ordem.col];
    const ordenada = [...filtrada].sort((a, b) => {
      const x = col.ordenar ? col.ordenar(a) : '', y = col.ordenar ? col.ordenar(b) : '';
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { numeric: true });
      return r * estado.ordem.dir;
    });

    if (ordenada.length === 0) {
      area.innerHTML = estado.lista.length === 0 && !Object.values(estado.valores).some(Boolean)
        ? `<div class="estado-vazio"><h2 class="fs-5">Nenhum registro encontrado</h2>
            <p class="text-body-secondary">${ent.permiteCriar === false ? 'Não há dados para esta consulta.' : `Cadastre o primeiro ${esc(ent.singular)} para começar.`}</p></div>`
        : `<div class="estado-vazio"><h2 class="fs-5">Nada corresponde aos filtros</h2>
            <p class="text-body-secondary mb-3">Tente outros valores ou limpe os filtros.</p>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-acao="limpar-estado">Limpar filtros</button></div>`;
      return;
    }

    const cab = ent.colunas.map((c, i) => {
      const ativo = i === estado.ordem.col;
      const sort = ativo ? (estado.ordem.dir === 1 ? 'ascending' : 'descending') : 'none';
      return `<th scope="col" aria-sort="${sort}" class="${c.classe || ''}"><button type="button" class="ordenar" data-ordem="${i}">${esc(c.titulo)}<span aria-hidden="true">${ativo ? (estado.ordem.dir === 1 ? ' ▲' : ' ▼') : ''}</span></button></th>`;
    }).join('');

    const linhas = ordenada.map((r) => {
      const acoes = ent.acoes(r).map((a) =>
        `<button type="button" class="btn btn-sm ${a.classe}" data-acao="${a.id}" data-id="${esc(r.id)}">${esc(a.rotulo)}</button>`).join(' ');
      return `<tr>${ent.colunas.map((c) => `<td class="${c.classe || ''}">${c.valor(r)}</td>`).join('')}<td class="text-end acoes">${acoes}</td></tr>`;
    }).join('');

    area.innerHTML = `
      <p class="contagem">${ordenada.length} de ${estado.lista.length} ${estado.lista.length === 1 ? 'registro' : 'registros'}</p>
      <div class="table-responsive tabela-caixa"><table class="table table-hover align-middle mb-0">
        <thead><tr>${cab}<th scope="col" class="text-end"><span class="visually-hidden">Ações</span></th></tr></thead>
        <tbody>${linhas}</tbody></table></div>`;
  }

  async function carregar(forcar = false) {
    const novos = lerFiltros();
    // Se nada mudou (ex.: o campo perdeu o foco ao clicar num botão), não redesenha:
    // trocar o HTML entre o "apertar" e o "soltar" do mouse faria o clique se perder
    if (!forcar && estado.desenhado && JSON.stringify(novos) === JSON.stringify(estado.valores)) return;
    estado.valores = novos;
    const consultaApi = ent.consultaApi ? ent.consultaApi(estado.valores) : { caminho: ent.rota, parametros: {} };
    const chave = JSON.stringify(consultaApi);
    rotaUsada.innerHTML = `Consulta: <code>GET ${esc(consultaApi.caminho + (Object.keys(consultaApi.parametros).filter((k) => consultaApi.parametros[k] !== '' && consultaApi.parametros[k] != null).length ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(consultaApi.parametros).filter(([, v]) => v !== '' && v != null))) : ''))}</code>`;
    if (forcar || chave !== estado.ultimaChave) {
      area.innerHTML = '<div class="estado-vazio" role="status"><div class="spinner-border spinner-border-sm" aria-hidden="true"></div> Carregando…</div>';
      try {
        const lista = await Api.listar(consultaApi.caminho, consultaApi.parametros);
        if (minha !== geracaoTela) return;
        estado.lista = lista;
        estado.ultimaChave = chave;
      } catch (erro) {
        if (minha !== geracaoTela) return;
        area.innerHTML = `<div class="estado-vazio" role="alert"><h2 class="fs-5">Não foi possível carregar</h2>
          <p class="text-body-secondary" id="erro-carregar"></p>
          <button type="button" class="btn btn-marca" data-acao="tentar-novamente">Tentar novamente</button></div>`;
        document.getElementById('erro-carregar').textContent = erro.message;
        estado.ultimaChave = null;
        return;
      }
    }
    estado.desenhado = true;
    desenharTabela();
  }

  // Filtros: texto filtra na hora; os demais recarregam quando mudam
  let atraso;
  document.getElementById('filtros').addEventListener('input', () => { clearTimeout(atraso); atraso = setTimeout(() => carregar(), 120); });
  document.getElementById('filtros').addEventListener('change', () => carregar());
  document.getElementById('filtros').addEventListener('submit', (e) => e.preventDefault());

  function limpar() {
    tela.querySelectorAll('[data-filtro]').forEach((el) => { if (el.type === 'checkbox') el.checked = false; else el.value = ''; });
    carregar();
  }
  document.getElementById('limpar').addEventListener('click', limpar);

  const recarregar = () => carregar(true);

  area.addEventListener('click', (e) => {
    const botao = e.target.closest('button');
    if (!botao) return;
    if (botao.dataset.ordem !== undefined) {
      const i = Number(botao.dataset.ordem);
      estado.ordem = { col: i, dir: estado.ordem.col === i ? -estado.ordem.dir : 1 };
      desenharTabela();
    } else if (botao.dataset.acao === 'limpar-estado') limpar();
    else if (botao.dataset.acao === 'tentar-novamente') recarregar();
    else if (botao.dataset.acao) {
      const registro = estado.lista.find((r) => String(r.id) === botao.dataset.id);
      if (registro) ent.executarAcao(botao.dataset.acao, registro, recarregar);
    }
  });

  const botaoNovo = document.getElementById('btn-novo');
  if (botaoNovo) botaoNovo.addEventListener('click', () => ent.executarAcao('novo', null, recarregar));

  await carregar(true);
}
