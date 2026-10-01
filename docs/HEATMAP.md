# Heatmap de Necessidades

Camada de calor que mostra a densidade espacial dos pedidos de ajuda, ponderada por urgência.

## Como funciona

### 1. Agregação em grid

Os pedidos de ajuda ativos (não resolvidos/cancelados) são agregados em células de um grid retangular.

- **Tamanho padrão da célula**: 0.005° (~500m)
- **Bounds**: definido pelo `bbox` (default: 50km ao redor de Franca/SP)
- **Período**: últimas 24h (configurável via `periodHours`)

Cada célula calcula:
- `count` — número de pedidos na célula
- `intensity` — soma de pesos (ponderada por urgência)

### 2. Pesos por urgência

| Urgência | Peso |
|---|---|
| `low` | 1 |
| `medium` | 2 |
| `high` | 3 |
| `critical` | 4 |

Bônus: pedidos `communityVerified = true` ganham +0.5 de peso (credibilidade extra).

### 3. Normalização

A intensidade bruta é normalizada para 0-1 dividindo pelo máximo global, para que leaflet.heat possa mapear para o gradient.

### 4. Gradient visual

| Valor | Cor |
|---|---|
| 0.0 | azul (frio) |
| 0.3 | ciano |
| 0.5 | verde (lima) |
| 0.7 | amarelo |
| 1.0 | vermelho (quente) |

## Endpoint

### `GET /api/heatmap`

**Query params:**
- `bbox=west,south,east,north` — área de interesse (default: Franca)
- `category=rescue` — filtrar por categoria
- `urgency=critical` — filtrar por urgência
- `periodHours=24` — período em horas (default 24)
- `gridSize=0.005` — tamanho da célula em graus (default 0.005 ≈ 500m)

**Resposta:**
```json
{
  "count": 7,
  "totalRequests": 7,
  "maxIntensity": 4.0,
  "points": [
    {
      "lng": -47.3975,
      "lat": -20.5275,
      "count": 1,
      "intensity": 1.0
    },
    {
      "lng": -47.4225,
      "lat": -20.5525,
      "count": 1,
      "intensity": 0.5
    }
  ],
  "heatPoints": [
    [-20.5275, -47.3975, 1.0],
    [-20.5525, -47.4225, 0.5]
  ]
}
```

`heatPoints` está no formato `[lat, lng, intensity]` aceito diretamente por `L.heatLayer()`.

## Toggle no UI

A camada pode ser ativada/desativada pelo QuickFilters (botão "Mapa de Calor" com ícone 🔥).

**Comportamento:**
- Quando **desativado** (default): nenhum canvas de heatmap é renderizado
- Quando **ativado**: chama `/api/heatmap` e renderiza via `leaflet.heat`
- **Atualização automática**: a cada 60 segundos enquanto ativo
- Reage a mudanças nos filtros (categoria/urgência) — re-busca dados

## Implementação técnica

### Biblioteca
- `leaflet.heat@0.2.0` — plugin Leaflet para renderização de heatmaps em canvas

### Componente React

`src/components/map/MapView.tsx` → `HeatmapLayer` component:
- Hook `useMap()` pega instância do mapa
- `useEffect` reage a mudanças em `heatmap[]` e `layers.heatmap`
- Cria layer via `L.heatLayer(points, options)`
- Cleanup remove layer ao desmontar

### PostGIS (produção)

Em produção, a agregação é feita direto no PostgreSQL via função `help_requests_heatmap_grid()`:

```sql
SELECT * FROM help_requests_heatmap_grid(
  -47.6, -20.7, -47.2, -20.35,  -- bbox
  0.005,                          -- grid_size
  NULL,                           -- category (NULL = todas)
  NULL,                           -- urgency (NULL = todas)
  24                              -- period_hours
);
```

Retorna colunas: `cell_lng`, `cell_lat`, `request_count`, `avg_urgency_score`, `weighted_intensity`.

## Performance

- Pré-agregação no banco (PostGIS) em vez de trazer todos os pontos para o cliente
- Cache de tiles não se aplica ao heatmap (dados dinâmicos)
- Em produção com milhares de pedidos: considerar Redis para cache de 30s
- Cliente limita a 5000 pontos por requisição

## Acessibilidade

- Cores do gradient seguem padrão perceptível por daltonismo (azul → verde → amarelo → vermelho)
- Toggle tem `aria-label` e é navegável por teclado
- Heatmap é puramente decorativo (não essencial) — pode ser desativado sem perda de funcionalidade
