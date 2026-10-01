# Validação Comunitária

A validação comunitária permite que qualquer pessoa (autenticada via token anônimo) confirme ou negue um pedido de ajuda, ajudando a distinguir pedidos reais de falsos/duplicados.

## Como funciona

### 1. Votação

Qualquer visitante pode votar em um pedido:

- **Confirmar** (`vote: true`) — "vi este pedido, é real"
- **Negar** (`vote: false`) — "pedido falso, já resolvido, ou impróprio"

Cada voto é identificado por:
- `voterToken` — UUID gerado no cliente, guardado em `localStorage('voter-token')`. Permite 1 voto por token por pedido.
- `ipHash` — SHA-256 do IP (truncado a 32 chars). Permite rate-limit: **máximo 10 votos por IP por hora**.

### 2. Selos de verificação

Um pedido pode ter 3 estados de verificação, exibidos visualmente:

| Selo | Cor | Condição |
|---|---|---|
| ⚪ **Não verificado** | cinza | Default, sem votos suficientes |
| 🔵 **Validado pela comunidade** | azul | ≥ 3 confirmações E denies < confirms/2 |
| 🟢 **Verificado oficial** | verde | Moderador marcou como oficial |

### 3. Auto-verificação

Quando um pedido atinge o threshold da comunidade (≥ 3 confirms, denies < confirms/2):
- `communityVerified = true`
- Status muda de `pending` → `validated` (se estava pendente)

Implementado via trigger SQL no PostGIS (`download/003_help_requests.sql`, função `auto_community_verify()`).

### 4. Verificação oficial

Moderador pode marcar um pedido como `officialVerified = true` chamando:
```sql
SELECT mark_official_verified('uuid-do-pedido');
```

Em produção (Supabase), essa função é `SECURITY DEFINER` e só pode ser chamada por role autenticada com permissão de moderador (RLS).

## Endpoint

### `POST /api/help-requests/[id]/validate`

**Body:**
```json
{
  "vote": true,                       // true = confirmar, false = negar
  "comment": "Vi pessoalmente",        // opcional, máx 500 chars
  "voterToken": "uuid-gerado-client"  // obrigatório
}
```

**Respostas:**

| Status | Condição |
|---|---|
| 200 | Voto registrado com sucesso |
| 404 | Pedido não encontrado |
| 409 | Token já votou neste pedido |
| 429 | Rate limit atingido (10/hora) |

**Resposta 200:**
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

## Denúncias

Usuários podem denunciar um pedido pelo botão "Denunciar" no popup. Abre um modal com motivos:

- `fake` — Informação falsa
- `duplicate` — Duplicado
- `outdated` — Já resolvido / desatualizado
- `offensive` — Conteúdo ofensivo
- `other` — Outro

Atualmente, denúncias são registradas como validações com `vote: false` + comentário estruturado `[DENÚNCIA: motivo] commentário`. Em produção, há tabela `moderation_reports` com status `pending` → `reviewed` → `actioned`.

## Privacidade

- IP **NUNCA** é guardado em texto puro. Apenas hash SHA-256 truncado.
- `voterToken` é anônimo e não vinculável a identidade real.
- Histórico de votos por token fica apenas em `localStorage` do navegador do votante.

## Diagrama de estados (selos)

```
                     ┌─────────────────────┐
                     │  Não verificado    │
                     │  (cinza, default)  │
                     └──────────┬──────────┘
                                │
                ┌───────────────┼───────────────┐
                │ 3+ confirms   │               │
                │ denies < c/2  │               │ moderador
                ▼               │               │ marca
        ┌──────────────────┐    │               │
        │ Validado pela    │    │               │
        │ comunidade       │◄───┘               │
        │ (azul)           │                    │
        └────────┬─────────┘                    │
                 │                              ▼
                 │                  ┌─────────────────────┐
                 └─────────────────►│ Verificado oficial  │
                                    │ (verde)             │
                                    └─────────────────────┘
```
