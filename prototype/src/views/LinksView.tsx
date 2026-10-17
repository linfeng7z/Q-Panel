import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  LinkSimple,
  LockSimple,
  MagnifyingGlass,
  Plus,
} from '@phosphor-icons/react'
import type { CategoryId, LinkItem } from '../types'
import { CATEGORIES, getCategory } from '../data/mock'
import { cn } from '../utils'
import { Card, EmptyState, catStyle } from '../components/ui'

interface LinksViewProps {
  links: LinkItem[]
  onChange: (links: LinkItem[]) => void
  onToast: (message: string) => void
}

export function LinksView({ links, onChange, onToast }: LinksViewProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = links.filter((link) => {
    const matchFilter = filter === 'all' || link.categoryId === filter
    const keyword = query.trim().toLowerCase()
    const matchQuery =
      !keyword ||
      link.title.toLowerCase().includes(keyword) ||
      link.domain.toLowerCase().includes(keyword) ||
      link.description.toLowerCase().includes(keyword)
    return matchFilter && matchQuery
  })

  const addLink = () => {
    const raw = url.trim()
    if (!raw) return
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    try {
      const parsed = new URL(normalized)
      const domain = parsed.hostname.replace(/^www\./, '')
      const link: LinkItem = {
        id: `l-${Date.now()}`,
        title: domain,
        url: normalized,
        domain,
        categoryId: filter === 'all' ? 'other' : filter,
        description: '刚添加的链接，稍后可以补充分组与说明。',
        letter: domain.slice(0, 1).toUpperCase(),
        internal: /\.internal$/.test(domain) || /\.local$/.test(domain),
      }
      onChange([link, ...links])
      setUrl('')
      onToast(`已添加链接 ${domain}`)
    } catch {
      onToast('URL 格式不正确，请检查后重试')
    }
  }

  return (
    <div className="view links-view">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="tick" />
            Links · local collection
          </div>
          <h1 className="page-title">
            链接收藏 <span className="light">与常用入口</span>
          </h1>
          <p className="page-sub">{links.length} 条链接 · 自动补齐标题与图标 · 点击用系统浏览器打开</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn primary" onClick={() => inputRef.current?.focus()}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            添加链接
          </button>
        </div>
      </div>

      <div className="links-toolbar">
        <div className="links-search">
          <MagnifyingGlass size={12} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题 / 域名 / 描述…"
          />
        </div>
        <button
          type="button"
          className={cn('chip', filter === 'all' && 'active')}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        {CATEGORIES.map((category) => {
          const count = links.filter((link) => link.categoryId === category.id).length
          if (!count) return null
          return (
            <button
              key={category.id}
              type="button"
              className={cn('chip cat', filter === category.id && 'active')}
              style={catStyle(category.id)}
              onClick={() => setFilter(category.id)}
            >
              <span className="dot" />
              {category.name}
              <span className="count">{count}</span>
            </button>
          )
        })}
        <div className="link-add">
          <input
            ref={inputRef}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addLink()
            }}
            placeholder="粘贴 URL，回车添加"
          />
          <button type="button" className="btn primary sm" onClick={addLink} disabled={!url.trim()}>
            添加
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LinkSimple size={20} />}
            title="这个筛选下没有链接"
            sub="粘贴一个网址，Q-Panel 会自动补标题和图标。"
            action={
              <button type="button" className="btn primary sm" onClick={() => inputRef.current?.focus()}>
                <Plus size={12} /> 添加链接
              </button>
            }
          />
        </Card>
      ) : (
        <div className="link-grid">
          {filtered.map((link) => (
            <Card key={link.id}>
              <div
                className="link-card"
                style={catStyle(link.categoryId)}
                onClick={() => onToast(`原型：将在系统浏览器打开 ${link.url}`)}
              >
                <div className="link-top">
                  <span className="link-icon">{link.letter}</span>
                  <span className="link-open">
                    {link.internal ? <LockSimple size={12} /> : <ArrowUpRight size={13} />}
                  </span>
                </div>
                <div className="link-title">{link.title}</div>
                <div className="link-domain">
                  {link.internal ? <LockSimple size={9} /> : null}
                  {link.domain}
                </div>
                <div className="link-desc">{link.description}</div>
                <div className="link-foot">
                  <span className="tag">
                    <span className="dot" style={{ width: 5, height: 5, flexBasis: 5 }} />
                    {getCategory(link.categoryId).name}
                  </span>
                  <span>{link.internal ? '内部链接' : '公开链接'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
