// Boas-vindas da fase de teste: aparece uma vez para cada convidado (e de novo se ele pedir em Opinar › Como funciona o teste).
import { sessao } from '/esboco-dados.js';

const CHAVE = 'ab-bv-teste';
const visto = () => { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } };
const marcar = () => { try { localStorage.setItem(CHAVE, '1'); } catch (e) { /* sem armazenamento */ } };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// O botão Opinar some enquanto qualquer boas-vindas, aviso de localização/instalação ou tela de login estiver aberto.
let pedidoInstalar = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; });

function estilo() {
  if (document.getElementById('ab-bv-css')) return;
  const st = Object.assign(document.createElement('style'), { id: 'ab-bv-css' });
  st.textContent = `
  body:has(#ab-bv-teste, #esb-bv, #ab-porteiro, .es-bv) #ab-opinar{display:none !important}
  #ab-bv-teste{position:fixed;inset:0;z-index:2147483260;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}
  #ab-bv-teste .bv-folha{width:100%;max-width:480px;max-height:94vh;overflow:auto;background:#fff;border-radius:20px 20px 0 0;padding:20px 18px 0;display:flex;flex-direction:column;gap:14px;box-sizing:border-box}
  #ab-bv-teste h2{margin:0;font-size:22px;line-height:1.2;font-weight:800;color:#1B1B17}
  #ab-bv-teste p{margin:0;font-size:15px;line-height:1.5;color:#3E3B33}
  #ab-bv-teste .bv-item{display:flex;gap:12px;align-items:flex-start}
  #ab-bv-teste .bv-n{flex:none;width:30px;height:30px;border-radius:50%;background:#E3F2E8;color:#007731;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}
  #ab-bv-teste .bv-c{display:flex;flex-direction:column;gap:8px;min-width:0}
  #ab-bv-teste .bv-t{display:block;font-size:16px;color:#1B1B17}
  #ab-bv-teste .bv-grifo{background:linear-gradient(transparent 55%,#FFE48A 55%);font-weight:800;color:#1B1B17;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
  #ab-bv-teste ol,#ab-bv-teste ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:15px;line-height:1.45;color:#3E3B33}
  #ab-bv-teste .bv-so{font-size:13px;font-weight:800;color:#7A4A08;text-transform:uppercase;letter-spacing:.04em}
  #ab-bv-teste .bv-ic{display:inline-block;width:18px;height:18px;vertical-align:-3px;stroke:#2F6FA3;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  #ab-bv-teste .bv-inst{height:46px;border:2px solid #007731;border-radius:12px;background:#fff;color:#007731;font:inherit;font-size:16px;font-weight:800;cursor:pointer}
  #ab-bv-teste .bv-fim{position:sticky;bottom:0;background:#fff;padding:10px 0 max(14px,env(safe-area-inset-bottom));margin-top:2px}
  #ab-bv-teste .bv-ok{width:100%;height:54px;border:0;border-radius:14px;background:#007731;color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer}`;
  document.head.appendChild(st);
}
// o estilo que esconde o Opinar precisa valer desde o início, mesmo antes de abrir o aviso do teste
if (typeof document !== 'undefined') { if (document.head) estilo(); else document.addEventListener('DOMContentLoaded', estilo); }

const ICONE_COMPARTILHAR = '<svg class="bv-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7"/></svg>';

export function boasVindas(forcar = false) {
  if (document.getElementById('ab-bv-teste')) return;
  if (!forcar && visto()) return;
  estilo();
  const nome = String(sessao()?.nome || '').split(' ')[0];
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  const instalado = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const passosIphone = `<span class="bv-so">iPhone (Safari)</span><ol><li>Toque em <b>Compartilhar</b> ${ICONE_COMPARTILHAR} na barra do Safari</li><li>Escolha <b>Adicionar à Tela de Início</b></li><li>Toque em <b>Adicionar</b></li></ol>`;
  const passosAndroid = `<span class="bv-so">Android (Chrome)</span><ol><li>Toque nos <b>três pontinhos</b> no canto de cima do Chrome</li><li>Escolha <b>Instalar aplicativo</b> (ou <b>Adicionar à tela inicial</b>)</li><li>Toque em <b>Instalar</b></li></ol>`;
  const comoInstalar = instalado
    ? '<p>Você já está usando como aplicativo. Está tudo certo.</p>'
    : `<p>Abre num toque, como um aplicativo, e funciona mesmo com sinal fraco na roça.</p>${ios ? passosIphone : android ? passosAndroid : passosIphone + passosAndroid}${android && pedidoInstalar ? '<button class="bv-inst" type="button" data-bv-inst>Instalar o app agora</button>' : ''}`;
  const el = document.createElement('div');
  el.id = 'ab-bv-teste';
  el.innerHTML = `<div class="bv-folha" role="dialog" aria-modal="true" aria-label="Boas-vindas ao teste">
    <h2>${nome ? esc(nome) + ', bem-vindo' : 'Bem-vindo'} ao teste do Amendoim Brasil</h2>
    <p>Você é um dos parceiros que o Helder escolheu para usar o app antes de todo mundo. A sua opinião vai moldar a versão final.</p>
    <div class="bv-item"><span class="bv-n">1</span><div class="bv-c"><b class="bv-t">Conteúdo exclusivo</b><p>Nesta fase o conteúdo é só para você. <span class="bv-grifo">Por favor, não compartilhe o acesso, não tire prints nem mande informações do app para outras pessoas.</span></p><p>Por isso o seu nome aparece bem de leve no fundo das telas, e os botões de compartilhar ficam desligados.</p></div></div>
    <div class="bv-item"><span class="bv-n">2</span><div class="bv-c"><b class="bv-t">Coloque o app na tela inicial</b>${comoInstalar}</div></div>
    <div class="bv-item"><span class="bv-n">3</span><div class="bv-c"><b class="bv-t">Precisamos da sua opinião</b>
      <p>Ela vai ajudar muito a melhorar o app. Em <b>qualquer tela</b>, toque no botão <b>Opinar</b>, no canto de baixo.</p>
      <ul>
        <li>Opine sobre <b>a tela em que você está</b>, ou sobre o app inteiro depois de usar.</li>
        <li><b>Quanto mais específico, melhor.</b> Diga o que você esperava ver, o que ficou confuso e o que melhoraria. Por exemplo: um gráfico difícil de ler, uma informação de mercado que faltou, uma explicação do clima que não ficou clara.</li>
        <li>Escolha uma etiqueta (achei confuso, faltou algo, tenho uma ideia, gostei) e <b>escreva ou grave um áudio</b> de até 2 minutos.</li>
      </ul>
      <p>O Helder lê e ouve tudo.</p></div></div>
    <div class="bv-fim"><button class="bv-ok" type="button">Entendi, vamos lá</button></div>
  </div>`;
  document.body.appendChild(el);
  const fechar = () => { marcar(); el.remove(); };
  el.querySelector('.bv-ok').addEventListener('click', fechar);
  el.querySelector('[data-bv-inst]')?.addEventListener('click', async () => { try { await pedidoInstalar.prompt(); pedidoInstalar = null; } catch (e) { /* o navegador não deixou */ } });
  setTimeout(() => el.querySelector('.bv-ok')?.focus(), 60);
}
