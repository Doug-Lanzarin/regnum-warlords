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
  invadidos), gemas por reino e relíquias (no altar, em trânsito ou
  capturadas), atualizados a cada 2 minutos.
- **Chefes** (`/bosses`): contagem regressiva dos bosses de mundo, dados ao
  vivo de `cort.ovh`.
- Sistema de **temas** fiel às cores originais do CoRT: Escuro (padrão),
  Claro, OLED e os três reinos (Alsius, Ignis, Syrtis).
- **PWA**: o app pode ser instalado (botão "Instalar app" quando o navegador
  permite) e funciona offline para o Trainer, já que os dados de referência
  (`public/data/trainer/1.35.19`) ficam empacotados localmente.
- Navegação já pronta para as demais páginas do CoRT (Zona de Batalha,
  Eventos da WZ, Estatísticas, Missões) — hoje como páginas "em construção",
  prontas para receber as próximas implementações.

## O que falta (próximos passos)

- Implementar as páginas "em construção" restantes (`src/pages/ComingSoonPage.tsx`
  é o placeholder de todas elas). O cliente de API ao vivo do CoRT já está
  pronto em `src/api/cortApi.ts` (bosses, zona de batalha, status da WZ,
  eventos, estatísticas) — falta só montar a UI de cada página.
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

## Regenerando os ícones do PWA

Os ícones em `public/icons/` foram gerados uma vez com o script
`scripts/gen-icons.mjs` (usa a lib `sharp`, que não fica como dependência do
projeto). Para gerar de novo com outro visual:

```bash
npm i -D sharp
node scripts/gen-icons.mjs
npm uninstall sharp
```

## Estrutura do projeto

```
src/
  api/            clientes de dados (cort.ovh ao vivo + dados locais)
  data/           constantes do jogo (classes, níveis, etc.)
  features/trainer/  lógica de cálculo do trainer + componentes de UI
  layout/         navegação e layout geral do app
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
projeto. O mapa da Zona de Guerra (`public/data/wz/base_map.png`) e o
posicionamento dos fortes na página de Status da WZ também vêm do CoRT
([mascaldotfr/CoRT](https://github.com/mascaldotfr/CoRT)).
