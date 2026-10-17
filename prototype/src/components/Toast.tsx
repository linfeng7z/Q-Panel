import { Check } from '@phosphor-icons/react'

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast-layer">
      <div className="toast">
        <span className="toast-icon">
          <Check size={11} weight="bold" />
        </span>
        <span>{message}</span>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}
