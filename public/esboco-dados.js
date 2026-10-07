// ESBOÇO da área de assinantes: dados de teste guardados só neste aparelho.
// Na versão final, conta e assinatura vêm do servidor (Supabase + Asaas) e o conteúdo é editado no painel.
const CHAVE_CONTEUDO = 'ab-esboco-conteudo';
const CHAVE_SESSAO = 'ab-esboco-sessao';
const CHAVE_ASSINANTES = 'ab-esboco-assinantes';

export const ALQUEIRE_HA = 2.42; // alqueire paulista
export const SACA_KG = 25;

export const PADRAO = {
  atualizado: '07/10/2026',
  estimativas: [
    { safra: '24/25', areaMin: 350, areaMax: 350, prodMin: 380, prodMax: 400, situacao: 'Estimativa' },
    { safra: '25/26', areaMin: 250, areaMax: 260, prodMin: 380, prodMax: 380, situacao: 'Estimativa' },
    { safra: '26/27', areaMin: 180, areaMax: 180, prodMin: 380, prodMax: 380, situacao: 'Preliminar' }
  ],
  comentario: 'A área segue em queda pelo terceiro ano. Com 180 mil ha em 26/27, mesmo com produtividade média de 380 sc/alq, a oferta fica perto da metade de 24/25.',
  balanco: { consumoKgHab: 0.9, populacaoMi: 213, sementeKgHa: 200, rendimento: 70 },
  planos: {
    produtor: { nome: 'Produtor', mensal: 29.9, anual: 299 },
    empresa: { nome: 'Empresa', mensal: 499, anual: 4990 }
  },
  diasTeste: 7,
  patrocinio: { semestral: 6000, cotas: 5 },
  leituraClima: 'Texto de exemplo: semana de chuva irregular no Oeste Paulista. Quem tem umidade boa no talhão pode avançar no plantio; quem está no seco, espere uma chuva de 15 a 20 mm. Você escreve esta leitura no painel (ou o Claude deixa um rascunho pronto toda segunda).',
  // Agenda: USDA (WASDE) e Conab conferidos nas fontes oficiais; os outros ficam "a confirmar" até você ajustar no painel.
  agenda: [
    { id: 'e1', data: '2026-10-09', tipo: 'dados', titulo: 'USDA · relatório WASDE de outubro', local: 'EUA · 13h (Brasília)', detalhe: 'Estimativa mundial de oferta e demanda. Traz a produção e os estoques de amendoim dos EUA, que mexem com o preço internacional.' },
    { id: 'e2', data: '2026-10-15', tipo: 'dados', titulo: 'Conab · 1º levantamento da safra 26/27', local: 'Brasil', detalhe: 'Primeira estimativa oficial de área e produção de amendoim da safra que está sendo plantada. Compare com a Estimativa Amendoim Brasil.' },
    { id: 'e3', data: '2026-11-05', tipo: 'dados', titulo: 'Comex Stat · exportações de outubro', local: 'Data aproximada', aConfirmar: true, detalhe: 'Saem os números de exportação de amendoim e óleo do mês. O app atualiza sozinho e o assinante recebe a leitura.' },
    { id: 'e4', data: '2026-11-10', tipo: 'dados', titulo: 'USDA · relatório WASDE de novembro', local: 'EUA · 14h (Brasília)', detalhe: 'Atualização de oferta e demanda mundial, com a colheita americana praticamente concluída.' },
    { id: 'e5', data: '2026-12-10', tipo: 'dados', titulo: 'USDA · relatório WASDE de dezembro', local: 'EUA · 14h (Brasília)', detalhe: 'Último relatório do ano.' },
    { id: 'e6', data: '2026-10-01', fim: '2026-12-15', tipo: 'safra', titulo: 'Janela de plantio · safra das águas 26/27', local: 'SP, MS e MG', detalhe: 'Período principal de plantio. Acompanhe a orientação técnica na aba Clima.' },
    { id: 'e7', data: '2027-02-01', fim: '2027-05-31', tipo: 'safra', titulo: 'Colheita da safra 26/27', local: 'SP, MS e MG', detalhe: 'Arranquio e colheita. Época de maior oferta e de negociação de lotes.' },
    { id: 'e8', data: null, tipo: 'camara', titulo: 'Reunião da Câmara Setorial do Amendoim', local: 'Data a definir', detalhe: 'Resumo da reunião e comunicados oficiais aparecem aqui, quando a Câmara autorizar a publicação.' },
    { id: 'e9', data: null, tipo: 'evento', titulo: 'Rally da Safra do Amendoim 2027', local: 'Regiões produtoras · data a definir', detalhe: 'Expedição de campo da Amendoim Brasil pelas lavouras, com a leitura da safra região por região.' },
    { id: 'e10', data: null, tipo: 'evento', titulo: 'Agrishow 2027', local: 'Ribeirão Preto/SP · abr/mai, data a confirmar', detalhe: 'Maior feira do agro do país: máquinas de amendoim, sementes e encontros do setor.' }
  ]
};

const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const gravar = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

export const conteudo = () => ({ ...PADRAO, ...(ler(CHAVE_CONTEUDO) || {}) });
export const salvarConteudo = (c) => gravar(CHAVE_CONTEUDO, c);
export const restaurarConteudo = () => gravar(CHAVE_CONTEUDO, null);

export const sessao = () => ler(CHAVE_SESSAO);
export const salvarSessao = (s) => gravar(CHAVE_SESSAO, s);
export const assinante = () => { const s = sessao(); return !!s && ['ativo', 'cortesia'].includes(s.status); };

// Produção a partir de área (mil ha) e produtividade (sacas de 25 kg por alqueire).
export function producao(e) {
  const sc = (area, prod) => (area * 1000 / ALQUEIRE_HA) * prod; // sacas
  const scMin = sc(e.areaMin, e.prodMin), scMax = sc(e.areaMax, e.prodMax);
  return { scMin, scMax, tMin: scMin * SACA_KG / 1000, tMax: scMax * SACA_KG / 1000, scMeio: (scMin + scMax) / 2, tMeio: (scMin + scMax) * SACA_KG / 2000 };
}

// Lista fictícia para o painel (só no esboço).
const FICTICIOS = [
  { id: 'a1', nome: 'João Batista (teste)', perfil: 'Produtor', municipio: 'Tupã', plano: 'Produtor · anual', status: 'ativo', vence: '12/08/2027', pagamento: 'Cartão', celular: '18999990001' },
  { id: 'a2', nome: 'Agro Marília Ltda (teste)', perfil: 'Indústria', municipio: 'Marília', plano: 'Empresa · mensal', status: 'ativo', vence: '05/11/2026', pagamento: 'Pix', celular: '14999990002' },
  { id: 'a3', nome: 'Carlos Mendes (teste)', perfil: 'Produtor', municipio: 'Jaboticabal', plano: 'Produtor · mensal', status: 'atrasado', vence: '01/10/2026', pagamento: 'Pix', celular: '16999990003' },
  { id: 'a4', nome: 'Fazenda Boa Vista (teste)', perfil: 'Produtor', municipio: 'Presidente Prudente', plano: 'Consultoria', status: 'cortesia', vence: '31/12/2026', pagamento: 'Cortesia', celular: '18999990004' },
  { id: 'a5', nome: 'Exporta Grãos SA (teste)', perfil: 'Exportador', municipio: 'Ribeirão Preto', plano: 'Empresa · anual', status: 'ativo', vence: '20/03/2027', pagamento: 'Cartão', celular: '16999990005' },
  { id: 'a6', nome: 'Pedro Alves (teste)', perfil: 'Cerealista', municipio: 'Dracena', plano: 'Produtor · mensal', status: 'cancelado', vence: '15/09/2026', pagamento: 'Cartão', celular: '18999990006' }
];
export const assinantes = () => ler(CHAVE_ASSINANTES) || FICTICIOS.map((a) => ({ ...a }));
export const salvarAssinantes = (l) => gravar(CHAVE_ASSINANTES, l);

// ---------- Cadastro grátis do produtor (vira o banco de dados de produtores no painel) ----------
const CHAVE_PERFIL = 'ab-esboco-perfil';
const CHAVE_LEMBRETES = 'ab-esboco-lembretes';
export const perfil = () => ler(CHAVE_PERFIL);
export const salvarPerfil = (p) => gravar(CHAVE_PERFIL, p);
export const lembretes = () => ler(CHAVE_LEMBRETES) || [];
export const alternarLembrete = (id) => { const l = lembretes(); const i = l.indexOf(id); if (i >= 0) l.splice(i, 1); else l.push(id); gravar(CHAVE_LEMBRETES, l); return i < 0; };

// Produtores fictícios para o painel do esboço (área em alqueires).
export const PRODUTORES_FICTICIOS = [
  { nome: 'José Carlos (teste)', municipio: 'Tupã', uf: 'SP', a2526: 120, a2627: 80, armazena: 'Sim', celular: '18999990011' },
  { nome: 'Marcos Lima (teste)', municipio: 'Tupã', uf: 'SP', a2526: 60, a2627: 45, armazena: 'Não', celular: '18999990012' },
  { nome: 'Fazenda Esperança (teste)', municipio: 'Marília', uf: 'SP', a2526: 300, a2627: 220, armazena: 'Sim', celular: '14999990013' },
  { nome: 'Antônio Prado (teste)', municipio: 'Pompéia', uf: 'SP', a2526: 90, a2627: 60, armazena: 'Não', celular: '14999990014' },
  { nome: 'Grupo Rio Verde (teste)', municipio: 'Jaboticabal', uf: 'SP', a2526: 800, a2627: 600, armazena: 'Sim', celular: '16999990015' },
  { nome: 'Luiz Fernando (teste)', municipio: 'Sertãozinho', uf: 'SP', a2526: 250, a2627: 200, armazena: 'Sim', celular: '16999990016' },
  { nome: 'Rogério Alves (teste)', municipio: 'Presidente Prudente', uf: 'SP', a2526: 150, a2627: 90, armazena: 'Não', celular: '18999990017' },
  { nome: 'Sítio Bela Vista (teste)', municipio: 'Osvaldo Cruz', uf: 'SP', a2526: 40, a2627: 30, armazena: 'Não', celular: '18999990018' },
  { nome: 'Ricardo Souza (teste)', municipio: 'Dourados', uf: 'MS', a2526: 200, a2627: 180, armazena: 'Sim', celular: '67999990019' },
  { nome: 'Paulo Henrique (teste)', municipio: 'Dracena', uf: 'SP', a2526: 70, a2627: 40, armazena: 'Não', celular: '18999990020' }
];
