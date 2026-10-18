// The saved 0..80 value is a material strength, not a native vibrancy preset.
// A fast early response removes desktop letterforms; 80 completely isolates it.
export function backdropMaterial(value: number) {
  const strength = Number.isFinite(value) ? Math.min(80, Math.max(0, value)) : 56
  const progress = strength / 80
  return {
    strength,
    // Linear in perceived travel: 1% is a tiny change, 50% is clearly midway.
    // The old sqrt curve jumped to ~18px at 1%, so the middle collapsed into
    // one blurred bucket.
    radius: progress * 64,
    // Continuous all the way to 100%. The old special case at exactly 80 made
    // the slider jump from "visible" to "solid"; this ramps into the solid end.
    tint: 0.3 + 0.7 * progress,
    percent: Math.round(progress * 100),
  }
}

export function backdropVariables(value: number): Record<string, string> {
  const material = backdropMaterial(value)
  return {
    '--panel-blur': `${material.strength}px`,
    '--panel-shade': `${material.strength / 80 * 0.2}`,
    // The capture is rasterized at quarter size, then scaled back up. Filtering
    // the smaller layer avoids filtering a full Retina desktop on every input.
    '--material-blur': `${material.radius / 4}px`,
    '--material-tint': `${material.tint}`,
  }
}

export interface DesktopBackdrop {
  image: string
  screen: { x?: number; y?: number; width: number; height: number }
  window: { x: number; y: number; width: number; height: number }
}

export function backdropImageStyle(backdrop: DesktopBackdrop) {
  const padding = 192
  const localX = backdrop.window.x - (backdrop.screen.x ?? 0)
  const localY = backdrop.window.y - (backdrop.screen.y ?? 0)
  return {
    backgroundImage: `url("${backdrop.image}")`,
    backgroundSize: `${backdrop.screen.width / 4}px ${backdrop.screen.height / 4}px`,
    backgroundPosition: `${(padding - localX) / 4}px ${(padding - localY) / 4}px`,
  }
}
