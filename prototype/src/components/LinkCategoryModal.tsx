import { useState } from 'react'
import type { CSSProperties } from 'react'
import { FolderSimple, Trash, X } from '@phosphor-icons/react'
import type { LinkCategory } from '../types'
import { LINK_CATEGORY_COLORS } from '../data/mock'
import { cn } from '../utils'

interface LinkCategoryModalProps {
  initial?: LinkCategory
  categories: LinkCategory[]
  linkCount: number
  onClose: () => void
  onSave: (data: { name: string; colorVar: string }) => void
  onDelete?: () => void
}

export function LinkCategoryModal({
  initial,
  categories,
  linkCount,
  onClose,
  onSave,
  onDelete,
}: LinkCategoryModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [colorVar] = useState(
    () =>
      initial?.colorVar ??
      LINK_CATEGORY_COLORS[Math.floor(Math.random() * LINK_CATEGORY_COLORS.length)].value,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const isFallback = initial?.id === 'unsorted'

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('给集合起一个名字')
      return
    }
    const duplicate = categories.some(
      (category) => category.id !== initial?.id && category.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicate) {
      setError('已经有同名集合了')
      return
    }
    onSave({ name: trimmed, colorVar })
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div
        className="modal-layer link-category-modal"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div className="modal-card">
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                <div className="modal-title">{initial ? '编辑收藏集合' : '新建收藏集合'}</div>
                <div className="modal-sub">颜色会自动分配，用一个短名字把同类链接收在一起。</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
                <X size={15} />
              </button>
            </div>
            <div className="modal-body link-category-body">
              <div className="link-category-preview" style={{ '--cat': `var(${colorVar})` } as CSSProperties}>
                <span className="link-category-preview-icon">
                  <FolderSimple size={19} />
                </span>
                <span>
                  <b>{name.trim() || '新收藏集合'}</b>
                  <small>{linkCount} 条收藏 · 自动配色</small>
                </span>
              </div>

              <div className="field">
                <label htmlFor="link-category-name">集合名称</label>
                <input
                  id="link-category-name"
                  className="input"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError('')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) submit()
                  }}
                  placeholder="例如：设计系统"
                  autoFocus
                />
                {error ? <span className="link-form-error">{error}</span> : null}
              </div>
            </div>
            <div className="modal-foot link-category-foot">
              <div className="link-category-foot-left">
                {initial && !isFallback && onDelete ? (
                  confirmDelete ? (
                    <button type="button" className="btn danger sm" onClick={onDelete}>
                      确认删除{linkCount > 0 ? ` · ${linkCount} 条移至待整理` : ''}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={cn('btn ghost sm', 'link-category-delete')}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash size={12} /> 删除集合
                    </button>
                  )
                ) : null}
              </div>
              <div className="link-category-foot-actions">
                <button type="button" className="btn ghost" onClick={onClose}>
                  取消
                </button>
                <button type="button" className="btn primary" onClick={submit}>
                  {initial ? '保存修改' : '创建集合'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
