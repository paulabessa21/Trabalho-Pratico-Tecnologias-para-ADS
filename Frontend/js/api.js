// ---------- Comunicação com a API (somente fetch) ----------

class ErroApi extends Error {
  constructor(mensagem, status, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes || [];
  }
}

// Traduz as respostas de erro da API da Locadora em uma mensagem legível.
//  - 400/404/409 do controller:  { message: "..." }
//  - 400 de validação (DataAnnotations): { title, errors: { Campo: ["..."] } }
//  - 500 do middleware: { title, detail }
function extrairErro(corpo, status) {
  if (corpo && corpo.message) return new ErroApi(corpo.message, status);
  if (corpo && corpo.errors) {
    const detalhes = Object.values(corpo.errors).flat();
    return new ErroApi(detalhes[0] || 'Dados inválidos.', status, detalhes);
  }
  if (corpo && corpo.title) return new ErroApi(corpo.title, status);
  return new ErroApi(`A API respondeu com erro ${status}.`, status);
}

async function requisitar(caminho, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(API_URL + caminho, {
      method: opcoes.metodo || 'GET',
      headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch (e) {
    throw new ErroApi(`Não foi possível conectar à API em ${API_URL}. Confira se ela está rodando (dotnet run).`, 0);
  }

  if (resposta.status === 204) return null; // PUT e DELETE respondem sem corpo

  let corpo = null;
  try { corpo = await resposta.json(); } catch (e) { /* resposta sem JSON */ }

  if (!resposta.ok) throw extrairErro(corpo, resposta.status);
  return corpo;
}

function consulta(caminho, parametros = {}) {
  const q = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => { if (v !== '' && v != null) q.set(k, v); });
  const texto = q.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

const Api = {
  listar: (rota, parametros) => requisitar(consulta(rota, parametros)),
  buscar: (rota, id) => requisitar(`${rota}/${encodeURIComponent(id)}`),
  criar: (rota, dados) => requisitar(rota, { metodo: 'POST', corpo: dados }),
  atualizar: (rota, id, dados) => requisitar(`${rota}/${encodeURIComponent(id)}`, { metodo: 'PUT', corpo: dados }),
  excluir: (rota, id) => requisitar(`${rota}/${encodeURIComponent(id)}`, { metodo: 'DELETE' }),
  devolver: (id, dados) => requisitar(`/api/alugueis/${encodeURIComponent(id)}/devolucao`, { metodo: 'PATCH', corpo: dados }),
};
