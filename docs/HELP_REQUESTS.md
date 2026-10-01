# Pedidos de Ajuda

Endpoint base: `/api/help-requests`

## Modelo de dados

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string (cuid) | Identificador único |
| `category` | enum | `rescue` \| `supplies` \| `medical` \| `shelter` \| `transport` |
| `urgency` | enum | `low` \| `medium` \| `high` \| `critical` |
| `status` | enum | `pending` \| `analyzing` \| `validated` \| `in_progress` \| `resolved` \| `cancelled` |
| `longitude` / `latitude` | number | Coordenadas (PostGIS Point) |
| `description` | string | Descrição livre da situação |
| `peopleCount` | number | Número de pessoas precisando de ajuda |
| `vulnerableGroups` | array | `['criancas', 'idosos', 'gestantes', 'pcd', 'outros']` |
| `hasAnimals` | boolean | Há animais no local |
| `animalCount` | number | Quantidade de animais |
| `animalDescription` | string | Descrição dos animais |
| `contact` | object | `{ phone, whatsapp, name }` — PII, server-only |
| `photos` | array | URLs de fotos (futuro: Supabase Storage) |
| `validationCount` | number | Confirmações (votos positivos) |
| `denyCount` | number | Denúncias (votos negativos) |
| `communityVerified` | boolean | Selo azul — validado pela comunidade (>= 3 confirms) |
| `officialVerified` | boolean | Selo verde — verificado por moderador oficial |
| `authorToken` | UUID | Token anônimo para o autor editar (sem login) |
| `expiresAt` | datetime | Expiração automática (24h para crítico, 72h demais) |
| `createdAt` / `updatedAt` | datetime | Timestamps |

## Endpoints

### `GET /api/help-requests`

Lista pedidos. Não retorna dados de contato (PII).

**Query params:**
- `bbox=west,south,east,north` — filtro geográfico
- `category=rescue` — filtrar por categoria
- `urgency=critical` — filtrar por urgência
- `status=pending` — filtrar por status
- `active=true` (default) — apenas não expirados

**Resposta:**
```json
{
  "count": 6,
  "helpRequests": [
    {
      "id": "cmuq...",
      "category": "rescue",
      "urgency": "critical",
      "status": "validated",
      "longitude": -47.405,
      "latitude": -20.5395,
      "description": "Família de 4 pessoas ilhadas no telhado",
      "peopleCount": 4,
      "vulnerableGroups": ["criancas", "idosos"],
      "hasAnimals": true,
      "animalCount": 2,
      "animalDescription": "1 cachorro pequeno e 1 gato",
      "contact": null,
      "photos": [],
      "validationCount": 5,
      "denyCount": 0,
      "communityVerified": true,
      "officialVerified": false,
      "expiresAt": "2026-10-03T22:00:00.000Z",
      "createdAt": "2026-10-02T22:00:00.000Z",
      "updatedAt": "2026-10-02T22:00:00.000Z",
      "location": { "type": "Point", "coordinates": [-47.405, -20.5395] }
    }
  ]
}
```

### `POST /api/help-requests`

Cria novo pedido. Retorna `authorToken` — guarde para editar depois.

**Body:**
```json
{
  "category": "rescue",
  "urgency": "critical",
  "longitude": -47.405,
  "latitude": -20.5395,
  "description": "Família de 4 pessoas ilhadas no telhado",
  "peopleCount": 4,
  "vulnerableGroups": ["criancas", "idosos"],
  "hasAnimals": true,
  "animalCount": 2,
  "animalDescription": "1 cachorro pequeno e 1 gato",
  "contact": {
    "name": "Maria Silva",
    "phone": "16999990000",
    "whatsapp": "16999990000"
  }
}
```

**Resposta (201):**
```json
{
  "id": "cmuq...",
  "category": "rescue",
  "urgency": "critical",
  "status": "pending",
  "...": "...",
  "authorToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `GET /api/help-requests/[id]?authorToken=xxx`

Detalhes de um pedido. Se `authorToken` correto, retorna `contact` (PII).

### `PATCH /api/help-requests/[id]`

Edita pedido (apenas autor com token válido).

**Body:**
```json
{
  "authorToken": "550e8400-e29b-41d4-a716-446655440000",
  "status": "resolved",
  "description": "Fomos resgatados, obrigado!"
}
```

### `POST /api/help-requests/[id]/validate`

Votação comunitária (confirm/deny). 1 voto por token por pedido. Rate limit: 10 votos por IP por hora.

**Body:**
```json
{
  "vote": true,
  "comment": "Confirmo, vi pessoalmente",
  "voterToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Resposta:**
```json
{
  "success": true,
  "validationId": "cmuq...",
  "vote": true,
  "counts": {
    "confirms": 5,
    "denies": 0
  },
  "communityVerified": true,
  "status": "validated"
}
```

## Status flow

```
pending ─── (3+ confirms) ──→ validated ─── (voluntário assume) ──→ in_progress ──→ resolved
   │                            │
   │                            └── (cancelado por autor/moderador) ──→ cancelled
   │
   └── (moderador analisa) ──→ analyzing
```

## TTL automático (PostgreSQL)

| Urgência | TTL |
|---|---|
| critical | 24h |
| low / medium / high | 72h |

Implementado via trigger `set_help_request_ttl()` no SQL PostGIS (`download/003_help_requests.sql`).

## LGPD e Privacidade

- **Contato** (`contact` field): armazenado como JSON, **NUNCA** retornado em listagens públicas. Acessível apenas ao próprio autor via `?authorToken=xxx` na rota `GET /api/help-requests/[id]`.
- **Ofuscação de localização**: cliente pode ativar `approximateLocation: true` ao criar pedido — adiciona ruído de ~50m nas coordenadas antes de enviar.
- **Consentimento**: checkbox obrigatório no formulário (LGPD Lei 13.709/2018).
- **Token do autor**: UUID gerado pelo servidor, armazenado em `localStorage` (`help-request-tokens`), permite edição sem login.
- **Token do votante**: UUID gerado no cliente, armazenado em `localStorage` (`voter-token`), previne duplo voto.

## Real-time

Eventos WebSocket emitidos pelo serviço Socket.io (porta 3003):

| Evento | Direção | Payload |
|---|---|---|
| `help-request:create` | cliente → servidor | `HelpRequest` |
| `help-request:created` | servidor → todos | `{ id, type, payload: HelpRequest }` |
| `help-request:update` | cliente → servidor | `Partial<HelpRequest> & { id }` |
| `help-request:updated` | servidor → todos | `{ id, type, payload: Partial<HelpRequest> }` |

Cliente (`useRealtime` hook) escuta `help-request:created` e `help-request:updated` e atualiza o store + exibe toast.
