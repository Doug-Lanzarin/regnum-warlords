# push-worker

Cloudflare Worker que dispara **notificações push de verdade** (com o app
fechado) pros alertas configurados em `/notificacoes` do app principal —
forte/muralha/gema tomado/perdido e épico prestes a nascer.

Existe separado do app (Vite/Vercel) porque roda numa plataforma diferente:
não é build do Vite, tem seu próprio deploy via Wrangler, direto pra
Cloudflare.

## Por que Cloudflare e não Vercel

O app já atualiza os alertas locais a cada 30s **enquanto está aberto**
(`AlertsWatcher`, no app principal). Pra funcionar com o app **fechado**,
precisa de um processo rodando fora do navegador que confira o estado da
Warzone/épicos periodicamente e dispare o push. Isso precisa de um
agendador (cron), e nenhuma plataforma gratuita agenda em intervalos
menores que 1 minuto:

- Vercel Cron (plano Hobby/grátis): só 1x por dia.
- GitHub Actions (`schedule`): mínimo de 5 em 5 minutos.
- **Cloudflare Cron Triggers**: mínimo de 1 em 1 minuto — o mais fino que
  existe de graça, por isso a escolha.

## Como funciona

- **`POST /subscribe`**: recebe a `PushSubscription` do navegador +
  as preferências de alerta (`AlertSettings`) e guarda no KV.
- **`POST /unsubscribe`**: remove uma subscription do KV.
- **Cron (`* * * * *`)**: a cada minuto, busca `wstatus.json` e
  `bosses.php` do `cort.ovh`, recalcula o status de fortes/gemas
  (reaproveitando `computeFortStatuses`/`computeGemStatuses` de
  `../src/features/wz/wzEngine.ts` — mesma lógica do app), compara com o
  snapshot da rodada anterior pra achar o que mudou (mesmas 6 categorias
  do painel de Alertas: forte/muralha/gema × tomado/perdido, mais os
  limiares de 60/30/15min antes de cada épico nascer), casa cada mudança
  com as preferências de cada assinante salvo, e dispara o push via VAPID.

### Por que tudo num único blob de KV, não uma chave por assinante

O plano gratuito da Workers KV libera 100.000 leituras/dia mas só **1.000
operações de `list()`/dia**. Com o cron rodando a cada minuto (1.440
execuções/dia), listar assinantes um por um estouraria esse limite rapidinho.
Por isso `subs:index`, `state:categories` e `state:boss` são cada um **uma
única chave** com um blob JSON — o cron faz `get()` (é *read*, não *list*,
orçamento de 100k/dia) e só escreve quando algo de fato muda.

## Rodando localmente

```bash
npm install
npm run typecheck
npm run dev          # sobe em http://localhost:8787, com KV emulado localmente
```

O cron não dispara sozinho em dev local — force manualmente com:

```bash
curl "http://localhost:8787/cdn-cgi/local/scheduled"
```

## Deploy (primeira vez)

Precisa de uma conta Cloudflare (grátis). Os passos abaixo só você
consegue rodar — dependem do seu login/OAuth, ninguém consegue fazer por
você:

1. **Login**:
   ```bash
   npx wrangler login
   ```
2. **Criar o namespace de KV**:
   ```bash
   npx wrangler kv namespace create push_state
   ```
   Copia o `id` que aparece na saída e cola no lugar de
   `REPLACE_ME_KV_NAMESPACE_ID` em `wrangler.toml`.
3. **Gerar as chaves VAPID** (se ainda não tiver um par — a Claude Code
   session que criou este projeto já gerou um e te passou separado, fora
   do repositório; se precisar gerar de novo):
   ```bash
   npx web-push generate-vapid-keys
   ```
4. **Configurar as variáveis** em `wrangler.toml`:
   - `ALLOWED_ORIGIN` e `VAPID_SUBJECT`: a URL de produção do app (ex.:
     `https://regnum-warlords.vercel.app`).
   - `VAPID_PUBLIC_KEY`: a chave pública gerada no passo 3.
5. **Guardar a chave privada como secret** (nunca em `wrangler.toml`,
   nunca commitada):
   ```bash
   npx wrangler secret put VAPID_PRIVATE_KEY
   ```
   (cola a chave privada quando pedir)
6. **Deploy**:
   ```bash
   npm run deploy
   ```
   Copia a URL que aparece no final (algo como
   `https://regnum-warlords-push.<sua-conta>.workers.dev`).
7. **Configurar o app principal** (Vercel → Settings → Environment
   Variables), pra ligar o client a esse Worker:
   - `VITE_PUSH_WORKER_URL` = a URL do passo 6.
   - `VITE_VAPID_PUBLIC_KEY` = a mesma chave pública do passo 3/4.

   Isso faz parte de uma segunda etapa (mudanças no app React ainda não
   estão neste PR) — depois de rodar os passos acima, é só avisar com a
   URL do Worker que o resto é feito.

## Limites do plano gratuito (referência)

- Workers: 100.000 requisições/dia (cron conta como invocação — 1.440/dia
  já usadas só pelo cron, sobra folga de sobra pros `/subscribe`).
- KV: 100.000 leituras/dia, 1.000 escritas/dia, 1.000 `list()`/dia (não
  usamos `list()` — ver seção acima), 1GB de armazenamento.
- CPU por invocação: 10ms no plano free — o trabalho aqui (parse de JSON
  pequeno, comparação de arrays curtos, assinatura VAPID) é rápido o
  suficiente pra escala de um app pessoal.
