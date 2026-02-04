import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Server-Sent Events endpoint for real-time updates
 * 
 * Clients connect here to receive live updates about:
 * - Time entry approvals/rejections
 * - New employees, projects, workplaces
 */
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({
        event: "connected",
        timestamp: new Date().toISOString(),
        workspaceId: session.user.workspaceId,
      })}\n\n`
      controller.enqueue(encoder.encode(connectMessage))

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ event: "ping", timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(encoder.encode(ping))
        } catch {
          clearInterval(keepAlive)
        }
      }, 30000)

      // Check for new events every second
      let lastEventIndex = 0
      const checkEvents = setInterval(() => {
        try {
          const eventBus = (globalThis as any).__realtimeEvents || []
          
          // Send any new events
          while (lastEventIndex < eventBus.length) {
            const event = eventBus[lastEventIndex]
            
            // Filter by workspace
            if (event.workspaceId === session.user.workspaceId) {
              // For employees, only their own updates
              if (session.user.role !== "EMPLOYEE" || !event.userId || event.userId === session.user.id) {
                const message = `data: ${JSON.stringify(event)}\n\n`
                controller.enqueue(encoder.encode(message))
              }
            }
            
            lastEventIndex++
          }
        } catch {
          clearInterval(checkEvents)
        }
      }, 1000)

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive)
        clearInterval(checkEvents)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
