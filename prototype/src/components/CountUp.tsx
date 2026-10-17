import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  decimals?: number
  duration?: number
}

export function CountUp({ value, decimals = 0, duration = 560 }: CountUpProps) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [display, setDisplay] = useState(reduce ? value : 0)
  const fromRef = useRef(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      fromRef.current = value
      return
    }

    const from = fromRef.current
    const started = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(from + (value - from) * eased)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, reduce, value])

  const current = reduce ? value : display
  const text = decimals > 0 ? current.toFixed(decimals) : String(Math.round(current))
  return <span className="count-up">{text}</span>
}
