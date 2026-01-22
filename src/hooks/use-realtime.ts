"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"

type RealtimeEvent = 
  | "time-entry-created"
  | "time-entry-approved"
  | "time-entry-rejected"
  | "employee-created"
  | "project-created"
  | "workplace-created"

interface RealtimeMessage {
  event: RealtimeEvent
  data: any
  timestamp: string
  workspaceId: string
  userId?: string
}

interface UseRealtimeOptions {
  onMessage?: (message: RealtimeMessage) => void
  events?: RealtimeEvent[]
}

/**
 * Real-time updates hook using Server-Sent Events (SSE)
 * 
 * This provides a simple, reliable real-time update mechanism
 * that works well with Next.js App Router and doesn't require
 * additional infrastructure like Socket.IO server.
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!session?.user) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Create new SSE connection
    const eventSource = new EventSource("/api/realtime")
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log("[Realtime] Connected")
    }

    eventSource.onmessage = (event) => {
      try {
        const message: RealtimeMessage = JSON.parse(event.data)

        // Filter by workspace
        if (message.workspaceId !== session.user.workspaceId) {
          return
        }

        // Filter by event types if specified
        if (options.events && !options.events.includes(message.event)) {
          return
        }

        // For employees, only receive their own updates
        if (session.user.role === "EMPLOYEE" && message.userId && message.userId !== session.user.id) {
          return
        }

        // Call handler
        options.onMessage?.(message)
      } catch (error) {
        console.error("[Realtime] Parse error:", error)
      }
    }

    eventSource.onerror = () => {
      console.log("[Realtime] Connection error, reconnecting...")
      eventSource.close()
      
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000)
    }
  }, [session, options])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return {
    isConnected: !!eventSourceRef.current,
  }
}

/**
 * Broadcast a realtime event to all connected clients
 * This should be called from API routes after mutations
 */
export async function broadcastEvent(event: RealtimeEvent, data: any, workspaceId: string, userId?: string) {
  // In a production environment, this would push to a message queue
  // For now, clients will poll or use SSE
  const message: RealtimeMessage = {
    event,
    data,
    timestamp: new Date().toISOString(),
    workspaceId,
    userId,
  }

  // Store in a global event bus for SSE to pick up
  if (typeof globalThis !== "undefined") {
    const eventBus = (globalThis as any).__realtimeEvents || []
    eventBus.push(message)
    ;(globalThis as any).__realtimeEvents = eventBus.slice(-100) // Keep last 100 events
  }

  return message
}
