// Boas-vindas da fase de teste: aparece uma vez para cada convidado (e de novo se ele pedir em Opinar › Como funciona o teste).
import { sessao } from '/esboco-dados.js';

const CHAVE = 'ab-bv-teste';
const visto = () => { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } };
const marcar = () => { try { localStorage.setItem(CHAVE, '1'); } catch (e) { /* sem armazenamento */ } };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function estilo() {
  if (document.getElementById('ab-bv-css')) return;
  const st = Object.assign(document.createElement('style'), { id: 'ab-bv-css' });
  st.textContent = `
  #ab-bv-teste{position:fixed;inset:0;z-index:2147483260;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}
  #ab-bv-teste .bv-folha{width:100%;max-width:480px;max-height:92vh;overflow:auto;background:#fff;border-radius:20px 20px 0 0;padding:20px 18px max(18px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:14px;box-sizing:border-box}
  #ab-bv-teste h2{margin:0;font-size:22px;line-height:1.2;font-weight:800;color:#1B1B17}
  #ab-bv-teste p{margin:0;font-size:15px;line-height:1.5;color:#3E3B33}
  #ab-bv-teste .bv-item{display:flex;gap:12px;align-items:flex-start}
  #ab-bv-teste .bv-n{flex:none;width:30px;height:30px;border-radius:50%;background:#E3F2E8;color:#007731;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}
  #ab-bv-teste .bv-t{display:block;font-size:16px;color:#1B1B17;margin-bottom:2px}
  #ab-bv-teste .bv-ok{height:54px;border:0;border-radius:14px;background:#007731;color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer;margin-top:4px}`;
  document.head.appendChild(st);
}

export function boasVindas(forcar = false) {
  if (document.getElementById('ab-bv-teste')) return;
  if (!forcar && visto()) return;
  estilo();
  const nome = String(sessao()?.nome || '').split(' ')[0];
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  const instalado = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const comoInstalar = instalado
    ? 'Você já está usando como aplicativo. Está tudo certo.'
    : [
      ios || !android ? '<b>iPhone:</b> no Safari, toque em Compartilhar (o quadradinho com a seta) e depois em <b>Adicionar à Tela de Início</b>.' : '',
      android || !ios ? '<b>Android:</b> no Chrome, toque nos três pontinhos e em <b>Instalar aplicativo</b> (ou Adicionar à tela inicial).' : ''
    ].filter(Boolean).join('<br>');
  const el = document.createElement('div');
  el.id = 'ab-bv-teste';
  el.innerHTML = `<div class="bv-folha" role="dialog" aria-modal="true" aria-label="Boas-vindas ao teste">
    <h2>${nome ? esc(nome) + ', bem-vindo' : 'Bem-vindo'} ao teste do Amendoim Brasil</h2>
    <p>Você é um dos parceiros que o Helder escolheu para usar o app antes de todo mundo. A sua opinião vai moldar a versão final.</p>
    <div class="bv-item"><span class="bv-n">1</span><div><b class="bv-t">Conteúdo exclusivo</b><p>Nesta fase o conteúdo é só para você. Por favor, não compartilhe o acesso e não tire prints nem mande informações do app para outras pessoas. Por isso o seu nome aparece bem de leve no fundo das telas, e os botões de compartilhar ficam desligados.</p></div></div>
    <div class="bv-item"><span class="bv-n">2</span><div><b class="bv-t">Deixe como aplicativo</b><p>${comoInstalar}</p></div></div>
    <div class="bv-item"><span class="bv-n">3</span><div><b class="bv-t">Conte o que achou</b><p>Em qualquer tela, toque no botão <b>Opinar</b> (canto da tela). Escolha se achou confuso, se faltou algo, se tem uma ideia ou se gostou, e escreva ou grave um áudio de até 2 minutos. Quanto mais específico, melhor: diga a tela e o que você esperava ver. O Helder lê e ouve tudo.</p></div></div>
    <button class="bv-ok" type="button">Entendi, vamos lá</button>
  </div>`;
  document.body.appendChild(el);
  const fechar = () => { marcar(); el.remove(); };
  el.querySelector('.bv-ok').addEventListener('click', fechar);
  setTimeout(() => el.querySelector('.bv-ok')?.focus(), 60);
}
