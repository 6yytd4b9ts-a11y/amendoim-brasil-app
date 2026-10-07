// Só no ramo do ESBOÇO: liga as telas de teste (assinantes, conta, estimativas, agenda, clima, painel) aos arquivos do app na hora do build.
// Formato de esboco-trocas.txt: "<<<<<<< arquivo" / trecho antigo / "=======" / trecho novo / ">>>>>>>".
// Cada trecho antigo precisa aparecer exatamente uma vez; se não, o build para (nada quebrado vai ao ar).
// As trocas podem vir em mais de um arquivo (esboco-trocas.txt, esboco-trocas-2.txt…), lidos em ordem (1, 2, 3…); um arquivo mais novo pode ajustar o resultado dos anteriores.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const pasta = new URL('./', import.meta.url);
const ordem = (n) => +(n.match(/-(\d+)\.txt$/)?.[1] || 1); // esboco-trocas.txt = 1, -2 = 2, -3 = 3…
const txt = readdirSync(pasta).filter((n) => /^esboco-trocas(-\d+)?\.txt$/.test(n)).sort((x, y) => ordem(x) - ordem(y)).map((n) => readFileSync(new URL(n, pasta), 'utf8')).join('');
const blocos = txt.split(/^<<<<<<< /m).filter(Boolean);
const arquivos = {};
for (const b of blocos) {
  const fim = b.indexOf('\n');
  const arq = b.slice(0, fim).trim();
  const corpo = b.slice(fim + 1).replace(/>>>>>>>\n?$/, '');
  const [velho, novo] = corpo.split(/^=======\n/m);
  if (novo === undefined) throw new Error('bloco sem ======= em ' + arq);
  (arquivos[arq] = arquivos[arq] || []).push([velho, novo]);
}
for (const [arq, lista] of Object.entries(arquivos)) {
  let t = readFileSync(arq, 'utf8');
  for (const [velho, novo] of lista) {
    const n = t.split(velho).length - 1;
    if (n !== 1) throw new Error(`${arq}: trecho encontrado ${n} vezes: ${velho.slice(0, 80)}`);
    t = t.replace(velho, () => novo);
  }
  writeFileSync(arq, t);
}
console.log('Esboço ligado.');
