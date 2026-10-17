import { useRef, useState } from 'react'
import { LinkSimple, LockSimple, X } from '@phosphor-icons/react'
import type { LinkCategoryId, LinkItem } from '../types'
import type { CSSProperties } from 'react'
import { LINK_CATEGORIES } from '../data/mock'
import { cn } from '../utils'

interface LinkEditorModalProps {
  initial?: LinkItem
  existingLinks: LinkItem[]
  defaultCategory?: LinkCategoryId
  onClose: () => void
  onSave: (link: LinkItem) => void
}

function normalizeUrl(raw: string): { url: string; domain: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    if (!parsed.hostname.includes('.')) return null
    return {
      url: parsed.toString(),
      domain: parsed.hostname.replace(/^www\./, ''),
    }
  } catch {
    return null
  }
}

function isInternalDomain(domain: string): boolean {
  return /(^|\.)internal$/.test(domain) || /(^|\.)local$/.test(domain) || domain === 'localhost'
}

export function LinkEditorModal({
  initial,
  existingLinks,
  defaultCategory = 'standards',
  onClose,
  onSave,
}: LinkEditorModalProps) {
  const [url, setUrl] = useState(initial?.url ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState<LinkCategoryId>(
    initial?.categoryId ?? defaultCategory,
  )
  const [internal, setInternal] = useState(initial?.internal ?? false)
  const [error, setError] = useState('')
  const titleTouched = useRef(Boolean(initial))

  const parsed = normalizeUrl(url)
  const duplicates = parsed
    ? existingLinks.find(
        (link) =>
          link.id !== initial?.id &&
          normalizeUrl(link.url)?.url.toLowerCase() === parsed.url.toLowerCase(),
      )
    : null

  const updateUrl = (next: string) => {
    setUrl(next)
    setError('')
    const nextParsed = normalizeUrl(next)
    if (!nextParsed) return
    setInternal(isInternalDomain(nextParsed.domain))
    if (!titleTouched.current || !title.trim()) {
      setTitle(nextParsed.domain)
    }
  }

  const submit = () => {
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setError('请输入有效网址，例如 https://example.com')
      return
    }
    if (duplicates) {
      setError('这个链接已经收藏过了')
      return
    }
    const finalTitle = title.trim() || normalized.domain
    onSave({
      id: initial?.id ?? `l-${Date.now()}`,
      title: finalTitle,
      url: normalized.url,
      domain: normalized.domain,
      categoryId,
      description: description.trim() || '暂无说明，稍后可以补充。',
      letter: finalTitle.slice(0, 1).toUpperCase(),
      internal,
    })
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div className="modal-layer link-editor-modal">
        <div className="modal-card">
          <form
            className="modal-inner"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <div className="modal-head">
              <div>
                <div className="modal-title">{initial ? '编辑收藏' : '添加收藏'}</div>
                <div className="modal-sub">收藏到合适的集合，之后可以随时编辑或删除</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
                <X size={15} />
              </button>
            </div>

            <div className="modal-body link-editor-body">
              <label className={cn('link-url-field', error && 'has-error')}>
                <LinkSimple size={16} />
                <input
                  value={url}
                  onChange={(event) => updateUrl(event.target.value)}
                  onBlur={() => {
                    if (parsed && !title.trim()) setTitle(parsed.domain)
                  }}
                  placeholder="粘贴网址，例如 https://owasp.org"
                  autoFocus
                />
                {internal ? (
                  <span className="link-url-badge">
                    <LockSimple size={10} /> 内部
                  </span>
                ) : null}
              </label>
              {error ? <div className="link-form-error">{error}</div> : null}
              {!error && parsed ? (
                <div className="link-form-hint">将保存为 {parsed.domain}</div>
              ) : null}

              <div className="field">
                <label htmlFor="link-title">标题</label>
                <input
                  id="link-title"
                  className="input"
                  value={title}
                  onChange={(event) => {
                    titleTouched.current = true
                    setTitle(event.target.value)
                  }}
                  onBlur={() => {
                    if (!title.trim() && parsed) setTitle(parsed.domain)
                  }}
                  placeholder="例如 OWASP Top 10"
                />
              </div>

              <div className="field">
                <label>收藏到</label>
                <div className="link-category-picker">
                  {LINK_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={cn('link-category-option', categoryId === category.id && 'active')}
                      style={{ '--cat': `var(${category.colorVar})` } as CSSProperties}
                      onClick={() => setCategoryId(category.id)}
                    >
                      <span className="dot" />
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="link-desc">说明</label>
                <textarea
                  id="link-desc"
                  className="textarea"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="为什么收藏它、什么时候会用到…"
                />
              </div>

              <label className="link-internal-toggle">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(event) => setInternal(event.target.checked)}
                />
                <span>
                  <b>内部链接</b>
                  <small>标记为仅内网可访问，列表中会显示锁图标</small>
                </span>
              </label>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn ghost" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="btn primary" disabled={!url.trim()}>
                {initial ? '保存修改' : '添加收藏'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
