// Boas-vindas da fase de teste, no mesmo modelo das boas-vindas do app: um passo por tela, sem rolar.
// Aparece uma vez para cada convidado (e de novo em Opinar › Como funciona o teste).
import { sessao } from '/esboco-dados.js';

const CHAVE = 'ab-bv-teste';
const visto = () => { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } };
const marcar = () => { try { localStorage.setItem(CHAVE, '1'); } catch (e) { /* sem armazenamento */ } };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let pedidoInstalar = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; });

function estilo() {
  if (document.getElementById('ab-bv-css')) return;
  const st = Object.assign(document.createElement('style'), { id: 'ab-bv-css' });
  st.textContent = `
  /* o Opinar some enquanto qualquer boas-vindas, aviso de localização/instalação ou tela de login estiver aberto */
  body:has(#ab-bv-teste, #esb-bv, #ab-porteiro, .es-bv) #ab-opinar{display:none !important}
  #ab-bv-teste{z-index:2147483260}
  #ab-bv-teste .es-bv-folha{gap:12px}
  #ab-bv-teste .es-bv-miolo{min-height:330px;justify-content:center;gap:12px}
  #ab-bv-teste .bv-sub{font-size:13px;line-height:1.45;color:var(--texto-3)}
  #ab-bv-teste .bv-so{align-self:flex-start;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--texto-3)}
  #ab-bv-teste .bv-linha{text-decoration:underline;text-decoration-color:#D9A93B;text-decoration-thickness:2px;text-underline-offset:4px}
  #ab-bv-teste .bv-ic{display:inline-block;width:18px;height:18px;vertical-align:-3px;stroke:#2F6FA3;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  #ab-bv-teste .bv-peq{font-size:13px;color:var(--texto-3)}
  #ab-bv-teste .bv-passos{display:flex;flex-direction:column;gap:7px;align-self:stretch;text-align:left}
  #ab-bv-teste .bv-p{display:flex;gap:10px;align-items:center;background:var(--fundo);border-radius:12px;padding:8px 10px;font-size:14px;line-height:1.35;color:var(--texto-2)}
  #ab-bv-teste .bv-n{flex:none;width:22px;height:22px;border-radius:50%;background:var(--verde);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
  #ab-bv-teste .bv-ic.cheio{fill:#2F6FA3;stroke:none}`;
  document.head.appendChild(st);
}
// o estilo que esconde o Opinar precisa valer desde o início
if (typeof document !== 'undefined') { if (document.head) estilo(); else document.addEventListener('DOMContentLoaded', estilo); }

const grande = (p) => `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#007731" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONES = {
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  celular: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>',
  conversa: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'
};
const COMPARTILHAR = '<svg class="bv-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7"/></svg>';
const PONTINHOS = '<svg class="bv-ic cheio" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
const ADICIONAR = '<svg class="bv-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>';
const passos4 = (l) => `<div class="bv-passos">${l.map((x, k) => `<div class="bv-p"><span class="bv-n">${k + 1}</span><span>${x}</span></div>`).join('')}</div>`;

export function boasVindas(forcar = false) {
  if (document.getElementById('ab-bv-teste')) return;
  if (!forcar && visto()) return;
  estilo();
  const nome = String(sessao()?.nome || '').split(' ')[0];
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  const instalado = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const passosIphone = passos4([
    `Toque nos <b>três pontinhos</b> ${PONTINHOS} na barra de baixo do Safari (ou direto em <b>Compartilhar</b> ${COMPARTILHAR}, se ele já aparecer)`,
    `Toque em <b>Compartilhar</b> ${COMPARTILHAR}`,
    `Role e escolha <b>Adicionar à Tela de Início</b> ${ADICIONAR}`,
    'Toque em <b>Adicionar</b>. O nome já vem como <b>Amendoim Brasil</b>'
  ]);
  const passosAndroid = passos4([
    `Toque nos <b>três pontinhos</b> ${PONTINHOS} do Chrome`,
    'Escolha <b>Instalar aplicativo</b> (ou <b>Adicionar à tela inicial</b>)',
    'Toque em <b>Instalar</b>'
  ]);

  const passos = [
    () => `${grande(ICONES.cadeado)}<b class="es-h1">${nome ? esc(nome) + ', este' : 'Este'} conteúdo é só para você</b>
      <span class="es-txt">Você é um dos parceiros escolhidos para usar o app antes de todo mundo.</span>
      <span class="es-txt"><span class="bv-linha">Por favor, não compartilhe o acesso nem envie prints ou informações do app para outras pessoas.</span></span>
      <span class="bv-sub">Seu nome aparece bem de leve no fundo das telas e os botões de compartilhar ficam desligados.</span>`,
    () => `${grande(ICONES.celular)}<b class="es-h1">Coloque o app na tela inicial</b>
      <span class="es-txt">Abre num toque, como um aplicativo, e funciona mesmo com sinal fraco na roça.</span>
      ${instalado ? '<span class="es-txt"><b>Você já está usando como aplicativo.</b> Está tudo certo.</span>'
        : ios ? passosIphone
        : android ? (pedidoInstalar ? '<button class="btn btn-verde" type="button" data-bv-inst>Instalar o app</button>' : passosAndroid)
        : `<span class="bv-so">iPhone (Safari)</span>${passosIphone}<span class="bv-so">Android (Chrome)</span>${passosAndroid}`}`,
    () => `${grande(ICONES.conversa)}<b class="es-h1">Precisamos da sua opinião</b>
      <span class="es-txt">Em qualquer tela, toque em <b class="bv-linha">Opinar</b> e nos conte o que achou: o que ficou confuso, o que faltou, uma ideia. Você pode <span class="bv-linha">escrever ou gravar um áudio</span>.</span>
      <span class="es-txt">Quanto mais específico, melhor: diga o que você esperava ver. <span class="bv-peq">(Vamos ouvir todo o seu feedback para melhorar o aplicativo.)</span></span>`
  ];
  let i = 0;
  const el = document.createElement('div');
  el.id = 'ab-bv-teste'; el.className = 'es-bv';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Boas-vindas ao teste');
  document.body.appendChild(el);
  const fechar = () => { marcar(); el.remove(); };
  function desenhar() {
    const ultimo = i === passos.length - 1;
    el.innerHTML = `<div class="es-bv-fundo"></div><section class="es-bv-folha">
      <div class="cartao-cab"><span class="rotulo">Teste do Amendoim Brasil</span></div>
      <div class="es-pontos">${passos.map((_, k) => `<i class="${k === i ? 'atual' : k < i ? 'feito' : ''}"></i>`).join('')}</div>
      <div class="es-bv-miolo">${passos[i]()}</div>
      <button class="btn btn-verde" type="button" data-av="prox">${ultimo ? 'Entendi, vamos lá' : 'Continuar'}</button>
      ${i > 0 ? '<button class="dx-sair" type="button" data-av="volta">Voltar</button>' : ''}
    </section>`;
    el.querySelector('[data-av=prox]').addEventListener('click', () => { if (ultimo) fechar(); else { i++; desenhar(); } });
    el.querySelector('[data-av=volta]')?.addEventListener('click', () => { i--; desenhar(); });
    el.querySelector('[data-bv-inst]')?.addEventListener('click', async () => { try { await pedidoInstalar.prompt(); pedidoInstalar = null; } catch (e) { /* o navegador não deixou */ } });
  }
  desenhar();
}
