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

- **Trainer** (`/`): calculadora completa de build — escolha de classe (as 6
  classes avançadas: Knight, Barbarian, Conjurer, Warlock, Hunter, Marksman),
  nível (10–60, incluindo o Cristal Necro no 60), disciplinas com custo em
  pontos de disciplina, habilidades com rank (0–5) em pontos de poder,
  detalhes de cada habilidade (mana, recarga, dano/buffs por rank) e
  compartilhamento de build por link.
- **Status da WZ** (`/wz`): dados ao vivo de `cort.ovh` — mapa da Zona de
  Guerra com os 12 fortes posicionados (ícone por tipo — forte, castelo,
  muralha — e cor do reino que controla cada um, com destaque para fortes
  invadidos), gemas por reino e um log dos eventos recentes (capturas,
  gemas, relíquias, pedidos ao dragão), atualizados a cada 2 minutos.
- **Chefes** (`/bosses`): contagem regressiva dos bosses de mundo, dados ao
  vivo de `cort.ovh`.
- **Notificações** (`/notificacoes`): timeline pública de avisos (título +
  descrição). O CRUD (criar/remover) fica numa página separada sem link em
  lugar nenhum — sem banco de dados nem servidor próprio, ver
  [Configurando as notificações](#configurando-as-notificações) abaixo.
- Navegação em **bottom tab bar** em todas as telas (não só mobile) — o
  header foi removido por enquanto, então essa barra (fixa embaixo no
  celular, flutuante no desktop) é a única navegação do app hoje, com a
  tab ativa destacada.
- **PWA**: o app funciona offline para o Trainer, já que os dados de
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
  "dados locais" / "dados ao vivo" na barra de ferramentas do Trainer.

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
content/
  notifications.json  dados das notificações — editado só via api/notifications.ts
src/
  api/            clientes de dados (cort.ovh ao vivo, dados locais, /api/notifications)
  data/           constantes do jogo (classes, níveis, etc.)
  features/trainer/  lógica de cálculo do trainer + componentes de UI
  features/notifications/  hook + componentes do CRUD de notificações
  layout/         navegação (bottom tab bar, em todas as telas) e layout geral
  pages/          páginas roteadas
  pwa/            hook de instalação do PWA
  theme/          sistema de temas (CSS custom properties)
  types/          tipos TypeScript dos dados do trainer
public/
  data/trainer/   dados de referência do trainer, empacotados para uso offline
  icons/          ícones do PWA
```

## Créditos

Inspirado no [CoRT](https://codeberg.org/mascal/CoRT), da comunidade de
Champions of Regnum, licenciado sob AGPL-3.0. Os dados de referência do
trainer (nomes, custos, textos das habilidades) usados aqui vêm do mesmo
projeto. O mapa da Zona de Guerra (`public/data/wz/base_map.png`), o
posicionamento dos fortes na página de Status da WZ e os retratos dos
chefes de mundo (`public/data/bosses/`) também vêm do CoRT
([mascaldotfr/CoRT](https://github.com/mascaldotfr/CoRT)).
