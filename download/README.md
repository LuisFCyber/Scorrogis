# Plataforma Rotas Seguras — Resposta a Desastres

Aplicação web GIS colaborativa em tempo real para rotas seguras e resposta a desastres naturais (alagamentos, enchentes, deslizamentos e crises climáticas).

## Stack Tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui | (O usuário pediu Vite; o skill fullstack-dev exige Next.js — escolha estratégica para SSR + API routes em um único projeto) |
| Mapa | Leaflet.js (`react-leaflet`) + tiles OpenStreetMap | 100% open source, sem custo de API |
| Roteamento / Geometria | `@turf/turf` para buffer, interseção, cálculo de desvios | Para produção: plugar OSRM/GraphHopper |
| Banco local (protótipo) | SQLite + Prisma ORM | Para desenvolvimento/teste |
| Banco produção (alvo) | PostgreSQL + PostGIS via Supabase | Schema SQL incluído em `001_postgis_schema.sql` |
| Real-time | Socket.io (mini-service na porta 3003) | Updates push de novos incidentes/sobreviventes |
| Estado global | Zustand | Camadas, filtros, modo de criação |

## Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── incidents/route.ts             # GET/POST incidentes
│   │   ├── incidents/[id]/vote/route.ts   # Votação social
│   │   ├── shelters/route.ts              # GET/POST abrigos
│   │   ├── survivors/route.ts             # GET/POST sobreviventes
│   │   ├── route/route.ts                 # Cálculo de rota segura (Turf)
│   │   └── seed/route.ts                  # Popula dados de exemplo (SP)
│   ├── layout.tsx                         # Layout raiz
│   └── page.tsx                           # Página principal (mapa + UI)
├── components/
│   ├── map/MapView.tsx                    # Leaflet + camadas + handlers
│   └── panels/
│       ├── Header.tsx                     # Cabeçalho com status
│       ├── QuickFilters.tsx              # Botões de filtro de camadas
│       ├── QuickActions.tsx              # FAB (Reportar / Ilhado / Rota)
│       ├── QuickForm.tsx                 # Modal de reporte rápido
│       └── RoutePanel.tsx                # Painel de rota calculada
├── lib/
│   ├── store.ts                          # Store Zustand
│   ├── db.ts                             # Cliente Prisma
│   └── realtime/useRealtime.ts           # Hook Socket.io
└── types/geo.ts                          # Tipos compartilhados

mini-services/realtime-service/           # WebSocket server (porta 3003)
prisma/schema.prisma                      # Schema SQLite (protótipo)
download/001_postgis_schema.sql           # Schema PostGIS + triggers TTL (produção)
```

## Modelo de Dados

### Tabelas principais (PostGIS)

1. **`incident_reports`** — Alagamentos, deslizamentos, bloqueios e rotas seguras
   - `location GEOMETRY(Point, 4326)` com índice GIST
   - TTL automático por tipo (flood: 6h, roadblock: 4h, safe_passage: 2h, landslide: 12h)
   - Auto-verificação após 5+ upvotes (com ratio downvote/upvote)
   
2. **`shelters`** — Abrigos, hospitais, postos de distribuição
   - Capacidade total/usada/status
   - Lista de suprimentos necessários
   - Informações de contato (JSONB)

3. **`survivor_signals`** — Pessoas ilhadas (opt-in)
   - Nível de urgência (safe_waiting → critical)
   - Anonimização configurável
   - TTL padrão de 24h

4. **`route_validations`** — Votos sociais ("ainda alagado?" / "já escoou?")

## Funcionalidades Implementadas

### 1. Mapa interativo (Leaflet + OSM)
- Tiles OpenStreetMap (gratuitos)
- Marcadores customizados com cores por tipo/severidade
- Popups detalhados com info de cada ponto

### 2. Camadas alternáveis (1 clique)
- Incidentes (alagamentos, deslizamentos, bloqueios, rotas seguras)
- Abrigos (casas, hospitais, distribuição de alimentos)
- Sinais de sobreviventes
- Rotas seguras calculadas

### 3. Sistema de votação social
- Upvote (ainda está alagado) / Downvote (já escoou)
- TTL automático evita alertas obsoletos
- Auto-verificação após threshold

### 4. Cálculo de rota segura (Turf.js)
- Origem/destino definidos por clique no mapa
- Buffer de áreas de risco (80–500m conforme severidade)
- Desvio automático à direita ou esquerda
- Detecção de incidentes próximos à rota final

### 5. FAB (Floating Action Button)
- "Reportar Situação" — abre modal com tipo/severidade/descrição
- "Estou Ilhado / Ajuda" — sinal de socorro com anonimização
- "Calcular Rota Segura" — modo de seleção de origem/destino
- "Minha Localização" — `navigator.geolocation` + recenter

### 6. Real-time (Socket.io)
- Novos incidentes propagados a todos os clientes conectados
- Atualizações de capacidade de abrigo em tempo real
- Sinais de sobreviventes propagados

### 7. Resiliência / UX mobile
- Mobile-first (Touch-friendly, 44px+ alvos)
- Detecção online/offline (badge no header)
- Carregamento via `dynamic` com SSR desativado para o mapa

## Como Rodar Localmente

```bash
# 1. Serviço real-time (porta 3003)
cd mini-services/realtime-service
bun install && bun run dev

# 2. App Next.js (porta 3000) — já roda automaticamente no sandbox
bun run dev
```

## Deploy em Produção (Supabase + PostGIS)

1. Crie um projeto no Supabase
2. Habilite a extensão PostGIS: `CREATE EXTENSION postgis;`
3. Execute o schema: `download/001_postgis_schema.sql`
4. (Opcional) Habilite `pg_cron` para limpeza periódica (comandos no final do SQL)
5. Configure as variáveis de ambiente:
   - `DATABASE_URL=postgresql://...`
   - `SUPABASE_URL=...`, `SUPABASE_ANON_KEY=...`
   - `NEXT_PUBLIC_SUPABASE_URL=...`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## Próximos Passos (Roadmap)

- [ ] Integrar OSRM/GraphHopper real (substituindo a heurística Turf)
- [ ] Service Worker + PWA para uso offline real (cached tiles)
- [ ] Sincronização offline-first (fila de mutations + retry)
- [ ] Auth Supabase (RLS já configurada no SQL)
- [ ] Upload de fotos nos incidentes
- [ ] Push notifications (Web Push API)
- [ ] Dashboard administrativo para Defesa Civil
