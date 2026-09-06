import { useCallback, useRef, useState } from 'react'

type DragReorderProps = {
  'data-drag-over'?: boolean
  onDragOver: (event: React.DragEvent<HTMLElement>) => void
  onDrop: (event: React.DragEvent<HTMLElement>) => void
}

type DragHandleProps = {
  draggable: boolean
  onDragStart: (event: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}

type UseDragReorderOptions = {
  disabled?: boolean
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function useDragReorder({ disabled = false, onReorder }: UseDragReorderOptions) {
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const resetDragState = useCallback(() => {
    dragIndexRef.current = null
    setDragOverIndex(null)
    setDraggingIndex(null)
  }, [])

  const getItemDragProps = useCallback(
    (index: number): DragReorderProps => ({
      'data-drag-over':
        dragOverIndex === index && draggingIndex !== null && draggingIndex !== index,
      onDragOver: event => {
        if (disabled || draggingIndex === null) return

        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDragOverIndex(index)
      },
      onDrop: event => {
        if (disabled || draggingIndex === null) return

        event.preventDefault()

        if (draggingIndex !== index) {
          onReorder(draggingIndex, index)
        }

        resetDragState()
      }
    }),
    [disabled, dragOverIndex, draggingIndex, onReorder, resetDragState]
  )

  const getHandleProps = useCallback(
    (index: number): DragHandleProps => ({
      draggable: !disabled,
      onDragStart: event => {
        if (disabled) return

        dragIndexRef.current = index
        setDraggingIndex(index)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
      },
      onDragEnd: resetDragState
    }),
    [disabled, resetDragState]
  )

  return {
    draggingIndex,
    dragOverIndex,
    getItemDragProps,
    getHandleProps
  }
}
