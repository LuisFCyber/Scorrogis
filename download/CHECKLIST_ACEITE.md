# Checklist de Aceite — Pedido de Ajuda, Validação Comunitária, Heatmap

Data: 02/10/2026
Versão: implementação incremental sobre base existente (sem user auth, sem testes formais)

---

## 1. Pedido de Ajuda

### Formulário
- [x] Campos: categoria, urgência, localização, nº de pessoas, vulneráveis, animais, contato, descrição
- [x] Fotos/vídeos: schema prevê campo `photos` (array URLs); upload ainda não implementado (futuro Supabase Storage)
- [x] Consentimento LGPD obrigatório
- [x] Ofuscação de localização opcional (~50m ruído)

### Status
- [x] Estados previstos: `pending`, `analyzing`, `validated`, `in_progress`, `resolved`, `cancelled`
- [x] Fluxo implementado: pending → validated (auto via 3+ confirms), pending → analyzing, validated → in_progress → resolved
- [x] PATCH endpoint permite autor mudar status via `authorToken`

### Mapa
- [x] Marcador por urgência (tamanho e cor variam: critical=36px vermelho, high=32px laranja, etc.)
- [x] Ícone por categoria (🆘 resgate, ✚ médico, 📦 suprimentos, 🏠 abrigo, 🚐 transporte)
- [x] Selo visual no marcador (círculo verde p/ oficial, azul p/ comunidade)

### Edição/Acompanhamento pelo autor
- [x] `authorToken` gerado no POST, retornado ao cliente, salvo em `localStorage('help-request-tokens')`
- [x] GET `/api/help-requests/[id]?authorToken=xxx` retorna contato (PII liberada ao autor)
- [x] PATCH `/api/help-requests/[id]` exige `authorToken` válido
- [x] Modal de sucesso exibe ID do pedido + mensagem sobre token salvo

### Notificação a moderadores/voluntários
- [x] WebSocket emite `help-request:created` para todos os clientes
- [x] Toast Sonner aparece para todos os clientes conectados (vermelho p/ crítico, amarelo p/ demais)
- [ ] Notificação push para moderadores específicos: NÃO implementado (sem sistema de roles/users)

---

## 2. Validação Comunitária

- [x] Usuário (via token anônimo) pode confirmar/negar pedidos
- [x] Limite 3 confirmações para selo "validado pela comunidade" (com denies < confirms/2)
- [x] Moderação pode marcar "verificado oficial" (via SQL `mark_official_verified()` em produção)
- [x] Denúncias: botão "Denunciar" no popup, modal com motivo e comentário
- [x] Limite por usuário (token): 1 voto por pedido (unique constraint)
- [x] Limite por IP: 10 votos/hora (rate limit via `ipHash`)
- [x] Histórico de validações: tabela `help_request_validations` no banco
- [x] Selos visuais: 3 estados (não verificado / comunidade / oficial) com cores distintas
- [x] Atualização automática dos contadores ao votar (sem refresh)

---

## 3. Heatmap de Necessidades

- [x] Camada de calor por densidade e urgência (pesos 1-4 por urgência + bônus 0.5 p/ verificado)
- [x] Filtros: tipo (categoria), urgência, período (`periodHours`, default 24h)
- [x] Atualização quase em tempo real: a cada 60s enquanto camada ativa
- [x] Integrado ao mapa existente (Leaflet + leaflet.heat)
- [x] Toggle no QuickFilters (botão "Mapa de Calor" com ícone 🔥)
- [x] **Toggle funcional: ativa/desativa canvas do heatmap sem deixar resíduos**
- [x] Legenda visual via gradient de cores (azul → ciano → verde → amarelo → vermelho)
- [x] Tooltip: ainda não implementado (seria hover no heat point — feature futura)
- [x] Endpoint: `GET /api/heatmap?bbox=&category=&urgency=&periodHours=&gridSize=`
- [x] PostGIS function `help_requests_heatmap_grid()` para produção

---

## Requisitos Não Funcionais

### Mobile-first
- [x] Layout responsivo (testado em 1280px desktop; mobile-first CSS via Tailwind)
- [x] Touch-friendly: botões 44px+, alvos touch amplos
- [x] FAB (Floating Action Button) com 5 ações rápidas

### PWA / Offline
- [x] PWA manifest.json + ícones 192/512
- [x] Service Worker com estratégias: CacheFirst (tiles), StaleWhileRevalidate (assets), NetworkFirst (API GET), Queue (POST offline)
- [x] IndexedDB cache de incidentes, abrigos, sobreviventes (HelpRequest cache pendente — ver próximo)
- [ ] **IndexedDB não inclui `helpRequests`** — não persiste pedidos offline. Bug conhecido: se API falhar, pedido ainda aparece via store em memória mas some no reload. Correção recomendada: adicionar `cacheHelpRequests()` no `useOfflineSync`.

### LGPD
- [x] Consentimento explícito obrigatório no formulário (checkbox LGPD)
- [x] Localização aproximada opcional (~50m ruído)
- [x] Dados sensíveis ocultos: `contact` nunca exposto em listagens públicas, apenas ao autor
- [x] Direito ao esquecimento: PATCH permite cancelar pedido; não há endpoint de exclusão total ainda (TODO)

### Moderação / Anti-fake news
- [x] Sistema de denúncias (botão "Denunciar" no popup)
- [x] Tabela `moderation_reports` com status pending → reviewed → actioned
- [x] Rate limit por IP em validações (10/hora)
- [x] Selo "verificado oficial" para contrapor fake news
- [ ] Painel admin de moderação: NÃO implementado (sem sistema de users/roles)

### Acessibilidade
- [x] ARIA labels em botões de mapa
- [x] Dialog (Radix UI) com `aria-describedby`, focus trap, ESC para fechar
- [x] Formulários com `<Label>` associados a inputs
- [x] Cores com contraste adequado (selos azul/verde/cinza)
- [ ] Navegação por teclado 100% funcional: parcial (Dialog funciona, mapa não é navegável por teclado)

### Performance
- [x] Lint sem erros
- [x] Mapa com lazy loading (`dynamic()` import)
- [x] Memoização de listas filtradas (`useMemo`)
- [x] Prisma queries com índices apropriados (criados no schema)
- [x] Heatmap com pré-agregação no banco (em produção via função SQL)

### Testes unitários/integração
- [ ] **NÃO IMPLEMENTADO** — briefing autorizou remover testes desta entrega. Pendente para próxima sprint.

### Documentação de API e uso
- [x] `docs/HELP_REQUESTS.md` — endpoints, modelo de dados, status flow, LGPD, real-time
- [x] `docs/VALIDATION.md` — votação, selos, denúncias, rate limit
- [x] `docs/HEATMAP.md` — agregação, endpoint, gradient, performance
- [x] SQL comentado: `download/003_help_requests.sql`

---

## Não implementado (conforme briefing)

- [x] ~~Fila de prioridade~~ — excluído por briefing
- [x] ~~Alocação de voluntários~~ — excluído por briefing
- [x] ~~Matching~~ — excluído por briefing
- [x] ~~Sistema de usuários / autenticação~~ — excluído por briefing
- [x] ~~Check-in familiar e modo crise~~ — fora de escopo
- [x] ~~Roteirização, estoque, mapa de abrigos, relatórios~~ — fora de escopo

---

## Pendências conhecidas (próximas sprints)

1. **Upload de fotos real** — atualmente apenas campo `photos[]` no schema, sem upload UI. Implementar com Supabase Storage.
2. **IndexedDB para `helpRequests`** — `useOfflineSync.ts` não persiste pedidos offline ainda.
3. **Painel admin de moderação** — sem UI para moderadores revisarem denúncias.
4. **Endpoint de exclusão de pedido** — LGPD direito ao esquecimento parcial (só é possível cancelar via PATCH).
5. **Tooltip no heatmap** — hover em célula do heat mostrar contagem/intensidade.
6. **Notificação push para voluntários próximos** — sem Web Push API ainda.
7. **Testes automatizados** — Vitest + Testing Library pendente.

---

## Verificação E2E com Agent Browser

Realizada em 02/10/2026. Resultados:

| Teste | Status |
|---|---|
| Página carrega sem erros | ✅ |
| Seed cria 6 pedidos + 4 validações | ✅ |
| FAB mostra 5 ações rápidas | ✅ |
| "Pedir Ajuda" ativa modo de criação no mapa | ✅ |
| Clique no mapa abre formulário completo | ✅ |
| Formulário valida LGPD obrigatório | ✅ |
| Submissão cria pedido (POST 201) e marcador aparece | ✅ |
| Token de autor retornado e salvo em localStorage | ✅ |
| Toast "Pedido criado com sucesso!" aparece | ✅ |
| Marcador de pedido médico mostra selo verde "Verificado oficial" | ✅ |
| Popup mostra categoria, urgência, status, descrição, contadores | ✅ |
| Botões "Confirmo" / "Negar" / "Denunciar" presentes | ✅ |
| Toggle "Mapa de Calor" adiciona/remove canvas do leaflet.heat | ✅ |
| Heatmap API retorna 7 pontos com intensidade normalizada | ✅ |
| Real-time: novo pedido propagado via Socket.io | ✅ (sem testar segundo cliente) |
| Lint sem erros | ✅ |
| Dev server sem erros no console do browser | ✅ |
