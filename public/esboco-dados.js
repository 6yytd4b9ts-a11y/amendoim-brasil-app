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
    empresa: { nome: 'Empresa', mensal: 149, anual: 1490 }
  },
  diasTeste: 7
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
