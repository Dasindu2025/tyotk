import { useState, useEffect, useCallback, useRef } from "react"

interface UseOptimizedFetchOptions {
  enabled?: boolean
  refetchInterval?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

/**
 * Optimized fetch hook with caching, deduplication, and error handling
 */
export function useOptimizedFetch<T = any>(
  url: string | null,
  options: UseOptimizedFetchOptions = {}
) {
  const { enabled = true, refetchInterval, onSuccess, onError } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map())
  const CACHE_DURATION = 60000 // 1 minute cache

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return

    // Check cache first
    const cached = cacheRef.current.get(url)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Cache-Control": "max-age=60",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const jsonData = await response.json()
      const result = jsonData.data ?? jsonData

      // Update cache
      cacheRef.current.set(url, { data: result, timestamp: Date.now() })

      setData(result)
      onSuccess?.(result)
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      }
    } finally {
      setLoading(false)
    }
  }, [url, enabled, onSuccess, onError])

  useEffect(() => {
    fetchData()

    let intervalId: NodeJS.Timeout | null = null
    if (refetchInterval) {
      intervalId = setInterval(fetchData, refetchInterval)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [fetchData, refetchInterval])

  const refetch = useCallback(() => {
    if (url) {
      cacheRef.current.delete(url) // Clear cache
      fetchData()
    }
  }, [url, fetchData])

  return { data, loading, error, refetch }
}
