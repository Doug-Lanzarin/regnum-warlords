# Regnum Warlords

Ferramentas para **Champions of Regnum**, com a calculadora de trainer (build
de disciplinas/skills) como primeira funcionalidade portada do
[CoRT](https://codeberg.org/mascal/CoRT) — reconstruída do zero em
React + TypeScript, com interface redesenhada, tema por reino e suporte a
instalação como aplicativo (PWA).

## Rodando localmente

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar no terminal (normalmente
`http://localhost:5173`).

Para gerar a versão de produção:

```bash
npm run build
npm run preview   # serve o build de produção localmente, para testar
```

## O que já está pronto

- **Treinador** (`/trainer`): calculadora completa de build — escolha de classe (as 6
  classes avançadas: Knight, Barbarian, Conjurer, Warlock, Hunter, Marksman),
  nível (10–60, incluindo o Cristal Necro no 60), disciplinas com custo em
  pontos de disciplina, habilidades com rank (0–5) em pontos de poder,
  detalhes de cada habilidade (mana, recarga, dano/buffs por rank) e
  compartilhamento de build por link.
- **Warzone** (`/`, tela inicial do app): dados ao vivo de `cort.ovh` — mapa da Zona de
  Guerra com os 12 fortes posicionados (ícone por tipo — forte, castelo,
  muralha — e cor do reino que controla cada um, com destaque para fortes
  invadidos); clicar (ou navegar por teclado) num forte abre um mini-histórico
  só das capturas/recapturas daquele forte, puxado do mesmo dump de eventos
  de 10 dias; gemas por reino, os últimos 5 pedidos ao dragão em destaque
  (buscados do dump de eventos de 10 dias do CoRT, já que pedidos ao dragão
  são raros o bastante pra não aparecerem sempre no log recente de baixo) e
  um log dos eventos recentes (capturas, gemas, relíquias, pedidos ao
  dragão) e um gráfico de barras com quantos fortes cada reino
  capturou/recapturou, pra saber de cara quem está mais ativo na guerra —
  com abas pra alternar entre 24h, semana, mês e 3 meses. A aba de 24h usa
  o dump de eventos de 10 dias do CoRT (mesmo motivo dos pedidos ao
  dragão); semana/mês/3 meses usam o `stats.json` do CoRT, que já vem
  pré-agregado por período (o log bruto de eventos não cobre mais que uns
  10 dias, então essas janelas maiores não dariam pra calcular a partir
  dele); e um gráfico de curva (linha) com o total de fortes capturados
  a cada 15/30/60 minutos ao longo das últimas 24h — pra ver os horários
  de pico de atividade da guerra, com cursor/toque mostrando o valor exato
  de cada ponto. Tudo atualizado a cada 2 minutos.
- **Épicos** (`/bosses`): contagem regressiva dos bosses de mundo, dados ao
  vivo de `cort.ovh`.
- **Notificações** (`/notificacoes`): timeline pública de avisos (título +
  descrição). O CRUD (criar/remover) fica numa página separada sem link em
  lugar nenhum — sem banco de dados nem servidor próprio, ver
  [Configurando as notificações](#configurando-as-notificações) abaixo. A
  mesma página tem um painel de **Alertas** pessoais, local ao aparelho (sem
  cadastro, guardado só no `localStorage`): escolher "meu reino" e ativar,
  independentemente, cada um dos 9 eventos — forte/muralha/gem, cada um com
  tomado, perdido e recuperado (recuperar é só a sua própria territorial
  voltando ao seu controle depois de invadida — diferente de tomar, que é
  capturar território alheio) — além de avisos 1h/30min/15min antes de cada
  épico nascer. Os avisos aparecem como toast dentro do app e,
  se a permissão de notificações do navegador for concedida, também como
  notificação do sistema — funcionam enquanto o app estiver aberto (aba
  ativa ou minimizada). Com a permissão concedida também dá pra ativar
  avisos com o **app fechado** de verdade (push), ver
  [Push de verdade (app fechado)](#push-de-verdade-app-fechado) abaixo.
- Navegação em **bottom tab bar** em todas as telas (não só mobile) — o
  header foi removido por enquanto, então essa barra (fixa embaixo no
  celular, flutuante no desktop) é a única navegação do app hoje, com a
  tab ativa destacada.
- **PWA**: o app funciona offline para o Treinador, já que os dados de
  referência (`public/data/trainer/1.35.19`) ficam empacotados localmente.

> **Tema e instalação do PWA temporariamente fora do ar**: o seletor de
> tema e o botão "Instalar app" ficavam no header, removido por enquanto —
> o app fica fixo no tema Escuro (padrão) até o header (ou outro lugar pra
> esses controles) voltar. O sistema de temas em si continua no código
> (`src/theme/`), só não está exposto na interface.

## O que falta (próximos passos)

- Zona de Batalha, Estatísticas (WZ e Trainer) e Missões ainda não têm
  página nem tab no menu. O cliente de API ao vivo do CoRT já está pronto em
  `src/api/cortApi.ts` (bosses, zona de batalha, status da WZ, eventos,
  estatísticas) para quando alguma delas for implementada.
- Hoje só a versão `1.35.19` dos dados do trainer está empacotada em
  `public/data/trainer/`. Para adicionar versões antigas, copie o
  `trainerdata.json` e a pasta `icons/` de cada versão do repositório do CoRT
  para `public/data/trainer/<versão>/` e adicione a versão em
  `src/data/trainerConstants.ts` (`DATASET_VERSIONS`).
- O app tenta primeiro buscar os dados do trainer direto de `cort.ovh` (dado
  que pode ser atualizado por eles a qualquer momento) e cai para a cópia
  local se a rede estiver bloqueada ou indisponível — em redes corporativas
  restritas isso é comum, e o app deixa isso visível com o indicador
  "dados locais" / "dados ao vivo" na barra de ferramentas do Treinador.

## Configurando as notificações

A tab **Notificações** (`/notificacoes`) é uma timeline pública e
**somente leitura** — não tem nenhum botão de gerenciar nela. Criar e remover
notificações acontece numa página separada e sem link em lugar nenhum do
menu: **`/warlords/gerenciamento/notificacoes`**.

`api/notifications.ts` é uma [Vercel Function](https://vercel.com/docs/functions)
(funciona com qualquer framework, não precisa ser Next.js) que lê e escreve
`content/notifications.json` **direto no repositório**, através da API do
GitHub — cada notificação criada ou removida vira um commit. Por isso não
precisa de Postgres/Redis/etc., e o app continua 100% estático pro resto.

- `GET /api/notifications` é público (qualquer visitante do site lê a lista).
- `POST`/`DELETE` exigem o header `x-admin-password`, comparado no servidor
  contra a variável de ambiente abaixo — sem ela, ninguém além de quem sabe a
  senha consegue criar ou apagar notificações.

Pra isso funcionar em produção, configure duas variáveis de ambiente no
projeto na Vercel (Settings → Environment Variables):

| Variável | O que é |
| --- | --- |
| `NOTIFICATIONS_GITHUB_TOKEN` | Um [fine-grained personal access token](https://github.com/settings/tokens?type=beta) do GitHub, com acesso só a este repositório e permissão **Contents: Read and write**. |
| `NOTIFICATIONS_ADMIN_PASSWORD` | A senha usada em `/warlords/gerenciamento/notificacoes`. |

> **Sobre a senha ser sempre a mesma:** como este repositório é **público**,
> qualquer valor escrito direto no código-fonte (em `api/notifications.ts`,
> por exemplo) fica visível pra qualquer pessoa que olhar o repo no GitHub —
> por isso a senha não vem fixa no código, só funciona através dessa
> variável de ambiente, que só você vê no painel da Vercel. Configure
> `NOTIFICATIONS_ADMIN_PASSWORD` com o valor que você quiser usar como senha
> universal de gerenciamento.

Depois de configurar, faça um novo deploy (ou aguarde o próximo push) pras
variáveis entrarem em vigor. Em `npm run dev` local a rota `/api/notifications`
não existe (o Vite não roda Functions da Vercel), então as duas páginas
mostram o estado de erro — isso é esperado, só funciona depois de publicado.

## Push de verdade (app fechado)

Os alertas locais do painel de Alertas (`/notificacoes`) só funcionam com
o app aberto — o polling que os alimenta é o próprio JS da página. Pra
notificar mesmo com o app **fechado**, o app usa Web Push de verdade:

- `api/push/subscribe.ts` / `api/push/unsubscribe.ts` — Vercel Functions que
  guardam a *push subscription* do navegador + as preferências de alerta
  (mesma ideia do `api/notifications.ts`: GitHub como banco, sem
  Postgres/Redis — grava em `content/push-subscribers.json`).
- `api/push/tick.ts` — a cada chamada, busca `wstatus.json`/`bosses.php` do
  `cort.ovh`, compara com o snapshot da rodada anterior
  (`content/push-state.json`, só reescrito quando algo de fato muda — pra
  não virar um commit por minuto), descobre o que mudou (mesmas 9
  categorias do painel de Alertas, mais os limiares de épico) e dispara o
  push via VAPID pra quem se aplica. Protegido por um segredo
  compartilhado (`PUSH_TICK_SECRET`, no header `Authorization: Bearer` ou
  `?secret=`) — sem ele, ninguém além de quem sabe o segredo consegue
  disparar um tick.
- `src/sw.ts` — service worker customizado (o app usa o modo
  `injectManifest` do `vite-plugin-pwa` em vez do `generateSW` padrão,
  justamente pra poder ter esse código próprio) com os handlers de
  `push`/`notificationclick` que mostram a notificação do sistema.

### Por que o "cron" não é da própria Vercel

Chamar `api/push/tick.ts` só funciona se algo disparar isso periodicamente
— e nenhuma plataforma grátis agenda em menos de 1 minuto (Vercel Cron no
plano Hobby é só 1x/dia; GitHub Actions é 5 em 5min no mínimo). A solução:
um serviço **externo** e gratuito de "ping" agendado bate no endpoint a
cada minuto — a lógica em si roda inteira na Vercel, só o gatilho vem de
fora. Usei o [cron-job.org](https://cron-job.org) (grátis, sem cartão,
suporta 1 em 1 minuto):

1. Crie uma conta grátis em cron-job.org.
2. Crie um novo cronjob:
   - URL: `https://<seu-domínio>/api/push/tick`
   - Schedule: a cada 1 minuto
   - Em "Advanced" → "Request headers", adicione
     `Authorization: Bearer <o mesmo valor de PUSH_TICK_SECRET>`
3. Salve e ative.

### Variáveis de ambiente (Vercel)

| Variável | O que é |
| --- | --- |
| `PUSH_TICK_SECRET` | Segredo que só o cron-job.org (via header `Authorization`) precisa saber, pra ninguém mais conseguir disparar `/api/push/tick`. |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID, usada no servidor pra assinar os pushes. |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID — nunca vai pro código, só aqui. |
| `VAPID_SUBJECT` | Uma URL `https://` (ou `mailto:`) exigida pelo protocolo VAPID como contato — pode ser a própria URL do site. |
| `VITE_VAPID_PUBLIC_KEY` | A **mesma** chave pública acima, mas exposta ao client (prefixo `VITE_`) — é o que o navegador usa em `pushManager.subscribe()`. |

O par de chaves VAPID é gerado uma vez com `npx web-push generate-vapid-keys`
(lib `web-push`, só precisa rodar localmente pra gerar o par — não fica
como dependência do projeto).

Sem `VITE_VAPID_PUBLIC_KEY` configurada, o botão "Ativar avisos com o app
fechado" simplesmente não aparece — o resto do app (alertas locais com o
app aberto) funciona normalmente.

## Regenerando os ícones do PWA

Os ícones em `public/icons/` são gerados a partir da arte-fonte em
`scripts/assets/app-icon-source.jpg` pelo script `scripts/gen-icons.mjs`
(usa a lib `sharp`, que não fica como dependência do projeto): recorta o
ícone quadrado (`icon-192.png`, `icon-512.png`) e uma versão com margem pra
`maskable-512.png`, que o Android/PWA recorta em círculo — sem a margem o
brasão seria cortado nas bordas.

Para trocar a arte ou gerar de novo:

```bash
# troque scripts/assets/app-icon-source.jpg por outra imagem quadrada, se quiser
npm i -D sharp
node scripts/gen-icons.mjs
npm uninstall sharp
```

## Estrutura do projeto

```
api/
  notifications.ts   Vercel Function do CRUD de notificações (GitHub como "banco")
  cort-proxy.ts   relay same-origin pra wstatus/events/stats.json (ver nota de CORS abaixo)
  _push/          lógica compartilhada do push (diff de WZ/épicos, envio VAPID, storage) — não roteável
  push/           Vercel Functions: subscribe.ts, unsubscribe.ts, tick.ts
content/
  notifications.json     dados das notificações — editado só via api/notifications.ts
  push-subscribers.json  assinaturas de push — editado só via api/push/*.ts
  push-state.json         snapshot da WZ/épicos usado pro diff do tick — idem
src/
  api/            clientes de dados (cort.ovh ao vivo, dados locais, /api/notifications)
  data/           constantes do jogo (classes, níveis, etc.)
  features/alerts/   alertas locais (client-side) + integração com push
  features/trainer/  lógica de cálculo do trainer + componentes de UI
  features/notifications/  hook + componentes do CRUD de notificações + painel de Alertas
  layout/         navegação (bottom tab bar, em todas as telas) e layout geral
  pages/          páginas roteadas
  pwa/            hook de instalação do PWA
  sw.ts           service worker customizado (push/notificationclick)
  theme/          sistema de temas (CSS custom properties)
  types/          tipos TypeScript dos dados do trainer
public/
  data/trainer/   dados de referência do trainer, empacotados para uso offline
  icons/          ícones do PWA
```

## Por que a Warzone passa por um proxy (`api/cort-proxy.ts`)

`wstatus.json`, `events.json` e `stats.json` (`cort.ovh/api/var/...`) sempre
respondem com `Access-Control-Allow-Origin: https://cort.ovh` — nunca o
domínio deste app, nem `*`. Isso significa que o **navegador** de qualquer
visitante bloqueia a leitura dessas respostas por CORS, não importa a
qualidade da conexão — dava pra confundir com "internet ruim" porque o
sintoma era só um erro genérico de "dados indisponíveis". `bosses.php`
manda `Access-Control-Allow-Origin: *` (por isso a página de Épicos nunca
teve esse problema).

A correção foi rotear só esses três endpoints por uma Vercel Function
própria (`api/cort-proxy.ts`, chamada via `/api/cort-proxy?endpoint=...`):
um servidor não está sujeito a CORS (o mesmo motivo pelo qual `curl`
funciona direto), então ela busca o JSON em nome do navegador e devolve
same-origin — sem CORS nenhum de atravessar. Como as outras Vercel
Functions deste projeto, isso não existe em `npm run dev` local (o Vite não
roda Functions), então em dev essas três chamadas caem no estado de erro —
só funciona depois de publicado.

## Créditos

Inspirado no [CoRT](https://codeberg.org/mascal/CoRT), da comunidade de
Champions of Regnum, licenciado sob AGPL-3.0. Os dados de referência do
trainer (nomes, custos, textos das habilidades) usados aqui vêm do mesmo
projeto. O mapa da Zona de Guerra (`public/data/wz/base_map.png`), o
posicionamento dos fortes na página de Warzone e os retratos dos
chefes de mundo (`public/data/bosses/`) também vêm do CoRT
([mascaldotfr/CoRT](https://github.com/mascaldotfr/CoRT)).
