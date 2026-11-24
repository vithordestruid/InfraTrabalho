import { api } from '../api.js';
import { esc, brl, debounce, bindMoney, moneyValue, MARCAS, unidades } from '../utils.js';
import { modal, confirmModal, toast, emptyState } from '../ui.js';

let S = { veiculos: [], ordens: [] };
let busca = '';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const vazioParaNull = (s) => (String(s ?? '').trim() === '' ? null : String(s).trim());

const ordensDe = (v) => S.ordens.filter((o) => o.veiculo && o.veiculo.id === v.id);

const SITUACOES = {
  DISPONIVEL: { label: 'Disponível', cls: 'green' },
  RESERVADO: { label: 'Tudo reservado', cls: 'amber' },
};
let filtro = 'TODOS';

// Disponível: sobrou unidade. Tudo reservado: todas as unidades estão em negociação.
// Quando a última unidade é vendida o aparelho sai da tabela (o back-end exclui).
// Situação de cada aparelho no estoque
function situacao(v) {
  const u = unidades(v, S.ordens);
  const key = u.disponiveis === 0 ? 'RESERVADO' : 'DISPONIVEL';
  return { key, ...SITUACOES[key], u };
}

function pintarResumo() {
  const el = document.getElementById('resumo');
  if (!el) return;
  let disp = 0, total = 0, reserv = 0, valor = 0;
  const c = { DISPONIVEL: 0, RESERVADO: 0 };
  S.veiculos.forEach((v) => {
    const st = situacao(v);
    c[st.key]++;
    disp += st.u.disponiveis; total += st.u.total; reserv += st.u.reservadas;
    if (v.preco != null) valor += Number(v.preco) * st.u.total;
  });
  const vendidos = S.ordens.filter((o) => o.status === 'CONCLUIDA').length;
  const kpi = (cls, label, value, hint, money = false) =>
    `<div class="kpi ${cls}"><div class="label">${label}</div><div class="value ${money ? 'money' : ''}">${value}</div><div class="hint">${hint}</div></div>`;
  const tab = (k, nome, n) => `<button class="tab ${filtro === k ? 'active' : ''}" data-action="filtro" data-k="${k}">${nome}<em>${n}</em></button>`;
  el.innerHTML = `
    <div class="kpis">
      ${kpi('green', 'Aparelhos disponíveis', disp, `de ${total} em estoque`)}
      ${kpi('amber', 'Reservados', reserv, 'em negociação')}
      ${kpi('blue', 'Vendidos', vendidos, 'negócios fechados')}
      ${kpi('red', 'Valor em estoque', brl(valor), 'preço x quantidade', true)}
    </div>
    <div class="tabs">
      ${tab('TODOS', 'Todos', S.veiculos.length)}
      ${tab('DISPONIVEL', 'Disponíveis', c.DISPONIVEL)}
      ${tab('RESERVADO', 'Tudo reservado', c.RESERVADO)}
    </div>`;
}

function pintar() {
  const el = document.getElementById('tabela');
  if (!S.veiculos.length) {
    el.innerHTML = emptyState({
      title: 'Estoque vazio',
      text: 'Cadastre os aparelhos e a quantidade de cada um para poder abrir negociações de venda e de compra.',
      buttons: '<button class="btn primary" data-action="novo">+ Novo aparelho</button>',
    });
    return;
  }
  const lista = S.veiculos.filter((v) => (filtro === 'TODOS' || situacao(v).key === filtro)
    && norm(`${v.marca} ${v.modelo} ${v.ano} ${v.cor}`).includes(norm(busca)));
  if (!lista.length) {
    el.innerHTML = emptyState({ title: 'Nenhum aparelho encontrado', text: 'Tente outro filtro ou busque por marca, modelo ou cor.' });
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Aparelho</th><th>Detalhes</th><th>Preço</th><th>Em estoque</th><th>Disponíveis</th><th>Situação</th><th></th></tr></thead>
    <tbody>${lista.map((v) => {
      const st = situacao(v);
      const det = [v.cor, v.quilometragem != null ? `${Number(v.quilometragem).toLocaleString('pt-BR')} GB` : null].filter(Boolean).join(' · ');
      return `<tr>
        <td><strong>${esc(v.marca)} ${esc(v.modelo)}</strong><br><small style="color:var(--muted)">${esc(v.ano)}</small></td>
        <td>${det ? esc(det) : '<span style="color:var(--muted)">-</span>'}</td>
        <td>${v.preco != null ? `<strong>${brl(v.preco)}</strong>` : '<span style="color:var(--muted)">-</span>'}</td>
        <td><strong>${st.u.total}</strong></td>
        <td><strong>${st.u.disponiveis}</strong></td>
        <td><span class="badge ${st.cls}">${st.label}${st.u.reservadas ? ' · ' + st.u.reservadas + ' reserv.' : ''}</span></td>
        <td class="actions">
          <button class="btn sm" data-action="editar" data-id="${v.id}">Editar</button>
          <button class="btn sm" data-action="excluir" data-id="${v.id}">Remover</button>
        </td></tr>`;
    }).join('')}</tbody></table></div>`;
}

async function recarregar() {
  [S.veiculos, S.ordens] = await Promise.all([api.veiculos.listar(), api.negociacoes.listar()]);
  pintarResumo();
  pintar();
}

function formulario(v = {}) {
  const anoAtual = new Date().getFullYear();
  return `
    <div class="grid2">
      <div class="field"><label for="v-marca">Marca</label>
        <input id="v-marca" name="marca" class="input" list="marcas" maxlength="60" value="${esc(v.marca || '')}" placeholder="Ex.: Samsung" autocomplete="off" required>
        <datalist id="marcas">${MARCAS.map((m) => `<option value="${m}">`).join('')}</datalist></div>
      <div class="field"><label for="v-modelo">Modelo</label>
        <input id="v-modelo" name="modelo" class="input" maxlength="60" value="${esc(v.modelo || '')}" placeholder="Ex.: Galaxy S23" autocomplete="off" required></div>
    </div>
    <div class="grid3">
      <div class="field"><label for="v-ano">Ano</label>
        <input id="v-ano" name="ano" class="input" type="number" min="1950" max="${anoAtual + 1}" value="${esc(v.ano ?? '')}" placeholder="${anoAtual - 3}" required></div>
      <div class="field"><label for="v-cor">Cor <span class="opt">(opcional)</span></label>
        <input id="v-cor" name="cor" class="input" maxlength="30" value="${esc(v.cor || '')}" placeholder="Prata" autocomplete="off"></div>
      <div class="field"><label for="v-km">Armazenamento (GB) <span class="opt">(opcional)</span></label>
        <input id="v-km" name="km" class="input" type="number" min="0" max="4096" value="${esc(v.quilometragem ?? '')}" placeholder="128"></div>
    </div>
    <div class="grid2">
      <div class="field"><label for="v-qtd">Quantidade em estoque</label>
        <input id="v-qtd" name="qtd" class="input" type="number" min="1" max="9999" value="${esc(v.quantidade ?? 1)}" required></div>
      <div class="field"><label for="v-preco">Preço de cada um <span class="opt">(opcional)</span></label>
        <input id="v-preco" name="preco" class="input" inputmode="numeric" value="${v.preco != null ? esc(brl(v.preco)) : ''}" placeholder="R$ 0,00" autocomplete="off"></div>
    </div>`;
}

function coletar(v, form) {
  const marca = v.marca.trim(), modelo = v.modelo.trim();
  if (!marca || !modelo) throw new Error('Informe a marca e o modelo.');
  const ano = Number(v.ano), max = new Date().getFullYear() + 1;
  if (!Number.isInteger(ano) || ano < 1950 || ano > max) throw new Error(`Informe um ano entre 1950 e ${max}.`);
  if (v.km !== '' && (!Number.isFinite(Number(v.km)) || Number(v.km) < 0)) throw new Error('A armazenamento não pode ser negativa.');
  const qtd = Number(v.qtd);
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > 9999) throw new Error('Informe a quantidade em estoque (número inteiro).');
  const preco = moneyValue(form.elements.preco);
  return {
    marca, modelo, ano, cor: vazioParaNull(v.cor),
    quilometragem: v.km === '' ? null : Number(v.km),
    quantidade: qtd, preco: preco > 0 ? preco : null,
  };
}

const aoAbrir = (f) => { bindMoney(f.elements.preco); };

function abrirNovo() {
  modal({
    title: 'Novo aparelho', subtitle: 'Se o aparelho já existe (mesma marca, modelo, ano, cor e armazenamento), a quantidade é somada.', submitLabel: 'Cadastrar aparelho',
    content: formulario(), onOpen: aoAbrir,
    onSubmit: async (v, form) => {
      const dto = coletar(v, form);
      const chave = (x) => norm(`${x.marca}|${x.modelo}|${x.ano}|${x.cor || ''}|${x.quilometragem ?? ''}`);
      const jaExistia = S.veiculos.some((x) => chave(x) === chave(dto));
      await api.veiculos.criar(dto);
      toast(jaExistia ? `${dto.quantidade} unidade(s) somada(s) ao estoque deste aparelho.` : 'Aparelho cadastrado.');
      await recarregar();
    },
  });
}

function abrirEditar(veic) {
  modal({
    title: 'Editar aparelho', submitLabel: 'Salvar alterações',
    content: formulario(veic), onOpen: aoAbrir,
    onSubmit: async (v, form) => {
      await api.veiculos.atualizar(veic.id, coletar(v, form));
      toast('Aparelho atualizado.');
      await recarregar();
    },
  });
}

function pedirExclusao(v) {
  const n = unidades(v, S.ordens).reservadas;
  if (n) {
    toast(`${v.marca} ${v.modelo} tem ${n} ${n === 1 ? 'unidade' : 'unidades'} em negociação e não pode ser removido agora.`, 'warn');
    return;
  }
  confirmModal({
    title: 'Remover aparelho?', message: `${esc(v.marca)} ${esc(v.modelo)} ${esc(v.ano)} será removido da tabela de aparelhos. Essa ação não pode ser desfeita.`,
    confirmLabel: 'Remover', danger: true,
    action: async () => { await api.veiculos.excluir(v.id); toast('Aparelho removido do estoque.'); await recarregar(); },
  });
}

export const estoque = {
  title: 'Estoque',
  sub: 'Aparelhos da loja e quantas unidades de cada um estão em estoque.',
  actions: '<button class="btn primary" data-action="novo">+ Novo aparelho</button>',

  async render(root, ctx) {
    const [veiculos, ordens] = await Promise.all([api.veiculos.listar(), api.negociacoes.listar()]);
    if (ctx.isStale()) return;
    S = { veiculos, ordens };
    root.innerHTML = `
      <div class="toolbar"><div class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/></svg>
        <input id="busca" type="search" placeholder="Buscar por marca, modelo ou cor" aria-label="Buscar aparelhos" value="${esc(busca)}"></div></div>
      <div id="resumo"></div>
      <div id="tabela"></div>`;
    document.getElementById('busca').addEventListener('input', debounce((e) => { busca = e.target.value; pintar(); }, 120));
    pintarResumo();
    pintar();
  },

  onAction(action, el) {
    const v = S.veiculos.find((x) => String(x.id) === el.dataset.id);
    if (action === 'filtro') { filtro = el.dataset.k; pintarResumo(); pintar(); }
    else if (action === 'novo') abrirNovo();
    else if (action === 'editar' && v) abrirEditar(v);
    else if (action === 'excluir' && v) pedirExclusao(v);
  },
};
