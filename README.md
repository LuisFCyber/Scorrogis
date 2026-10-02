🆘 Rotas Seguras
Plataforma colaborativa de resposta a desastres naturais em tempo real
Next.jsTypeScriptPrismaPostGISLeafletVercelSupabasePWALGPD

License: MITPRs WelcomeMade with ❤️ in Brazil

⚠️ Sobre vida, não sobre código.

Plataforma open source para apoiar comunidades, defesa civil e voluntáriosem situações de enchente, alagamento, deslizamento e crises climáticas.100% construída com stack open source. Sem APIs proprietárias. Sem lock-in.

📑 Índice
🎯 Sobre
✨ Funcionalidades
🛠️ Stack Tecnológica
🚀 Quick Start
📁 Estrutura do Projeto
🗺️ Roadmap
📚 Documentação
🤝 Como Contribuir
📄 Licença
🎯 Sobre
Rotas Seguras é uma plataforma GIS colaborativa para resposta a desastresnaturais. Permite que cidadãos reportem alagamentos, peçam ajuda, valideminformações da comunidade e encontrem rotas seguras — tudo em tempo real, comsuporte offline e conformidade LGPD.

🎯 Para quem?
Público	O que faz
👤 Cidadão	Reporta alagamentos, pede ajuda, valida pedidos da vizinhança
🆘 Pessoa em risco	Sinaliza que está ilhada, precisa de resgate ou suprimentos
🚑 Voluntário / Defesa Civil	Visualiza pedidos por prioridade, vota em validações, atende
🏛️ Moderador / Prefeitura	Marca pedidos como verificados oficialmente, modera denúncias
🌍 Por que open source?
Em desastres, a informação salva vidas. Não achamos certo que plataformasde emergência sejam pagas, proprietárias ou dependam de APIs externas caras.Por isso usamos apenas:

✅ OpenStreetMap (gratuito, sem custo de tiles)
✅ PostGIS (open source, sem Oracle)
✅ Leaflet (open source, sem Google Maps)
✅ Turf.js (open source, sem Mapbox)
✅ Supabase + Vercel free tiers (R$ 0 para começar)
✨ Funcionalidades
🗺️ Mapa Interativo
Tiles OpenStreetMap (gratuitos, sem chave de API)
Marcadores customizados por tipo e urgência
Camadas alternáveis com 1 clique
Popups ricos com detalhes (capacidade, suprimentos, contato, etc.)
Geolocalização do navegador (navigator.geolocation)
🌊 Incidentes Reportados
5 tipos com cores distintas:

Tipo	Ícone	Cor	Descrição
🌊 Alagamento	waves	azul	Córrego transbordando, via alagada
🏔️ Deslizamento	mountain	marrom	Risco de encosta
🛣️ Via Bloqueada	roadblock	vermelho	Árvore caída, interdição
✅ Rota Segura	shield-check	verde	Via alternativa liberada
TTL automático por tipo (2h a 12h) evita alertas obsoletos
Votação social (upvote/downvote) com auto-verificação após 5+ votos
Sistema de expiração via pg_cron
🆘 Pedidos de Ajuda
Formulário rico com:

5 categorias: Resgate, Suprimentos, Médico, Abrigo, Transporte
4 níveis de urgência: Baixa, Média, Alta, Crítica
Grupos vulneráveis: Crianças, Idosos, Gestantes, PCD, Outros
Animais no local: com contagem e descrição
Fotos/vídeos: schema prevê campo (upload pendente)
Contato criptografado: nunca exposto em listagens públicas
Consentimento LGPD obrigatório (checkbox)
Ofuscação de localização: ruído de ~50m para proteger identidade
Status workflow:

pending → analyzing → validated → in_progress → resolved                                    ↓                              cancelled
Edição pelo autor via authorToken (UUID anônimo em localStorage) —sem necessidade de login.

✅ Validação Comunitária
Sistema de selos com 3 estados:

Selo	Cor	Como obtém
⚪ Não verificado	cinza	Default
🔵 Validado pela comunidade	azul	≥ 3 confirmações, denúncias < confirms/2
🟢 Verificado oficial	verde	Moderador marca via mark_official_verified()
Recursos anti-fake news:

1 voto por token anônimo por pedido (UNIQUE(request_id, voter_token))
Rate limit por IP: 10 votos/hora (via ipHash SHA-256)
Botão "Denunciar" com motivos: fake, duplicado, desatualizado, ofensivo
Tabela moderation_reports para revisão manual
🔥 Heatmap de Necessidades
Camada de calor que mostra densidade espacial dos pedidos de ajuda:

Pesos por urgência (low=1, medium=2, high=3, critical=4)
Bônus de +0.5 para pedidos validados pela comunidade
Grid de ~500m para agregação
Gradient visual: azul → ciano → verde → amarelo → vermelho
Toggle no painel de filtros (liga/desliga sem resíduos)
Auto-refresh a cada 60s
Endpoint otimizado com pré-agregação
🚗 Cálculo de Rota Segura
Heurística com Turf.js para desviar de áreas de risco:

Buffer de segurança (80m a 500m) ao redor de incidentes, conforme severidade
Detecta interseção entre rota direta e polígonos de risco
Calcula desvio à direita ou esquerda (escolhe o menor)
Identifica incidentes próximos à rota final (alertas)
Em produção: substituível por OSRM/GraphHopper para rotas via ruas reais
🏠 Abrigos
5 tipos com status de capacidade:

Tipo	Cor	Exemplos
🏠 Abrigo	azul	Ginásios, escolas, centros comunitários
＋ Hospital	vermelho	Pronto-socorro, postos de saúde
🍜 Distribuição	verde	CEAGESP, bancos de alimentos
◉ Checkpoint	roxo	Postos de triagem
Cada abrigo mostra:

Capacidade total e usada (vagas em tempo real)
Lista de suprimentos necessários
Contato (telefone, WhatsApp)
Notas operacionais (acessibilidade, aceita animais, etc.)
📶 PWA + Offline-first
PWA instalável (manifest + ícones 192/512)
Service Worker com estratégias inteligentes:
Tiles OSM: CacheFirst (imutáveis)
Assets estáticos: StaleWhileRevalidate
API GET: NetworkFirst com fallback para cache
API POST offline: enfileirada automaticamente
IndexedDB cacheia incidentes, abrigos, sobreviventes
Fila de sync persistente (sincroniza quando volta online)
Toast notifications com Sonner para eventos real-time
🔔 Real-time
Eventos WebSocket propagados a todos os clientes conectados:

Evento	Quando	Comportamento
incident:created	Novo incidente reportado	Toast + marcador aparece
survivor:created	Sinal de socorro	Toast crítico vermelho
help-request:created	Novo pedido de ajuda	Toast + marcador
help-request:updated	Voto recebido	Contadores atualizam
shelter:updated	Capacidade mudou	Toast + dados atualizados
Local: mini-service Socket.io (porta 3003)Produção: migra para Supabase Realtime (gerenciado, não morre)

🔐 LGPD Compliance
Consentimento explícito obrigatório (checkbox)
Ofuscação de localização opcional (~50m ruído)
Contato PII nunca exposto em listagens públicas
Token anônimo para autor editar sem login
Direito ao esquecimento: PATCH permite cancelar pedido
Hash de IP (SHA-256) para rate-limit — IP original nunca guardado
🛠️ Stack Tecnológica
Frontend
Tecnologia	Versão	Para quê
Next.js	16	Framework React (App Router)
TypeScript	5	Tipagem estática
Tailwind CSS	4	Estilização utility-first
shadcn/ui	-	Componentes acessíveis (Radix)
Lucide Icons	-	Ícones SVG
Leaflet + react-leaflet	1.9 / 5.0	Mapa interativo
leaflet.heat	0.2	Heatmap layer
Turf.js	7	Operações geoespaciais
Zustand	5	Estado global leve
Sonner	2	Toast notifications
Framer Motion	12	Animações
Backend
Tecnologia	Versão	Para quê
Next.js API Routes	16	REST API serverless
Prisma	6	ORM type-safe
Socket.io	4	WebSocket (mini-service)
Banco de Dados
Tecnologia	Para quê
PostgreSQL	Banco relacional
PostGIS	Extensão geoespacial (ST_DWithin, GEOMETRY, ST_Distance)
pg_cron	Cron jobs no banco (limpeza periódica)
pgcrypto	Criptografia de PII
uuid-ossp	Geração de UUIDs
Infraestrutura
Serviço	Para quê	Custo
Vercel	Hospedagem Next.js (serverless)	Free até 100GB bw
Supabase	Postgres + Auth + Realtime + Storage	Free até 500MB
OpenStreetMap	Tiles de mapa	Gratuito (fair use)
GitHub	Versionamento + CI/CD	Free para open source
🚀 Quick Start
Pré-requisitos
Node.js 20+ (baixar)
Bun (opcional, mais rápido — instalar)
Git (baixar)
Instalação local (5 minutos)
# 1. Clone o repositóriogit clone https://github.com/SEU_USUARIO/rotas-seguras.gitcd rotas-seguras# 2. Instale as dependênciasnpm install --legacy-peer-deps# ou com Bun (mais rápido):bun install# 3. Configure variáveis de ambientecp .env.example .env# Edite o .env e deixe apenas:# DATABASE_URL="file:./dev.db"# 4. Crie o banco SQLite localnpx prisma db push# 5. Rode em desenvolvimentonpm run dev# ou: bun run dev# 6. Abra http://localhost:3000
Primeira execução
Acesse http://localhost:3000
Clique em "Dados de exemplo (Franca/SP)" no canto inferior esquerdo
Veja o mapa se preencher com marcadores reais de Franca/SP
Clique no FAB (+) no canto inferior direito → explore as 5 ações
Clique num marcador colorido para abrir o popup
Iniciar o serviço real-time (opcional)
# Em outro terminalcd mini-services/realtime-servicenpm installnpm run dev# WebSocket rodando em http://localhost:3003
Em produção na Vercel, migramos para Supabase Realtime (ver download/GUIA_DEPLOY_PASSO_A_PASSO.md).

Deploy em produção
Siga o guia completo: download/GUIA_DEPLOY_PASSO_A_PASSO.md

Resumo rápido (15 minutos):

GitHub: git push o código
Supabase: crie projeto, ative PostGIS, rode os 3 SQLs em download/
Vercel: importe o repo, configure 4 variáveis de ambiente, deploy
📁 Estrutura do Projeto
rotas-seguras/├── 📁 src/                           # Código fonte│   ├── 📁 app/                       # Next.js App Router│   │   ├── 📁 api/                   # API routes (REST)│   │   │   ├── 📁 incidents/         # /api/incidents│   │   │   ├── 📁 shelters/          # /api/shelters│   │   │   ├── 📁 survivors/         # /api/survivors│   │   │   ├── 📁 help-requests/     # /api/help-requests│   │   │   ├── 📁 heatmap/           # /api/heatmap│   │   │   ├── 📁 route/             # /api/route (cálculo de rota)│   │   │   └── 📁 seed/              # /api/seed (dados de exemplo)│   │   ├── layout.tsx                # Layout raiz + PWA + SW│   │   └── page.tsx                  # Página principal (mapa + UI)│   ││   ├── 📁 components/│   │   ├── 📁 map/│   │   │   └── MapView.tsx           # Leaflet + camadas + handlers│   │   ├── 📁 panels/│   │   │   ├── Header.tsx            # Cabeçalho com status│   │   │   ├── QuickFilters.tsx      # Painel de filtros flutuante│   │   │   ├── QuickActions.tsx      # FAB (5 ações rápidas)│   │   │   ├── QuickForm.tsx         # Modal incidente/sobrevivente│   │   │   ├── HelpRequestForm.tsx   # Modal pedido de ajuda rico│   │   │   ├── HelpRequestPopup.tsx  # Popup com selos e votação│   │   │   ├── RoutePanel.tsx        # Painel de rota calculada│   │   │   └── OfflineBanner.tsx     # Banner de modo offline│   │   └── 📁 ui/                    # shadcn/ui (componentes base)│   ││   ├── 📁 lib/│   │   ├── store.ts                  # Zustand store global│   │   ├── db.ts                     # Cliente Prisma (singleton)│   │   ├── utils.ts                  # Utils (cn, etc.)│   │   ├── 📁 realtime/│   │   │   └── useRealtime.ts        # Hook WebSocket│   │   └── 📁 offline/│   │       ├── db.ts                 # Wrapper IndexedDB│   │       └── useOfflineSync.ts     # Hook de sincronização offline│   ││   └── 📁 types/│       └── geo.ts                    # Tipos compartilhados│├── 📁 prisma/│   └── schema.prisma                 # Schema Prisma (SQLite dev / Postgres prod)│├── 📁 public/│   ├── manifest.json                 # PWA manifest│   ├── sw.js                         # Service Worker│   ├── icon-192.png                  # Ícone PWA│   ├── icon-512.png                  # Ícone PWA│   └── robots.txt│├── 📁 download/                       # Entregáveis SQL + guias│   ├── 001_postgis_schema.sql        # Schema principal│   ├── 002_seed_franca_sp.sql        # Dados de exemplo (Franca real)│   ├── 003_help_requests.sql         # Schema pedidos de ajuda│   ├── DEPLOYMENT.md                 # Guia técnico resumido│   ├── GUIA_DEPLOY_PASSO_A_PASSO.md  # Guia completo (Git+Vercel+Supabase)│   ├── CHECKLIST_ACEITE.md           # Checklist de features│   └── README.md                     # README desta pasta│├── 📁 docs/                          # Documentação técnica│   ├── HELP_REQUESTS.md              # API de pedidos│   ├── VALIDATION.md                 # Sistema de validação│   ├── HEATMAP.md                    # Heatmap│   ├── ARQUITETURA.md                # Diagramas de arquitetura│   ├── API.md                        # Referência completa de API│   └── CONTRIBUTING.md               # Guia de contribuição│├── 📁 mini-services/│   └── realtime-service/             # Socket.io (porta 3003)│├── 📁 scripts/                       # Scripts utilitários│   └── generate_icons.py             # Gerador de ícones PWA│├── .env.example                      # Template de variáveis├── .gitignore├── vercel.json                       # Config Vercel (headers, regions)├── next.config.ts├── tsconfig.json├── eslint.config.mjs├── tailwind.config.ts├── components.json                   # Config shadcn/ui├── package.json├── README.md                         # ← Você está aqui└── LICENSE
🗺️ Roadmap
✅ Versão atual (0.1.0)
 Mapa Leaflet + OSM com camadas
 Incidentes (4 tipos) com TTL e votação social
 Abrigos com capacidade e suprimentos
 Sobreviventes (opt-in, anonimização)
 Pedidos de ajuda (5 categorias, formulário rico)
 Validação comunitária (selos + denúncias)
 Heatmap com toggle e filtros
 Cálculo de rota segura (Turf.js)
 PWA + Service Worker + IndexedDB offline
 Real-time via Socket.io (local) / Supabase Realtime (prod)
 LGPD compliance (consentimento, ofuscação, PII protegida)
 Dados de exemplo de Franca/SP (locais reais)
 Documentação completa + guia de deploy
🚧 Próxima versão (0.2.0)
 Auth Supabase (login para moderadores e voluntários)
 Upload de fotos via Supabase Storage
 Web Push notifications para alertas críticos
 Painel admin de moderação
 Endpoint de exclusão total (LGPD direito ao esquecimento)
 Tooltip no heatmap (hover mostra contagem)
 IndexedDB para helpRequests (offline)
 OSRM real para rotas via ruas
 Testes automatizados (Vitest + Testing Library)
🎯 Visão de futuro (1.0.0)
 Multi-município (seletor de cidade)
 App mobile nativo (React Native / Flutter)
 Integração com APIs da Defesa Civil
 Dashboard com métricas em tempo real (Recharts)
 Modo crisis (interface simplificada para situação ativa)
 Check-in familiar
 Sistema de estoque de suprimentos
 Mapa de abrigos dedicado
 Relatórios exportáveis (PDF, CSV)
 Notificações por SMS (Twilio)
 Tradução para EN/ES (i18n)
📚 Documentação
Documento	Conteúdo
📋 download/GUIA_DEPLOY_PASSO_A_PASSO.md	Deploy completo: Git → Vercel → Supabase
📊 docs/ARQUITETURA.md	Diagramas de arquitetura e fluxo de dados
🌐 docs/API.md	Referência completa de endpoints REST
🆘 docs/HELP_REQUESTS.md	API de pedidos de ajuda
✅ docs/VALIDATION.md	Sistema de validação comunitária
🔥 docs/HEATMAP.md	Heatmap de necessidades
🗄️ download/001_postgis_schema.sql	Schema principal PostGIS
🆘 download/003_help_requests.sql	Schema pedidos de ajuda + validação
🌱 download/002_seed_franca_sp.sql	Dados de exemplo de Franca/SP
🤝 docs/CONTRIBUTING.md	Como contribuir com o projeto
✅ download/CHECKLIST_ACEITE.md	Checklist de features implementadas
🤝 Como Contribuir
Contribuições são muito bem-vindas! Este é um projeto open source eacolhedor.

🎯 Tipos de contribuição procuramos
Tipo	Descrição
🐛 Bugs	Reporte issues no GitHub
✨ Features	Sugira novas funcionalidades
🌍 Tradução	i18n para EN, ES, indígenas
📊 Dados	Mapas de risco, equipamentos públicos, áreas vulneráveis
🎨 Design	UX/UI, acessibilidade, microinterações
📝 Docs	Melhorias na documentação
🧪 Testes	Cobertura de testes (Vitest pendente)
🔒 Segurança	Auditoria, LGPD, pentest
Quick contribuição
# Fork o projeto no GitHub# Clone seu forkgit clone https://github.com/SEU_USUARIO/rotas-seguras.gitcd rotas-seguras# Crie uma branchgit checkout -b feature/minha-feature# Faça suas mudanças e commitgit add .git commit -m "feat: adiciona minha feature incrível"# Push e abra um PRgit push origin feature/minha-feature# Vá no GitHub e clique em "Compare & pull request"
📜 Padrões de commit (Conventional Commits)
Tipo	Uso
feat:	Nova funcionalidade
fix:	Correção de bug
docs:	Mudança em documentação
style:	Formatação (espaços, vírgulas)
refactor:	Refatoração sem mudança de comportamento
perf:	Melhoria de performance
test:	Adição de testes
chore:	Tarefas de build, deps, etc.
🛡️ Código de Conduta
Seja respeitoso. Este projeto é para salvar vidas, não para egos.Qualquer forma de assédio, discriminatória ou tóxica não será tolerada.

📄 Licença
Distribuído sob licença MIT. Veja LICENSE para detalhes.

MIT LicenseCopyright (c) 2026 Rotas Seguras ContributorsPermission is hereby granted, free of charge, to any person obtaining a copyof this software and associated documentation files (the "Software"), to dealin the Software without restriction, including without limitation the rightsto use, copy, modify, merge, publish, distribute, sublicense, and/or sellcopies of the Software, and to permit persons to whom the Software isfurnished to do so, subject to the following conditions:The above copyright notice and this permission notice shall be included in allcopies or substantial portions of the Software.THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND...
💛 Agradecimentos
Defesa Civil de Franca/SP — inspiração real para os dados de exemplo
OpenStreetMap contributors — mapas gratuitos para o mundo
Comunidade open source — Leaflet, Turf, Prisma, Next.js, Supabase, Vercel
Comunidades afetadas por desastres — que nos lembram por que isto importa
🆘 Em memória das vítimas das enchentes no Brasil
Que esta plataforma nunca precise ser usada. Mas se precisar, que funcione.

⬆ Voltar ao topo •📚 Docs •🚀 Quick Start •🤝 Contribuir

Made with ❤️ and ☕ in Brazil 🇧🇷

É só copiar tudo isso aí em cima (do <div align="center"> até o final) e colar no seu README.md. Já vai ficar bonito no GitHub, com badges, índice navegável, tabelas, código formatado, tudo. 🤝

Se quiser que eu ajuste alguma coisa — tipo trocar "SEU_USUARIO" pelo seu user real do GitHub, adicionar seu nome nos créditos, ou mudar alguma seção — é só falar!
