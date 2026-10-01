# Guia Completo de Deploy — Supabase + Vercel

Este guia mostra como colocar a **Plataforma Rotas Seguras** em produção usando
**Supabase** (banco PostGIS + Realtime) e **Vercel** (hospedagem Next.js).

---

## Visão Geral da Arquitetura em Produção

```
┌───────────────────────────────────────────────────────────────┐
│                      VERCEL (Next.js)                          │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   │
│  │  App Router /  │   │  API Routes    │   │  Server Actions│   │
│  │  React + Leaflet│   │  /api/incidents │   │  (Realtime)   │   │
│  └────────┬───────┘   └────────┬───────┘   └────────┬───────┘   │
│           │ Prisma Client       │ Prisma Client        │         │
└───────────┼─────────────────────┼──────────────────────┼─────────┘
            │                     │                      │
            ▼                     ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + PostGIS)                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  incidents   │  │   shelters   │  │  survivor_signals      │  │
│  │  (PostGIS)   │  │  (PostGIS)   │  │  (PostGIS)             │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  RLS (Row Level Security) + Triggers TTL + pg_cron          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Supabase Realtime (substitui nosso Socket.io local)         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## PARTE 1 — Configurar o Supabase

### Passo 1.1 — Criar projeto no Supabase

1. Acesse https://supabase.com e faça login (pode usar GitHub/Google)
2. Clique em **New Project**
3. Preencha:
   - **Name**: `rotas-seguras` (ou o nome que preferir)
   - **Database Password**: gere uma senha forte e **guarde-a** (vai precisar)
   - **Region**: `South America (São Paulo)` — mais perto do Brasil
   - **Plan**: Free tier é suficiente para começar
4. Clique em **Create new project** e aguarde ~2 minutos

### Passo 1.2 — Habilitar a extensão PostGIS

1. No painel do projeto, vá em **Database → Extensions**
2. Busque por `postgis`
3. Clique no toggle para **ativar**
4. Confirme clicando em **Enable extension**

> ⚠️ **Importante**: Sem isso as tabelas com `GEOMETRY(Point, 4326)` não vão funcionar.

### Passo 1.3 — Executar o schema SQL

1. Vá em **SQL Editor → New query**
2. Cole o conteúdo do arquivo `download/001_postgis_schema.sql`
3. Clique em **RUN** (Ctrl+Enter)
4. Verifique se apareceu "Success. No rows returned."
5. Faça o mesmo com `download/002_seed_franca_sp.sql` para popular os dados de exemplo

### Passo 1.4 — Pegar as credenciais da API

1. Vá em **Project Settings (⚙️) → API**
2. Anote os seguintes valores:
   - **Project URL**: `https://xxxxxxxx.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key**: `eyJhbGci...` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: `eyJhbGci...` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ mantenha em segredo

### Passo 1.5 — Pegar a string de conexão do banco

1. Vá em **Project Settings → Database**
2. Em **Connection string**, escolha a aba **URI**
3. Selecione o modo **Transaction** (porta 6543 — recomendado para serverless)
4. A URL terá o formato:
   ```
   postgresql://postgres.[ref]:[SUA-SENHA]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Substitua `[SUA-SENHA]` pela senha que você definiu no Passo 1.1
6. Esta será a sua `DATABASE_URL` na Vercel

### Passo 1.6 — (Opcional) Habilitar `pg_cron` para limpeza automática

Para que incidentes expirados sejam marcados automaticamente:

1. Vá em **Database → Extensions**
2. Ative a extensão `pg_cron`
3. Vá no **SQL Editor** e rode:
   ```sql
   SELECT cron.schedule(
     'mark-expired-incidents',
     '*/5 * * * *',
     $$SELECT mark_expired_incidents();$$
   );

   SELECT cron.schedule(
     'mark-expired-survivors',
     '*/10 * * * *',
     $$SELECT mark_expired_survivors();$$
   );
   ```

---

## PARTE 2 — Adaptar o projeto para PostgreSQL

### Passo 2.1 — Atualizar o schema do Prisma

Substitua o conteúdo de `prisma/schema.prisma` por:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model IncidentReport {
  id          String   @id @default(cuid())
  type        String
  severity    String   @default("medium")
  longitude   Float
  latitude    Float
  description String?
  upvotes     Int      @default(0)
  downvotes   Int      @default(0)
  verified    Boolean  @default(false)
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type])
  @@index([verified])
  @@index([expiresAt])
}

model Shelter {
  id             String   @id @default(cuid())
  name           String
  type           String   @default("shelter")
  longitude      Float
  latitude       Float
  capacityTotal  Int      @default(0)
  capacityUsed   Int      @default(0)
  capacityStatus String   @default("unknown")
  contactInfo    String?
  suppliesNeeded String?
  notes          String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([type])
  @@index([isActive])
}

model SurvivorSignal {
  id            String   @id @default(cuid())
  peopleCount   Int      @default(1)
  urgencyLevel  String   @default("safe_waiting")
  longitude     Float
  latitude      Float
  isResolved    Boolean  @default(false)
  contactInfo   String?
  anonymize     Boolean  @default(true)
  expiresAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([isResolved])
  @@index([urgencyLevel])
}

model RouteValidation {
  id          String   @id @default(cuid())
  incidentId  String
  vote        Boolean
  comment     String?
  createdAt   DateTime @default(now())

  @@index([incidentId])
}
```

> **Por que não usar o tipo `geometry` do PostGIS no Prisma?**
> O Prisma ainda não suporta nativamente tipos geoespaciais. A estratégia
> recomendada é guardar latitude/longitude em colunas Float separadas
> (como acima) e usar **views** ou **funções SQL** do PostGIS (`ST_DWithin`,
> `ST_Distance`) para queries avançadas. As migrations PostGIS originais
> ficam paralelas ao schema do Prisma.

### Passo 2.2 — Gerar o cliente Prisma para Postgres

```bash
# Localmente, com a DATABASE_URL apontando para o Supabase:
DATABASE_URL="postgresql://..." bun run db:push
bun run db:generate
```

> Se preferir manter o SQLite para desenvolvimento local e PostgreSQL só em produção,
> use dois arquivos `.env`: `.env` (com `file:./dev.db`) e `.env.production` (com a URL do Supabase).

---

## PARTE 3 — Deploy na Vercel

### Passo 3.1 — Subir o código para o GitHub

```bash
# Inicialize o repositório (se ainda não fez)
git init
git add .
git commit -m "Plataforma Rotas Seguras - versão inicial"

# Crie um repositório no GitHub e conecte
git remote add origin https://github.com/SEU-USUARIO/rotas-seguras.git
git push -u origin main
```

> **Importante**: Antes de fazer push, verifique se o `.gitignore` contém:
> - `.env`
> - `dev.db`
> - `node_modules/`
> - `.next/`

### Passo 3.2 — Importar o projeto na Vercel

1. Acesse https://vercel.com e faça login com GitHub
2. Clique em **Add New → Project**
3. Selecione o repositório `rotas-seguras`
4. A Vercel detectará automaticamente o Next.js — **não mude nenhuma configuração de build**
5. **NÃO clique em Deploy ainda!** Primeiro vamos configurar as variáveis de ambiente (Passo 3.3)

### Passo 3.3 — Configurar variáveis de ambiente

Na página de configuração do projeto, expanda **Environment Variables** e adicione cada uma:

| Nome | Valor | Em qual ambiente |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[SENHA]@aws-0-[region].pooler.supabase.com:6543/postgres` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (anon public) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (service_role) | Production, Preview (server-only) |
| `NEXT_PUBLIC_APP_URL` | `https://rotas-seguras.vercel.app` (URL final) | Production |
| `NODE_ENV` | `production` | Production |

> ⚠️ **Atenção**: Marque `SUPABASE_SERVICE_ROLE_KEY` para **NUNCA** ir para o ambiente Development (ela é server-only e dar bypass no RLS)

### Passo 3.4 — Deploy!

1. Clique em **Deploy**
2. Aguarde ~2-3 minutos (build + deploy)
3. Acesse a URL gerada: `https://rotas-seguras-xxxx.vercel.app`

### Passo 3.5 — Configurar domínio próprio (opcional)

1. Na Vercel: **Settings → Domains**
2. Adicione seu domínio (ex: `rotas-seguras.prefeitura.gov.br`)
3. Configure os DNS no seu provedor conforme instruído pela Vercel
4. Atualize `NEXT_PUBLIC_APP_URL` para o domínio final

---

## PARTE 4 — Real-time em produção (substituindo Socket.io local)

O Socket.io que roda em `mini-services/realtime-service` **não funciona na Vercel** (ela é serverless
e não mantém WebSocket connections persistentes). Você tem 3 opções:

### Opção A — Usar Supabase Realtime (recomendado, grátis até 200 conexões)

1. No Supabase: **Database → Replication** → ative as tabelas `incident_reports`, `shelters`, `survivor_signals`
2. Instalar o cliente Supabase:
   ```bash
   bun add @supabase/supabase-js
   ```
3. Substituir `src/lib/realtime/useRealtime.ts` por:
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import { useEffect } from 'react'

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )

   export function useRealtime() {
     useEffect(() => {
       const channel = supabase
         .channel('public:incident_reports')
         .on('postgres_changes',
           { event: 'INSERT', schema: 'public', table: 'incident_reports' },
           (payload) => {
             console.log('Novo incidente:', payload.new)
             // addIncident(payload.new) etc
           }
         )
         .subscribe()
       return () => { supabase.removeChannel(channel) }
     }, [])
   }
   ```

### Opção B — Manter o mini-service Socket.io separado

Hospede o `mini-services/realtime-service` em um VPS (DigitalOcean, Railway, Fly.io)
e ajuste a URL do cliente para apontar para esse servidor.

### Opção C — Polling (mais simples, menos ideal)

Faça o cliente buscar `/api/incidents` a cada 10-20 segundos quando houver atividade.
Funciona em qualquer hospedagem, mas consome mais banda.

---

## PARTE 5 — Checklist de Produção

Antes de anunciar a aplicação, verifique:

### Segurança
- [ ] Todas as chaves sensíveis (`SUPABASE_SERVICE_ROLE_KEY`) estão no escopo **server-only**
- [ ] RLS (Row Level Security) está ativa em todas as tabelas (já configurada no SQL)
- [ ] CSP (Content Security Policy) configurada — ver `vercel.json` headers
- [ ] CORS do Supabase está configurado para permitir apenas seu domínio

### Performance
- [ ] Índices GIST criados (já no schema SQL)
- [ ] Imagens otimizadas (use `next/image`)
- [ ] Service Worker cacheando tiles OSM
- [ ] Lazy loading de componentes pesados (`dynamic()`)

### Monitoramento
- [ ] Configure Sentry (free tier 5k erros/mês)
- [ ] Ative Vercel Analytics
- [ ] Configure alertas do Supabase (Disk usage > 80%)

### Backup
- [ ] Supabase faz backup automático diário (Free tier: 7 dias)
- [ ] Considere exportar dados críticos mensalmente

### Legal / Compliance (LGPD)
- [ ] Política de Privacidade visível no app
- [ ] Termos de uso para voluntários/reportadores
- [ ] Consentimento explícito para localização (geolocation API exige)
- [ ] Não armazenar dados pessoais de sobreviventes sem criptografia (já feito)
- [ ] Anonimização ativada por padrão para sinais de socorro (já feito)

---

## PARTE 6 — Resolução de Problemas Comuns

### Erro: `PrismaClientInitializationError: Can't reach database server`

**Causa**: String de conexão errada ou IP bloqueado
**Solução**:
1. Confirme que a senha está correta na URL
2. Vá em Supabase → Settings → Database → Network Restrictions
3. Adicione `0.0.0.0/0` para permitir conexões de qualquer IP (ou restrinja aos IPs da Vercel)

### Erro: `relation "incident_reports" does not exist`

**Causa**: Você não rodou o schema SQL no Supabase
**Solução**: Vá em SQL Editor e rode `001_postgis_schema.sql`

### Erro: `extension "postgis" does not exist`

**Causa**: Extensão não foi habilitada
**Solução**: Vá em Database → Extensions e ative `postgis`

### Erro: Tiles OSM não carregam na Vercel

**Causa**: Política CSP bloqueando `*.tile.openstreetmap.org`
**Solução**: Adicione o domínio ao `connect-src` no `vercel.json` headers

### Erro: Service Worker não atualiza após novo deploy

**Causa**: Browser cacheou a versão antiga
**Solução**: O `sw.js` tem `Cache-Control: no-cache` (configurado no `vercel.json`). Se ainda assim não atualizar, force o unregister no DevTools → Application → Service Workers → Unregister

### Lentidão em consultas geoespaciais

**Causa**: Índices GIST não criados ou dados foram inseridos antes dos índices
**Solução**:
```sql
-- Recria índices
REINDEX TABLE incident_reports;
REINDEX TABLE shelters;
REINDEX TABLE survivor_signals;

-- Atualiza estatísticas
ANALYZE incident_reports;
ANALYZE shelters;
ANALYZE survivor_signals;
```

---

## PARTE 7 — Custos Estimados

### Supabase Free Tier
- 500MB de banco
- 50k MAU (Monthly Active Users) no Auth
- 1GB Storage
- Realtime: 200 conexões simultâneas
- **Custo: R$ 0/mês**

### Vercel Free Tier (Hobby)
- 100GB bandwidth/mês
- 100h build time/mês
- Deploy automático via GitHub
- **Custo: R$ 0/mês**

### OpenStreetMap Tiles
- Gratuito, mas com fair use policy (~tens de milhares de requests/dia)
- Para alto tráfego: use um provedor self-hosted ou Switch2OSM
- **Custo: R$ 0/mês até ~50k usuários**

### Estimativa total para até ~5.000 usuários/mês
**R$ 0/mês** — tudo roda nos free tiers

### Para escala municipal (prefeituras)
- Supabase Pro: $25/mês → 8GB banco, 100k MAU, mais backups
- Vercel Pro: $20/mês → 1TB bandwidth
- **Total: ~R$ 250/mês** para uma cidade inteira

---

## Próximos Passos (Roadmap)

1. **Integrar OSRM real** para rotas mais precisas (substituindo a heurística Turf)
2. **Auth Supabase** para login de administradores da Defesa Civil
3. **Upload de fotos** em incidentes (Supabase Storage)
4. **Push notifications** Web Push API para alertas críticos
5. **Dashboard admin** com métricas em tempo real (Recharts já incluído)
6. **Modo PWA instalável** (já implementado, mas testar em Android/iOS)
7. **Integração com API da Defesa Civil** para alertas oficiais automáticos
8. **Suporte multi-município** (seleção de cidade no header)

---

## Suporte

- Documentação Supabase: https://supabase.com/docs
- Documentação Vercel: https://vercel.com/docs
- Documentação Next.js: https://nextjs.org/docs
- Documentação Leaflet: https://leafletjs.com
- Documentação Prisma + PostGIS: https://www.prisma.io/docs/concepts/components/prisma-schema/postgresql-special-types
