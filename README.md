<div align="center">

# 🆘 Rotas Seguras

### Plataforma colaborativa de resposta a desastres naturais em tempo real

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostGIS](https://img.shields.io/badge/PostGIS-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgis.net/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![LGPD](https://img.shields.io/badge/LGPD-Compliant-00875F?style=for-the-badge)](https://www.gov.br/anpd/pt-br)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Made with ❤️ in Brazil](https://img.shields.io/badge/feito_no_%F0%9F%87%A7%F0%9F%87%B7-Brazil-009C3B?style=flat-square)]()

</div>

---

> ⚠️ **Sobre vida, não sobre código.**
>
> Plataforma open source para apoiar comunidades, defesa civil e voluntários
> em situações de enchente, alagamento, deslizamento e crises climáticas.
> 100% construída com stack open source. Sem APIs proprietárias. Sem lock-in.

---

## 📑 Índice

- [🎯 Sobre](#-sobre)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [🚀 Quick Start](#-quick-start)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [🗺️ Roadmap](#️-roadmap)
- [📚 Documentação](#-documentação)
- [🤝 Como Contribuir](#-como-contribuir)
- [📄 Licença](#-licença)

---

## 🎯 Sobre

**Rotas Seguras** é uma plataforma GIS colaborativa para resposta a desastres
naturais. Permite que cidadãos reportem alagamentos, peçam ajuda, validem
informações da comunidade e encontrem rotas seguras — tudo em tempo real, com
suporte offline e conformidade LGPD.

### 🎯 Para quem?

| Público | O que faz |
|---|---|
| 👤 **Cidadão** | Reporta alagamentos, pede ajuda, valida pedidos da vizinhança |
| 🆘 **Pessoa em risco** | Sinaliza que está ilhada, precisa de resgate ou suprimentos |
| 🚑 **Voluntário / Defesa Civil** | Visualiza pedidos por prioridade, vota em validações, atende |
| 🏛️ **Moderador / Prefeitura** | Marca pedidos como verificados oficialmente, modera denúncias |

### 🌍 Por que open source?

Em desastres, **a informação salva vidas**. Não achamos certo que plataformas
de emergência sejam pagas, proprietárias ou dependam de APIs externas caras.
Por isso usamos apenas:

- ✅ **OpenStreetMap** (gratuito, sem custo de tiles)
- ✅ **PostGIS** (open source, sem Oracle)
- ✅ **Leaflet** (open source, sem Google Maps)
- ✅ **Turf.js** (open source, sem Mapbox)
- ✅ **Supabase + Vercel free tiers** (R$ 0 para começar)

---

## ✨ Funcionalidades

### 🗺️ Mapa Interativo

- Tiles **OpenStreetMap** (gratuitos, sem chave de API)
- Marcadores customizados por **tipo** e **urgência**
- Camadas alternáveis com 1 clique
- Popups ricos com detalhes (capacidade, suprimentos, contato, etc.)
- Geolocalização do navegador (`navigator.geolocation`)

### 🌊 Incidentes Reportados

5 tipos com cores distintas:

| Tipo | Ícone | Cor | Descrição |
|---|---|---|---|
| 🌊 Alagamento | waves | azul | Córrego transbordando, via alagada |
| 🏔️ Deslizamento | mountain | marrom | Risco de encosta |
| 🛣️ Via Bloqueada | roadblock | vermelho | Árvore caída, interdição |
| ✅ Rota Segura | shield-check | verde | Via alternativa liberada |

- **TTL automático** por tipo (2h a 12h) evita alertas obsoletos
- **Votação social** (upvote/downvote) com auto-verificação após 5+ votos
- Sistema de expiração via `pg_cron`

### 🆘 Pedidos de Ajuda

Formulário rico com:

- **5 categorias**: Resgate, Suprimentos, Médico, Abrigo, Transporte
- **4 níveis de urgência**: Baixa, Média, Alta, Crítica
- **Grupos vulneráveis**: Crianças, Idosos, Gestantes, PCD, Outros
- **Animais no local**: com contagem e descrição
- **Fotos/vídeos**: schema prevê campo (upload pendente)
- **Contato criptografado**: nunca exposto em listagens públicas
- **Consentimento LGPD obrigatório** (checkbox)
- **Ofuscação de localização**: ruído de ~50m para proteger identidade

**Status workflow:**

```
pending → analyzing → validated → in_progress → resolved
                                    ↓
                              cancelled
```

**Edição pelo autor** via `authorToken` (UUID anônimo em localStorage) —
sem necessidade de login.

### ✅ Validação Comunitária

Sistema de selos com 3 estados:

| Selo | Cor | Como obtém |
|---|---|---|
| ⚪ **Não verificado** | cinza | Default |
| 🔵 **Validado pela comunidade** | azul | ≥ 3 confirmações, denúncias < confirms/2 |
| 🟢 **Verificado oficial** | verde | Moderador marca via `mark_official_verified()` |

**Recursos anti-fake news:**

- 1 voto por token anônimo por pedido (`UNIQUE(request_id, voter_token)`)
- Rate limit por IP: 10 votos/hora (via `ipHash` SHA-256)
- Botão "Denunciar" com motivos: fake, duplicado, desatualizado, ofensivo
- Tabela `moderation_reports` para revisão manual

### 🔥 Heatmap de Necessidades

Camada de calor que mostra **densidade espacial** dos pedidos de ajuda:

- Pesos por urgência (low=1, medium=2, high=3, critical=4)
- Bônus de +0.5 para pedidos validados pela comunidade
- Grid de ~500m para agregação
- Gradient visual: azul → ciano → verde → amarelo → vermelho
- **Toggle** no painel de filtros (liga/desliga sem resíduos)
- Auto-refresh a cada 60s
- Endpoint otimizado com pré-agregação

### 🚗 Cálculo de Rota Segura

Heurística com **Turf.js** para desviar de áreas de risco:

- Buffer de segurança (80m a 500m) ao redor de incidentes, conforme severidade
- Detecta interseção entre rota direta e polígonos de risco
- Calcula desvio à direita ou esquerda (escolhe o menor)
- Identifica incidentes próximos à rota final (alertas)
- Em produção: substituível por OSRM/GraphHopper para rotas via ruas reais

### 🏠 Abrigos

5 tipos com status de capacidade:

| Tipo | Cor | Exemplos |
|---|---|---|
| 🏠 Abrigo | azul | Ginásios, escolas, centros comunitários |
| ＋ Hospital | vermelho | Pronto-socorro, postos de saúde |
| 🍜 Distribuição | verde | CEAGESP, bancos de alimentos |
| ◉ Checkpoint | roxo | Postos de triagem |

Cada abrigo mostra:
- Capacidade total e usada (vagas em tempo real)
- Lista de suprimentos necessários
- Contato (telefone, WhatsApp)
- Notas operacionais (acessibilidade, aceita animais, etc.)

### 📶 PWA + Offline-first

- **PWA** instalável (manifest + ícones 192/512)
- **Service Worker** com estratégias inteligentes:
  - Tiles OSM: CacheFirst (imutáveis)
  - Assets estáticos: StaleWhileRevalidate
  - API GET: NetworkFirst com fallback para cache
  - API POST offline: enfileirada automaticamente
- **IndexedDB** cacheia incidentes, abrigos, sobreviventes
- **Fila de sync** persistente (sincroniza quando volta online)
- **Toast notifications** com Sonner para eventos real-time

### 🔔 Real-time

Eventos WebSocket propagados a todos os clientes conectados:

| Evento | Quando | Comportamento |
|---|---|---|
| `incident:created` | Novo incidente reportado | Toast + marcador aparece |
| `survivor:created` | Sinal de socorro | Toast crítico vermelho |
| `help-request:created` | Novo pedido de ajuda | Toast + marcador |
| `help-request:updated` | Voto recebido | Contadores atualizam |
| `shelter:updated` | Capacidade mudou | Toast + dados atualizados |

**Local:** mini-service Socket.io (porta 3003)
**Produção:** migra para Supabase Realtime (gerenciado, não morre)

### 🔐 LGPD Compliance

- **Consentimento explícito** obrigatório (checkbox)
- **Ofuscação de localização** opcional (~50m ruído)
- **Contato PII** nunca exposto em listagens públicas
- **Token anônimo** para autor editar sem login
- **Direito ao esquecimento**: PATCH permite cancelar pedido
- **Hash de IP** (SHA-256) para rate-limit — IP original nunca guardado

---

## 🛠️ Stack Tecnológica

### Frontend

| Tecnologia | Versão | Para quê |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 | Framework React (App Router) |
| [TypeScript](https://www.typescriptlang.org) | 5 | Tipagem estática |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Estilização utility-first |
| [shadcn/ui](https://ui.shadcn.com) | - | Componentes acessíveis (Radix) |
| [Lucide Icons](https://lucide.dev) | - | Ícones SVG |
| [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org) | 1.9 / 5.0 | Mapa interativo |
| [leaflet.heat](https://github.com/Leaflet/Leaflet.heat) | 0.2 | Heatmap layer |
| [Turf.js](https://turfjs.org) | 7 | Operações geoespaciais |
| [Zustand](https://zustand-demo.pmnd.rs) | 5 | Estado global leve |
| [Sonner](https://sonner.emilkowal.ski) | 2 | Toast notifications |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animações |

### Backend

| Tecnologia | Versão | Para quê |
|---|---|---|
| [Next.js API Routes](https://nextjs.org/docs) | 16 | REST API serverless |
| [Prisma](https://www.prisma.io) | 6 | ORM type-safe |
| [Socket.io](https://socket.io) | 4 | WebSocket (mini-service) |

### Banco de Dados

| Tecnologia | Para quê |
|---|---|
| [PostgreSQL](https://www.postgresql.org) | Banco relacional |
| [PostGIS](https://postgis.net) | Extensão geoespacial (`ST_DWithin`, `GEOMETRY`, `ST_Distance`) |
| [pg_cron](https://github.com/citusdata/pg_cron) | Cron jobs no banco (limpeza periódica) |
| [pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html) | Criptografia de PII |
| [uuid-ossp](https://www.postgresql.org/docs/current/uuid-ossp.html) | Geração de UUIDs |

### Infraestrutura

| Serviço | Para quê | Custo |
|---|---|---|
| [Vercel](https://vercel.com) | Hospedagem Next.js (serverless) | Free até 100GB bw |
| [Supabase](https://supabase.com) | Postgres + Auth + Realtime + Storage | Free até 500MB |
| [OpenStreetMap](https://openstreetmap.org) | Tiles de mapa | Gratuito (fair use) |
| [GitHub](https://github.com) | Versionamento + CI/CD | Free para open source |

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js 20+** ([baixar](https://nodejs.org))
- **Bun** (opcional, mais rápido — [instalar](https://bun.sh))
- **Git** ([baixar](https://git-scm.com/downloads))

### Instalação local (5 minutos)

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/rotas-seguras.git
cd rotas-seguras

# 2. Instale as dependências
npm install --legacy-peer-deps
# ou com Bun (mais rápido):
bun install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite o .env e deixe apenas:
# DATABASE_URL="file:./dev.db"

# 4. Crie o banco SQLite local
npx prisma db push

# 5. Rode em desenvolvimento
npm run dev
# ou: bun run dev

# 6. Abra http://localhost:3000
```

### Primeira execução

1. Acesse http://localhost:3000
2. Clique em **"Dados de exemplo (Franca/SP)"** no canto inferior esquerdo
3. Veja o mapa se preencher com marcadores reais de Franca/SP
4. Clique no FAB (**+**) no canto inferior direito → explore as 5 ações
5. Clique num marcador colorido para abrir o popup

### Iniciar o serviço real-time (opcional)

```bash
# Em outro terminal
cd mini-services/realtime-service
npm install
npm run dev
# WebSocket rodando em http://localhost:3003
```

> Em produção na Vercel, migramos para Supabase Realtime (ver `download/GUIA_DEPLOY_PASSO_A_PASSO.md`).

### Deploy em produção

Siga o guia completo: **`download/GUIA_DEPLOY_PASSO_A_PASSO.md`**

Resumo rápido (15 minutos):

1. **GitHub**: `git push` o código
2. **Supabase**: crie projeto, ative PostGIS, rode os 3 SQLs em `download/`
3. **Vercel**: importe o repo, configure 4 variáveis de ambiente, deploy

---

## 📁 Estrutura do Projeto

```
rotas-seguras/
├── 📁 src/                           # Código fonte
│   ├── 📁 app/                       # Next.js App Router
│   │   ├── 📁 api/                   # API routes (REST)
│   │   │   ├── 📁 incidents/         # /api/incidents
│   │   │   ├── 📁 shelters/          # /api/shelters
│   │   │   ├── 📁 survivors/         # /api/survivors
│   │   │   ├── 📁 help-requests/     # /api/help-requests
│   │   │   ├── 📁 heatmap/           # /api/heatmap
│   │   │   ├── 📁 route/             # /api/route (cálculo de rota)
│   │   │   └── 📁 seed/              # /api/seed (dados de exemplo)
│   │   ├── layout.tsx                # Layout raiz + PWA + SW
│   │   └── page.tsx                  # Página principal (mapa + UI)
│   │
│   ├── 📁 components/
│   │   ├── 📁 map/
│   │   │   └── MapView.tsx           # Leaflet + camadas + handlers
│   │   ├── 📁 panels/
│   │   │   ├── Header.tsx            # Cabeçalho com status
│   │   │   ├── QuickFilters.tsx      # Painel de filtros flutuante
│   │   │   ├── QuickActions.tsx      # FAB (5 ações rápidas)
│   │   │   ├── QuickForm.tsx         # Modal incidente/sobrevivente
│   │   │   ├── HelpRequestForm.tsx   # Modal pedido de ajuda rico
│   │   │   ├── HelpRequestPopup.tsx  # Popup com selos e votação
│   │   │   ├── RoutePanel.tsx       # Painel de rota calculada
│   │   │   └── OfflineBanner.tsx     # Banner de modo offline
│   │   └── 📁 ui/                    # shadcn/ui (componentes base)
│   │
│   ├── 📁 lib/
│   │   ├── store.ts                  # Zustand store global
│   │   ├── db.ts                     # Cliente Prisma (singleton)
│   │   ├── utils.ts                  # Utils (cn, etc.)
│   │   ├── 📁 realtime/
│   │   │   └── useRealtime.ts        # Hook WebSocket
│   │   └── 📁 offline/
│   │       ├── db.ts                 # Wrapper IndexedDB
│   │       └── useOfflineSync.ts     # Hook de sincronização offline
│   │
│   └── 📁 types/
│       └── geo.ts                    # Tipos compartilhados
│
├── 📁 prisma/
│   └── schema.prisma                 # Schema Prisma (SQLite dev / Postgres prod)
│
├── 📁 public/
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service Worker
│   ├── icon-192.png                  # Ícone PWA
│   ├── icon-512.png                  # Ícone PWA
│   └── robots.txt
│
├── 📁 download/                       # Entregáveis SQL + guias
│   ├── 001_postgis_schema.sql        # Schema principal
│   ├── 002_seed_franca_sp.sql        # Dados de exemplo (Franca real)
│   ├── 003_help_requests.sql         # Schema pedidos de ajuda
│   ├── DEPLOYMENT.md                 # Guia técnico resumido
│   ├── GUIA_DEPLOY_PASSO_A_PASSO.md  # Guia completo (Git+Vercel+Supabase)
│   ├── CHECKLIST_ACEITE.md           # Checklist de features
│   └── README.md                     # README desta pasta
│
├── 📁 docs/                          # Documentação técnica
│   ├── HELP_REQUESTS.md              # API de pedidos
│   ├── VALIDATION.md                 # Sistema de validação
│   ├── HEATMAP.md                    # Heatmap
│   ├── ARQUITETURA.md                # Diagramas de arquitetura
│   ├── API.md                        # Referência completa de API
│   └── CONTRIBUTING.md               # Guia de contribuição
│
├── 📁 mini-services/
│   └── realtime-service/             # Socket.io (porta 3003)
│
├── 📁 scripts/                       # Scripts utilitários
│   └── generate_icons.py             # Gerador de ícones PWA
│
├── .env.example                      # Template de variáveis
├── .gitignore
├── vercel.json                       # Config Vercel (headers, regions)
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── tailwind.config.ts
├── components.json                   # Config shadcn/ui
├── package.json
├── README.md                         # ← Você está aqui
└── LICENSE
```

---

## 🗺️ Roadmap

### ✅ Versão atual (0.1.0)

- [x] Mapa Leaflet + OSM com camadas
- [x] Incidentes (4 tipos) com TTL e votação social
- [x] Abrigos com capacidade e suprimentos
- [x] Sobreviventes (opt-in, anonimização)
- [x] Pedidos de ajuda (5 categorias, formulário rico)
- [x] Validação comunitária (selos + denúncias)
- [x] Heatmap com toggle e filtros
- [x] Cálculo de rota segura (Turf.js)
- [x] PWA + Service Worker + IndexedDB offline
- [x] Real-time via Socket.io (local) / Supabase Realtime (prod)
- [x] LGPD compliance (consentimento, ofuscação, PII protegida)
- [x] Dados de exemplo de Franca/SP (locais reais)
- [x] Documentação completa + guia de deploy

### 🚧 Próxima versão (0.2.0)

- [ ] Auth Supabase (login para moderadores e voluntários)
- [ ] Upload de fotos via Supabase Storage
- [ ] Web Push notifications para alertas críticos
- [ ] Painel admin de moderação
- [ ] Endpoint de exclusão total (LGPD direito ao esquecimento)
- [ ] Tooltip no heatmap (hover mostra contagem)
- [ ] IndexedDB para `helpRequests` (offline)
- [ ] OSRM real para rotas via ruas
- [ ] Testes automatizados (Vitest + Testing Library)

### 🎯 Visão de futuro (1.0.0)

- [ ] Multi-município (seletor de cidade)
- [ ] App mobile nativo (React Native / Flutter)
- [ ] Integração com APIs da Defesa Civil
- [ ] Dashboard com métricas em tempo real (Recharts)
- [ ] Modo crisis (interface simplificada para situação ativa)
- [ ] Check-in familiar
- [ ] Sistema de estoque de suprimentos
- [ ] Mapa de abrigos dedicado
- [ ] Relatórios exportáveis (PDF, CSV)
- [ ] Notificações por SMS (Twilio)
- [ ] Tradução para EN/ES (i18n)

---

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| 📋 `download/GUIA_DEPLOY_PASSO_A_PASSO.md` | Deploy completo: Git → Vercel → Supabase |
| 📊 `docs/ARQUITETURA.md` | Diagramas de arquitetura e fluxo de dados |
| 🌐 `docs/API.md` | Referência completa de endpoints REST |
| 🆘 `docs/HELP_REQUESTS.md` | API de pedidos de ajuda |
| ✅ `docs/VALIDATION.md` | Sistema de validação comunitária |
| 🔥 `docs/HEATMAP.md` | Heatmap de necessidades |
| 🗄️ `download/001_postgis_schema.sql` | Schema principal PostGIS |
| 🆘 `download/003_help_requests.sql` | Schema pedidos de ajuda + validação |
| 🌱 `download/002_seed_franca_sp.sql` | Dados de exemplo de Franca/SP |
| 🤝 `docs/CONTRIBUTING.md` | Como contribuir com o projeto |
| ✅ `download/CHECKLIST_ACEITE.md` | Checklist de features implementadas |

---

## 🤝 Como Contribuir

Contribuições são **muito bem-vindas**! Este é um projeto open source e
acolhedor.

### 🎯 Tipos de contribuição procuramos

| Tipo | Descrição |
|---|---|
| 🐛 **Bugs** | Reporte issues no GitHub |
| ✨ **Features** | Sugira novas funcionalidades |
| 🌍 **Tradução** | i18n para EN, ES, indígenas |
| 📊 **Dados** | Mapas de risco, equipamentos públicos, áreas vulneráveis |
| 🎨 **Design** | UX/UI, acessibilidade, microinterações |
| 📝 **Docs** | Melhorias na documentação |
| 🧪 **Testes** | Cobertura de testes (Vitest pendente) |
| 🔒 **Segurança** | Auditoria, LGPD, pentest |

### Quick contribuição

```bash
# Fork o projeto no GitHub
# Clone seu fork
git clone https://github.com/SEU_USUARIO/rotas-seguras.git
cd rotas-seguras

# Crie uma branch
git checkout -b feature/minha-feature

# Faça suas mudanças e commit
git add .
git commit -m "feat: adiciona minha feature incrível"

# Push e abra um PR
git push origin feature/minha-feature
# Vá no GitHub e clique em "Compare & pull request"
```

### 📜 Padrões de commit (Conventional Commits)

| Tipo | Uso |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `docs:` | Mudança em documentação |
| `style:` | Formatação (espaços, vírgulas) |
| `refactor:` | Refatoração sem mudança de comportamento |
| `perf:` | Melhoria de performance |
| `test:` | Adição de testes |
| `chore:` | Tarefas de build, deps, etc. |

### 🛡️ Código de Conduta

Seja respeitoso. Este projeto é para **salvar vidas**, não para egos.
Qualquer forma de assédio, discriminatória ou tóxica não será tolerada.

---

## 📄 Licença

Distribuído sob licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

```
MIT License

Copyright (c) 2026 Rotas Seguras Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND...
```

---

## 💛 Agradecimentos

- **Defesa Civil de Franca/SP** — inspiração real para os dados de exemplo
- **OpenStreetMap contributors** — mapas gratuitos para o mundo
- **Comunidade open source** — Leaflet, Turf, Prisma, Next.js, Supabase, Vercel
- **Comunidades afetadas por desastres** — que nos lembram por que isto importa

---

<div align="center">

### 🆘 Em memória das vítimas das enchentes no Brasil

**Que esta plataforma nunca precise ser usada. Mas se precisar, que funcione.**

---

**[⬆ Voltar ao topo](#-rotas-seguras)** •
**[📚 Docs](#-documentação)** •
**[🚀 Quick Start](#-quick-start)** •
**[🤝 Contribuir](#-como-contribuir)**

Made with ❤️ and ☕ in Brazil 🇧🇷

</div>
