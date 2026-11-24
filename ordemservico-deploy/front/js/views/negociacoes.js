import { api } from '../api.js';
import {
  esc, brl, ago, fmtDate, initials, debounce, bindMoney, moneyValue,
  STATUS, STATUS_ORDER, INTERESSE, TIPOS,
  dadosNegocio, nomeVeiculo, unidades, veiculoTitulo, veiculoMeta,
} from '../utils.js';
import { modal, confirmModal, toast, emptyState, loadingCards } from '../ui.js';

const filtros = { q: '', status: 'TODAS', interesse: 'TODOS', tipo: 'TODOS' };
let S = { ordens: [], clientes: [], vendedores: [], veiculos: [] };
let rootEl = null;

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function passa(o, d, ignorarStatus = false) {
  if (!ignorarStatus && filtros.status !== 'TODAS' && o.status !== filtros.status) return false;
  if (filtros.interesse !== 'TODOS' && o.prioridade !== filtros.interesse) return false;
  if (filtros.tipo !== 'TODOS' && d.tipo !== filtros.tipo) return false;
  if (filtros.q) {
    const texto = norm(`${d.raw} ${o.cliente?.nome || ''} ${o.tecnico?.nome || ''}`);
    if (!texto.includes(norm(filtros.q))) return false;
  }
  return true;
}

const ativa = (o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO';

function cartao(o, d) {
  const st = STATUS[o.status] || STATUS.ABERTA;
  const meta = veiculoMeta(d);
  const tecnico = o.tecnico
    ? `<span class="avatar sm">${esc(initials(o.tecnico.nome))}</span><div><small>Vendedor</small><strong>${esc(o.tecnico.nome)}</strong></div>`
    : `<span class="avatar sm" aria-hidden="true">?</span><div><small>Vendedor</small><strong class="none">Sem vendedor</strong></div>`;

  let rodape;
  if (o.status === 'CONCLUIDA') {
    rodape = `<div class="deal-price"><small>${d.tipo === 'REVENDA' ? 'Comprado por' : 'Vendido por'}</small>${brl(o.valor)}</div>
              <div class="deal-info"><span>Fechada em ${fmtDate(o.dataFechamento)}</span></div>`;
  } else if (o.status === 'CANCELADA') {
    rodape = `<div class="deal-info"><span>Cancelada em ${fmtDate(o.dataFechamento)}</span></div>`;
  } else {
    rodape = `<div class="deal-info"><span>Aberta ${ago(o.dataAbertura)}</span>
              ${o.prioridade ? `<span class="${o.prioridade === 'ALTA' ? 'hot' : ''}">${INTERESSE[o.prioridade]}</span>` : ''}</div>`;
  }

  let acoes = '';
  if (o.status === 'ABERTA') {
    acoes = `<button class="btn primary sm" data-action="atribuir" data-id="${o.id}">Atribuir vendedor</button>
             <button class="btn sm" data-action="editar" data-id="${o.id}">Editar</button>
             <button class="btn sm" data-action="cancelar" data-id="${o.id}">Cancelar</button>`;
  } else if (o.status === 'EM_ANDAMENTO') {
    acoes = `<button class="btn primary sm" data-action="fechar" data-id="${o.id}">Fechar negócio</button>
             <button class="btn sm" data-action="atribuir" data-id="${o.id}">Trocar vendedor</button>
             <button class="btn sm" data-action="editar" data-id="${o.id}">Editar</button>
             <button class="btn sm" data-action="cancelar" data-id="${o.id}">Cancelar</button>`;
  } else if (o.status === 'CANCELADA') {
    acoes = `<button class="btn sm" data-action="excluir" data-id="${o.id}">Excluir registro</button>`;
  }

  return `<article class="deal" aria-label="${esc(veiculoTitulo(d))}">
    <div class="deal-top"><span class="chip ${d.tipo.toLowerCase()}">${TIPOS[d.tipo].label}</span><span class="badge ${st.cls}">${st.label}</span></div>
    <h3 class="deal-title">${esc(veiculoTitulo(d))}</h3>
    <p class="deal-meta">${esc(meta) || '&nbsp;'}</p>
    <div class="deal-people">
      <div class="person"><span class="avatar sm">${esc(initials(o.cliente?.nome))}</span><div><small>Cliente</small><strong>${esc(o.cliente?.nome || '-')}</strong></div></div>
      <div class="person">${tecnico}</div>
    </div>
    ${d.obs ? `<p class="deal-info" style="display:block">${esc(d.obs)}</p>` : ''}
    ${rodape}
    ${acoes ? `<div class="deal-actions">${acoes}</div>` : ''}
  </article>`;
}

function pintar() {
  const itens = S.ordens.map((o) => ({ o, d: dadosNegocio(o) }));

  // Abas com contagem (respeitam os outros filtros, menos o de status)
  const base = itens.filter(({ o, d }) => passa(o, d, true));
  const contagem = (s) => (s === 'TODAS' ? base.length : base.filter(({ o }) => o.status === s).length);
  document.getElementById('tabs').innerHTML = ['TODAS', ...STATUS_ORDER].map((s) =>
    `<button type="button" class="tab ${filtros.status === s ? 'active' : ''}" data-action="tab" data-status="${s}" aria-pressed="${filtros.status === s}">
       ${s === 'TODAS' ? 'Todas' : STATUS[s].label}<em>${contagem(s)}</em></button>`).join('');

  const lista = document.getElementById('lista');
  if (!S.ordens.length) {
    lista.innerHTML = emptyState({
      title: 'Nenhuma negociação ainda',
      text: 'Abra a primeira negociação escolhendo um cliente e o aparelho.',
      buttons: '<button class="btn primary" data-action="nova">+ Nova negociação</button>',
    });
    return;
  }
  const visiveis = itens.filter(({ o, d }) => passa(o, d))
    .sort((a, b) => Number(ativa(b.o)) - Number(ativa(a.o)) || b.o.id - a.o.id);
  if (!visiveis.length) {
    lista.innerHTML = emptyState({
      title: 'Nenhuma negociação encontrada',
      text: 'Nenhum resultado para esses filtros. Tente ampliar a busca.',
      buttons: '<button class="btn" data-action="limpar">Limpar filtros</button>',
    });
    return;
  }
  lista.innerHTML = `<div class="deals">${visiveis.map(({ o, d }) => cartao(o, d)).join('')}</div>`;
}

async function recarregar() {
  S.ordens = await api.negociacoes.listar();
  pintar();
}

// ---------- Modais ----------
const ATIVAS = ['ABERTA', 'EM_ANDAMENTO'];
const veiculoOcupado = (veiculoId, ignorarOsId) =>
  S.ordens.some((o) => o.veiculo && o.veiculo.id === veiculoId && ATIVAS.includes(o.status) && o.id !== ignorarOsId);

function formNegociacao(o) {
  const tipoAtual = o?.tipo || 'VENDA';
  return `
    <div class="field"><label for="f-cliente">Cliente</label>
      <select id="f-cliente" name="clienteId" class="input" required>
        <option value="">Selecione o cliente</option>
        ${S.clientes.map((c) => `<option value="${c.id}" ${o?.cliente?.id === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
      </select></div>
    <div class="field"><span class="lbl">Tipo de negociação</span>
      <div class="seg" role="radiogroup" aria-label="Tipo de negociação">
        ${Object.entries(TIPOS).map(([k, t]) => `<label><input type="radio" name="tipo" value="${k}" ${k === tipoAtual ? 'checked' : ''}><span>${t.label}<small>${t.help}</small></span></label>`).join('')}
      </div></div>
    <div class="field"><label for="f-veiculo">Aparelho do estoque</label>
      <select id="f-veiculo" name="veiculoId" class="input" required>
        <option value="">Selecione o aparelho</option>
        ${S.veiculos.map((v) => {
          // Bloqueia no formulário o aparelho sem unidade livre
          const u = unidades(v, S.ordens.filter((x) => x.id !== o?.id));
          const sem = u.disponiveis <= 0;
          return `<option value="${v.id}" ${o?.veiculo?.id === v.id ? 'selected' : ''} ${sem ? 'disabled' : ''}>${esc(nomeVeiculo(v))} (${sem ? 'tudo reservado' : u.disponiveis + ' disponível(is)'})</option>`;
        }).join('')}
      </select>
      <p class="help">Não achou o aparelho? Cadastre em <a href="#/estoque">Estoque</a> antes de abrir a negociação.</p></div>
    <div class="field"><label for="f-int">Interesse do cliente</label>
      <select id="f-int" name="prioridade" class="input">
        ${['ALTA', 'MEDIA', 'BAIXA'].map((k) => `<option value="${k}" ${k === (o?.prioridade || 'MEDIA') ? 'selected' : ''}>${INTERESSE[k]}</option>`).join('')}
      </select></div>
    <div class="field"><label for="f-obs">Observações <span class="opt">(opcional)</span></label>
      <textarea id="f-obs" name="obs" class="input" rows="2" maxlength="200" placeholder="Ex.: aceita troca, prefere financiamento">${o ? esc(dadosNegocio(o).obs) : ''}</textarea></div>`;
}

function dtoNegociacao(v) {
  if (!v.clienteId) throw new Error('Selecione o cliente.');
  if (!v.veiculoId) throw new Error('Selecione o aparelho do estoque.');
  const veic = S.veiculos.find((x) => String(x.id) === v.veiculoId);
  const padrao = `${v.tipo === 'REVENDA' ? 'Compra' : 'Venda'} de ${veic ? nomeVeiculo(veic) : 'aparelho'}`;
  return {
    descricao: v.obs.trim() || padrao,
    prioridade: v.prioridade, tipo: v.tipo,
    clienteId: Number(v.clienteId), veiculoId: Number(v.veiculoId),
  };
}

function abrirNova() {
  if (!S.clientes.length) {
    toast('Cadastre um cliente antes de abrir uma negociação.', 'warn');
    location.hash = '#/clientes';
    return;
  }
  if (!S.veiculos.length) {
    toast('Cadastre um aparelho no estoque antes de abrir uma negociação.', 'warn');
    location.hash = '#/estoque';
    return;
  }
  modal({
    title: 'Nova negociação',
    subtitle: 'Escolha o cliente e o aparelho. Depois é só atribuir um vendedor.',
    submitLabel: 'Abrir negociação',
    content: formNegociacao(null),
    onSubmit: async (v) => {
      await api.negociacoes.abrir(dtoNegociacao(v));
      toast('Negociação aberta.');
      await recarregar();
    },
  });
}

function abrirEditar(o) {
  modal({
    title: 'Editar negociação',
    subtitle: 'Altere o cliente, o aparelho, o tipo, o interesse ou as observações.',
    submitLabel: 'Salvar alterações',
    content: formNegociacao(o),
    onSubmit: async (v) => {
      await api.negociacoes.editar(o.id, dtoNegociacao(v));
      toast('Negociação atualizada.');
      await recarregar();
    },
  });
}

function abrirExcluir(o) {
  const d = dadosNegocio(o);
  confirmModal({
    title: 'Excluir registro?',
    message: `${esc(veiculoTitulo(d))} · ${esc(o.cliente?.nome || '')}. A negociação cancelada será removida de vez.`,
    confirmLabel: 'Excluir', danger: true,
    action: async () => { await api.negociacoes.excluir(o.id); toast('Registro excluído.'); await recarregar(); },
  });
}

function abrirAtribuir(o) {
  if (!S.vendedores.length) {
    toast('Cadastre um vendedor antes de atribuir.', 'warn');
    location.hash = '#/vendedores';
    return;
  }
  const d = dadosNegocio(o);
  modal({
    title: o.tecnico ? 'Trocar vendedor' : 'Atribuir vendedor',
    subtitle: `${esc(veiculoTitulo(d))} · ${esc(o.cliente?.nome || '')}`,
    submitLabel: 'Confirmar',
    content: `<div class="field"><label for="f-vend">Vendedor responsável</label>
      <select id="f-vend" name="vendedorId" class="input" required>
        <option value="">Selecione o vendedor</option>
        ${S.vendedores.map((v) => `<option value="${v.id}" ${o.tecnico?.id === v.id ? 'selected' : ''}>${esc(v.nome)}${v.especialidade ? ' (' + esc(v.especialidade) + ')' : ''}</option>`).join('')}
      </select>
      <p class="help">Ao atribuir, a negociação passa para "Em negociação".</p></div>`,
    onSubmit: async (v) => {
      if (!v.vendedorId) throw new Error('Selecione o vendedor.');
      await api.negociacoes.atribuirVendedor(o.id, Number(v.vendedorId));
      toast('Vendedor atribuído. Negociação em andamento.');
      await recarregar();
    },
  });
}

function abrirFechar(o) {
  const d = dadosNegocio(o);
  modal({
    title: 'Fechar negócio',
    submitLabel: 'Confirmar fechamento',
    content: `<div class="summary-box"><strong>${esc(veiculoTitulo(d))}</strong>
        <small>${TIPOS[d.tipo].label} · ${esc(o.cliente?.nome || '')} · vendedor ${esc(o.tecnico?.nome || '-')}</small></div>
      <div class="field"><label for="f-valor">${d.tipo === 'REVENDA' ? 'Valor pago pelo aparelho' : 'Valor final da venda'}</label>
        <input id="f-valor" name="valor" class="input money-input" inputmode="numeric" placeholder="R$ 0,00" autocomplete="off" required></div>`,
    onOpen: (form) => bindMoney(form.elements.valor),
    onSubmit: async (v, form) => {
      const valor = moneyValue(form.elements.valor);
      if (!(valor > 0)) throw new Error('Informe um valor maior que zero.');
      if (valor > 99999999.99) throw new Error('Valor acima do limite permitido.');
      await api.negociacoes.fechar(o.id, valor);
      toast(`Negócio fechado por ${brl(valor)}.`);
      await recarregar();
    },
  });
}

function abrirCancelar(o) {
  const d = dadosNegocio(o);
  confirmModal({
    title: 'Cancelar negociação?',
    message: `${esc(veiculoTitulo(d))} · ${esc(o.cliente?.nome || '')}. Depois de cancelada, a negociação não pode mais ser alterada.`,
    confirmLabel: 'Cancelar negociação', danger: true,
    action: async () => { await api.negociacoes.cancelar(o.id); toast('Negociação cancelada.'); await recarregar(); },
  });
}

// ---------- Tela ----------
export const negociacoes = {
  title: 'Negociações',
  sub: 'Acompanhe cada proposta de venda e de compra, do primeiro contato ao fechamento.',
  actions: '<button class="btn primary" data-action="nova">+ Nova negociação</button>',

  async render(root, ctx) {
    rootEl = root;
    root.innerHTML = loadingCards();
    const [ordens, clientes, vendedores, veiculos] = await Promise.all([
      api.negociacoes.listar(), api.clientes.listar(), api.vendedores.listar(), api.veiculos.listar(),
    ]);
    if (ctx.isStale()) return;
    S = { ordens, clientes, vendedores, veiculos };

    // Filtros que podem vir do link (ex.: vindo do alerta do painel)
    const st = ctx.params.get('status'), it = ctx.params.get('interesse');
    if (st || it) {
      filtros.q = ''; filtros.tipo = 'TODOS';
      filtros.status = STATUS[st] ? st : 'TODAS';
      filtros.interesse = INTERESSE[it] ? it : 'TODOS';
    }

    root.innerHTML = `
      <div class="toolbar">
        <div class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/></svg>
          <input id="busca" type="search" placeholder="Buscar por aparelho, cliente ou vendedor" aria-label="Buscar negociações" value="${esc(filtros.q)}">
        </div>
        <select id="fTipo" class="input" aria-label="Filtrar por tipo">
          <option value="TODOS">Venda e compra</option>
          ${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${filtros.tipo === k ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
        <select id="fInteresse" class="input" aria-label="Filtrar por interesse">
          <option value="TODOS">Qualquer interesse</option>
          ${['ALTA', 'MEDIA', 'BAIXA'].map((k) => `<option value="${k}" ${filtros.interesse === k ? 'selected' : ''}>${INTERESSE[k]}</option>`).join('')}
        </select>
      </div>
      <div class="tabs" id="tabs" role="group" aria-label="Filtrar por status"></div>
      <div id="lista"></div>`;

    document.getElementById('busca').addEventListener('input', debounce((e) => { filtros.q = e.target.value; pintar(); }, 120));
    document.getElementById('fTipo').addEventListener('change', (e) => { filtros.tipo = e.target.value; pintar(); });
    document.getElementById('fInteresse').addEventListener('change', (e) => { filtros.interesse = e.target.value; pintar(); });
    pintar();

    if (ctx.params.get('nova')) {
      history.replaceState(null, '', '#/negociacoes');
      abrirNova();
    }
  },

  onAction(action, el) {
    const o = S.ordens.find((x) => String(x.id) === el.dataset.id);
    switch (action) {
      case 'nova': abrirNova(); break;
      case 'tab': filtros.status = el.dataset.status; pintar(); break;
      case 'limpar':
        Object.assign(filtros, { q: '', status: 'TODAS', interesse: 'TODOS', tipo: 'TODOS' });
        this.render(rootEl, { params: new URLSearchParams(), isStale: () => false });
        break;
      case 'atribuir': if (o) abrirAtribuir(o); break;
      case 'fechar': if (o) abrirFechar(o); break;
      case 'cancelar': if (o) abrirCancelar(o); break;
      case 'editar': if (o) abrirEditar(o); break;
      case 'excluir': if (o) abrirExcluir(o); break;
    }
  },
};
