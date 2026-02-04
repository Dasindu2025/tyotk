import { useState, useMemo } from "react"

interface UsePaginationProps<T> {
  data: T[]
  itemsPerPage?: number
  initialPage?: number
}

interface PaginationResult<T> {
  currentData: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function usePagination<T>({
  data,
  itemsPerPage = 10,
  initialPage = 1,
}: UsePaginationProps<T>): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage)

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage

  const currentData = useMemo(() => {
    return data.slice(startIndex, endIndex)
  }, [data, startIndex, endIndex])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  // Reset to page 1 if data changes and current page is out of bounds
  if (data.length > 0 && currentPage > totalPages) {
    setCurrentPage(1)
  }

  return {
    currentData,
    currentPage,
    totalPages,
    totalItems: data.length,
    itemsPerPage,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }
}
