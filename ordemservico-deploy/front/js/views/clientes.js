import { api } from '../api.js';
import { esc, initials, debounce, bindMask, maskCpf, maskPhone } from '../utils.js';
import { modal, confirmModal, toast, emptyState } from '../ui.js';

let S = { clientes: [], ordens: [] };
let busca = '';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const vazioParaNull = (s) => (String(s ?? '').trim() === '' ? null : String(s).trim());

function negociacoesDe(c) { return S.ordens.filter((o) => o.cliente && o.cliente.id === c.id); }

function pintar() {
  const el = document.getElementById('tabela');
  if (!S.clientes.length) {
    el.innerHTML = emptyState({
      title: 'Nenhum cliente cadastrado',
      text: 'Cadastre quem compra ou vende aparelhos na sua loja.',
      buttons: '<button class="btn primary" data-action="novo">+ Novo cliente</button>',
    });
    return;
  }
  const lista = S.clientes.filter((c) => norm(`${c.nome} ${c.email} ${c.telefone}`).includes(norm(busca)));
  if (!lista.length) {
    el.innerHTML = emptyState({ title: 'Nenhum cliente encontrado', text: 'Tente buscar por outro nome, telefone ou e-mail.' });
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Cliente</th><th>Contato</th><th>Negociações</th><th><span class="sr-only" style="position:absolute;left:-999px">Ações</span></th></tr></thead>
    <tbody>${lista.map((c) => {
      const n = negociacoesDe(c);
      const abertas = n.filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length;
      return `<tr>
        <td><div class="who"><span class="avatar">${esc(initials(c.nome))}</span><div><strong>${esc(c.nome)}</strong><small>Cliente #${c.id}</small></div></div></td>
        <td>${c.telefone ? esc(c.telefone) : '<span style="color:var(--muted)">-</span>'}<br><small style="color:var(--muted)">${c.email ? esc(c.email) : 'sem e-mail'}</small></td>
        <td>${n.length ? `<span class="chip soft">${n.length} ${n.length === 1 ? 'negociação' : 'negociações'}${abertas ? ` · ${abertas} ativa${abertas === 1 ? '' : 's'}` : ''}</span>` : '<span style="color:var(--muted)">Nenhuma</span>'}</td>
        <td class="actions">
          <button class="btn sm" data-action="editar" data-id="${c.id}">Editar</button>
          <button class="btn sm" data-action="excluir" data-id="${c.id}">Excluir</button>
        </td></tr>`;
    }).join('')}</tbody></table></div>`;
}

async function recarregar() {
  [S.clientes, S.ordens] = await Promise.all([api.clientes.listar(), api.negociacoes.listar()]);
  pintar();
}

function abrirNovo() {
  modal({
    title: 'Novo cliente',
    subtitle: 'Quem compra ou vende aparelhos com a loja.',
    submitLabel: 'Cadastrar cliente',
    content: `
      <div class="field"><label for="c-nome">Nome completo</label>
        <input id="c-nome" name="nome" class="input" maxlength="100" autocomplete="off" required></div>
      <div class="field"><label for="c-cpf">CPF</label>
        <input id="c-cpf" name="cpf" class="input" inputmode="numeric" placeholder="000.000.000-00" maxlength="14" autocomplete="off" required>
        <p class="help">O CPF não pode ser alterado depois do cadastro.</p></div>
      <div class="grid2">
        <div class="field"><label for="c-tel">Telefone <span class="opt">(opcional)</span></label>
          <input id="c-tel" name="telefone" class="input" inputmode="tel" placeholder="(45) 99999-0000" maxlength="15" autocomplete="off"></div>
        <div class="field"><label for="c-mail">E-mail <span class="opt">(opcional)</span></label>
          <input id="c-mail" name="email" class="input" type="email" maxlength="100" placeholder="nome@email.com" autocomplete="off"></div>
      </div>`,
    onOpen: (f) => { bindMask(f.elements.cpf, maskCpf); bindMask(f.elements.telefone, maskPhone); },
    onSubmit: async (v) => {
      if (!v.nome.trim()) throw new Error('Informe o nome do cliente.');
      if (v.cpf.replace(/\D/g, '').length !== 11) throw new Error('Informe um CPF com 11 dígitos.');
      if (v.email.trim() && !EMAIL.test(v.email.trim())) throw new Error('E-mail inválido.');
      await api.clientes.criar({ nome: v.nome.trim(), cpf: v.cpf, telefone: vazioParaNull(v.telefone), email: vazioParaNull(v.email) });
      toast('Cliente cadastrado.');
      await recarregar();
    },
  });
}

function abrirEditar(c) {
  modal({
    title: 'Editar cliente',
    subtitle: 'O CPF é definido no cadastro e não pode ser alterado.',
    submitLabel: 'Salvar alterações',
    content: `
      <div class="field"><label for="c-nome">Nome completo</label>
        <input id="c-nome" name="nome" class="input" maxlength="100" value="${esc(c.nome)}" required></div>
      <div class="grid2">
        <div class="field"><label for="c-tel">Telefone</label>
          <input id="c-tel" name="telefone" class="input" inputmode="tel" maxlength="15" value="${esc(c.telefone || '')}"></div>
        <div class="field"><label for="c-mail">E-mail</label>
          <input id="c-mail" name="email" class="input" type="email" maxlength="100" value="${esc(c.email || '')}"></div>
      </div>`,
    onOpen: (f) => bindMask(f.elements.telefone, maskPhone),
    onSubmit: async (v) => {
      if (!v.nome.trim()) throw new Error('Informe o nome do cliente.');
      if (v.email.trim() && !EMAIL.test(v.email.trim())) throw new Error('E-mail inválido.');
      await api.clientes.atualizar(c.id, { nome: v.nome.trim(), telefone: vazioParaNull(v.telefone), email: vazioParaNull(v.email) });
      toast('Cliente atualizado.');
      await recarregar();
    },
  });
}

function pedirExclusao(c) {
  const n = negociacoesDe(c).length;
  if (n) {
    toast(`${c.nome} tem ${n} ${n === 1 ? 'negociação' : 'negociações'} e não pode ser excluído.`, 'warn');
    return;
  }
  confirmModal({
    title: 'Excluir cliente?', message: `${esc(c.nome)} será removido. Essa ação não pode ser desfeita.`,
    confirmLabel: 'Excluir', danger: true,
    action: async () => { await api.clientes.excluir(c.id); toast('Cliente excluído.'); await recarregar(); },
  });
}

export const clientes = {
  title: 'Clientes',
  sub: 'Compradores e vendedores de aparelhos atendidos pela loja.',
  actions: '<button class="btn primary" data-action="novo">+ Novo cliente</button>',

  async render(root, ctx) {
    const [lista, ordens] = await Promise.all([api.clientes.listar(), api.negociacoes.listar()]);
    if (ctx.isStale()) return;
    S = { clientes: lista, ordens };
    root.innerHTML = `
      <div class="toolbar"><div class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/></svg>
        <input id="busca" type="search" placeholder="Buscar por nome, telefone ou e-mail" aria-label="Buscar clientes" value="${esc(busca)}"></div></div>
      <div id="tabela"></div>`;
    document.getElementById('busca').addEventListener('input', debounce((e) => { busca = e.target.value; pintar(); }, 120));
    pintar();
  },

  onAction(action, el) {
    const c = S.clientes.find((x) => String(x.id) === el.dataset.id);
    if (action === 'novo') abrirNovo();
    else if (action === 'editar' && c) abrirEditar(c);
    else if (action === 'excluir' && c) pedirExclusao(c);
  },
};
