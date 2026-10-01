import { createServer } from 'http'
import { Server } from 'socket.io'

// Serviço de tempo real - Plataforma Rotas Seguras
// Porta 3003 (convenção do skill fullstack-dev)

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface GeoEvent {
  id: string
  type: 'incident' | 'shelter' | 'survivor' | 'validation' | 'route'
  action: 'create' | 'update' | 'delete' | 'vote'
  payload: Record<string, unknown>
  timestamp: string
}

const generateId = () => Math.random().toString(36).slice(2, 11)

io.on('connection', (socket) => {
  console.log(`[realtime] Cliente conectado: ${socket.id}`)

  // Cliente anuncia região de interesse (bounding box)
  socket.on('subscribe:region', (bbox: { south: number; west: number; north: number; east: number }) => {
    socket.join(`region:${bbox.south.toFixed(2)}:${bbox.west.toFixed(2)}`)
    console.log(`[realtime] ${socket.id} inscrito na região`, bbox)
  })

  // Novo incidente reportado
  socket.on('incident:create', (data) => {
    const event: GeoEvent = {
      id: generateId(),
      type: 'incident',
      action: 'create',
      payload: data,
      timestamp: new Date().toISOString(),
    }
    io.emit('incident:created', event)
    console.log(`[realtime] Novo incidente:`, data)
  })

  // Voto em incidente (validação social)
  socket.on('incident:vote', (data: { incidentId: string; vote: boolean }) => {
    const event: GeoEvent = {
      id: generateId(),
      type: 'validation',
      action: 'vote',
      payload: data,
      timestamp: new Date().toISOString(),
    }
    io.emit('incident:voted', event)
    console.log(`[realtime] Voto em ${data.incidentId}: ${data.vote ? 'up' : 'down'}`)
  })

  // Sinal de sobrevivente
  socket.on('survivor:create', (data) => {
    const event: GeoEvent = {
      id: generateId(),
      type: 'survivor',
      action: 'create',
      payload: data,
      timestamp: new Date().toISOString(),
    }
    io.emit('survivor:created', event)
    console.log(`[realtime] Novo sinal de sobrevivente`)
  })

  // Atualização de abrigo (capacidade, suprimentos)
  socket.on('shelter:update', (data) => {
    const event: GeoEvent = {
      id: generateId(),
      type: 'shelter',
      action: 'update',
      payload: data,
      timestamp: new Date().toISOString(),
    }
    io.emit('shelter:updated', event)
    console.log(`[realtime] Abrigo atualizado`)
  })

  socket.on('disconnect', () => {
    console.log(`[realtime] Cliente desconectado: ${socket.id}`)
  })

  socket.on('error', (err) => {
    console.error(`[realtime] Erro socket ${socket.id}:`, err)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[realtime] WebSocket server rodando na porta ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[realtime] Recebido SIGTERM, desligando...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[realtime] Recebido SIGINT, desligando...')
  httpServer.close(() => process.exit(0))
})
