// Funções de apoio: formatação, máscaras e o "tradutor" entre o modelo da API
// (ordem de serviço) e o tema de venda e compra de aparelhos.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (n) => brlFmt.format(Number(n) || 0);

export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR');
}

export function ago(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const min = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  return fmtDate(iso);
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// ---------- Máscaras ----------
export function maskCpf(v) {
  const d = String(v).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function maskPhone(v) {
  const d = String(v).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Campo de dinheiro: o usuário digita só números e o campo vira "R$ 45.000,00".
export function bindMoney(input) {
  input.addEventListener('input', () => {
    const cents = Number(input.value.replace(/\D/g, '') || 0);
    input.value = cents ? brl(cents / 100) : '';
  });
}
export const moneyValue = (input) => Number(input.value.replace(/\D/g, '') || 0) / 100;

export function bindMask(input, fn) {
  input.addEventListener('input', () => { input.value = fn(input.value); });
}

// ---------- Rótulos do domínio ----------
// O back-end continua com StatusOS/Prioridade; aqui só mudamos o vocabulário.
export const STATUS = {
  ABERTA:       { label: 'Aberta',        cls: 'blue',  color: '#2563eb' },
  EM_ANDAMENTO: { label: 'Em negociação', cls: 'amber', color: '#f79009' },
  CONCLUIDA:    { label: 'Fechada',       cls: 'green', color: '#17b26a' },
  CANCELADA:    { label: 'Cancelada',     cls: 'gray',  color: '#98a2b3' },
};
export const STATUS_ORDER = ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

export const INTERESSE = {
  ALTA:  'Alto interesse',
  MEDIA: 'Interesse médio',
  BAIXA: 'Interesse baixo',
};

export const TIPOS = {
  VENDA:   { label: 'Venda',   help: 'A loja vende um aparelho ao cliente' },
  REVENDA: { label: 'Compra', help: 'A loja compra o aparelho usado do cliente' },
};

export const MARCAS = ['Apple', 'Asus', 'Google', 'Huawei', 'LG', 'Motorola', 'Nokia', 'OnePlus', 'Poco', 'Realme',
  'Samsung', 'Xiaomi'];

// ---------- Descrição do aparelho ----------
// A API guarda um único texto (descricao, até 500 caracteres). O front monta e lê assim:
//   TIPO | Marca Modelo | Ano | Cor | Km | Observações
const SEP = ' | ';
const clean = (s) => String(s ?? '').replace(/\|/g, '/').trim();

export function composeDescricao({ tipo, veiculo, ano, cor, km, obs }) {
  return [tipo, clean(veiculo), clean(ano), clean(cor), clean(km), clean(obs)].join(SEP);
}

export function parseDescricao(descricao) {
  const raw = String(descricao ?? '');
  const p = raw.split(SEP);
  if (p.length >= 3 && TIPOS[p[0]]) {
    return {
      tipo: p[0], veiculo: p[1] || 'Aparelho', ano: p[2] || '', cor: p[3] || '',
      km: p[4] || '', obs: p.slice(5).join(SEP), estruturado: true, raw,
    };
  }
  // Registros antigos (criados direto pela API) aparecem como texto livre.
  return { tipo: 'VENDA', veiculo: raw || 'Aparelho', ano: '', cor: '', km: '', obs: '', estruturado: false, raw };
}

// Dados da negociação para a tela. Usa o aparelho cadastrado (entidade Veiculo);
// negociações antigas, sem aparelho, caem no texto da descrição.
export function dadosNegocio(o) {
  const v = o.veiculo;
  if (v) {
    const auto = /^(Venda|Revenda|Compra) de /.test(o.descricao || '');
    return {
      tipo: TIPOS[o.tipo] ? o.tipo : 'VENDA', veiculo: `${v.marca} ${v.modelo}`, ano: v.ano ?? '',
      cor: v.cor || '', km: v.quilometragem ?? '', obs: auto ? '' : (o.descricao || ''), estruturado: true,
      raw: `${v.marca} ${v.modelo} ${o.descricao || ''}`,
    };
  }
  // Aparelho já vendido e removido do estoque: a negociação guarda uma cópia (nome|ano|cor|GB).
  if (o.veiculoDescricao) {
    const [nome, ano, cor, km] = o.veiculoDescricao.split('|');
    const auto = /^(Venda|Revenda|Compra) de /.test(o.descricao || '');
    return {
      tipo: TIPOS[o.tipo] ? o.tipo : 'VENDA', veiculo: nome, ano: ano || '', cor: cor || '', km: km || '',
      obs: auto ? '' : (o.descricao || ''), estruturado: true, raw: `${nome} ${o.descricao || ''}`,
    };
  }
  const d = parseDescricao(o.descricao);
  if (TIPOS[o.tipo]) d.tipo = o.tipo;
  return d;
}

export const nomeVeiculo = (v) => `${v.marca} ${v.modelo}${v.ano ? ' ' + v.ano : ''}${v.cor ? ' ' + v.cor : ''}${v.quilometragem != null ? ' · ' + Number(v.quilometragem).toLocaleString('pt-BR') + ' GB' : ''}`;

const ATIVAS_OS = ['ABERTA', 'EM_ANDAMENTO'];
// Unidades de um aparelho: reservadas = negociações ativas; disponíveis = estoque - reservadas.
// Cálculo de unidades: reservadas e disponíveis
export function unidades(v, ordens) {
  const reservadas = ordens.filter((o) => o.veiculo && o.veiculo.id === v.id && ATIVAS_OS.includes(o.status)).length;
  const total = Number(v.quantidade) || 0;
  return { total, reservadas, disponiveis: Math.max(0, total - reservadas) };
}

export function veiculoTitulo(d) {
  return d.ano ? `${d.veiculo} ${d.ano}` : d.veiculo;
}

export function veiculoMeta(d) {
  const partes = [];
  if (d.cor) partes.push(d.cor);
  if (d.km !== '' && !isNaN(Number(d.km))) partes.push(`${Number(d.km).toLocaleString('pt-BR')} GB`);
  return partes.join(' · ');
}

export const carSvg = () => `
<svg class="car" viewBox="0 0 120 60" fill="none" aria-hidden="true">
  <rect x="44" y="4" width="32" height="52" rx="8" stroke="currentColor" stroke-width="5"/>
  <path d="M55 46h10" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
</svg>`;
