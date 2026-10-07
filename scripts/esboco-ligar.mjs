// Só no ramo do ESBOÇO: liga as telas de teste (assinantes, conta, estimativas, agenda, clima, painel) aos arquivos do app na hora do build.
// Formato de esboco-trocas.txt: "<<<<<<< arquivo" / trecho antigo / "=======" / trecho novo / ">>>>>>>".
// Cada trecho antigo precisa aparecer exatamente uma vez; se não, o build para (nada quebrado vai ao ar).
import { readFileSync, writeFileSync } from 'node:fs';
const txt = readFileSync(new URL('./esboco-trocas.txt', import.meta.url), 'utf8');
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
