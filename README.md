# App Amendoim Brasil

Central de informação do mercado de amendoim: cotação, clima, ferramentas e balcão de negociação.
Funciona como app de tela inicial (PWA) e está preparado para ser empacotado para App Store e Google Play (Capacitor).

## Estrutura

```
public/
  index.html            casca do app e barra de abas
  styles.css            visual (cores da marca no topo do arquivo)
  app.js                telas, calculadoras, gráfico e navegação
  sw.js                 funcionamento offline / sinal fraco
  manifest.webmanifest  nome, ícone e cores do app instalado
  data/                 TODO o conteúdo editável
assets/                 logo e ícone guardados como texto (montados no build)
scripts/montar.sh       gera as imagens no build do Netlify
netlify.toml            configuração de hospedagem
```

## Onde muda cada coisa (pasta `public/data/`)

| Arquivo | O que controla |
|---|---|
| `config.json` | WhatsApp do Helder, fase da safra, termômetro, nome do boletim (semanal/quinzenal/mensal), status da exportação |
| `cotacoes.json` | Cotação da semana por região, referências públicas (IEA) e histórico do gráfico |
| `boletins.json` | Boletins e relatórios (o primeiro aparece em destaque no Início) |
| `noticias.json` | Carrossel de notícias e vídeos (link, capa, fonte, patrocinado) |
| `ofertas.json` | Ofertas do balcão |
| `patrocinadores.json` | Faixa de parceiros (até 4) |
| `panorama.json` | Panorama global por país |
| `clima.json` | Dados de clima (serão preenchidos automaticamente quando a fonte for contratada) |

Exemplo: para trocar "Boletim da semana" por "Boletim quinzenal", altere `config.json → boletim.rotulo`.

## Próximas etapas

1. Hospedagem no Netlify ligada a este repositório (publica sozinho a cada alteração).
2. Supabase: login dos clientes da consultoria, cadastro de ofertas e painel de conteúdo.
3. Fontes de clima (previsão com licença comercial e radar IPMet) via funções agendadas.
4. Coleta automática de notícias com fila de aprovação.
5. Capacitor para gerar os apps de iPhone e Android.

## Rodar localmente

```
bash scripts/montar.sh
cd public && python3 -m http.server 8080
```
e abrir http://localhost:8080
