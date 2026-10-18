import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { LinkSimple, LockSimple, X } from '@phosphor-icons/react'
import type { LinkCategory, LinkCategoryId, LinkItem } from '../types'
import { cn } from '../utils'

interface LinkEditorModalProps {
  initial?: LinkItem
  existingLinks: LinkItem[]
  categories: LinkCategory[]
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
  categories,
  defaultCategory = 'standards',
  onClose,
  onSave,
}: LinkEditorModalProps) {
  const resolveCategory = (id?: string) =>
    categories.find((category) => category.id === id) ??
    categories.find((category) => category.id === 'unsorted') ??
    categories[0]

  const [url, setUrl] = useState(initial?.url ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(
    resolveCategory(initial?.categoryId ?? defaultCategory)?.id ?? 'unsorted',
  )
  const [internal, setInternal] = useState(initial?.internal ?? false)
  const [error, setError] = useState('')
  const titleTouched = useRef(Boolean(initial))
  const descriptionTouched = useRef(Boolean(initial?.description))
  const initialUrlRef = useRef(initial?.url ? normalizeUrl(initial.url)?.url : undefined)
  const metadataRequest = useRef(0)
  const [metadataStatus, setMetadataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const parsed = normalizeUrl(url)
  const category = resolveCategory(categoryId)
  const duplicates = parsed
    ? existingLinks.find(
        (link) =>
          link.id !== initial?.id &&
          normalizeUrl(link.url)?.url.toLowerCase() === parsed.url.toLowerCase(),
      )
    : null
  useEffect(() => {
    const bridge = window.qpanel?.metadata
    const normalized = normalizeUrl(url)
    if (!bridge || !normalized || internal || normalized.url === initialUrlRef.current) {
      setMetadataStatus('idle')
      return
    }
    let cancelled = false
    const request = metadataRequest.current + 1
    metadataRequest.current = request
    setMetadataStatus('loading')
    const timer = window.setTimeout(() => {
      void bridge.fetch(normalized.url).then((result) => {
        if (cancelled || metadataRequest.current !== request) return
        if (!result?.ok) {
          setMetadataStatus('error')
          return
        }
        setTitle((current) => {
          if (titleTouched.current && current.trim()) return current
          return result.title || normalized.domain
        })
        setDescription((current) => {
          if (descriptionTouched.current || current.trim()) return current
          return result.description || current
        })
        setMetadataStatus('success')
      }).catch(() => {
        if (!cancelled && metadataRequest.current === request) setMetadataStatus('error')
      })
    }, 550)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [url, internal])

  const previewTitle = title.trim() || parsed?.domain || '未命名收藏'
  const previewDomain = parsed?.domain || 'example.com'
  const previewLetter = previewTitle.slice(0, 1).toUpperCase()
  const categoryStyle = category
    ? ({ '--cat': `var(${category.colorVar})` } as CSSProperties)
    : undefined

  const updateUrl = (next: string) => {
    setUrl(next)
    setError('')
    const nextParsed = normalizeUrl(next)
    if (!nextParsed) return
    setInternal(isInternalDomain(nextParsed.domain))
    if (!titleTouched.current || !title.trim()) setTitle(nextParsed.domain)
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
      categoryId: category?.id ?? 'unsorted',
      description: description.trim() || '暂无说明，稍后可以补充。',
      letter: finalTitle.slice(0, 1).toUpperCase(),
      internal,
    })
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div
        className="modal-layer link-editor-modal"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
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
                <div className="modal-sub">网址会先解析成一张收藏卡片，再选择集合和补充信息。</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
                <X size={15} />
              </button>
            </div>

            <div className="modal-body link-editor-body">
              <div className="link-editor-grid">
                <aside className="link-preview-pane">
                  <div className="link-preview-label">收藏预览</div>
                  <div className="link-preview-card" style={categoryStyle}>
                    <span className="link-preview-avatar">{previewLetter}</span>
                    <span className="link-preview-title">{previewTitle}</span>
                    <span className="link-preview-domain">
                      {internal ? <LockSimple size={9} /> : null}
                      {previewDomain}
                    </span>
                    <span className="link-preview-meta">
                      <span className="link-preview-cat">
                        <span className="dot" />
                        {category?.name ?? '待整理'}
                      </span>
                      {internal ? <span>内部链接</span> : null}
                    </span>
                  </div>
                  <div className="link-preview-note">
                    标题和地址来自链接本身，可以随时手动修整。
                  </div>
                </aside>

                <div className="link-editor-fields">
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
                    <div className="link-form-hint">
                      将保存为 {parsed.domain}
                      {metadataStatus === 'loading' ? <span className="link-meta-status"> · 正在识别网页标题…</span> : null}
                      {metadataStatus === 'success' ? <span className="link-meta-status success"> · 已识别网页信息</span> : null}
                      {metadataStatus === 'error' ? <span className="link-meta-status muted"> · 未识别到标题，仍可手动填写</span> : null}
                    </div>
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
                      {categories.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={cn('link-category-option', categoryId === item.id && 'active')}
                          style={{ '--cat': `var(${item.colorVar})` } as CSSProperties}
                          onClick={() => setCategoryId(item.id)}
                        >
                          <span className="dot" />
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="link-desc">说明</label>
                    <textarea
                      id="link-desc"
                      className="textarea"
                      rows={2}
                      value={description}
                      onChange={(event) => {
                        descriptionTouched.current = true
                        setDescription(event.target.value)
                      }}
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
              </div>
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
