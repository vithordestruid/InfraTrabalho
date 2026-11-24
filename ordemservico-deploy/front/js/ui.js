// Componentes de interface: toast, modal, estados vazios e de carregamento.
import { esc, carSvg } from './utils.js';

export function toast(message, type = 'ok') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type === 'err' ? 'err' : type === 'warn' ? 'warn' : ''}`;
  el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), type === 'err' ? 6500 : 3800);
}

/**
 * Abre um modal com formulário.
 * onSubmit(dados, form) pode lançar Error: a mensagem aparece dentro do modal.
 */
export function modal({ title, subtitle = '', content, submitLabel = 'Salvar', danger = false, onSubmit, onOpen }) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" novalidate>
      <header>
        <h2 id="modal-title">${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Fechar">&times;</button>
      </header>
      ${subtitle ? `<p class="modal-sub">${subtitle}</p>` : ''}
      <div class="modal-body">${content}</div>
      <div class="form-error" role="alert" hidden></div>
      <footer>
        <button type="button" class="btn ghost" data-close>Cancelar</button>
        <button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submitLabel)}</button>
      </footer>
    </form>`;

  const previous = document.activeElement;
  const form = overlay.querySelector('form');
  const errBox = overlay.querySelector('.form-error');
  const submitBtn = overlay.querySelector('button[type=submit]');
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (previous && previous.focus) previous.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    try {
      await onSubmit(Object.fromEntries(new FormData(form)), form);
      close();
    } catch (ex) {
      errBox.textContent = ex.message || 'Algo deu errado. Tente novamente.';
      errBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });

  if (onOpen) onOpen(form);
  const first = form.querySelector('input:not([type=radio]), select, textarea') || submitBtn;
  setTimeout(() => first.focus(), 30);
  return { close, form };
}

// Confirmação simples. `action` roda ao confirmar (erros aparecem no próprio modal).
export function confirmModal({ title, message, confirmLabel = 'Confirmar', danger = false, action }) {
  return modal({
    title, subtitle: message, content: '', submitLabel: confirmLabel, danger,
    onSubmit: async () => { await action(); },
  });
}

export function emptyState({ title, text, buttons = '' }) {
  return `<div class="state">${carSvg()}<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="btns">${buttons}</div></div>`;
}

export function errorState(message) {
  return `<div class="state error">${carSvg()}<h2>Não foi possível carregar os dados</h2>
    <p>${esc(message)}</p><div class="btns"><button class="btn primary" data-action="retry">Tentar de novo</button></div></div>`;
}

export const loadingKpis = () =>
  `<div class="kpis">${'<div class="skeleton kpi-s"></div>'.repeat(4)}</div>
   <div class="dash-grid"><div class="skeleton panel-s span-7"></div><div class="skeleton panel-s span-5"></div></div>`;
export const loadingCards = () =>
  `<div class="deals">${'<div class="skeleton card-s"></div>'.repeat(6)}</div>`;
