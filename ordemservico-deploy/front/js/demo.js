// Cria dados de exemplo pela própria API, para apresentar o sistema sem cadastrar tudo na mão.
import { api } from './api.js';
import { maskCpf } from './utils.js';

const rnd = (n) => Math.floor(Math.random() * n);
const cpfAleatorio = () => maskCpf(Array.from({ length: 11 }, () => rnd(10)).join(''));

async function criarCliente(dto) {
  for (let i = 0; i < 5; i++) {
    try { return await api.clientes.criar({ ...dto, cpf: cpfAleatorio() }); }
    catch (e) { if (e.status !== 400) throw e; }  // CPF repetido por azar: sorteia outro
  }
  throw new Error('Não foi possível gerar um CPF novo.');
}

export async function carregarDemo() {
  const clientes = [];
  for (const c of [
    { nome: 'Marcos Almeida', telefone: '(45) 99811-2040', email: 'marcos.almeida@email.com' },
    { nome: 'Fernanda Ribeiro', telefone: '(45) 99922-3151', email: 'fernanda.ribeiro@email.com' },
    { nome: 'Paulo Henrique Souza', telefone: '(45) 99733-4262', email: 'paulo.souza@email.com' },
    { nome: 'Juliana Martins', telefone: '(45) 99644-5373', email: null },
    { nome: 'Rafael Teixeira', telefone: '(45) 99555-6484', email: 'rafael.teixeira@email.com' },
  ]) clientes.push(await criarCliente(c));

  const vendedores = [];
  for (const v of [
    { nome: 'Carlos Menezes', especialidade: 'Apple e seminovos', telefone: '(45) 98801-1010' },
    { nome: 'Patrícia Lopes', especialidade: 'Android e acessórios', telefone: '(45) 98802-2020' },
    { nome: 'Diego Fontana', especialidade: 'Compra de usados', telefone: '(45) 98803-3030' },
  ]) vendedores.push(await api.vendedores.criar(v));

  const negocios = [
    { c: 0, tipo: 'VENDA',   qtd: 5, veiculo: 'Apple iPhone 15',          ano: 2023, cor: 'Preto',    km: 128, prio: 'ALTA',  v: 0, fecha: 5499 },
    { c: 1, tipo: 'VENDA',   qtd: 2, veiculo: 'Samsung Galaxy S24',       ano: 2024, cor: 'Cinza',    km: 256, prio: 'ALTA',  v: 1, fecha: 4799 },
    { c: 2, tipo: 'REVENDA', qtd: 1, veiculo: 'Apple iPhone 12',          ano: 2020, cor: 'Azul',     km: 64,  prio: 'MEDIA', v: 2, fecha: 1900 },
    { c: 3, tipo: 'VENDA',   qtd: 3, veiculo: 'Xiaomi Redmi Note 13',     ano: 2024, cor: 'Verde',    km: 128, prio: 'ALTA',  v: 0 },
    { c: 4, tipo: 'REVENDA', qtd: 2, veiculo: 'Samsung Galaxy A54',       ano: 2023, cor: 'Branco',   km: 128, prio: 'MEDIA', v: 1 },
    { c: 0, tipo: 'VENDA',   qtd: 4, veiculo: 'Motorola Moto G84',        ano: 2023, cor: 'Azul',     km: 256, prio: 'BAIXA', cancela: true },
    { c: 1, tipo: 'REVENDA', qtd: 3, veiculo: 'Apple iPhone 13',          ano: 2021, cor: 'Rosa',     km: 128, prio: 'MEDIA' },
    { c: 2, tipo: 'VENDA',   qtd: 1, veiculo: 'Google Pixel 8',           ano: 2023, cor: 'Preto',    km: 128, prio: 'ALTA' },
  ];

  for (const n of negocios) {
    const [marca, ...resto] = n.veiculo.split(' ');
    const preco = n.fecha ? n.fecha + 300 : 1500 + rnd(60) * 100;
    const veic = await api.veiculos.criar({
      marca, modelo: resto.join(' '), ano: n.ano, cor: n.cor, quilometragem: n.km, quantidade: n.qtd || 1, preco,
    });
    const os = await api.negociacoes.abrir({
      descricao: `${n.tipo === 'REVENDA' ? 'Compra' : 'Venda'} de ${n.veiculo} ${n.ano}`,
      prioridade: n.prio,
      clienteId: clientes[n.c].id,
      veiculoId: veic.id,
      tipo: n.tipo,
    });
    if (n.v !== undefined) await api.negociacoes.atribuirVendedor(os.id, vendedores[n.v].id);
    if (n.fecha) await api.negociacoes.fechar(os.id, n.fecha);
    if (n.cancela) await api.negociacoes.cancelar(os.id);
  }
}
