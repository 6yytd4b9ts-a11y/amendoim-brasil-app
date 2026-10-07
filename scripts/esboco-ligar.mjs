// Só no ramo do ESBOÇO: liga as telas de teste (assinantes, conta, estimativas, painel) aos arquivos do app na hora do build.
// Cada troca precisa achar o trecho exatamente uma vez; se não achar, o build para (nada quebrado vai ao ar).
import { readFileSync, writeFileSync } from 'node:fs';
const trocas = JSON.parse(readFileSync(new URL('./esboco-trocas.json', import.meta.url), 'utf8'));
for (const [arq, lista] of Object.entries(trocas)) {
  let t = readFileSync(arq, 'utf8');
  for (const [velho, novo] of lista) {
    const n = t.split(velho).length - 1;
    if (n !== 1) throw new Error(`${arq}: trecho encontrado ${n} vezes: ${velho.slice(0, 80)}`);
    t = t.replace(velho, () => novo);
  }
  writeFileSync(arq, t);
}
console.log('Esboço ligado.');
