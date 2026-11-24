// Cliente da API REST (Spring Boot). Uma função por endpoint do back-end.

const BASE = (window.APP_CONFIG && window.APP_CONFIG.apiBase) || '';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function mensagemPadrao(status) {
  if (status === 404) return 'Registro não encontrado. Atualize a página e tente de novo.';
  if (status === 400) return 'Não foi possível concluir: dados inválidos ou ação não permitida.';
  if (status >= 500) return 'Erro interno no servidor. Veja o terminal da aplicação para mais detalhes.';
  return `Erro inesperado (HTTP ${status}).`;
}

// `fallback` troca a mensagem padrão por uma mais clara quando o servidor não devolve texto.
// (O back-end devolve { message } padronizado pelo ApiExceptionHandler.)
async function request(method, path, { body, fallback = {} } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Sem conexão com a API em ${BASE || location.origin}. Confira se a aplicação está rodando.`);
  }
  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* corpo não é JSON */ }

  if (!res.ok) {
    const msg = data && typeof data.message === 'string' && data.message.trim() && !/^Validation failed/i.test(data.message)
      ? data.message
      : (fallback[res.status] || mensagemPadrao(res.status));
    throw new ApiError(res.status, msg);
  }
  return data;
}

const q = encodeURIComponent;

export const api = {
  clientes: {
    listar: () => request('GET', '/clientes'),
    criar: (dto) => request('POST', '/clientes', {
      body: dto, fallback: { 400: 'Já existe um cliente com este CPF ou os dados estão inválidos.' },
    }),
    atualizar: (id, dto) => request('PUT', `/clientes/${id}`, { body: dto }),
    excluir: (id) => request('DELETE', `/clientes/${id}`, {
      fallback: { 400: 'Este cliente possui negociações e não pode ser excluído.' },
    }),
  },
  vendedores: {
    listar: () => request('GET', '/tecnicos'),
    criar: (dto) => request('POST', '/tecnicos', { body: dto }),
    atualizar: (id, dto) => request('PUT', `/tecnicos/${id}`, { body: dto }),
    excluir: (id) => request('DELETE', `/tecnicos/${id}`, {
      fallback: { 400: 'Este vendedor possui negociações vinculadas e não pode ser excluído.' },
    }),
  },
  // Chamadas à API REST (GET, POST, PUT, DELETE)
  veiculos: {
    listar: () => request('GET', '/veiculos'),
    criar: (dto) => request('POST', '/veiculos', {
      body: dto, fallback: { 400: 'Dados do aparelho inválidos ou sem unidade disponível.' },
    }),
    atualizar: (id, dto) => request('PUT', `/veiculos/${id}`, {
      body: dto, fallback: { 400: 'Dados do aparelho inválidos ou sem unidade disponível.' },
    }),
    excluir: (id) => request('DELETE', `/veiculos/${id}`, {
      fallback: { 400: 'Este aparelho possui negociações e não pode ser excluído.' },
    }),
  },
  negociacoes: {
    listar: () => request('GET', '/ordens'),
    editar: (id, dto) => request('PUT', `/ordens/${id}`, {
      body: dto, fallback: { 400: 'Não foi possível salvar: negociação finalizada ou aparelho já em outra negociação.' },
    }),
    excluir: (id) => request('DELETE', `/ordens/${id}`, {
      fallback: { 400: 'Uma negociação fechada não pode ser excluída.' },
    }),
    abrir: (dto) => request('POST', '/ordens', {
      body: dto, fallback: { 400: 'Este aparelho já está em outra negociação ativa.', 404: 'Cliente ou aparelho não encontrado. Atualize a página.' },
    }),
    atribuirVendedor: (id, vendedorId) => request('PUT', `/ordens/${id}/tecnico/${vendedorId}`, {
      fallback: { 400: 'Esta negociação já foi finalizada e não pode mais ser alterada.' },
    }),
    fechar: (id, valor) => request('PUT', `/ordens/${id}/concluir?valor=${q(Number(valor).toFixed(2))}`, {
      fallback: { 400: 'Para fechar, a negociação precisa ter vendedor e um valor maior que zero.' },
    }),
    cancelar: (id) => request('PUT', `/ordens/${id}/cancelar`, {
      fallback: { 400: 'Esta negociação já foi finalizada e não pode mais ser alterada.' },
    }),
  },
};
