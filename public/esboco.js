// ESBOÇO navegável da área de assinantes, boas-vindas, login, planos, pagamento e Estimativas Amendoim Brasil.
// Tudo aqui é de teste: login e pagamento são simulados neste aparelho. Nada é cobrado nem enviado.
import { conteudo, sessao, salvarSessao, assinante, producao } from '/esboco-dados.js';

let h = null;
let ctx = { render: () => {}, evento: () => {}, localizar: async () => null };
const est = { modo: 'whatsapp', codigo: false, cel: '', periodo: 'mensal', plano: 'produtor', forma: 'pix', etapaPg: '', msg: '', cancelar: false };

const CHAVE_BV = 'ab-esboco-bv';
const nf = (n, d = 0) => (n == null || !isFinite(n) ? '–' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const faixa = (a, b, d = 0) => (Math.abs(a - b) < 1e-9 ? nf(a, d) : `${nf(a, d)}–${nf(b, d)}`);
const preco = (v) => (v == null || !isFinite(v) ? 'R$ —' : 'R$ ' + nf(v, 2));
const ok = '<path d="M5 12l5 5 9-10"/>';
const pessoa = '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>';
const grafico = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
const navio = '<path d="M3 17l2 4h14l2-4M5 17V9h14v8M9 9V5h6v4"/>';
const calc = '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>';
const sinoMais = '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>';

function voltar(href, texto, extra = '') {
  return `<header class="topo"><a class="link-mini" href="${href}" ${extra} style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}${texto}</a></header>`;
}
const item = (t, bloqueado = false) => `<div class="es-item">${h.ic(bloqueado ? h.I.cadeado : ok, `style="width:18px;height:18px;stroke:${bloqueado ? '#7A4A08' : '#007731'};stroke-width:2.4;flex-shrink:0"`)}<span>${t}</span></div>`;
const aviso = (t) => `<div class="es-aviso">${h.ic(h.I.alerta, 'style="width:16px;height:16px;flex-shrink:0"')}<span>${t}</span></div>`;

// ---------- Mercado › Assinantes ----------
export function telaAssinatura(hh) {
  h = hh;
  const s = sessao(), c = conteudo();
  if (s && assinante()) return areaDoAssinante(s);
  const p = producao(c.estimativas[c.estimativas.length - 1]);
  return `
  <section class="cartao es-hero">
    <span class="pilula pilula-amendoim" style="align-self:flex-start">EXCLUSIVO ASSINANTES</span>
    <b class="es-h1">Informação na ponta do lápis para vender e comprar melhor</b>
    <span class="es-txt">Estimativas próprias da Amendoim Brasil, dados de exportação completos e histórico de preço, atualizados por quem está no mercado.</span>
    <div class="es-lista">
      ${item('Estimativas Amendoim Brasil: área, produção e balanço')}
      ${item('Exportação mês a mês, destinos e preço por país')}
      ${item('Histórico de preço de 1 e 5 anos e sazonalidade')}
      ${item('Empresa: paridade de exportação e alertas avançados')}
    </div>
    <a class="btn btn-verde" href="#/conta/criar" data-ev="esb-criar">Criar conta e assinar</a>
    <a class="btn btn-escuro" href="#/conta/entrar" data-ev="esb-entrar">Já sou assinante · Entrar</a>
    ${c.diasTeste ? `<span class="mini" style="text-align:center">${c.diasTeste} dias grátis para conhecer · cancele quando quiser</span>` : ''}
  </section>

  <a class="cartao es-previa" href="#/estimativas">
    <div class="cartao-cab"><span class="rotulo">Estimativa de safra ${h.esc(c.estimativas[c.estimativas.length - 1].safra)}</span>${h.ic(h.I.cadeado, 'style="width:18px;height:18px;stroke:#7A4A08"')}</div>
    <div class="es-borrado" aria-hidden="true"><div class="dx-tiles">
      <div class="dx-tile"><span>Área</span><b>${nf(c.estimativas[c.estimativas.length - 1].areaMin)} mil ha</b></div>
      <div class="dx-tile"><span>Produção</span><b>${nf(p.scMeio / 1e6, 1)} mi sc</b></div>
      <div class="dx-tile"><span>Variação</span><b>−00%</b></div>
    </div></div>
    <span class="mini">Toque para ver o que tem dentro</span>
  </a>

  ${blocoPlanos(c, false)}

  <section class="cartao" style="flex-direction:row;align-items:center;gap:12px">
    ${h.ic(h.I.escudo, 'style="width:30px;height:30px;stroke:#007731;flex-shrink:0"')}
    <div class="cresce"><b style="font-size:15px;display:block">Cliente da consultoria?</b><span style="font-size:13px;color:var(--texto-3)">Entre com o seu celular. O Helder libera o acesso sem custo.</span></div>
    <a class="btn btn-escuro btn-pequeno" href="#/conta/entrar">Entrar</a>
  </section>
  ${rodapeLegal()}`;
}

function areaDoAssinante(s) {
  const empresa = s.plano === 'empresa';
  const card = (href, icone, titulo, txt, travado = false) => `<a class="cartao es-cartao" href="${href}">
    <span class="sigla" style="width:44px;height:44px;border-radius:12px;background:${travado ? 'var(--fundo)' : 'var(--verde-claro)'}">${h.ic(icone, `style="stroke:${travado ? '#5F5B52' : '#007731'}"`)}</span>
    <span class="cresce"><b style="font-size:15px;display:block">${titulo}</b><span class="mini">${txt}</span></span>
    ${h.ic(travado ? h.I.cadeado : h.I.seta, 'style="width:18px;height:18px;stroke:#5F5B52"')}</a>`;
  return `
  <section class="cartao es-ola">
    <div class="cartao-cab"><span class="rotulo">Olá, ${h.esc((s.nome || 'assinante').split(' ')[0])}</span><span class="pilula pilula-verde">${s.status === 'cortesia' ? 'Cortesia' : 'Plano ' + (empresa ? 'Empresa' : 'Produtor')}</span></div>
    <span class="es-txt">Sua área exclusiva. O que é novo aparece primeiro.</span>
  </section>
  ${card('#/estimativas', grafico, 'Estimativas Amendoim Brasil', 'Área, produção e balanço por safra')}
  ${card('#/mercado/dados', navio, 'Dados de exportação', 'Mês a mês, destinos, preço por país e mundo')}
  ${card('#/conta/em-breve', h.I.doc, 'Histórico e sazonalidade', 'Preço de 1 e 5 anos · em breve')}
  ${card(empresa ? '#/conta/em-breve' : '#/conta/planos', calc, 'Paridade de exportação', empresa ? 'R$/saca a partir do preço externo · em breve' : 'Plano Empresa', !empresa)}
  ${card(empresa ? '#/alertas' : '#/conta/planos', sinoMais, 'Alertas avançados', empresa ? 'Exportação, destino e preço por país' : 'Plano Empresa', !empresa)}
  ${card('#/conta', pessoa, 'Minha conta', 'Plano, pagamento e dados')}`;
}

function blocoPlanos(c, escolher = true) {
  const per = est.periodo;
  const cartao = (k, extras) => {
    const p = c.planos[k], v = p[per];
    const mes = per === 'anual' ? v / 12 : null;
    const sel = escolher && est.plano === k;
    return `<${escolher ? 'button type="button"' : 'a'} class="cartao es-plano ${sel ? 'es-sel' : ''}" ${escolher ? `data-esb-plano="${k}" aria-pressed="${sel}"` : `href="#/conta/criar"`}>
      <div class="cartao-cab"><b style="font-size:17px">${h.esc(p.nome)}</b>${k === 'produtor' ? '<span class="pilula pilula-verde">Mais escolhido</span>' : '<span class="pilula pilula-azul">Indústria e exportador</span>'}</div>
      <div class="num"><span class="es-preco">${preco(v)}</span><span class="mini"> /${per === 'anual' ? 'ano' : 'mês'}</span></div>
      ${mes ? `<span class="mini">equivale a ${preco(mes)} por mês</span>` : ''}
      <div class="es-lista">${extras.map((t) => item(t)).join('')}</div>
    </${escolher ? 'button' : 'a'}>`;
  };
  return `
  <div class="secao-titulo"><h2>Planos</h2><span class="aviso-exemplo">Valores de exemplo</span></div>
  <div class="segmento es-periodo">${[['mensal', 'Mensal'], ['anual', 'Anual · 2 meses grátis']].map(([k, t]) => `<button type="button" data-esb-periodo="${k}" aria-pressed="${per === k}">${t}</button>`).join('')}</div>
  ${cartao('produtor', ['Estimativas Amendoim Brasil', 'Dados de exportação completos', 'Histórico de preço e sazonalidade'])}
  ${cartao('empresa', ['Tudo do Produtor', 'Paridade de exportação', 'Alertas avançados e relatório mensal', 'Até 3 pessoas da empresa'])}`;
}

const rodapeLegal = () => `<p class="mini es-legal"><a class="link-mini" href="#/termos">Termos de uso</a> · <a class="link-mini" href="#/privacidade">Privacidade (LGPD)</a></p>`;

// ---------- Conta: entrar, criar, planos, pagar, minha conta ----------
export function telaConta(sub, hh) {
  h = hh;
  if (sub === 'entrar') return telaEntrar();
  if (sub === 'criar') return telaCriar();
  if (sub === 'planos') return `${voltar('#/mercado/consultoria', 'Assinantes')}${passos(2)}${blocoPlanos(conteudo())}<a class="btn btn-verde" href="#/conta/pagar">Continuar</a>${rodapeLegal()}`;
  if (sub === 'pagar') return telaPagar();
  if (sub === 'pronto') return telaPronto();
  if (sub === 'em-breve') return `${voltar('#/mercado/consultoria', 'Assinantes')}<div class="vazio">Esta parte entra numa próxima etapa.<br>No esboço ela só mostra onde vai ficar.</div>`;
  return telaMinhaConta();
}

function passos(n) {
  const nomes = ['Conta', 'Plano', 'Pagamento'];
  return `<ol class="es-passos">${nomes.map((t, i) => `<li class="${i + 1 < n ? 'feito' : i + 1 === n ? 'atual' : ''}"><i>${i + 1 < n ? '✓' : i + 1}</i>${t}</li>`).join('')}</ol>`;
}

function telaEntrar() {
  const zap = est.modo === 'whatsapp';
  return `${voltar('#/mercado/consultoria', 'Assinantes')}
  <section class="cartao es-form">
    <b class="es-h1">Entrar</b>
    <div class="segmento">${[['whatsapp', 'Código no WhatsApp'], ['email', 'E-mail e senha']].map(([k, t]) => `<button type="button" data-esb-modo="${k}" aria-pressed="${est.modo === k}">${t}</button>`).join('')}</div>
    ${zap ? (est.codigo ? `
      <form id="esb-form-codigo" class="es-campos">
        <span class="es-txt">Mandamos um código de 6 números para o WhatsApp <b>${h.esc(est.cel)}</b>.</span>
        <div class="campo"><label for="esb-cod">Código</label><input id="esb-cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" class="es-codigo" required></div>
        ${aviso('Esboço: nenhuma mensagem é enviada. Use o código <b>123456</b>.')}
        <button class="btn btn-verde" type="submit">Entrar</button>
        <button class="dx-sair" type="button" data-esb-trocar-cel>Usar outro número</button>
      </form>` : `
      <form id="esb-form-cel" class="es-campos">
        <div class="campo"><label for="esb-cel">Seu celular com WhatsApp</label><input id="esb-cel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" required value="${h.esc(est.cel)}"></div>
        <button class="btn btn-verde" type="submit">${h.ic(h.I.zap, 'style="stroke:#fff"')}Receber código no WhatsApp</button>
        <span class="mini" style="text-align:center">Sem senha para lembrar. O código vale por 10 minutos.</span>
      </form>`) : `
      <form id="esb-form-email" class="es-campos">
        <div class="campo"><label for="esb-email">E-mail</label><input id="esb-email" type="email" autocomplete="email" placeholder="voce@exemplo.com" required></div>
        <div class="campo"><label for="esb-senha">Senha</label><input id="esb-senha" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-verde" type="submit">Entrar</button>
        <button class="dx-sair" type="button" data-esb-esqueci>Esqueci minha senha</button>
      </form>`}
    <div id="esb-msg" class="mini" role="status" style="text-align:center">${h.esc(est.msg)}</div>
  </section>
  <a class="chamada" href="#/conta/criar"><span class="cresce"><b style="font-size:15px;display:block">Ainda não tem conta?</b><span style="font-size:13px;color:#5C3A06">Crie em 1 minuto${conteudo().diasTeste ? ` e use ${conteudo().diasTeste} dias grátis` : ''}</span></span>${h.ic(h.I.seta, 'style="stroke:#5C3A06"')}</a>
  ${rodapeLegal()}`;
}

function telaCriar() {
  return `${voltar('#/mercado/consultoria', 'Assinantes')}${passos(1)}
  <form id="esb-form-criar" class="cartao es-form es-campos">
    <b class="es-h1">Criar conta</b>
    <div class="campo"><label for="cr-nome">Nome completo</label><input id="cr-nome" autocomplete="name" required></div>
    <div class="campo"><label for="cr-cel">Celular com WhatsApp</label><input id="cr-cel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" required></div>
    <div class="campo"><label for="cr-email">E-mail</label><input id="cr-email" type="email" autocomplete="email" placeholder="para recibos e nota fiscal" required></div>
    <div class="campo"><label for="cr-perfil">Você é</label><select id="cr-perfil"><option>Produtor</option><option>Indústria / beneficiadora</option><option>Exportador</option><option>Cerealista / corretor</option><option>Outro</option></select></div>
    <div class="campo"><label for="cr-senha">Crie uma senha <span style="font-weight:500">(opcional: dá para entrar só com o código do WhatsApp)</span></label><input id="cr-senha" type="password" autocomplete="new-password" minlength="8" placeholder="mínimo 8 caracteres"></div>
    <label class="es-check"><input type="checkbox" id="cr-aceite" required><span>Li e aceito os <a class="link-mini" href="#/termos" target="_blank">Termos de uso</a> e a <a class="link-mini" href="#/privacidade" target="_blank">Política de privacidade</a>.</span></label>
    <label class="es-check"><input type="checkbox" id="cr-novidades" checked><span>Quero receber avisos e boletins no WhatsApp (dá para sair quando quiser).</span></label>
    <button class="btn btn-verde" type="submit">Criar conta</button>
  </form>
  <a class="chamada" href="#/conta/entrar"><span class="cresce"><b style="font-size:15px;display:block">Já tem conta?</b><span style="font-size:13px;color:#5C3A06">Entrar com o código do WhatsApp</span></span>${h.ic(h.I.seta, 'style="stroke:#5C3A06"')}</a>`;
}

function qrFalso() {
  let s = 7, q = '';
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const canto = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#1B1B17"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#1B1B17"/>`;
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    if ((x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16)) continue;
    if (r() > 0.52) q += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="-1 -1 27 27" class="es-qr" aria-label="QR Code Pix de exemplo"><rect x="-1" y="-1" width="27" height="27" fill="#fff"/><g fill="#1B1B17">${q}</g>${canto(0, 0)}${canto(18, 0)}${canto(0, 18)}</svg>`;
}

function telaPagar() {
  const c = conteudo(), p = c.planos[est.plano], v = p[est.periodo], s = sessao();
  if (est.etapaPg === 'pix') {
    return `${voltar('#/conta/pagar', 'Pagamento', 'data-esb-pg-voltar')}${passos(3)}
    <section class="cartao es-form" style="align-items:center;text-align:center">
      <b class="es-h1">${c.diasTeste ? 'Teste grátis começando' : 'Pague com Pix'}</b>
      <span class="es-txt">${c.diasTeste ? `Nada a pagar hoje. Quando acabarem os ${c.diasTeste} dias grátis, chega no seu WhatsApp e e-mail um Pix como este, de <b class="num">${preco(v)}</b>. É só abrir o app do banco › Pix › Ler QR Code.` : `Abra o app do seu banco, escolha Pix › Ler QR Code. <b class="num">${preco(v)}</b>`}</span>
      ${qrFalso()}
      <button class="btn btn-escuro btn-pequeno" type="button" data-esb-copiar>Copiar código Pix (copia e cola)</button>
      <span class="mini">Assim que o banco confirmar, o acesso libera sozinho. ${est.periodo === 'mensal' ? 'Nos próximos meses o Pix chega no seu WhatsApp e e-mail 5 dias antes de vencer.' : ''}</span>
      ${aviso('Esboço: este QR Code é falso. Na versão final ele vem do Asaas.')}
      <button class="btn btn-verde" type="button" data-esb-simular-pago style="width:100%">${c.diasTeste ? 'Simular: começar teste grátis' : 'Simular: pagamento confirmado'}</button>
    </section>`;
  }
  if (est.etapaPg === 'cartao') {
    return `${voltar('#/conta/pagar', 'Pagamento', 'data-esb-pg-voltar')}${passos(3)}
    <section class="cartao es-form" style="align-items:center;text-align:center">
      ${h.ic(h.I.escudo, 'style="width:44px;height:44px;stroke:#007731"')}
      <b class="es-h1">Página segura do Asaas</b>
      <span class="es-txt">O número do cartão é digitado na página do Asaas, não no app. A Amendoim Brasil nunca vê nem guarda o seu cartão.</span>
      <span class="es-txt">Cobrança automática de <b class="num">${preco(v)}</b> ${est.periodo === 'anual' ? 'por ano' : 'todo mês'}. Cancele quando quiser em Minha conta.</span>
      ${aviso('Esboço: nenhuma página de pagamento é aberta.')}
      <button class="btn btn-verde" type="button" data-esb-simular-pago style="width:100%">Simular: cartão aprovado</button>
    </section>`;
  }
  return `${voltar('#/conta/planos', 'Planos')}${passos(3)}
  <section class="cartao es-form">
    <div class="cartao-cab"><span class="rotulo">Seu plano</span><a class="link-mini" href="#/conta/planos">trocar</a></div>
    <div class="cartao-cab"><b style="font-size:17px">${h.esc(p.nome)} · ${est.periodo}</b><b class="num" style="font-size:17px">${preco(v)}</b></div>
    ${c.diasTeste ? `<span class="mini">Hoje você não paga nada: a primeira cobrança é depois de ${c.diasTeste} dias grátis.</span>` : ''}
  </section>
  <form id="esb-form-pagar" class="cartao es-form es-campos">
    <div class="campo"><label for="pg-doc">CPF ou CNPJ <span style="font-weight:500">(para o recibo e a nota fiscal)</span></label><input id="pg-doc" inputmode="numeric" placeholder="000.000.000-00" required></div>
    <span class="rotulo">Forma de pagamento</span>
    <div class="es-formas">
      ${[['pix', 'Pix', 'Código todo mês no WhatsApp'], ['cartao', 'Cartão de crédito', 'Cobra sozinho, sem esquecer']].map(([k, t, d]) => `<button type="button" class="es-forma" data-esb-forma="${k}" aria-pressed="${est.forma === k}"><b>${t}</b><span class="mini">${d}</span></button>`).join('')}
    </div>
    <button class="btn btn-verde" type="submit">${c.diasTeste ? `Começar ${c.diasTeste} dias grátis` : est.forma === 'pix' ? 'Gerar Pix' : 'Ir para o pagamento seguro'}</button>
    <span class="mini" style="text-align:center">Pagamento processado pelo Asaas. ${s ? '' : 'Você precisa estar com a conta criada.'}</span>
  </form>`;
}

function telaPronto() {
  const s = sessao();
  return `<section class="destaque" style="gap:12px;margin-top:20px;text-align:center;align-items:center">
    ${h.ic(ok, 'style="width:52px;height:52px;stroke:#F4AD46;stroke-width:2.6"')}
    <b style="font-size:22px">Assinatura ativa</b>
    <span style="font-size:15px;opacity:.95">Bem-vindo${s?.nome ? ', ' + h.esc(s.nome.split(' ')[0]) : ''}! O recibo foi para o seu e-mail.</span>
    <a class="btn btn-amendoim" href="#/estimativas" style="width:100%">Ver Estimativas Amendoim Brasil</a>
    <a class="btn-branco" href="#/mercado/consultoria" style="width:100%">Ir para a área do assinante</a>
  </section>`;
}

function telaMinhaConta() {
  const s = sessao();
  if (!s) return `${voltar('#/mercado/consultoria', 'Assinantes')}<div class="vazio">Você ainda não entrou.<br><a class="btn btn-verde btn-pequeno" href="#/conta/entrar" style="margin-top:12px">Entrar</a></div>`;
  const c = conteudo(), p = c.planos[s.plano || 'produtor'];
  const st = { ativo: ['Ativa', 'pilula-verde'], cortesia: ['Cortesia', 'pilula-verde'], atrasado: ['Pagamento atrasado', 'pilula-amendoim'], cancelado: ['Cancelada', 'pilula-amendoim'], sem: ['Sem assinatura', 'pilula-amendoim'] }[s.status || 'sem'];
  const linha = (a, b) => `<div class="lista-linha"><span class="cresce mini" style="font-size:14px">${a}</span><b style="font-size:15px;text-align:right">${b}</b></div>`;
  return `${voltar('#/mercado/consultoria', 'Assinantes')}
  <section class="cartao" style="gap:0;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 6px"><b style="font-size:18px">${h.esc(s.nome || 'Assinante')}</b><span class="pilula ${st[1]}">${st[0]}</span></div>
    ${linha('Celular', h.esc(s.celular || '—'))}
    ${linha('E-mail', h.esc(s.email || '—'))}
    ${linha('Plano', s.status === 'cortesia' ? 'Consultoria (cortesia)' : `${h.esc(p.nome)} · ${h.esc(s.periodo || 'mensal')}`)}
    ${linha('Próxima cobrança', s.status === 'ativo' ? `${h.esc(s.vence || '—')} · ${preco(p[s.periodo || 'mensal'])}` : '—')}
    ${linha('Pagamento', h.esc(s.forma === 'cartao' ? 'Cartão de crédito' : s.forma === 'pix' ? 'Pix' : '—'))}
  </section>
  <div class="es-botoes">
    <a class="btn btn-escuro btn-pequeno" href="#/conta/planos">Trocar de plano</a>
    ${s.status === 'ativo' ? `<button class="btn btn-pequeno es-btn-claro" type="button" data-esb-cancelar>Cancelar assinatura</button>` : ''}
  </div>
  ${est.cancelar ? `<section class="cartao" style="border-color:#E8B4B0">
    <b style="font-size:15px">Cancelar a assinatura?</b>
    <span class="es-txt">Você continua com acesso até ${h.esc(s.vence || 'o fim do período pago')}. Depois disso, não há nova cobrança.</span>
    <div class="es-botoes"><button class="btn btn-pequeno btn-perigo" type="button" data-esb-cancelar-ok>Sim, cancelar</button><button class="btn btn-pequeno es-btn-claro" type="button" data-esb-cancelar-nao>Manter</button></div>
  </section>` : ''}
  <section class="cartao" style="gap:10px">
    <span class="rotulo">Seus dados (LGPD)</span>
    <span class="es-txt">Você pode baixar ou apagar seus dados a qualquer momento.</span>
    <div class="es-botoes"><button class="btn btn-pequeno es-btn-claro" type="button" data-esb-lgpd="baixar">Baixar meus dados</button><button class="btn btn-pequeno es-btn-claro" type="button" data-esb-lgpd="excluir">Excluir minha conta</button></div>
    <div id="esb-lgpd-msg" class="mini" role="status"></div>
  </section>
  <section class="cartao es-teste" style="gap:10px">
    <span class="rotulo">Só no esboço: simular situação</span>
    <div class="chips">${[['ativo', 'Produtor ativo', 'produtor'], ['empresa', 'Empresa ativa', 'empresa'], ['cortesia', 'Cortesia', 'produtor'], ['atrasado', 'Atrasado', 'produtor'], ['sem', 'Sem assinatura', 'produtor']].map(([k, t]) => `<button class="chip" type="button" data-esb-simular="${k}" aria-pressed="${(k === 'empresa' ? s.plano === 'empresa' && s.status === 'ativo' : k === 'ativo' ? s.plano !== 'empresa' && s.status === 'ativo' : s.status === k)}">${t}</button>`).join('')}</div>
    <button class="chip" type="button" data-esb-rever-bv>Rever as boas-vindas</button>
  </section>
  <button class="btn btn-escuro" type="button" data-esb-sair>Sair da conta</button>
  ${rodapeLegal()}`;
}

// ---------- Estimativas Amendoim Brasil ----------
export function telaEstimativas(hh) {
  h = hh;
  const c = conteudo(), s = sessao(), lib = assinante();
  const lista = c.estimativas;
  const prods = lista.map(producao);
  const ult = lista[lista.length - 1], pu = prods[prods.length - 1], pa = prods[prods.length - 2], p0 = prods[0];
  const areaMeio = (e) => (e.areaMin + e.areaMax) / 2;
  const varArea = lista.length > 1 ? ((areaMeio(ult) - areaMeio(lista[lista.length - 2])) / areaMeio(lista[lista.length - 2])) * 100 : null;
  const varProd = pa ? ((pu.scMeio - pa.scMeio) / pa.scMeio) * 100 : null;
  const vc = (v) => (v == null ? '' : `<span class="${v > 0 ? 'dx-sobe' : v < 0 ? 'dx-cai' : ''}">${v > 0 ? '+' : ''}${nf(v, 0)}%</span>`);
  const max = Math.max(...prods.map((p) => p.scMax));
  const b = c.balanco, rend = b.rendimento / 100;
  const ref = lista[lista.length - 2] || ult, pRef = pa || pu; // balanço da safra que está sendo comercializada
  const consumoGrao = b.consumoKgHab * b.populacaoMi; // mil t de grão
  const consumoCasca = consumoGrao / rend;
  const semente = ult.areaMin * b.sementeKgHa / 1000; // mil t casca para plantar a próxima safra
  const tRef = pRef.tMeio / 1000; // mil t

  const corpo = `
  <section class="cartao" style="gap:6px">
    <div class="cartao-cab"><b class="es-h1" style="font-size:20px">Estimativas Amendoim Brasil</b></div>
    <span class="mini">Estimativa própria · atualizada em ${h.esc(c.atualizado)} · Helder Lamberti</span>
  </section>
  <div class="dx-tiles">
    <div class="dx-tile"><span>Área ${h.esc(ult.safra)}</span><b>${faixa(ult.areaMin, ult.areaMax)} mil ha</b><small>${vc(varArea)} vs ${h.esc(lista[lista.length - 2]?.safra || '')}</small></div>
    <div class="dx-tile"><span>Produção ${h.esc(ult.safra)}</span><b>${nf(pu.scMeio / 1e6, 1)} mi sc</b><small>${vc(varProd)} vs ${h.esc(lista[lista.length - 2]?.safra || '')}</small></div>
    <div class="dx-tile"><span>Produtividade</span><b>${faixa(ult.prodMin, ult.prodMax)} sc/alq</b><small>${h.esc(ult.situacao)}</small></div>
  </div>

  <section class="cartao dx-cartao">
    <div class="cartao-cab"><span class="rotulo">Área e produção por safra</span><span class="mini">casca · saca 25 kg</span></div>
    <div class="tabela-rolar"><table class="tabela dx-tabela">
      <thead><tr><th>Safra</th><th>Área<br>mil ha</th><th>Produtiv.<br>sc/alq</th><th>Produção<br>mi sc</th><th>Produção<br>mil t</th></tr></thead>
      <tbody>${lista.map((e, i) => `<tr><th>${h.esc(e.safra)}${e.situacao === 'Preliminar' ? '*' : ''}</th><td class="num">${faixa(e.areaMin, e.areaMax)}</td><td class="num">${faixa(e.prodMin, e.prodMax)}</td><td class="num">${faixa(prods[i].scMin / 1e6, prods[i].scMax / 1e6, 1)}</td><td class="num">${faixa(Math.round(prods[i].tMin / 1000), Math.round(prods[i].tMax / 1000))}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="es-barras">${lista.map((e, i) => `<div class="es-barra-ano"><span>${h.esc(e.safra)}</span><div class="es-barra"><i style="width:${(prods[i].scMin / max) * 100}%"></i>${prods[i].scMax > prods[i].scMin ? `<i class="faixa" style="width:${((prods[i].scMax - prods[i].scMin) / max) * 100}%"></i>` : ''}</div><b class="num">${nf(prods[i].scMeio / 1e6, 1)}</b></div>`).join('')}</div>
    <span class="mini dx-nota">*${h.esc(ult.safra)}: preliminar, com a produtividade média do Brasil. Em relação a ${h.esc(lista[0].safra)}, a produção cai ${nf((1 - pu.scMeio / p0.scMeio) * 100, 0)}%.</span>
  </section>

  ${c.comentario ? `<section class="boletim" style="gap:8px"><span class="tag">${h.ic(h.I.doc, 'style="width:18px;height:18px"')}Leitura do Helder</span><p style="margin:0">${h.esc(c.comentario)}</p></section>` : ''}

  <section class="cartao dx-cartao">
    <div class="cartao-cab"><span class="rotulo">Balanço ${h.esc(ref.safra)} por exclusão</span><span class="mini">mil t em casca</span></div>
    <div class="tabela-rolar"><table class="tabela dx-tabela es-balanco">
      <tbody>
        <tr class="dx-sub"><th>Produção ${h.esc(ref.safra)}</th><td class="num">${nf(tRef, 0)}</td></tr>
        <tr><th>(−) Exportação amendoim<br><small>Comex Stat, grão convertido em casca</small></th><td class="num es-auto">automático</td></tr>
        <tr><th>(−) Exportação de óleo<br><small>Comex Stat, em casca equivalente</small></th><td class="num es-auto">automático</td></tr>
        <tr><th>(−) Consumo interno<br><small>${nf(b.consumoKgHab, 1)} kg/hab × ${nf(b.populacaoMi)} mi hab</small></th><td class="num">${nf(consumoCasca, 0)}</td></tr>
        <tr><th>(−) Semente para ${h.esc(ult.safra)}<br><small>${nf(ult.areaMin)} mil ha × ${nf(b.sementeKgHa)} kg/ha</small></th><td class="num">${nf(semente, 0)}</td></tr>
      </tbody>
      <tfoot><tr><th>(=) Sobra para esmagamento e estoque</th><td class="num es-auto">automático</td></tr></tfoot>
    </table></div>
    <span class="mini dx-nota">Rendimento casca → grão de ${nf(b.rendimento)}%. As exportações entram sozinhas do Comex Stat na versão final (ano comercial de março a fevereiro). Os parâmetros você ajusta no painel.</span>
  </section>

  <section class="cartao" style="gap:6px">
    <span class="rotulo">Como a conta é feita</span>
    <span class="es-txt">1 alqueire paulista = 2,42 ha · saca de 25 kg em casca · produção = área ÷ 2,42 × sacas por alqueire.</span>
  </section>
  <p class="mini es-legal">Conteúdo exclusivo de assinantes. Proibido repassar ou publicar sem autorização.</p>`;

  if (!lib) {
    return `${voltar('#/mercado/consultoria', 'Assinantes')}
    <div class="es-travado"><div class="es-borrado" aria-hidden="true">${corpo}</div>
      <section class="cartao es-cadeado">
        ${h.ic(h.I.cadeado, 'style="width:34px;height:34px;stroke:#7A4A08"')}
        <b class="es-h1" style="text-align:center">Estimativas Amendoim Brasil</b>
        <span class="es-txt" style="text-align:center">Área, produção e balanço de cada safra, com a leitura do Helder. Exclusivo para assinantes.</span>
        <a class="btn btn-verde" href="#/conta/criar" style="width:100%">Assinar${conteudo().diasTeste ? ` · ${conteudo().diasTeste} dias grátis` : ''}</a>
        <a class="btn btn-escuro" href="#/conta/entrar" style="width:100%">Já sou assinante</a>
      </section>
    </div>`;
  }
  // Marca d'água com o nome de quem está logado: desestimula print repassado.
  const marca = h.esc(`${s.nome || ''} · ${s.celular || s.email || ''}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="160"><text x="10" y="110" transform="rotate(-24 130 80)" font-family="sans-serif" font-size="13" font-weight="700" fill="#1B1B17" fill-opacity=".07">${marca}</text></svg>`;
  return `${voltar('#/mercado/consultoria', 'Assinantes')}<div class="es-marca" style="background-image:url('data:image/svg+xml,${encodeURIComponent(svg)}')">${corpo}</div>`;
}

// ---------- Termos e Privacidade (rascunhos) ----------
const secao = (t, ps) => `<section><h2>${t}</h2>${ps.map((p) => `<p>${p}</p>`).join('')}</section>`;
export function telaTermos(hh) {
  h = hh;
  return `${voltar('#/mercado/consultoria', 'Voltar')}
  <article class="leitura">
    <span class="tag-boletim">RASCUNHO · revisar com advogado(a) antes de cobrar</span>
    <h1>Termos de uso</h1>
    <span class="mini">Amendoim Brasil · [razão social] · CNPJ [00.000.000/0000-00]</span>
    ${secao('1. O que é o app', ['O Amendoim Brasil reúne cotações, clima, notícias, ferramentas e análises do mercado de amendoim. Parte do conteúdo é gratuita e parte é exclusiva para assinantes.'])}
    ${secao('2. Cadastro', ['Para assinar, você cria uma conta com nome, celular e e-mail verdadeiros e mantém esses dados atualizados. A conta é pessoal: o acesso pode ser usado em até 2 aparelhos ao mesmo tempo (no plano Empresa, até 3 pessoas).'])}
    ${secao('3. Assinatura e pagamento', ['A assinatura é mensal ou anual e é renovada automaticamente até você cancelar. O pagamento é feito por Pix ou cartão de crédito e processado pelo Asaas. A Amendoim Brasil não recebe nem guarda dados do seu cartão.', 'Os preços podem mudar; qualquer mudança é avisada com pelo menos 30 dias de antecedência e vale a partir da renovação seguinte.'])}
    ${secao('4. Cancelamento e arrependimento', ['Você pode cancelar a qualquer momento em Minha conta. O acesso continua até o fim do período já pago. Na primeira contratação, você pode desistir em até 7 dias e receber o valor de volta (Código de Defesa do Consumidor, art. 49).'])}
    ${secao('5. Uso do conteúdo', ['O conteúdo exclusivo (estimativas, relatórios e dados organizados) é para uso próprio. Não é permitido copiar, repassar, revender ou publicar sem autorização por escrito. Contas usadas para repassar o conteúdo podem ser suspensas.'])}
    ${secao('6. Natureza das informações', ['Preços, estimativas e análises são informativos, feitos com base em fontes públicas e no levantamento da Amendoim Brasil. Não são recomendação garantida de compra ou venda, e as decisões de comercialização são de quem as toma. Estimativas podem ser revisadas.'])}
    ${secao('7. Disponibilidade', ['Trabalhamos para manter o app no ar, mas ele pode ficar fora em manutenções ou por falha de fontes externas (IEA, Conab, Comex Stat, USDA, serviços de clima).'])}
    ${secao('8. Contato e foro', ['Dúvidas: WhatsApp da Amendoim Brasil ou [e-mail de contato]. Fica eleito o foro da comarca de [cidade/UF].'])}
  </article>`;
}

export function telaPrivacidade(hh) {
  h = hh;
  return `${voltar('#/mercado/consultoria', 'Voltar')}
  <article class="leitura">
    <span class="tag-boletim">RASCUNHO · revisar com advogado(a) antes de cobrar</span>
    <h1>Política de privacidade</h1>
    <span class="mini">Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018)</span>
    ${secao('Quem cuida dos seus dados', ['[Razão social], CNPJ [00.000.000/0000-00], responsável pelo app Amendoim Brasil. Encarregado (DPO): [nome] · [e-mail de contato].'])}
    ${secao('Quais dados coletamos', ['Sem conta: o município escolhido para o clima e contagens anônimas de uso (quais telas abrem), sem nome nem celular.', 'Com conta: nome, celular, e-mail, perfil (produtor, indústria…) e, para cobrar, CPF ou CNPJ. Os dados do cartão ficam só com o Asaas.', 'Localização: só quando você permite, para mostrar a previsão da sua região. Não guardamos o histórico de onde você esteve.'])}
    ${secao('Para que usamos', ['Dar acesso à sua conta e ao conteúdo assinado; cobrar e emitir recibo e nota fiscal; enviar avisos que você escolheu (preço, chuva, boletins); melhorar o app com números agregados.'])}
    ${secao('Com quem compartilhamos', ['Asaas (pagamentos), Supabase (contas e banco de dados), Netlify (hospedagem) e o provedor de WhatsApp que envia os códigos de acesso. Não vendemos nem alugamos seus dados.'])}
    ${secao('Por quanto tempo guardamos', ['Enquanto a conta existir. Depois de excluída, apagamos em até 30 dias, exceto o que a lei obriga a guardar (por exemplo, dados fiscais por 5 anos).'])}
    ${secao('Seus direitos', ['Você pode ver, corrigir, baixar ou excluir seus dados e retirar consentimentos a qualquer momento, em Minha conta ou pelo nosso contato. Respondemos em até 15 dias.'])}
    ${secao('Segurança', ['Conexão criptografada (https), senhas guardadas de forma cifrada e acesso aos dados restrito ao responsável pelo app.'])}
  </article>`;
}

// ---------- Tela inicial: chamada para as estimativas ----------
export function cartaoEstimativaInicio(hh) {
  h = hh;
  const c = conteudo(), ult = c.estimativas[c.estimativas.length - 1];
  return `<a class="cartao es-chamada-inicio" href="#/estimativas" data-ev="esb-estimativa-inicio">
    <div class="cartao-cab"><span class="rotulo">Estimativa de safra ${h.esc(ult.safra)}</span><span class="pilula pilula-amendoim" style="font-size:11px">${assinante() ? 'ASSINANTE' : 'EXCLUSIVO'}</span></div>
    <b style="font-size:17px;line-height:1.3">Quanto amendoim o Brasil vai colher? Área, produção e balanço da Amendoim Brasil</b>
    <span class="mini" style="display:flex;align-items:center;gap:6px">${h.ic(assinante() ? h.I.seta : h.I.cadeado, 'style="width:15px;height:15px;stroke:#7A4A08"')}${assinante() ? 'Ver a estimativa' : 'Para assinantes · veja os planos'}</span>
  </a>`;
}

// ---------- Boas-vindas no primeiro acesso ----------
let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; });
const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const iphone = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
export const boasVindasFeitas = () => { try { return !!localStorage.getItem(CHAVE_BV); } catch (e) { return true; } };
const marcarBV = () => { try { localStorage.setItem(CHAVE_BV, '1'); } catch (e) { /* ignora */ } };

function passosBV() {
  const l = ['local'];
  if (!instalado()) l.push('instalar');
  l.push('avisos');
  return l;
}
let bv = { i: 0, msg: '' };
function desenharBV() {
  let el = document.getElementById('esb-bv');
  if (!el) { el = document.createElement('div'); el.id = 'esb-bv'; el.className = 'es-bv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  const lista = passosBV(), passo = lista[bv.i];
  const pontos = `<div class="es-pontos">${lista.map((_, k) => `<i class="${k === bv.i ? 'atual' : k < bv.i ? 'feito' : ''}"></i>`).join('')}</div>`;
  const icone = (p) => h.ic(p, 'style="width:34px;height:34px;stroke:#007731"');
  let miolo = '';
  if (passo === 'local') miolo = `${icone(h.I.pino)}<b class="es-h1">Preço e chuva da sua região</b>
    <span class="es-txt">Com a sua localização, o app mostra a previsão do tempo e a recomendação de plantio do seu município. Ela fica só no seu celular.</span>
    <button class="btn btn-verde" type="button" data-bv="local">Usar minha localização</button>`;
  if (passo === 'instalar') miolo = `${icone('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>')}<b class="es-h1">Coloque o app na tela inicial</b>
    <span class="es-txt">Abre num toque, como um aplicativo, e funciona mesmo com sinal fraco na roça.</span>
    ${iphone() ? `<ol class="es-ios"><li>Toque em <b>Compartilhar</b> ${h.ic(h.I.enviar, 'style="width:18px;height:18px;vertical-align:-3px;stroke:#2F6FA3"')} na barra do Safari</li><li>Escolha <b>Adicionar à Tela de Início</b></li><li>Toque em <b>Adicionar</b></li></ol>
      <button class="btn btn-verde" type="button" data-bv="proximo">Já adicionei</button>`
      : `<button class="btn btn-verde" type="button" data-bv="instalar">Instalar o app</button>`}`;
  if (passo === 'avisos') miolo = `${icone(h.I.sino)}<b class="es-h1">Avisos de preço e chuva</b>
    <span class="es-txt">Receba no celular quando o preço do IEA mudar, quando chegar o boletim ou chuva forte na sua região. Você escolhe o que quer.</span>
    ${iphone() && !instalado() ? `<span class="mini">No iPhone, os avisos funcionam depois que o app está na tela inicial.</span>` : ''}
    <button class="btn btn-verde" type="button" data-bv="avisos">Escolher meus avisos</button>`;
  el.innerHTML = `<div class="es-bv-fundo"></div><section class="es-bv-folha">
    <div class="cartao-cab"><span class="rotulo">Bem-vindo ao Amendoim Brasil</span><button class="es-bv-fechar" type="button" data-bv="fechar" aria-label="Fechar">×</button></div>
    ${pontos}<div class="es-bv-miolo">${miolo}</div>
    <div class="mini" role="status" style="text-align:center;min-height:16px">${h.esc(bv.msg)}</div>
    <button class="dx-sair" type="button" data-bv="pular">${bv.i < lista.length - 1 ? 'Agora não' : 'Pular'}</button>
  </section>`;
}
function fecharBV() { marcarBV(); document.getElementById('esb-bv')?.remove(); }
function avancarBV(msg = '') {
  bv.msg = msg;
  if (bv.i >= passosBV().length - 1) { fecharBV(); return; }
  bv.i++; desenharBV();
}
export function mostrarBoasVindas(hh) { h = hh; bv = { i: 0, msg: '' }; desenharBV(); }

// ---------- eventos ----------
export function ligarEsboco(opcoes) {
  ctx = { ...ctx, ...opcoes };
  const entrar = (dados) => {
    const atual = sessao();
    salvarSessao({ nome: 'Assinante de teste', status: 'ativo', plano: 'produtor', periodo: 'anual', forma: 'cartao', vence: '07/10/2027', ...(atual || {}), ...dados });
    est.codigo = false; est.msg = '';
    ctx.evento('esb-login');
    location.hash = '#/mercado/consultoria';
  };

  document.addEventListener('click', async (e) => {
    const t = e.target;
    const q = (s) => t.closest(s);
    let x;
    if ((x = q('[data-esb-modo]'))) { est.modo = x.dataset.esbModo; est.msg = ''; ctx.render(false); return; }
    if ((x = q('[data-esb-periodo]'))) { est.periodo = x.dataset.esbPeriodo; ctx.render(false); return; }
    if ((x = q('[data-esb-plano]'))) { est.plano = x.dataset.esbPlano; ctx.render(false); return; }
    if ((x = q('[data-esb-forma]'))) { est.forma = x.dataset.esbForma; ctx.render(false); return; }
    if (q('[data-esb-pg-voltar]')) { est.etapaPg = ''; ctx.render(); return; }
    if (q('[data-esb-trocar-cel]')) { est.codigo = false; ctx.render(false); return; }
    if (q('[data-esb-esqueci]')) { const m = document.getElementById('esb-msg'); if (m) m.textContent = 'Esboço: na versão final chega um link no seu e-mail para criar uma senha nova.'; return; }
    if (q('[data-esb-copiar]')) { try { await navigator.clipboard.writeText('00020126PIX-DE-EXEMPLO-AMENDOIM-BRASIL'); } catch (er) { /* ignora */ } q('[data-esb-copiar]').textContent = 'Código copiado'; return; }
    if (q('[data-esb-simular-pago]')) {
      const s = sessao() || {};
      salvarSessao({ ...s, status: 'ativo', plano: est.plano, periodo: est.periodo, forma: est.etapaPg, vence: est.periodo === 'anual' ? '07/10/2027' : '07/11/2026' });
      est.etapaPg = ''; ctx.evento('esb-pagou'); location.hash = '#/conta/pronto'; return;
    }
    if (q('[data-esb-cancelar]')) { est.cancelar = true; ctx.render(false); return; }
    if (q('[data-esb-cancelar-nao]')) { est.cancelar = false; ctx.render(false); return; }
    if (q('[data-esb-cancelar-ok]')) { const s = sessao(); salvarSessao({ ...s, status: 'cancelado' }); est.cancelar = false; ctx.render(false); return; }
    if ((x = q('[data-esb-lgpd]'))) { const m = document.getElementById('esb-lgpd-msg'); if (m) m.textContent = x.dataset.esbLgpd === 'baixar' ? 'Esboço: na versão final baixa um arquivo com todos os seus dados.' : 'Esboço: na versão final pede confirmação e apaga a conta em até 30 dias.'; return; }
    if ((x = q('[data-esb-simular]'))) {
      const k = x.dataset.esbSimular, s = sessao() || {};
      salvarSessao({ ...s, status: k === 'empresa' ? 'ativo' : k, plano: k === 'empresa' ? 'empresa' : 'produtor', periodo: s.periodo || 'mensal', vence: s.vence || '07/11/2026' });
      ctx.render(false); return;
    }
    if (q('[data-esb-rever-bv]')) { mostrarBoasVindas(h); return; }
    if (q('[data-esb-sair]')) { salvarSessao(null); location.hash = '#/mercado/consultoria'; return; }

    if ((x = q('[data-bv]'))) {
      const a = x.dataset.bv;
      if (a === 'fechar' || (a === 'pular' && bv.i >= passosBV().length - 1)) { fecharBV(); return; }
      if (a === 'pular' || a === 'proximo') { avancarBV(); return; }
      if (a === 'local') {
        x.disabled = true; x.textContent = 'Buscando sua localização…';
        const m = await ctx.localizar();
        avancarBV(m ? 'Pronto: previsão da sua região ativada.' : 'Sem localização: escolha o município na aba Clima.');
        return;
      }
      if (a === 'instalar') {
        if (pedidoInstalar) { pedidoInstalar.prompt(); const r = await pedidoInstalar.userChoice.catch(() => null); pedidoInstalar = null; avancarBV(r?.outcome === 'accepted' ? 'App instalado.' : ''); }
        else avancarBV('Use o menu ⋮ do navegador › Instalar app.');
        return;
      }
      if (a === 'avisos') { fecharBV(); location.hash = '#/alertas'; return; }
    }
  });

  document.addEventListener('submit', (e) => {
    const id = e.target.id;
    if (!id.startsWith('esb-form-')) return;
    e.preventDefault();
    const v = (s) => (document.getElementById(s)?.value || '').trim();
    if (id === 'esb-form-cel') { est.cel = v('esb-cel'); est.codigo = true; ctx.render(false); setTimeout(() => document.getElementById('esb-cod')?.focus(), 50); return; }
    if (id === 'esb-form-codigo') {
      if (v('esb-cod') !== '123456') { est.msg = 'Código incorreto. No esboço, use 123456.'; ctx.render(false); return; }
      entrar({ celular: est.cel }); return;
    }
    if (id === 'esb-form-email') { entrar({ email: v('esb-email') }); return; }
    if (id === 'esb-form-criar') {
      salvarSessao({ nome: v('cr-nome'), celular: v('cr-cel'), email: v('cr-email'), perfil: v('cr-perfil'), status: 'sem', plano: 'produtor' });
      if (/Indústria|Exportador/.test(v('cr-perfil'))) est.plano = 'empresa';
      ctx.evento('esb-criou'); location.hash = '#/conta/planos'; return;
    }
    if (id === 'esb-form-pagar') {
      if (!sessao()) { location.hash = '#/conta/criar'; return; }
      est.etapaPg = est.forma; ctx.render(); return;
    }
  });

  window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/conta/pagar')) est.etapaPg = ''; est.cancelar = false; });
}
