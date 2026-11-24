import { api } from '../api.js';
import { esc, brl, initials, bindMask, maskPhone } from '../utils.js';
import { modal, confirmModal, toast, emptyState } from '../ui.js';

let S = { vendedores: [], ordens: [] };
let rootEl = null;

const vazioParaNull = (s) => (String(s ?? '').trim() === '' ? null : String(s).trim());
const minhas = (v) => S.ordens.filter((o) => o.tecnico && o.tecnico.id === v.id);

function pintar() {
  const el = document.getElementById('equipe');
  if (!S.vendedores.length) {
    el.innerHTML = emptyState({
      title: 'Nenhum vendedor cadastrado',
      text: 'Cadastre a equipe de vendas para poder atribuir negociações.',
      buttons: '<button class="btn primary" data-action="novo">+ Novo vendedor</button>',
    });
    return;
  }
  el.innerHTML = `<div class="team">${S.vendedores.map((v) => {
    const m = minhas(v);
    const emAndamento = m.filter((o) => o.status === 'EM_ANDAMENTO').length;
    const fechadas = m.filter((o) => o.status === 'CONCLUIDA');
    const total = fechadas.reduce((t, o) => t + (Number(o.valor) || 0), 0);
    return `<article class="seller">
      <div class="seller-head">
        <span class="avatar lg">${esc(initials(v.nome))}</span>
        <div><h3>${esc(v.nome)}</h3><small>${v.especialidade ? esc(v.especialidade) : 'Sem especialidade'}</small>
          <small>${v.telefone ? esc(v.telefone) : 'sem telefone'}</small></div>
      </div>
      <div class="stats">
        <div><b>${emAndamento}</b><span>Em negociação</span></div>
        <div><b>${fechadas.length}</b><span>Fechadas</span></div>
        <div><b style="font-size:14px;line-height:27px">${brl(total)}</b><span>Vendido</span></div>
      </div>
      <div class="seller-actions">
        <button class="btn sm" data-action="editar" data-id="${v.id}">Editar</button>
        <button class="btn sm" data-action="excluir" data-id="${v.id}">Excluir</button>
      </div></article>`;
  }).join('')}</div>`;
}

async function recarregar() {
  [S.vendedores, S.ordens] = await Promise.all([api.vendedores.listar(), api.negociacoes.listar()]);
  pintar();
}

function formulario(v = {}) {
  return `
    <div class="field"><label for="v-nome">Nome completo</label>
      <input id="v-nome" name="nome" class="input" maxlength="100" value="${esc(v.nome || '')}" autocomplete="off" required></div>
    <div class="grid2">
      <div class="field"><label for="v-esp">Especialidade <span class="opt">(opcional)</span></label>
        <input id="v-esp" name="especialidade" class="input" maxlength="60" placeholder="Ex.: Apple, Android" value="${esc(v.especialidade || '')}" autocomplete="off"></div>
      <div class="field"><label for="v-tel">Telefone <span class="opt">(opcional)</span></label>
        <input id="v-tel" name="telefone" class="input" inputmode="tel" maxlength="15" placeholder="(45) 99999-0000" value="${esc(v.telefone || '')}" autocomplete="off"></div>
    </div>`;
}

const dados = (v) => ({ nome: v.nome.trim(), especialidade: vazioParaNull(v.especialidade), telefone: vazioParaNull(v.telefone) });

function abrirNovo() {
  modal({
    title: 'Novo vendedor', subtitle: 'Quem conduz as negociações da loja.', submitLabel: 'Cadastrar vendedor',
    content: formulario(),
    onOpen: (f) => bindMask(f.elements.telefone, maskPhone),
    onSubmit: async (v) => {
      if (!v.nome.trim()) throw new Error('Informe o nome do vendedor.');
      await api.vendedores.criar(dados(v));
      toast('Vendedor cadastrado.');
      await recarregar();
    },
  });
}

function abrirEditar(vend) {
  modal({
    title: 'Editar vendedor', submitLabel: 'Salvar alterações',
    content: formulario(vend),
    onOpen: (f) => bindMask(f.elements.telefone, maskPhone),
    onSubmit: async (v) => {
      if (!v.nome.trim()) throw new Error('Informe o nome do vendedor.');
      await api.vendedores.atualizar(vend.id, dados(v));
      toast('Vendedor atualizado.');
      await recarregar();
    },
  });
}

function pedirExclusao(v) {
  const n = minhas(v).length;
  if (n) {
    toast(`${v.nome} tem ${n} ${n === 1 ? 'negociação vinculada' : 'negociações vinculadas'} e não pode ser excluído.`, 'warn');
    return;
  }
  confirmModal({
    title: 'Excluir vendedor?', message: `${esc(v.nome)} será removido da equipe. Essa ação não pode ser desfeita.`,
    confirmLabel: 'Excluir', danger: true,
    action: async () => { await api.vendedores.excluir(v.id); toast('Vendedor excluído.'); await recarregar(); },
  });
}

export const vendedores = {
  title: 'Vendedores',
  sub: 'A equipe responsável por conduzir cada negociação até o fechamento.',
  actions: '<button class="btn primary" data-action="novo">+ Novo vendedor</button>',

  async render(root, ctx) {
    rootEl = root;
    const [lista, ordens] = await Promise.all([api.vendedores.listar(), api.negociacoes.listar()]);
    if (ctx.isStale()) return;
    S = { vendedores: lista, ordens };
    root.innerHTML = '<div id="equipe"></div>';
    pintar();
  },

  onAction(action, el) {
    const v = S.vendedores.find((x) => String(x.id) === el.dataset.id);
    if (action === 'novo') abrirNovo();
    else if (action === 'editar' && v) abrirEditar(v);
    else if (action === 'excluir' && v) pedirExclusao(v);
  },
};
