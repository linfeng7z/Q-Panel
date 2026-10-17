import { useState } from 'react'
import { FolderSimple, Trash, X } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
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
  const [colorVar, setColorVar] = useState(initial?.colorVar ?? LINK_CATEGORY_COLORS[0].value)
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
      <div className="modal-layer link-category-modal">
        <div className="modal-card">
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                <div className="modal-title">{initial ? '编辑收藏集合' : '新建收藏集合'}</div>
                <div className="modal-sub">用集合给链接分组，之后可以随时改名或重新分配。</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
                <X size={15} />
              </button>
            </div>
            <div className="modal-body link-category-body">
              <div className="link-category-preview" style={{ '--cat': `var(${colorVar})` } as CSSProperties}>
                <span className="link-category-preview-icon">
                  <FolderSimple size={18} />
                </span>
                <span>
                  <b>{name.trim() || '新收藏集合'}</b>
                  <small>{linkCount} 条收藏</small>
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
                    if (event.key === 'Enter') submit()
                  }}
                  placeholder="例如：设计系统"
                  autoFocus
                />
                {error ? <span className="link-form-error">{error}</span> : null}
              </div>

              <div className="field">
                <label>颜色</label>
                <div className="link-color-picker">
                  {LINK_CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn('link-color-option', colorVar === color.value && 'active')}
                      style={{ '--cat': `var(${color.value})` } as CSSProperties}
                      onClick={() => setColorVar(color.value)}
                      aria-label={`${color.label}色`}
                    >
                      <span />
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {initial && !isFallback ? (
                <div className={cn('link-category-danger', confirmDelete && 'armed')}>
                  <div>
                    <b>删除集合</b>
                    <span>
                      {linkCount > 0
                        ? `其中 ${linkCount} 条收藏会自动移到「待整理」`
                        : '这个集合还没有收藏'}
                    </span>
                  </div>
                  {confirmDelete ? (
                    <button type="button" className="btn danger sm" onClick={onDelete}>
                      确认删除
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn ghost sm danger-text"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash size={12} /> 删除
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-foot">
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
    </>
  )
}
