// Ponto de entrada: roteador por hash (#/painel, #/negociacoes, #/estoque, #/clientes, #/vendedores).
import { painel } from './views/painel.js';
import { negociacoes } from './views/negociacoes.js';
import { clientes } from './views/clientes.js';
import { estoque } from './views/estoque.js';
import { vendedores } from './views/vendedores.js';
import { errorState } from './ui.js';

// Roteador: troca de tela conforme o link (#/painel, #/estoque...)
const routes = { painel, negociacoes, estoque, clientes, vendedores };
const root = document.getElementById('view');
let current = null;
let token = 0;

function setApiStatus(online) {
  document.getElementById('apiDot').className = `status-dot ${online ? 'on' : 'off'}`;
  document.getElementById('apiText').textContent = online ? 'API conectada' : 'API sem conexão';
}

async function navigate() {
  const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const key = routes[path] ? path : 'painel';
  const view = routes[key];
  const mine = ++token;
  current = view;

  document.querySelectorAll('.nav a').forEach((a) => {
    const active = a.dataset.route === key;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('pageTitle').textContent = view.title;
  document.getElementById('pageSub').textContent = view.sub;
  document.getElementById('pageActions').innerHTML = view.actions || '';
  document.title = `${view.title} | Cell Point`;
  root.innerHTML = '';

  try {
    await view.render(root, { params: new URLSearchParams(qs), isStale: () => mine !== token });
    if (mine === token) setApiStatus(true);
  } catch (e) {
    if (mine !== token) return;
    setApiStatus(e.status !== 0);
    root.innerHTML = errorState(e.message);
  }
}

// Um único ouvinte de cliques para todos os botões com data-action.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'retry') { navigate(); return; }
  if (current && current.onAction) current.onAction(el.dataset.action, el, e);
});

window.addEventListener('hashchange', navigate);
navigate();
