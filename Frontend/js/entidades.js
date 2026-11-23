// ---------- Descrição das 5 entidades da Locadora e das rotas da API que cada uma usa ----------

const ROTAS = {
  fabricantes: '/api/fabricantes',
  categorias: '/api/categorias',
  veiculos: '/api/veiculos',
  clientes: '/api/clientes',
  alugueis: '/api/alugueis',
};

const incluiTexto = (campos, busca) => !busca || normalizar(campos.join(' ')).includes(normalizar(busca));

async function opcoesDe(rota, rotulo) {
  const lista = await Api.listar(rota);
  return lista.map((x) => ({ valor: x.id, rotulo: rotulo(x) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

const BOTAO_EDITAR = { id: 'editar', rotulo: 'Editar', classe: 'btn-outline-secondary' };
const BOTAO_EXCLUIR = { id: 'excluir', rotulo: 'Excluir', classe: 'btn-outline-danger' };

// Comportamento comum de criar / editar / excluir
function crudPadrao(ent) {
  const cadastrado = ent.fem ? 'cadastrada' : 'cadastrado';
  const atualizado = ent.fem ? 'atualizada' : 'atualizado';
  const excluido = ent.fem ? 'excluída' : 'excluído';
  const inicial = ent.singular.charAt(0).toUpperCase() + ent.singular.slice(1);

  ent.acoes = ent.acoes || (() => [BOTAO_EDITAR, BOTAO_EXCLUIR]);
  ent.executarAcao = async (acao, registro, recarregar) => {
    try {
      if (acao === 'novo') {
        abrirFormulario({
          titulo: `Novo ${ent.singular}`,
          campos: await ent.campos(null),
          valores: ent.valoresIniciais ? ent.valoresIniciais() : {},
          enviar: async (dados) => { await Api.criar(ent.rota, dados); return `${inicial} ${cadastrado}.`; },
          aoConcluir: recarregar,
        });
      } else if (acao === 'editar') {
        abrirFormulario({
          titulo: `Editar ${ent.singular}`,
          campos: await ent.campos(registro),
          valores: ent.valoresEdicao ? ent.valoresEdicao(registro) : registro,
          enviar: async (dados) => { await Api.atualizar(ent.rota, registro.id, dados); return `${inicial} ${atualizado}.`; },
          aoConcluir: recarregar,
        });
      } else if (acao === 'excluir') {
        confirmarExclusao(`Você vai excluir ${ent.descreverRegistro(registro)}.`,
          async () => { await Api.excluir(ent.rota, registro.id); return `${inicial} ${excluido}.`; }, recarregar);
      } else if (ent.acaoExtra) {
        await ent.acaoExtra(acao, registro, recarregar);
      }
    } catch (erro) {
      mostrarAviso(erro.message, 'erro');
    }
  };
  return ent;
}

// ---------- Fabricantes ----------
const Fabricantes = crudPadrao({
  chave: 'fabricantes', rota: ROTAS.fabricantes, titulo: 'Fabricantes', singular: 'fabricante',
  descricao: 'Marcas dos veículos da frota.',
  colunas: [
    { titulo: 'Código', valor: (r) => r.id, ordenar: (r) => r.id, classe: 'num' },
    { titulo: 'Nome', valor: (r) => esc(r.nome), ordenar: (r) => normalizar(r.nome) },
  ],
  filtros: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'text', dica: 'Ex.: Fiat', col: 4 },
    { nome: 'codigo', rotulo: 'Código', tipo: 'number', col: 2 },
  ],
  filtrar: (lista, v) => lista.filter((r) =>
    incluiTexto([r.nome], v.nome) && (!v.codigo || String(r.id) === v.codigo)),
  campos: async () => [
    { nome: 'nome', rotulo: 'Nome do fabricante', obrigatorio: true, attrs: { minlength: 2, maxlength: 100 }, erro: 'Informe de 2 a 100 caracteres.' },
  ],
  descreverRegistro: (r) => `o fabricante “${r.nome}”`,
});

// ---------- Categorias ----------
const Categorias = crudPadrao({
  chave: 'categorias', rota: ROTAS.categorias, titulo: 'Categorias', singular: 'categoria', fem: true,
  descricao: 'Grupos de veículos e o valor base da diária de cada um.',
  colunas: [
    { titulo: 'Código', valor: (r) => r.id, ordenar: (r) => r.id, classe: 'num' },
    { titulo: 'Nome', valor: (r) => esc(r.nome), ordenar: (r) => normalizar(r.nome) },
    { titulo: 'Diária base', valor: (r) => formatarMoeda(r.valorDiariaBase), ordenar: (r) => r.valorDiariaBase, classe: 'num' },
  ],
  filtros: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'text', dica: 'Ex.: SUV', col: 4 },
    { nome: 'minimo', rotulo: 'Diária de (R$)', tipo: 'number', col: 2 },
    { nome: 'maximo', rotulo: 'Diária até (R$)', tipo: 'number', col: 2 },
  ],
  filtrar: (lista, v) => lista.filter((r) =>
    incluiTexto([r.nome], v.nome)
    && (v.minimo === '' || r.valorDiariaBase >= Number(v.minimo))
    && (v.maximo === '' || r.valorDiariaBase <= Number(v.maximo))),
  campos: async () => [
    { nome: 'nome', rotulo: 'Nome da categoria', obrigatorio: true, attrs: { minlength: 2, maxlength: 50 }, erro: 'Informe de 2 a 50 caracteres.' },
    { nome: 'valorDiariaBase', rotulo: 'Valor da diária base (R$)', tipo: 'number', converter: 'decimal', obrigatorio: true, attrs: { min: 0.01, max: 100000, step: 0.01 }, erro: 'Informe um valor maior que zero.' },
  ],
  descreverRegistro: (r) => `a categoria “${r.nome}”`,
});

// ---------- Clientes ----------
const Clientes = crudPadrao({
  chave: 'clientes', rota: ROTAS.clientes, titulo: 'Clientes', singular: 'cliente',
  descricao: 'Pessoas que alugam veículos.',
  colunas: [
    { titulo: 'Nome', valor: (r) => esc(r.nome), ordenar: (r) => normalizar(r.nome) },
    { titulo: 'CPF', valor: (r) => formatarCpf(r.cpf), ordenar: (r) => r.cpf, classe: 'num' },
    { titulo: 'E-mail', valor: (r) => esc(r.email), ordenar: (r) => normalizar(r.email) },
    { titulo: 'Telefone', valor: (r) => esc(r.telefone || '—'), ordenar: (r) => r.telefone || '' },
  ],
  filtros: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'text', col: 3 },
    { nome: 'cpf', rotulo: 'CPF', tipo: 'text', dica: 'Só números', col: 3 },
    { nome: 'email', rotulo: 'E-mail', tipo: 'text', col: 3 },
    { nome: 'semAluguel', rotulo: 'Só clientes sem aluguel', tipo: 'check' },
  ],
  // Rota da API usada quando o filtro "sem aluguel" está ligado (LEFT JOIN no backend)
  consultaApi: (v) => v.semAluguel
    ? { caminho: `${ROTAS.clientes}/sem-aluguel`, parametros: {} }
    : { caminho: ROTAS.clientes, parametros: {} },
  filtrar: (lista, v) => lista.filter((r) =>
    incluiTexto([r.nome], v.nome)
    && (!v.cpf || r.cpf.includes(v.cpf.replace(/\D/g, '')))
    && incluiTexto([r.email], v.email)),
  campos: async () => [
    { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, attrs: { minlength: 3, maxlength: 150 }, erro: 'Informe de 3 a 150 caracteres.' },
    { nome: 'cpf', rotulo: 'CPF', obrigatorio: true, converter: 'cpf', col: 6, attrs: { pattern: '\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}', maxlength: 14, inputmode: 'numeric' }, erro: 'O CPF deve ter 11 dígitos.' },
    { nome: 'telefone', rotulo: 'Telefone', col: 6, attrs: { maxlength: 20, inputmode: 'tel' } },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, attrs: { maxlength: 150 }, erro: 'Informe um e-mail válido.' },
  ],
  valoresEdicao: (r) => ({ ...r, cpf: formatarCpf(r.cpf) }),
  descreverRegistro: (r) => `o cliente “${r.nome}” (CPF ${formatarCpf(r.cpf)})`,
});

// ---------- Veículos ----------
const Veiculos = crudPadrao({
  chave: 'veiculos', rota: ROTAS.veiculos, titulo: 'Veículos', singular: 'veículo',
  descricao: 'Frota da locadora, com fabricante, categoria e situação.',
  colunas: [
    { titulo: 'Modelo', valor: (r) => `<strong>${esc(r.modelo)}</strong><span class="sub">${esc(r.fabricanteNome)} · ${esc(r.categoriaNome)}</span>`, ordenar: (r) => normalizar(r.modelo) },
    { titulo: 'Placa', valor: (r) => placaHTML(r.placa), ordenar: (r) => r.placa },
    { titulo: 'Ano', valor: (r) => r.anoFabricacao, ordenar: (r) => r.anoFabricacao, classe: 'num' },
    { titulo: 'Quilometragem', valor: (r) => formatarKm(r.quilometragem), ordenar: (r) => r.quilometragem, classe: 'num' },
    { titulo: 'Situação', valor: (r) => statusHTML(r.status), ordenar: (r) => r.status },
  ],
  filtros: [
    { nome: 'busca', rotulo: 'Modelo ou placa', tipo: 'text', dica: 'Ex.: Onix ou ABC', col: 3 },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', col: 2, opcoes: [
      { valor: 'Disponivel', rotulo: 'Disponível' }, { valor: 'Alugado', rotulo: 'Alugado' }, { valor: 'Manutencao', rotulo: 'Manutenção' }] },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'select', col: 2 },
    { nome: 'fabricante', rotulo: 'Fabricante', tipo: 'select', col: 2 },
    { nome: 'anoMinimo', rotulo: 'Ano a partir de', tipo: 'number', col: 2 },
    { nome: 'somenteDisponiveis', rotulo: 'Só disponíveis para locação', tipo: 'check' },
  ],
  opcoesFiltros: async () => ({
    categoria: await opcoesDe(ROTAS.categorias, (c) => c.nome),
    fabricante: await opcoesDe(ROTAS.fabricantes, (f) => f.nome),
  }),
  // Com o filtro ligado, quem filtra é a rota /disponiveis do backend (categoria e fabricante vão como parâmetros)
  consultaApi: (v) => v.somenteDisponiveis
    ? { caminho: `${ROTAS.veiculos}/disponiveis`, parametros: { categoriaId: v.categoria, fabricanteId: v.fabricante } }
    : { caminho: ROTAS.veiculos, parametros: {} },
  filtrar: (lista, v) => lista.filter((r) =>
    incluiTexto([r.modelo, r.placa], v.busca)
    && (!v.status || r.status === v.status)
    && (!v.categoria || String(r.categoriaId) === v.categoria)
    && (!v.fabricante || String(r.fabricanteId) === v.fabricante)
    && (!v.anoMinimo || r.anoFabricacao >= Number(v.anoMinimo))),
  campos: async (registro) => {
    const [fabricantes, categorias] = await Promise.all([
      opcoesDe(ROTAS.fabricantes, (f) => f.nome), opcoesDe(ROTAS.categorias, (c) => c.nome)]);
    if (!fabricantes.length || !categorias.length) {
      throw new Error('Cadastre ao menos um fabricante e uma categoria antes de cadastrar veículos.');
    }
    const editando = !!registro;
    const campos = [
      { nome: 'modelo', rotulo: 'Modelo', obrigatorio: true, col: 8, attrs: { minlength: 2, maxlength: 100 }, erro: 'Informe de 2 a 100 caracteres.' },
      { nome: 'anoFabricacao', rotulo: 'Ano de fabricação', tipo: 'number', converter: 'inteiro', obrigatorio: true, col: 4, attrs: { min: 1950, max: 2100 }, erro: 'Informe um ano entre 1950 e 2100.' },
      { nome: 'placa', rotulo: 'Placa', obrigatorio: true, converter: 'maiuscula', col: editando ? 4 : 6, dica: 'AAA1234 ou AAA1A23', attrs: { pattern: '[A-Za-z]{3}[0-9][A-Za-z0-9][0-9]{2}', maxlength: 7 }, erro: 'Use o formato AAA1234 ou AAA1A23.' },
      { nome: 'quilometragem', rotulo: 'Quilometragem', tipo: 'number', converter: 'inteiro', obrigatorio: true, col: editando ? 4 : 6, attrs: { min: 0 }, erro: 'A quilometragem não pode ser negativa.' },
    ];
    if (editando) {
      campos.push({ nome: 'status', rotulo: 'Situação', tipo: 'select', obrigatorio: true, col: 4,
        opcoes: [{ valor: 'Disponivel', rotulo: 'Disponível' }, { valor: 'Alugado', rotulo: 'Alugado' }, { valor: 'Manutencao', rotulo: 'Manutenção' }] });
    }
    campos.push(
      { nome: 'fabricanteId', rotulo: 'Fabricante', tipo: 'select', converter: 'inteiro', obrigatorio: true, col: 6, opcoes: fabricantes, erro: 'Escolha o fabricante.' },
      { nome: 'categoriaId', rotulo: 'Categoria', tipo: 'select', converter: 'inteiro', obrigatorio: true, col: 6, opcoes: categorias, erro: 'Escolha a categoria.' });
    return campos;
  },
  valoresIniciais: () => ({ quilometragem: 0 }),
  descreverRegistro: (r) => `o veículo ${r.modelo} (placa ${r.placa})`,
});

// ---------- Aluguéis ----------
function situacaoAluguelHTML(r) {
  if (r.dataDevolucao) return `<span class="selo selo-ok">Devolvido em ${formatarData(r.dataDevolucao)}</span>`;
  const atrasado = dataISO(r.dataPrevistaDevolucao) < hojeISO();
  return atrasado ? '<span class="selo selo-atraso">Em aberto · atrasado</span>' : '<span class="selo selo-uso">Em aberto</span>';
}

const Alugueis = crudPadrao({
  chave: 'alugueis', rota: ROTAS.alugueis, titulo: 'Aluguéis', singular: 'aluguel',
  descricao: 'Retiradas e devoluções. A devolução calcula o valor total e libera o veículo.',
  colunas: [
    { titulo: 'Cliente', valor: (r) => esc(r.clienteNome), ordenar: (r) => normalizar(r.clienteNome) },
    { titulo: 'Veículo', valor: (r) => `${esc(r.veiculoModelo)}<span class="sub">${placaHTML(r.veiculoPlaca)}</span>`, ordenar: (r) => normalizar(r.veiculoModelo) },
    { titulo: 'Retirada', valor: (r) => formatarData(r.dataRetirada), ordenar: (r) => dataISO(r.dataRetirada), classe: 'num' },
    { titulo: 'Devolução prevista', valor: (r) => formatarData(r.dataPrevistaDevolucao), ordenar: (r) => dataISO(r.dataPrevistaDevolucao), classe: 'num' },
    { titulo: 'Situação', valor: situacaoAluguelHTML, ordenar: (r) => (r.dataDevolucao ? 1 : 0) },
    { titulo: 'Diária', valor: (r) => formatarMoeda(r.valorDiaria), ordenar: (r) => r.valorDiaria, classe: 'num' },
    { titulo: 'Total', valor: (r) => formatarMoeda(r.valorTotal), ordenar: (r) => r.valorTotal ?? -1, classe: 'num' },
  ],
  filtros: [
    { nome: 'busca', rotulo: 'Cliente, modelo ou placa', tipo: 'text', col: 3 },
    { nome: 'cliente', rotulo: 'Cliente', tipo: 'select', col: 2 },
    { nome: 'situacao', rotulo: 'Situação', tipo: 'select', col: 2, todos: 'Todas', opcoes: [
      { valor: 'aberto', rotulo: 'Em aberto' }, { valor: 'devolvido', rotulo: 'Devolvidos' }] },
    { nome: 'de', rotulo: 'Retirada de', tipo: 'date', col: 2 },
    { nome: 'ate', rotulo: 'Retirada até', tipo: 'date', col: 2 },
  ],
  opcoesFiltros: async () => ({ cliente: await opcoesDe(ROTAS.clientes, (c) => c.nome) }),
  // "Em aberto" usa a rota /em-aberto do backend (com o cliente como parâmetro, se escolhido)
  consultaApi: (v) => v.situacao === 'aberto'
    ? { caminho: `${ROTAS.alugueis}/em-aberto`, parametros: { clienteId: v.cliente } }
    : { caminho: ROTAS.alugueis, parametros: {} },
  filtrar: (lista, v) => lista.filter((r) =>
    incluiTexto([r.clienteNome, r.veiculoModelo, r.veiculoPlaca], v.busca)
    && (!v.cliente || String(r.clienteId) === v.cliente)
    && (v.situacao !== 'devolvido' || r.dataDevolucao)
    && (!v.de || dataISO(r.dataRetirada) >= v.de)
    && (!v.ate || dataISO(r.dataRetirada) <= v.ate)),
  acoes: (r) => (r.dataDevolucao
    ? [BOTAO_EXCLUIR]
    : [{ id: 'devolver', rotulo: 'Registrar devolução', classe: 'btn-marca' }, BOTAO_EXCLUIR]),
  // O backend não tem PUT para aluguéis: o fluxo é criar, devolver e excluir
  campos: async () => {
    const [clientes, veiculos, categorias] = await Promise.all([
      opcoesDe(ROTAS.clientes, (c) => c.nome),
      Api.listar(`${ROTAS.veiculos}/disponiveis`),
      Api.listar(ROTAS.categorias)]);
    if (!clientes.length) throw new Error('Cadastre um cliente antes de registrar um aluguel.');
    if (!veiculos.length) throw new Error('Nenhum veículo está disponível para locação no momento.');
    Alugueis._veiculos = new Map(veiculos.map((v) => [String(v.id), v]));
    Alugueis._categorias = new Map(categorias.map((c) => [c.id, c.valorDiariaBase]));
    return [
      { nome: 'clienteId', rotulo: 'Cliente', tipo: 'select', converter: 'inteiro', obrigatorio: true, opcoes: clientes, erro: 'Escolha o cliente.' },
      { nome: 'veiculoId', rotulo: 'Veículo disponível', tipo: 'select', converter: 'inteiro', obrigatorio: true,
        opcoes: veiculos.map((v) => ({ valor: v.id, rotulo: `${v.modelo} — ${v.placa}` })), erro: 'Escolha o veículo.' },
      { nome: 'dataRetirada', rotulo: 'Data de retirada', tipo: 'date', obrigatorio: true, col: 6 },
      { nome: 'dataPrevistaDevolucao', rotulo: 'Devolução prevista', tipo: 'date', obrigatorio: true, col: 6 },
      { nome: 'kmInicial', rotulo: 'Quilometragem inicial', tipo: 'number', converter: 'inteiro', obrigatorio: true, col: 6, attrs: { min: 0 }, dica: 'Preenchida com a quilometragem atual do veículo.' },
      { nome: 'valorDiaria', rotulo: 'Valor da diária (R$)', tipo: 'number', converter: 'decimal', obrigatorio: true, col: 6, attrs: { min: 0.01, step: 0.01 }, dica: 'Sugerida pela categoria do veículo.', erro: 'Informe um valor maior que zero.' },
    ];
  },
  valoresIniciais: () => ({ dataRetirada: hojeISO() }),
  executarAcao: null, // definido abaixo
  descreverRegistro: (r) => `o aluguel de ${r.veiculoModelo} (${r.veiculoPlaca}) para ${r.clienteNome}`,
  acaoExtra: async (acao, r, recarregar) => {
    if (acao !== 'devolver') return;
    abrirFormulario({
      titulo: 'Registrar devolução',
      textoBotao: 'Registrar devolução',
      campos: [
        { nome: 'dataDevolucao', rotulo: 'Data de devolução', tipo: 'date', obrigatorio: true, col: 6, attrs: { min: dataISO(r.dataRetirada) }, erro: 'A devolução não pode ser antes da retirada.' },
        { nome: 'kmFinal', rotulo: 'Quilometragem final', tipo: 'number', converter: 'inteiro', obrigatorio: true, col: 6, attrs: { min: r.kmInicial }, dica: `Inicial: ${numero.format(r.kmInicial)} km`, erro: 'Não pode ser menor que a inicial.' },
      ],
      valores: { dataDevolucao: hojeISO() < dataISO(r.dataRetirada) ? dataISO(r.dataRetirada) : hojeISO(), kmFinal: r.kmInicial },
      enviar: async (dados) => {
        const resultado = await Api.devolver(r.id, dados);
        return `Devolução registrada. Valor total: ${formatarMoeda(resultado.valorTotal)}.`;
      },
      aoConcluir: recarregar,
    });
  },
});

// O formulário de novo aluguel preenche km e diária quando o veículo é escolhido
// e confere a ordem das datas antes de enviar
const executarPadrao = Alugueis.executarAcao;
Alugueis.executarAcao = async (acao, registro, recarregar) => {
  if (acao !== 'novo') return executarPadrao(acao, registro, recarregar);
  try {
    abrirFormulario({
      titulo: 'Novo aluguel',
      campos: await Alugueis.campos(null),
      valores: Alugueis.valoresIniciais(),
      aoMontar: (form) => {
        const verificarDatas = () => {
          const r = form.elements.dataRetirada.value, p = form.elements.dataPrevistaDevolucao.value;
          form.elements.dataPrevistaDevolucao.setCustomValidity(r && p && p <= r ? 'A devolução prevista deve ser depois da retirada.' : '');
        };
        form.elements.veiculoId.addEventListener('change', () => {
          const v = Alugueis._veiculos.get(form.elements.veiculoId.value);
          if (!v) return;
          form.elements.kmInicial.value = v.quilometragem;
          const base = Alugueis._categorias.get(v.categoriaId);
          if (base != null) form.elements.valorDiaria.value = base;
        });
        form.elements.dataRetirada.addEventListener('change', verificarDatas);
        form.elements.dataPrevistaDevolucao.addEventListener('change', verificarDatas);
      },
      enviar: async (dados) => { await Api.criar(ROTAS.alugueis, dados); return 'Aluguel registrado. O veículo agora está alugado.'; },
      aoConcluir: recarregar,
    });
  } catch (erro) {
    mostrarAviso(erro.message, 'erro');
  }
};

const ENTIDADES = { veiculos: Veiculos, clientes: Clientes, alugueis: Alugueis, fabricantes: Fabricantes, categorias: Categorias };
