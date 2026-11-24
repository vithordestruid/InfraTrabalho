import { api } from '../api.js';
import { esc, brl, ago, initials, STATUS, STATUS_ORDER, TIPOS, dadosNegocio, veiculoTitulo } from '../utils.js';
import { toast, emptyState, loadingKpis } from '../ui.js';
import { carregarDemo } from '../demo.js';

let rootEl = null;
let ctxRef = null;

const soma = (lista) => lista.reduce((t, o) => t + (Number(o.valor) || 0), 0);

export const painel = {
  title: 'Painel',
  sub: 'Visão geral das vendas e compras da loja.',
  actions: `<a class="btn" href="#/negociacoes">Ver negociações</a>
            <button class="btn primary" data-action="nova">+ Nova negociação</button>`,

  async render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    root.innerHTML = loadingKpis();
    const [ordens, clientes, vendedores] = await Promise.all([
      api.negociacoes.listar(), api.clientes.listar(), api.vendedores.listar(),
    ]);
    if (ctx.isStale()) return;

    if (!ordens.length && !clientes.length && !vendedores.length) {
      root.innerHTML = emptyState({
        title: 'Sua loja ainda está vazia',
        text: 'Cadastre clientes, vendedores e abra a primeira negociação. Ou carregue dados de exemplo para ver o painel funcionando.',
        buttons: `<button class="btn primary" data-action="demo">Carregar dados de exemplo</button>
                  <a class="btn" href="#/clientes">Cadastrar cliente</a>`,
      });
      return;
    }

    const por = (s) => ordens.filter((o) => o.status === s);
    const abertas = por('ABERTA'), andamento = por('EM_ANDAMENTO'), fechadas = por('CONCLUIDA'), canceladas = por('CANCELADA');
    const receita = soma(fechadas);
    const ticket = fechadas.length ? receita / fechadas.length : 0;
    const finalizadas = fechadas.length + canceladas.length;
    const taxa = finalizadas ? Math.round((fechadas.length / finalizadas) * 100) : null;
    const quentes = abertas.filter((o) => o.prioridade === 'ALTA');

    const kpi = (cls, label, value, hint, money = false) =>
      `<div class="kpi ${cls}"><div class="label">${label}</div><div class="value ${money ? 'money' : ''}">${value}</div><div class="hint">${hint}</div></div>`;

    // ---- Funil por status ----
    const total = ordens.length;
    const funil = STATUS_ORDER.map((s) => ({ s, n: por(s).length }));
    const funnelBar = funil.filter((x) => x.n)
      .map((x) => `<span style="flex:${x.n};background:${STATUS[x.s].color}" title="${STATUS[x.s].label}: ${x.n}"></span>`).join('');
    const legend = funil.map((x) =>
      `<div><i style="background:${STATUS[x.s].color}"></i>${STATUS[x.s].label}<b>${x.n}</b></div>`).join('');

    // ---- Venda x Compra ----
    const porTipo = Object.keys(TIPOS).map((t) => {
      const lista = ordens.filter((o) => dadosNegocio(o).tipo === t);
      const fech = lista.filter((o) => o.status === 'CONCLUIDA');
      return { t, n: lista.length, fech: fech.length, valor: soma(fech) };
    });
    const maxN = Math.max(1, ...porTipo.map((x) => x.n));
    const tipoRows = porTipo.map((x) => `
      <div class="bar-row">
        <div class="bar-head"><strong>${TIPOS[x.t].label}</strong><span>${x.n} ${x.n === 1 ? 'negociação' : 'negociações'} · ${x.fech} ${x.fech === 1 ? 'fechada' : 'fechadas'}</span></div>
        <div class="bar"><i class="${x.t === 'REVENDA' ? 'steel' : ''}" style="width:${(x.n / maxN) * 100}%"></i></div>
        <div class="hint" style="margin-top:6px;font-size:13px;color:var(--muted)">${brl(x.valor)} em negócios fechados</div>
      </div>`).join('');

    // ---- Últimas negociações ----
    const recentes = [...ordens].sort((a, b) => (b.dataAbertura || '').localeCompare(a.dataAbertura || '') || b.id - a.id).slice(0, 6);
    const recentesHtml = recentes.length ? recentes.map((o) => {
      const d = dadosNegocio(o); const st = STATUS[o.status] || STATUS.ABERTA;
      return `<div class="row">
        <span class="avatar sm">${esc(initials(o.cliente?.nome))}</span>
        <div class="grow"><strong>${esc(veiculoTitulo(d))}</strong><small>${esc(o.cliente?.nome || '')} · ${TIPOS[d.tipo].label} · ${ago(o.dataAbertura)}</small></div>
        <div class="end"><span class="badge ${st.cls}">${st.label}</span>${o.status === 'CONCLUIDA' ? `<small>${brl(o.valor)}</small>` : ''}</div>
      </div>`;
    }).join('') : '<p style="color:var(--muted)">Nenhuma negociação aberta ainda.</p>';

    // ---- Equipe ----
    const equipe = vendedores.map((v) => {
      const minhas = ordens.filter((o) => o.tecnico && o.tecnico.id === v.id);
      const fech = minhas.filter((o) => o.status === 'CONCLUIDA');
      return { v, andamento: minhas.filter((o) => o.status === 'EM_ANDAMENTO').length, fech: fech.length, valor: soma(fech) };
    }).sort((a, b) => b.valor - a.valor || b.fech - a.fech || b.andamento - a.andamento).slice(0, 5);
    const equipeHtml = equipe.length ? equipe.map((x) => `
      <div class="row">
        <span class="avatar sm">${esc(initials(x.v.nome))}</span>
        <div class="grow"><strong>${esc(x.v.nome)}</strong><small>${x.andamento} em negociação · ${x.fech} ${x.fech === 1 ? 'fechada' : 'fechadas'}</small></div>
        <div class="end">${brl(x.valor)}</div>
      </div>`).join('') : '<p style="color:var(--muted)">Cadastre vendedores para acompanhar o desempenho da equipe.</p>';

    root.innerHTML = `
      <div class="kpis">
        ${kpi('blue', 'Propostas abertas', abertas.length, quentes.length ? `${quentes.length} de alto interesse` : 'aguardando vendedor')}
        ${kpi('amber', 'Em negociação', andamento.length, 'com vendedor atribuído')}
        ${kpi('green', 'Negócios fechados', fechadas.length, taxa === null ? 'nenhum fechamento ainda' : `taxa de fechamento: ${taxa}%`)}
        ${kpi('red', 'Faturamento fechado', brl(receita), fechadas.length ? `ticket médio: ${brl(ticket)}` : 'sem negócios fechados', true)}
      </div>
      ${quentes.length ? `<div class="alert-box" role="status">
          <span><strong>${quentes.length} ${quentes.length === 1 ? 'proposta de alto interesse está' : 'propostas de alto interesse estão'} sem vendedor.</strong> Quanto antes alguém assumir, maior a chance de fechar.</span>
          <a class="btn sm" href="#/negociacoes?status=ABERTA&interesse=ALTA">Atribuir agora</a></div>` : ''}
      <div class="dash-grid">
        <section class="panel span-7"><h2>Funil de negociações <a href="#/negociacoes">Ver todas</a></h2>
          <div class="funnel" role="img" aria-label="Distribuição das ${total} negociações por status">${funnelBar}</div>
          <div class="legend">${legend}</div></section>
        <section class="panel span-5"><h2>Venda x Compra</h2>${tipoRows}</section>
        <section class="panel span-7"><h2>Últimas negociações <a href="#/negociacoes">Abrir lista</a></h2><div class="list">${recentesHtml}</div></section>
        <section class="panel span-5"><h2>Equipe de vendas <a href="#/vendedores">Ver equipe</a></h2><div class="list">${equipeHtml}</div></section>
      </div>`;
  },

  async onAction(action, el) {
    if (action === 'nova') { location.hash = '#/negociacoes?nova=1'; return; }
    if (action === 'demo') {
      el.disabled = true; el.classList.add('loading');
      try {
        await carregarDemo();
        toast('Dados de exemplo carregados.');
        await this.render(rootEl, ctxRef);
      } catch (e) {
        toast(e.message || 'Não foi possível carregar os dados de exemplo.', 'err');
        el.disabled = false; el.classList.remove('loading');
      }
    }
  },
};
