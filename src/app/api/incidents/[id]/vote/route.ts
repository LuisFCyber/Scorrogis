import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/incidents/[id]/vote - votação social (validação de via)
// Body: { vote: true (ainda alagado) | false (já escoou / liberado) }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const vote: boolean = Boolean(body?.vote)

    const incident = await db.incidentReport.findUnique({ where: { id } })
    if (!incident) {
      return NextResponse.json({ error: 'Incidente não encontrado' }, { status: 404 })
    }

    const updated = await db.incidentReport.update({
      where: { id },
      data: vote
        ? { upvotes: incident.upvotes + 1 }
        : { downvotes: incident.downvotes + 1 },
    })

    // Auto-verificação: >= 5 upvotes e downvotes < upvotes/2
    if (updated.upvotes >= 5 && updated.downvotes < updated.upvotes / 2 && !updated.verified) {
      const verified = await db.incidentReport.update({
        where: { id },
        data: { verified: true },
      })
      return NextResponse.json({ ...verified, justVerified: true })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[api/incidents/vote POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
