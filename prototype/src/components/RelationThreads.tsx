import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface RelationThreadsProps {
  taskId: string | null
  objectiveId?: string
  projectId?: string
}

interface ThreadPath {
  key: string
  d: string
  startX: number
  startY: number
  endX: number
  endY: number
}

function curve(startX: number, startY: number, endX: number, endY: number): string {
  const bend = Math.max(18, Math.abs(endX - startX) * 0.34)
  return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
}

export function RelationThreads({ taskId, objectiveId, projectId }: RelationThreadsProps) {
  const [paths, setPaths] = useState<ThreadPath[]>([])

  useLayoutEffect(() => {
    if (!taskId) return

    let frame = 0
    const measure = () => {
      const source = document.querySelector(`[data-relation-task="${CSS.escape(taskId)}"]`)
      if (!source) {
        setPaths([])
        return
      }

      const sourceRect = source.getBoundingClientRect()
      const targets: Array<{ id: string; element: Element }> = []
      if (objectiveId) {
        const element = document.querySelector(
          `[data-relation-objective="${CSS.escape(objectiveId)}"]`,
        )
        if (element) targets.push({ id: `objective-${objectiveId}`, element })
      }
      if (projectId) {
        const element = document.querySelector(`[data-relation-project="${CSS.escape(projectId)}"]`)
        if (element) targets.push({ id: `project-${projectId}`, element })
      }

      const next = targets.map(({ id, element }) => {
        const targetRect = element.getBoundingClientRect()
        const startX = sourceRect.right
        const startY = sourceRect.top + sourceRect.height / 2
        const endX = targetRect.left
        const endY = targetRect.top + targetRect.height / 2
        return {
          key: `${taskId}-${id}`,
          d: curve(startX, startY, endX, endY),
          startX,
          startY,
          endX,
          endY,
        }
      })
      setPaths(next)
    }

    frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    const scrollArea = document.querySelector('.view-scroll')
    scrollArea?.addEventListener('scroll', measure, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      scrollArea?.removeEventListener('scroll', measure)
    }
  }, [objectiveId, projectId, taskId])

  if (!taskId || paths.length === 0) return null

  return createPortal(
    <svg className="relation-overlay" aria-hidden="true">
      {paths.map((path) => (
        <g key={path.key}>
          <path className="relation-thread" d={path.d} pathLength={1} />
          <path className="relation-thread-pulse" d={path.d} pathLength={1} />
          <circle className="relation-node source" cx={path.startX} cy={path.startY} r="2.6" />
          <circle className="relation-node target" cx={path.endX} cy={path.endY} r="3.4" />
        </g>
      ))}
    </svg>,
    document.querySelector('.qp-root') ?? document.body,
  )
}
