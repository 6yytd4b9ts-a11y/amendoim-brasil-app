// Painel · fase de teste (piloto): convidados, interruptor, códigos a repassar e uso. Só o administrador (login por celular).
import { sessao } from '/esboco-dados.js';
import { chamarAdmin, pedirCodigo, verificarCodigo } from '/auth.js';

const est = { aba: null, dados: null, uso: null, carregando: false, erro: '', msg: '', editando: null, ver: false, login: { etapa: 'cel', cel: '', msg: '', manual: false }, confirma: false };
let redesenhar = () => {};
let timer = null;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eAdmin = () => { const s = sessao(); return !!(s && s.remoto && s.papel === 'admin'); };
const fmtCel = (c) => {
  const d = String(c || '');
  if (/^55\d{10,11}$/.test(d)) { const n = d.slice(4); return `(${d.slice(2, 4)}) ${n.length === 9 ? n.slice(0, 5) + '-' + n.slice(5) : n.slice(0, 4) + '-' + n.slice(4)}`; }
  return d;
};
const quando = (iso, vazio = 'nunca entrou') => {
  if (!iso) return vazio;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 2 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`;
};
const msgCodigo = (cod) => `Amendoim Brasil\nSeu código de acesso: ${cod}\nVale por 10 minutos. Não compartilhe com ninguém.`;
const NOMES = { '/inicio': 'Início', '/mercado': 'Mercado', '/mercado/consultoria': 'Área do assinante', '/mercado/hoje': 'Mercado hoje', '/mercado/dados': 'Exportação do Brasil', '/mercado/historico': 'Histórico de preço', '/mercado/termometro': 'Termômetro', '/estimativas': 'Estimativas', '/agenda': 'Agenda', '/terminal': 'Terminal (exportação)', '/destinos': 'Preço por destino', '/dolar': 'Dólar', '/clima': 'Clima', '/ferramentas': 'Ferramentas', '/negociar': 'Negociar', '/alertas': 'Alertas', '/conta': 'Minha conta', '/perfil': 'Perfil' };
const nomeTela = (r) => NOMES[r] || r;

async function carregar(forcar = false) {
  if (est.carregando) return;
  est.carregando = true; est.erro = '';
  const aba = est.aba;
  const r = await chamarAdmin(aba === 'piloto' ? 'admin_uso' : 'admin_listar');
  est.carregando = false;
  if (r.ok) { if (aba === 'piloto') est.uso = r; else est.dados = r; } else est.erro = r.mensagem || 'Não foi possível carregar.';
  redesenhar();
  if (forcar) return;
}

export function abrirAbaPiloto(aba) {
  est.aba = aba; est.erro = ''; est.msg = '';
  if (eAdmin()) carregar();
}

// ---------- entrar como administrador ----------
function telaLogin() {
  const l = est.login;
  const caixa = l.etapa === 'cel'
    ? `<form id="pp-f-cel" class="es-campos"><div class="campo"><label for="pp-cel">Seu celular (administrador)</label><input id="pp-cel" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 90000-0000" value="${esc(l.cel)}" required></div>
        <button class="btn btn-verde" type="submit">Receber o código</button></form>`
    : `<form id="pp-f-cod" class="es-campos"><span class="es-txt">Código de 6 números para <b>${esc(l.cel)}</b>.${l.manual ? ' O envio automático ainda não está ligado: o código aparece para você no banco; peça aqui na conversa com o Claude.' : ''}</span>
        <div class="campo"><label for="pp-cod">Código</label><input id="pp-cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" required></div>
        <button class="btn btn-verde" type="submit">Entrar</button><button class="dx-sair" type="button" data-pp-outro>Usar outro número</button></form>`;
  return `<section class="cartao es-form" style="gap:10px"><b class="es-h1">Entrar como administrador</b>
    <span class="es-txt">Esta área controla os convidados da fase de teste. Entre com o seu celular, uma vez por aparelho.</span>${caixa}
    <div class="mini" role="status" style="text-align:center">${esc(l.msg)}</div></section>`;
}

// ---------- convidados ----------
function blocoCodigos() {
  const l = est.dados?.codigos || [];
  if (!l.length) return '<span class="es-txt">Nenhum pedido de código agora. Quando alguém digitar o número no app, o código aparece aqui para você repassar.</span>';
  return l.map((c) => `<div class="lista-linha" style="gap:10px;align-items:center">
    <span class="cresce"><b style="font-size:15px">${esc(c.nome || fmtCel(c.celular))}</b><br><span class="mini">${esc(fmtCel(c.celular))} · vale até ${new Date(c.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></span>
    <b class="num" style="font-size:24px;letter-spacing:2px">${esc(c.codigo)}</b>
    <a class="btn btn-verde btn-pequeno" target="_blank" rel="noopener" href="https://wa.me/${esc(c.celular)}?text=${encodeURIComponent(msgCodigo(c.codigo))}">WhatsApp</a>
  </div>`).join('');
}

export function telaConvidadosP() {
  if (!eAdmin()) return telaLogin();
  if (!est.dados) return `<section class="cartao"><div class="vazio">${est.erro ? `${esc(est.erro)} <button class="link-mini" type="button" data-pp-recarregar>Tentar de novo</button>` : 'Carregando…'}</div></section>`;
  clearInterval(timer);
  timer = setInterval(async () => {
    const el = document.getElementById('pp-codigos');
    if (!el) { clearInterval(timer); return; }
    if (document.visibilityState !== 'visible') return;
    const r = await chamarAdmin('admin_listar');
    if (r.ok) { est.dados = r; el.innerHTML = blocoCodigos(); }
  }, 8000);
  const d = est.dados, e = est.editando, lista = d.convidados;
  const ligado = !!d.piloto;
  return `
  <section class="cartao" style="gap:10px;${ligado ? 'border-color:#BFD9C6' : ''}">
    <div class="cartao-cab"><span class="rotulo">Fase de teste</span><span class="pilula ${ligado ? 'pilula-verde' : 'pilula-amendoim'}">${ligado ? 'LIGADA' : 'desligada'}</span></div>
    <span class="es-txt">${ligado
      ? '<b>O app inteiro está travado:</b> só entra quem tem convite, com o nome na marca d\'água, sem compartilhar, e o uso dos convidados é registrado (o seu não conta).'
      : 'O app está aberto ao público, como sempre. Ligue para travar tudo e começar o teste com os convidados.'}</span>
    ${est.confirma
      ? `<div class="es-botoes"><button class="btn btn-pequeno ${ligado ? 'btn-perigo' : 'btn-verde'}" type="button" data-pp-piloto="${ligado ? 'off' : 'on'}">${ligado ? 'Sim, encerrar a fase de teste' : 'Sim, travar o app agora'}</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-piloto="nao">Cancelar</button></div>`
      : `<button class="btn btn-pequeno ${ligado ? 'es-btn-claro' : 'btn-verde'}" type="button" data-pp-piloto="pedir">${ligado ? 'Encerrar a fase de teste' : 'Ligar a fase de teste'}</button>`}
    <span class="mini">Ao encerrar, o app volta ao normal: tira o bloqueio, a marca d'água e o registro de uso. Os convidados continuam com a conta.</span>
  </section>
  <section class="cartao" style="gap:8px">
    <div class="cartao-cab"><span class="rotulo">Códigos para repassar</span><span class="mini">atualiza sozinho</span></div>
    <div id="pp-codigos" style="display:flex;flex-direction:column;gap:10px">${blocoCodigos()}</div>
    <span class="mini">Envio automático pelo WhatsApp: <b>${d.whatsapp.provedor === 'manual' ? 'desligado (você repassa o código)' : 'ligado (' + esc(d.whatsapp.provedor) + ')'}</b>.</span>
  </section>
  <section class="cartao" style="gap:2px;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 6px"><span class="rotulo">Convidados (${lista.length})</span></div>
    ${lista.map((c) => `<div class="lista-linha" style="gap:10px;align-items:center;${c.ativo ? '' : 'opacity:.55'}">
      <span class="cresce"><b style="font-size:15px">${esc(c.nome)}</b> <span class="pilula ${c.plano === 'empresa' ? 'pilula-azul' : 'pilula-verde'}">${c.plano === 'empresa' ? 'Empresa' : 'Produtor'}</span>${c.papel === 'admin' ? ' <span class="pilula pilula-amendoim">Admin</span>' : ''}<br>
        <span class="mini">${esc(fmtCel(c.celular))}${c.empresa ? ' · ' + esc(c.empresa) : ''} · ${c.ativo ? quando(c.ultimo_acesso) : 'desativado'}${!c.perfil_ok && c.papel !== 'admin' ? ' · ainda não confirmou o nome' : ''}${c.expira_em ? ' · até ' + new Date(c.expira_em).toLocaleDateString('pt-BR') : ''}${c.observacao ? ' · ' + esc(c.observacao) : ''}</span></span>
      <button class="chip" type="button" data-pp-editar="${esc(c.id)}">Editar</button>
    </div>`).join('') || '<div class="vazio">Ninguém cadastrado ainda.</div>'}
  </section>
  <form id="pp-form" class="cartao es-form es-campos">
    <b class="es-h1">${e ? 'Editar convidado' : 'Liberar um novo convidado'}</b>
    <div class="campo"><label for="pp-nome">Nome</label><input id="pp-nome" required maxlength="80" value="${esc(e?.nome || '')}"></div>
    <div class="campo"><label for="pp-cel2">Celular com WhatsApp</label><input id="pp-cel2" type="tel" inputmode="tel" required placeholder="(18) 90000-0000" value="${esc(e ? fmtCel(e.celular) : '')}" ${e ? 'readonly' : ''}></div>
    <div class="campo"><label for="pp-plano">Plano</label><select id="pp-plano"><option value="empresa" ${e?.plano !== 'produtor' ? 'selected' : ''}>Empresa (tudo, inclusive Terminal)</option><option value="produtor" ${e?.plano === 'produtor' ? 'selected' : ''}>Produtor</option></select></div>
    <div class="campo"><label for="pp-ate">Acesso até (opcional)</label><input id="pp-ate" type="date" value="${esc(e?.expira_em ? String(e.expira_em).slice(0, 10) : '')}"></div>
    <div class="campo"><label for="pp-obs">Observação (opcional)</label><input id="pp-obs" maxlength="200" placeholder="ex.: amigo da Dreyfus" value="${esc(e?.observacao || '')}"></div>
    ${e ? `<label class="es-check"><input type="checkbox" id="pp-ativo" ${e.ativo ? 'checked' : ''}><span>Acesso ativo (desmarque para encerrar na hora)</span></label>` : ''}
    <button class="btn btn-verde" type="submit">${e ? 'Salvar' : 'Liberar acesso'}</button>
    ${e ? '<button class="dx-sair" type="button" data-pp-cancelar>Cancelar edição</button>' : ''}
    <div class="mini" role="status" style="text-align:center">${esc(est.msg)}</div>
  </form>
  <details class="cartao tm-info" ${est.ver ? 'open' : ''}><summary>Ligar o envio automático do código no WhatsApp</summary>
    <form id="pp-form-zap" class="es-campos" style="margin-top:10px">
      <span class="es-txt">Enquanto estiver desligado, o código aparece aqui e você repassa. Para automático, crie a conta no provedor e cole os dados abaixo (ficam só no servidor).</span>
      <div class="campo"><label for="pz-prov">Provedor</label><select id="pz-prov"><option value="manual" ${d.whatsapp.provedor === 'manual' ? 'selected' : ''}>Desligado (manual)</option><option value="zapi" ${d.whatsapp.provedor === 'zapi' ? 'selected' : ''}>Z-API</option><option value="meta" ${d.whatsapp.provedor === 'meta' ? 'selected' : ''}>WhatsApp Cloud API (Meta)</option></select></div>
      <div class="campo"><label for="pz-zi">Z-API · ID da instância</label><input id="pz-zi" autocomplete="off"></div>
      <div class="campo"><label for="pz-zt">Z-API · token</label><input id="pz-zt" autocomplete="off" type="password"></div>
      <div class="campo"><label for="pz-zc">Z-API · client-token (se tiver)</label><input id="pz-zc" autocomplete="off" type="password"></div>
      <div class="campo"><label for="pz-mp">Meta · ID do número</label><input id="pz-mp" autocomplete="off"></div>
      <div class="campo"><label for="pz-mt">Meta · token</label><input id="pz-mt" autocomplete="off" type="password"></div>
      <div class="campo"><label for="pz-mm">Meta · nome do modelo de autenticação</label><input id="pz-mm" autocomplete="off"></div>
      <button class="btn btn-escuro btn-pequeno" type="submit">Salvar envio</button>
      <span class="mini">Campos em branco mantêm o valor que já está salvo.</span>
    </form>
  </details>`;
}

// ---------- uso dos convidados ----------
const lista = (itens, vazio = '—') => (itens?.length ? itens.map(([k, n]) => `<div class="lista-linha" style="padding:6px 0"><span class="cresce mini" style="font-size:13px">${esc(nomeTela(k))}</span><b class="num">${n}</b></div>`).join('') : `<span class="mini">${vazio}</span>`);
const tile = (rot, val, sub = '') => `<div class="pn-tile"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

export function telaUsoP() {
  if (!eAdmin()) return telaLogin();
  if (!est.uso) return `<section class="cartao"><div class="vazio">${est.erro ? `${esc(est.erro)} <button class="link-mini" type="button" data-pp-recarregar>Tentar de novo</button>` : 'Carregando…'}</div></section>`;
  const u = est.uso, cs = u.convidados;
  const ativosHoje = cs.filter((c) => c.hoje).length, entraram = cs.filter((c) => c.sessoes > 0).length;
  return `
  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Resumo do piloto</span><button class="chip" type="button" data-pp-recarregar>Atualizar</button></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Convidados', cs.length)}${tile('Já entraram', entraram, `de ${cs.length}`)}${tile('Usaram hoje', ativosHoje)}</div>
    <span class="mini">Só conta o uso dos convidados. O seu uso (administrador) não entra aqui.</span>
  </section>
  ${cs.map((c) => `<section class="cartao" style="gap:10px;${c.ativo ? '' : 'opacity:.6'}">
    <div class="cartao-cab"><span><b style="font-size:16px">${esc(c.nome)}</b>${c.empresa ? `<br><span class="mini">${esc(c.empresa)}</span>` : ''}</span><span class="mini">${c.sessoes ? 'visto ' + quando(c.ultimo_acesso) : 'nunca entrou'}</span></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(4,1fr)">${tile('Aberturas', c.sessoes)}${tile('Dias', c.dias)}${tile('Min. total', c.minutos)}${tile('Min. 7 dias', c.minutos7)}</div>
    <div class="pn-duas" style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><span class="rotulo">Telas mais vistas</span>${lista(c.telas, 'sem uso ainda')}</div><div><span class="rotulo">Botões tocados</span>${lista(c.cliques, 'sem toques ainda')}</div></div>
    ${c.ultimas.length ? `<details class="tm-info"><summary>Últimas ações</summary>${c.ultimas.map((a) => `<div class="lista-linha" style="padding:5px 0"><span class="cresce mini">${a.t === 'abriu' ? 'abriu o app' : a.t === 'tela' ? 'viu ' + esc(nomeTela(a.d)) : 'tocou ' + esc(a.d)}</span><span class="mini">${quando(a.em)}</span></div>`).join('')}</details>` : ''}
  </section>`).join('') || '<div class="vazio">Nenhum convidado cadastrado ainda.</div>'}
  <section class="cartao" style="gap:6px"><span class="rotulo">Telas mais vistas (todos)</span>${lista(u.telasTop, 'sem dados ainda')}</section>
  <section class="cartao" style="gap:8px"><span class="rotulo">Opiniões enviadas (${u.feedback.length})</span>
    ${u.feedback.length ? u.feedback.map((f) => `<div style="border-top:1px solid var(--linha);padding-top:8px"><b style="font-size:14px">${esc(f.nome)}</b> <span class="mini">· ${quando(f.em)}${f.tela ? ' · em ' + esc(nomeTela(f.tela)) : ''}</span><div class="es-txt">${esc(f.texto)}</div></div>`).join('') : '<span class="mini">Nenhuma opinião ainda. O botão "Opinar" fica na tela dos convidados.</span>'}
  </section>`;
}

// ---------- eventos ----------
export function ligarPainelPiloto(desenhar) {
  redesenhar = desenhar;
  document.addEventListener('click', async (e) => {
    const t = e.target;
    let x;
    if (t.closest('[data-pp-recarregar]')) { est.erro = ''; carregar(); return; }
    if (t.closest('[data-pp-outro]')) { est.login = { etapa: 'cel', cel: '', msg: '', manual: false }; redesenhar(); return; }
    if ((x = t.closest('[data-pp-editar]'))) { est.editando = (est.dados?.convidados || []).find((c) => c.id === x.dataset.ppEditar) || null; est.msg = ''; redesenhar(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
    if (t.closest('[data-pp-cancelar]')) { est.editando = null; est.msg = ''; redesenhar(); return; }
    if ((x = t.closest('[data-pp-piloto]'))) {
      const a = x.dataset.ppPiloto;
      if (a === 'pedir') { est.confirma = true; redesenhar(); return; }
      if (a === 'nao') { est.confirma = false; redesenhar(); return; }
      x.disabled = true;
      const r = await chamarAdmin('admin_piloto', { ligado: a === 'on' });
      est.confirma = false;
      if (r.ok) { const l = await chamarAdmin('admin_listar'); if (l.ok) est.dados = l; } else est.erro = r.mensagem || 'Não foi possível mudar agora.';
      redesenhar();
    }
  });
  document.addEventListener('submit', async (e) => {
    const id = e.target.id;
    if (!id.startsWith('pp-')) return;
    e.preventDefault();
    const v = (k) => (document.getElementById(k)?.value || '').trim();
    if (id === 'pp-f-cel') {
      est.login.cel = v('pp-cel'); est.login.msg = 'Pedindo o código…'; redesenhar();
      const r = await pedirCodigo(est.login.cel);
      if (r.ok) { est.login.etapa = 'cod'; est.login.manual = !r.enviado; est.login.msg = ''; } else est.login.msg = r.mensagem || 'Não foi possível pedir o código.';
      redesenhar();
      return;
    }
    if (id === 'pp-f-cod') {
      const cod = v('pp-cod');
      est.login.msg = 'Conferindo…'; redesenhar();
      const r = await verificarCodigo(est.login.cel, cod);
      if (r.ok && r.conta.papel === 'admin') { est.login = { etapa: 'cel', cel: '', msg: '', manual: false }; carregar(); return; }
      est.login.msg = r.ok ? 'Este número não é de administrador.' : (r.mensagem || 'Não foi possível entrar.');
      redesenhar();
      return;
    }
    if (id === 'pp-form') {
      const ed = est.editando;
      const corpo = {
        nome: v('pp-nome'), celular: v('pp-cel2'), plano: v('pp-plano'), papel: ed?.papel || 'usuario',
        ativo: ed ? !!document.getElementById('pp-ativo')?.checked : true,
        expira_em: v('pp-ate') ? v('pp-ate') + 'T23:59:59-03:00' : null, observacao: v('pp-obs')
      };
      est.msg = 'Salvando…'; redesenhar();
      const r = await chamarAdmin('admin_salvar', corpo);
      if (r.ok) { est.editando = null; est.msg = 'Salvo.'; const l = await chamarAdmin('admin_listar'); if (l.ok) est.dados = l; } else est.msg = r.mensagem || 'Não foi possível salvar.';
      redesenhar();
      return;
    }
    if (id === 'pp-form-zap') {
      est.ver = true;
      const r = await chamarAdmin('admin_whatsapp', { provedor: v('pz-prov'), zapi_instancia: v('pz-zi'), zapi_token: v('pz-zt'), zapi_client_token: v('pz-zc'), meta_phone_id: v('pz-mp'), meta_token: v('pz-mt'), meta_template: v('pz-mm') });
      if (r.ok) { const l = await chamarAdmin('admin_listar'); if (l.ok) est.dados = l; est.msg = 'Envio salvo.'; } else est.msg = r.mensagem || 'Não foi possível salvar o envio.';
      redesenhar();
    }
  });
}
