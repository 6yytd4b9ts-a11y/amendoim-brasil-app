// Painel de convidados do piloto (só para administradores): quem pode entrar, plano, prazo e códigos de acesso a repassar.
import { sessao } from '/esboco-dados.js';
import { chamarAdmin } from '/auth.js';

const est = { dados: null, carregando: false, erro: '', msg: '', editando: null, ver: false };
let ctx = { render: () => {}, evento: () => {} };
let timer = null;

const fmtCel = (c) => {
  const d = String(c || '');
  if (/^55\d{10,11}$/.test(d)) { const n = d.slice(4); return `(${d.slice(2, 4)}) ${n.length === 9 ? n.slice(0, 5) + '-' + n.slice(5) : n.slice(0, 4) + '-' + n.slice(4)}`; }
  return d;
};
const quando = (iso) => {
  if (!iso) return 'nunca entrou';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 2 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`;
};
const msgCodigo = (cod) => `Amendoim Brasil\nSeu código de acesso: ${cod}\nVale por 10 minutos. Não compartilhe com ninguém.`;

async function carregar() {
  est.carregando = true; est.erro = ''; ctx.render(false);
  const r = await chamarAdmin('admin_listar');
  est.carregando = false;
  if (r.ok) est.dados = r; else est.erro = r.mensagem || 'Não foi possível carregar.';
  ctx.render(false);
}

function blocoCodigos(h) {
  const l = est.dados?.codigos || [];
  if (!l.length) return `<span class="es-txt">Nenhum pedido de código agora. Quando alguém digitar o número no app, o código aparece aqui para você repassar.</span>`;
  return l.map((c) => `<div class="lista-linha" style="gap:10px;align-items:center">
    <span class="cresce"><b style="font-size:15px">${h.esc(c.nome || fmtCel(c.celular))}</b><br><span class="mini">${h.esc(fmtCel(c.celular))} · vale até ${new Date(c.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></span>
    <b class="num" style="font-size:24px;letter-spacing:2px">${h.esc(c.codigo)}</b>
    <a class="btn btn-verde btn-pequeno" target="_blank" rel="noopener" href="https://wa.me/${h.esc(c.celular)}?text=${encodeURIComponent(msgCodigo(c.codigo))}">WhatsApp</a>
  </div>`).join('');
}

export function telaConvidados(h) {
  const s = sessao();
  const topo = `<header class="topo"><a class="link-mini" href="#/conta" style="display:flex;align-items:center;gap:4px">${h.ic(h.I.seta, 'style="width:16px;height:16px;transform:rotate(180deg)"')}Minha conta</a>
    <div><h1>Convidados do piloto</h1><div class="sub">Quem pode entrar, plano e códigos de acesso</div></div></header>`;
  if (!s?.remoto || s.papel !== 'admin') return `${topo}<div class="vazio">Esta área é só para o administrador.<br><a class="btn btn-verde btn-pequeno" href="#/conta/entrar" style="margin-top:12px">Entrar</a></div>`;
  if (!est.dados && !est.carregando && !est.erro) setTimeout(carregar);
  if (!est.dados) return `${topo}<section class="cartao"><div class="vazio">${est.erro ? h.esc(est.erro) + ' <button class="link-mini" type="button" data-cv-tentar>Tentar de novo</button>' : 'Carregando…'}</div></section>`;
  clearInterval(timer);
  timer = setInterval(async () => {
    const el = document.getElementById('cv-codigos');
    if (!el || document.visibilityState !== 'visible') { if (!el) clearInterval(timer); return; }
    const r = await chamarAdmin('admin_listar');
    if (r.ok) { est.dados = r; el.innerHTML = blocoCodigos(h); }
  }, 8000);
  const d = est.dados, e = est.editando;
  const lista = d.convidados;
  return `${topo}
  <section class="cartao" style="gap:8px">
    <div class="cartao-cab"><span class="rotulo">Códigos para repassar</span><span class="mini">atualiza sozinho</span></div>
    <div id="cv-codigos" style="display:flex;flex-direction:column;gap:10px">${blocoCodigos(h)}</div>
    <span class="mini">Envio automático pelo WhatsApp: <b>${d.whatsapp.provedor === 'manual' ? 'desligado (você repassa o código)' : 'ligado (' + h.esc(d.whatsapp.provedor) + ')'}</b>.</span>
  </section>
  <section class="cartao" style="gap:2px;padding:4px 16px">
    <div class="cartao-cab" style="padding:12px 0 6px"><span class="rotulo">Convidados (${lista.length})</span></div>
    ${lista.map((c) => `<div class="lista-linha" style="gap:10px;align-items:center;${c.ativo ? '' : 'opacity:.55'}">
      <span class="cresce"><b style="font-size:15px">${h.esc(c.nome)}</b> <span class="pilula ${c.plano === 'empresa' ? 'pilula-azul' : 'pilula-verde'}">${c.plano === 'empresa' ? 'Empresa' : 'Produtor'}</span>${c.papel === 'admin' ? ' <span class="pilula pilula-amendoim">Admin</span>' : ''}<br>
        <span class="mini">${h.esc(fmtCel(c.celular))} · ${c.ativo ? quando(c.ultimo_acesso) : 'desativado'}${c.expira_em ? ' · até ' + new Date(c.expira_em).toLocaleDateString('pt-BR') : ''}${c.observacao ? ' · ' + h.esc(c.observacao) : ''}</span></span>
      <button class="chip" type="button" data-cv-editar="${h.esc(c.id)}">Editar</button>
    </div>`).join('') || '<div class="vazio">Ninguém cadastrado ainda.</div>'}
  </section>
  <form id="cv-form" class="cartao es-form es-campos">
    <b class="es-h1">${e ? 'Editar convidado' : 'Liberar um novo convidado'}</b>
    <div class="campo"><label for="cv-nome">Nome (aparece na marca d'água)</label><input id="cv-nome" required maxlength="80" value="${h.esc(e?.nome || '')}"></div>
    <div class="campo"><label for="cv-cel">Celular com WhatsApp</label><input id="cv-cel" type="tel" inputmode="tel" required placeholder="(18) 90000-0000" value="${h.esc(e ? fmtCel(e.celular) : '')}" ${e ? 'readonly' : ''}></div>
    <div class="campo"><label for="cv-plano">Plano</label><select id="cv-plano"><option value="empresa" ${e?.plano !== 'produtor' ? 'selected' : ''}>Empresa (tudo, inclusive Terminal)</option><option value="produtor" ${e?.plano === 'produtor' ? 'selected' : ''}>Produtor</option></select></div>
    <div class="campo"><label for="cv-ate">Acesso até (opcional)</label><input id="cv-ate" type="date" value="${h.esc(e?.expira_em ? String(e.expira_em).slice(0, 10) : '')}"></div>
    <div class="campo"><label for="cv-obs">Observação (opcional)</label><input id="cv-obs" maxlength="200" placeholder="ex.: Dreyfus, amigo do Kleber" value="${h.esc(e?.observacao || '')}"></div>
    ${e ? `<label class="es-check"><input type="checkbox" id="cv-ativo" ${e.ativo ? 'checked' : ''}><span>Acesso ativo (desmarque para encerrar na hora)</span></label>` : ''}
    <button class="btn btn-verde" type="submit">${e ? 'Salvar' : 'Liberar acesso'}</button>
    ${e ? '<button class="dx-sair" type="button" data-cv-cancelar>Cancelar edição</button>' : ''}
    <div class="mini" role="status" style="text-align:center">${h.esc(est.msg)}</div>
  </form>
  <details class="cartao tm-info" ${est.ver ? 'open' : ''}><summary>Ligar o envio automático do código no WhatsApp</summary>
    <form id="cv-form-zap" class="es-campos" style="margin-top:10px">
      <span class="es-txt">Enquanto estiver desligado, o código aparece aqui e você repassa. Para automático, crie a conta no provedor e cole os dados abaixo (ficam só no servidor).</span>
      <div class="campo"><label for="cz-prov">Provedor</label><select id="cz-prov"><option value="manual" ${d.whatsapp.provedor === 'manual' ? 'selected' : ''}>Desligado (manual)</option><option value="zapi" ${d.whatsapp.provedor === 'zapi' ? 'selected' : ''}>Z-API</option><option value="meta" ${d.whatsapp.provedor === 'meta' ? 'selected' : ''}>WhatsApp Cloud API (Meta)</option></select></div>
      <div class="campo"><label for="cz-zi">Z-API · ID da instância</label><input id="cz-zi" autocomplete="off"></div>
      <div class="campo"><label for="cz-zt">Z-API · token</label><input id="cz-zt" autocomplete="off" type="password"></div>
      <div class="campo"><label for="cz-zc">Z-API · client-token (se tiver)</label><input id="cz-zc" autocomplete="off" type="password"></div>
      <div class="campo"><label for="cz-mp">Meta · ID do número</label><input id="cz-mp" autocomplete="off"></div>
      <div class="campo"><label for="cz-mt">Meta · token</label><input id="cz-mt" autocomplete="off" type="password"></div>
      <div class="campo"><label for="cz-mm">Meta · nome do modelo de autenticação</label><input id="cz-mm" autocomplete="off"></div>
      <button class="btn btn-escuro btn-pequeno" type="submit">Salvar envio</button>
      <span class="mini">Campos em branco mantêm o valor que já está salvo.</span>
    </form>
  </details>`;
}

export function ligarConvidados(render, evento) {
  ctx = { render, evento };
  document.addEventListener('click', (e) => {
    let x;
    if (e.target.closest('[data-cv-tentar]')) { est.erro = ''; est.dados = null; render(false); return; }
    if ((x = e.target.closest('[data-cv-editar]'))) { est.editando = (est.dados?.convidados || []).find((c) => c.id === x.dataset.cvEditar) || null; est.msg = ''; render(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
    if (e.target.closest('[data-cv-cancelar]')) { est.editando = null; est.msg = ''; render(false); }
  });
  document.addEventListener('submit', async (e) => {
    const id = e.target.id;
    if (id !== 'cv-form' && id !== 'cv-form-zap') return;
    e.preventDefault();
    const v = (k) => (document.getElementById(k)?.value || '').trim();
    if (id === 'cv-form') {
      const ed = est.editando;
      est.msg = 'Salvando…'; render(false);
      const r = await chamarAdmin('admin_salvar', {
        nome: v('cv-nome'), celular: v('cv-cel'), plano: v('cv-plano'), papel: ed?.papel || 'usuario',
        ativo: ed ? !!document.getElementById('cv-ativo')?.checked : true,
        expira_em: v('cv-ate') ? v('cv-ate') + 'T23:59:59-03:00' : null, observacao: v('cv-obs')
      });
      if (r.ok) { est.editando = null; est.msg = 'Salvo.'; evento('convidado-salvo'); const l = await chamarAdmin('admin_listar'); if (l.ok) est.dados = l; }
      else est.msg = r.mensagem || 'Não foi possível salvar.';
      render(false);
      return;
    }
    est.ver = true;
    const r = await chamarAdmin('admin_whatsapp', {
      provedor: v('cz-prov'), zapi_instancia: v('cz-zi'), zapi_token: v('cz-zt'), zapi_client_token: v('cz-zc'),
      meta_phone_id: v('cz-mp'), meta_token: v('cz-mt'), meta_template: v('cz-mm')
    });
    if (r.ok) { const l = await chamarAdmin('admin_listar'); if (l.ok) est.dados = l; est.msg = 'Envio salvo.'; }
    else est.msg = r.mensagem || 'Não foi possível salvar o envio.';
    render(false);
  });
}
