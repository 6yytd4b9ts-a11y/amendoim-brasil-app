// Painel · aba "Teste": a fase de teste inteira num lugar só (interruptor, códigos a repassar, convidados com o uso de cada um,
// opiniões e envio automático). Entra com a mesma chave do painel; o uso do administrador não conta.
const API = 'https://lvugmecpbitcmetfxkcs.supabase.co/functions/v1/acesso';

const est = { dados: null, uso: null, carregando: false, erro: '', msg: '', editando: null, novo: false, ver: false, confirma: false };
let redesenhar = () => {};
let pegarChave = () => '';
let timer = null;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
const TAGS = { confuso: ['Achei confuso', 'pilula-amendoim'], faltou: ['Faltou algo', 'pilula-azul'], ideia: ['Tenho uma ideia', 'pilula-verde'], gostei: ['Gostei', 'pilula-verde'] };
const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, '0')}`;

async function chamar(acao, corpo = {}) {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao, chave: pegarChave(), ...corpo }) });
    const j = await r.json().catch(() => ({ ok: false, mensagem: 'Resposta inesperada. Tente de novo.' }));
    return { ...j, status: r.status };
  } catch (e) { return { ok: false, status: 0, mensagem: 'Sem conexão agora. Tente de novo.' }; }
}

async function carregar() {
  if (est.carregando) return;
  est.carregando = true; est.erro = '';
  const [l, u] = await Promise.all([chamar('admin_listar'), chamar('admin_uso')]);
  est.carregando = false;
  if (l.ok) est.dados = l; else est.erro = l.mensagem || 'Não foi possível carregar.';
  if (u.ok) est.uso = u;
  redesenhar();
}

export function abrirTeste() { est.erro = ''; est.msg = ''; carregar(); }

// ---------- peças ----------
const tile = (rot, val, sub = '') => `<div class="pn-tile"><span>${rot}</span><b class="num">${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const lista = (itens, vazio = '—') => (itens?.length ? itens.map(([k, n]) => `<div class="lista-linha" style="padding:6px 0"><span class="cresce mini" style="font-size:13px">${esc(nomeTela(k))}</span><b class="num">${n}</b></div>`).join('') : `<span class="mini">${vazio}</span>`);

function blocoCodigos() {
  const l = est.dados?.codigos || [];
  if (!l.length) return '<span class="es-txt">Nenhum pedido de código agora. Quando alguém digitar o número no app, o código aparece aqui para você repassar (você também: peça o seu na tela do app e ele aparece aqui).</span>';
  return l.map((c) => `<div class="lista-linha" style="gap:10px;align-items:center">
    <span class="cresce"><b style="font-size:15px">${esc(c.nome || fmtCel(c.celular))}</b><br><span class="mini">${esc(fmtCel(c.celular))} · vale até ${new Date(c.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></span>
    <b class="num" style="font-size:24px;letter-spacing:2px">${esc(c.codigo)}</b>
    <a class="btn btn-verde btn-pequeno" target="_blank" rel="noopener" href="https://wa.me/${esc(c.celular)}?text=${encodeURIComponent(msgCodigo(c.codigo))}">WhatsApp</a>
  </div>`).join('');
}

function cartaoConvidado(c, u) {
  const uso = u || { sessoes: 0, dias: 0, minutos: 0, minutos7: 0, telas: [], cliques: [], ultimas: [] };
  const ult = c.ultimo_acesso || uso.ultimo_acesso, entrou = !!ult || uso.sessoes > 0;
  return `<section class="cartao" style="gap:10px;${c.ativo ? '' : 'opacity:.6'}">
    <div class="cartao-cab" style="align-items:flex-start">
      <span><b style="font-size:16px">${esc(c.nome)}</b> <span class="pilula ${c.plano === 'empresa' ? 'pilula-azul' : 'pilula-verde'}">${c.plano === 'empresa' ? 'Empresa' : 'Produtor'}</span><br>
        <span class="mini">${esc(fmtCel(c.celular))}${c.empresa ? ' · ' + esc(c.empresa) : ''}${c.observacao ? ' · ' + esc(c.observacao) : ''}${c.expira_em ? ' · até ' + new Date(c.expira_em).toLocaleDateString('pt-BR') : ''}</span><br>
        <span class="mini"><b>${c.ativo ? (entrou ? 'visto ' + quando(ult) : 'ainda não entrou') : 'acesso encerrado'}</b>${entrou && !c.perfil_ok ? ' · não confirmou o nome' : ''}</span></span>
      <button class="chip" type="button" data-pp-editar="${esc(c.id)}">Editar</button>
    </div>
    ${entrou ? `<div class="pn-tiles" style="grid-template-columns:repeat(4,1fr)">${tile('Aberturas', uso.sessoes)}${tile('Dias', uso.dias)}${tile('Min. total', uso.minutos)}${tile('Min. 7 dias', uso.minutos7)}</div>
    <details class="tm-info"><summary>Ver o que mais usou ›</summary>
      <div class="pn-duas" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px"><div><span class="rotulo">Telas mais vistas</span>${lista(uso.telas, 'sem uso ainda')}</div><div><span class="rotulo">Botões tocados</span>${lista(uso.cliques, 'sem toques ainda')}</div></div>
      ${uso.ultimas.length ? `<span class="rotulo" style="display:block;margin-top:8px">Últimas ações</span>${uso.ultimas.map((a) => `<div class="lista-linha" style="padding:5px 0"><span class="cresce mini">${a.t === 'abriu' ? 'abriu o app' : a.t === 'tela' ? 'viu ' + esc(nomeTela(a.d)) : 'tocou ' + esc(a.d)}</span><span class="mini">${quando(a.em)}</span></div>`).join('')}` : ''}
    </details>` : ''}
  </section>`;
}

function todosJuntos(convs) {
  const us = est.uso;
  if (!us) return '';
  const cs = us.convidados || [];
  const aberturas = cs.reduce((s, c) => s + (c.sessoes || 0), 0);
  const min = us.minutosTotal ?? cs.reduce((s, c) => s + (c.minutos || 0), 0);
  if (!aberturas && !min && !(us.telasTop || []).length) return `<section class="cartao" style="gap:6px"><span class="rotulo">Todos juntos</span><span class="mini">Ainda sem uso dos convidados. Quando entrarem, aqui aparece o que o grupo todo mais usa.</span></section>`;
  const media = cs.filter((c) => c.sessoes > 0).length;
  return `<section class="cartao" style="gap:10px"><div class="cartao-cab"><span class="rotulo">Todos juntos</span><span class="mini">últimos 60 dias · só convidados</span></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Aberturas', aberturas)}${tile('Min. no total', min)}${tile('Min. por pessoa', media ? Math.round(min / media) : 0, 'de quem entrou')}</div>
    <div class="pn-duas" style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><span class="rotulo">Telas mais vistas</span>${lista(us.telasTop, 'sem uso ainda')}</div><div><span class="rotulo">Botões mais tocados</span>${lista(us.cliquesTop, 'sem toques ainda')}</div></div>
  </section>`;
}

// ---------- a aba ----------
export function telaTeste() {
  if (!est.dados) return `<section class="cartao"><div class="vazio">${est.erro ? `${esc(est.erro)} <button class="link-mini" type="button" data-pp-recarregar>Tentar de novo</button>` : 'Carregando…'}</div></section>`;
  clearInterval(timer);
  timer = setInterval(async () => {
    const el = document.getElementById('pp-codigos');
    if (!el) { clearInterval(timer); return; }
    if (document.visibilityState !== 'visible') return;
    const r = await chamar('admin_listar');
    if (r.ok) { est.dados = r; el.innerHTML = blocoCodigos(); }
  }, 8000);
  const d = est.dados, e = est.editando;
  const ligado = !!d.piloto;
  const convs = d.convidados.filter((c) => c.papel !== 'admin');
  const admins = d.convidados.filter((c) => c.papel === 'admin');
  const usoPor = new Map((est.uso?.convidados || []).map((c) => [c.id, c]));
  const entraram = convs.filter((c) => c.ultimo_acesso).length, hoje = (est.uso?.convidados || []).filter((c) => c.hoje).length;
  const fb = est.uso?.feedback || [];
  return `
  <section class="cartao" style="gap:10px;${ligado ? 'border-color:#BFD9C6' : ''}">
    <div class="cartao-cab"><span class="rotulo">Fase de teste</span><span class="pilula ${ligado ? 'pilula-verde' : 'pilula-amendoim'}">${ligado ? 'LIGADA' : 'desligada'}</span></div>
    <span class="es-txt">${ligado
      ? '<b>O app inteiro está travado:</b> só entra quem tem convite (celular + código), com o nome na marca d\'água, sem compartilhar. O uso dos convidados é registrado; o seu não conta.'
      : 'O app está aberto ao público, como sempre. Ligue para travar tudo e começar o teste só com os convidados.'}</span>
    ${est.confirma
      ? `<div class="es-botoes"><button class="btn btn-pequeno ${ligado ? 'btn-perigo' : 'btn-verde'}" type="button" data-pp-piloto="${ligado ? 'off' : 'on'}">${ligado ? 'Sim, encerrar a fase de teste' : 'Sim, travar o app agora'}</button><button class="btn btn-pequeno es-btn-claro" type="button" data-pp-piloto="nao">Cancelar</button></div>`
      : `<button class="btn btn-pequeno ${ligado ? 'es-btn-claro' : 'btn-verde'}" type="button" data-pp-piloto="pedir">${ligado ? 'Encerrar a fase de teste' : 'Ligar a fase de teste'}</button>`}
    <span class="mini">${ligado ? 'Ao encerrar, o app volta ao normal: tira o bloqueio, a marca d\'água e o registro de uso. Os convidados continuam com a conta.' : 'Antes de começar, vale zerar os números na aba Uso para a contagem partir do zero.'}</span>
  </section>
  <section class="cartao" style="gap:8px">
    <div class="cartao-cab"><span class="rotulo">Códigos para repassar</span><span class="mini">atualiza sozinho</span></div>
    <div id="pp-codigos" style="display:flex;flex-direction:column;gap:10px">${blocoCodigos()}</div>
    <span class="mini">Envio automático pelo WhatsApp: <b>${d.whatsapp.provedor === 'manual' ? 'desligado (você repassa o código)' : 'ligado (' + esc(d.whatsapp.provedor) + ')'}</b>.</span>
  </section>
  <section class="cartao" style="gap:10px">
    <div class="cartao-cab"><span class="rotulo">Quem está no teste</span><button class="chip" type="button" data-pp-recarregar>Atualizar</button></div>
    <div class="pn-tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Convidados', convs.length)}${tile('Já entraram', entraram, `de ${convs.length}`)}${tile('Usaram hoje', hoje)}</div>
    <span class="mini">Só conta quem foi convidado. O seu uso (administrador) não entra aqui.</span>
  </section>
  ${todosJuntos(convs)}
  ${convs.map((c) => cartaoConvidado(c, usoPor.get(c.id))).join('') || '<div class="vazio">Ninguém foi convidado ainda. Use "Liberar um convidado" abaixo.</div>'}
  ${admins.length ? `<span class="mini" style="padding:0 4px">Administrador (não conta no uso): ${admins.map((a) => esc(a.nome) + ' · ' + esc(fmtCel(a.celular))).join(', ')}</span>` : ''}
  <details class="cartao" id="pp-det-novo" ${e || est.novo ? 'open' : ''}><summary class="rotulo" style="cursor:pointer">${e ? 'Editar convidado' : '＋ Liberar um convidado'}</summary>
    <form id="pp-form" class="es-campos" style="margin-top:10px">
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
  </details>
  <section class="cartao" style="gap:8px"><span class="rotulo">Opiniões enviadas (${fb.length})</span>
    ${fb.length ? fb.map((f) => `<div style="border-top:1px solid var(--linha);padding-top:8px;display:flex;flex-direction:column;gap:4px"><span><b style="font-size:14px">${esc(f.nome)}</b> <span class="mini">· ${quando(f.em)}${f.tela ? ' · em ' + esc(nomeTela(f.tela)) : ''}</span>${TAGS[f.tag] ? ` <span class="pilula ${TAGS[f.tag][1]}">${TAGS[f.tag][0]}</span>` : ''}</span>${f.texto ? `<div class="es-txt">${esc(f.texto)}</div>` : ''}${f.audio ? `<div data-pp-audio="${esc(f.id)}"><button class="chip" type="button" data-pp-ouvir="${esc(f.id)}">▶ Ouvir o áudio (${mmss(f.seg)})</button></div>` : ''}</div>`).join('') : '<span class="mini">Nenhuma opinião ainda. O botão "Opinar" fica na tela dos convidados.</span>'}
  </section>
  <details class="cartao tm-info" id="pp-det-zap" ${est.ver ? 'open' : ''}><summary>Ligar o envio automático do código no WhatsApp</summary>
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

// ---------- eventos ----------
export function ligarPainelPiloto(desenhar, getChave) {
  redesenhar = desenhar;
  pegarChave = getChave || (() => '');
  document.addEventListener('toggle', (e) => {
    if (e.target.id === 'pp-det-novo' && !est.editando) est.novo = e.target.open;
    if (e.target.id === 'pp-det-zap') est.ver = e.target.open;
  }, true);
  document.addEventListener('click', async (e) => {
    const t = e.target;
    let x;
    if (t.closest('[data-pp-recarregar]')) { est.erro = ''; carregar(); return; }
    if ((x = t.closest('[data-pp-ouvir]'))) {
      const id = x.dataset.ppOuvir, caixa = x.parentElement;
      x.disabled = true; x.textContent = 'Abrindo…';
      const r = await chamar('admin_audio', { id: Number(id) });
      if (!r.ok || !r.url) { x.disabled = false; x.textContent = '▶ Tentar de novo'; caixa.insertAdjacentHTML('beforeend', `<div class="mini">${esc(r.mensagem || 'Não foi possível abrir o áudio.')}</div>`); return; }
      const a = document.createElement('audio');
      a.controls = true; a.autoplay = true; a.preload = 'auto'; a.src = r.url; a.style.cssText = 'width:100%;max-width:340px';
      caixa.replaceChildren(a);
      return;
    }
    if ((x = t.closest('[data-pp-editar]'))) {
      est.editando = (est.dados?.convidados || []).find((c) => c.id === x.dataset.ppEditar) || null; est.msg = '';
      redesenhar(); document.getElementById('pp-det-novo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    if (t.closest('[data-pp-cancelar]')) { est.editando = null; est.novo = false; est.msg = ''; redesenhar(); return; }
    if ((x = t.closest('[data-pp-piloto]'))) {
      const a = x.dataset.ppPiloto;
      if (a === 'pedir') { est.confirma = true; redesenhar(); return; }
      if (a === 'nao') { est.confirma = false; redesenhar(); return; }
      x.disabled = true;
      const r = await chamar('admin_piloto', { ligado: a === 'on' });
      est.confirma = false;
      if (r.ok) { const l = await chamar('admin_listar'); if (l.ok) est.dados = l; } else est.erro = r.mensagem || 'Não foi possível mudar agora.';
      redesenhar();
    }
  });
  document.addEventListener('submit', async (e) => {
    const id = e.target.id;
    if (!id.startsWith('pp-')) return;
    e.preventDefault();
    const v = (k) => (document.getElementById(k)?.value || '').trim();
    if (id === 'pp-form') {
      const ed = est.editando;
      const corpo = {
        nome: v('pp-nome'), celular: v('pp-cel2'), plano: v('pp-plano'), papel: ed?.papel || 'usuario',
        ativo: ed ? !!document.getElementById('pp-ativo')?.checked : true,
        expira_em: v('pp-ate') ? v('pp-ate') + 'T23:59:59-03:00' : null, observacao: v('pp-obs')
      };
      est.msg = 'Salvando…'; redesenhar();
      const r = await chamar('admin_salvar', corpo);
      if (r.ok) {
        est.editando = null; est.novo = false; est.msg = 'Salvo.';
        const [l, u] = await Promise.all([chamar('admin_listar'), chamar('admin_uso')]);
        if (l.ok) est.dados = l; if (u.ok) est.uso = u;
      } else est.msg = r.mensagem || 'Não foi possível salvar.';
      redesenhar();
      return;
    }
    if (id === 'pp-form-zap') {
      est.ver = true;
      const corpo = { provedor: v('pz-prov'), zapi_instancia: v('pz-zi'), zapi_token: v('pz-zt'), zapi_client_token: v('pz-zc'), meta_phone_id: v('pz-mp'), meta_token: v('pz-mt'), meta_template: v('pz-mm') };
      const r = await chamar('admin_whatsapp', corpo);
      if (r.ok) { const l = await chamar('admin_listar'); if (l.ok) est.dados = l; est.msg = 'Envio salvo.'; } else est.msg = r.mensagem || 'Não foi possível salvar o envio.';
      redesenhar();
    }
  });
}
