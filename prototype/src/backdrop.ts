// The saved 0..80 value is a material strength, not a native vibrancy preset.
// A fast early response removes desktop letterforms; 80 completely isolates it.
export function backdropMaterial(value: number) {
  const strength = Number.isFinite(value) ? Math.min(80, Math.max(0, value)) : 56
  const progress = strength / 80
  const response = Math.sqrt(progress)
  return {
    strength,
    radius: 160 * response,
    // Keep the desktop visible through most of the travel, then close the
    // material completely at 100%. This keeps the slider perceptible while the
    // reading surfaces themselves stay opaque.
    // One tint veil for the whole glass skin. It begins at the original dark
    // glass level and closes completely at max, so text never sits on a live
    // or sharp desktop while the UI remains a single surface.
    tint: strength === 80 ? 1 : 0.34 + 0.66 * Math.pow(progress, 1.25),
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
