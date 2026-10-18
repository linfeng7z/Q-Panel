import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  ArrowUpRight,
  FolderSimple,
  LinkSimple,
  LockSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import type { LinkCategory, LinkCategoryId, LinkItem } from '../types'
import { getLinkCategory } from '../data/mock'
import { LinkCategoryModal } from '../components/LinkCategoryModal'
import { LinkEditorModal } from '../components/LinkEditorModal'
import { cn } from '../utils'

interface LinksViewProps {
  links: LinkItem[]
  onChange: (links: LinkItem[]) => void
  categories: LinkCategory[]
  onCategoriesChange: (categories: LinkCategory[]) => void
  onToast: (message: string) => void
}

function categoryStyle(category: LinkCategory): CSSProperties {
  return { '--cat': `var(${category.colorVar})` } as CSSProperties
}

export function LinksView({
  links,
  onChange,
  categories,
  onCategoriesChange,
  onToast,
}: LinksViewProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | LinkCategoryId>('all')
  const [editor, setEditor] = useState<{ link?: LinkItem } | null>(null)
  const [categoryEditor, setCategoryEditor] = useState<{ category?: LinkCategory } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<LinkItem | null>(null)

  const resolveCategory = (categoryId: string) => getLinkCategory(categoryId, categories)
  const categoryIdOf = (link: LinkItem) => resolveCategory(link.categoryId).id
  const fallbackCategory =
    categories.find((category) => category.id === 'unsorted') ?? categories[categories.length - 1]
  const keyword = query.trim().toLowerCase()
  const filtered = links.filter((link) => {
    const category = resolveCategory(link.categoryId)
    const matchFilter = filter === 'all' || category.id === filter
    const matchQuery =
      !keyword ||
      link.title.toLowerCase().includes(keyword) ||
      link.domain.toLowerCase().includes(keyword) ||
      link.description.toLowerCase().includes(keyword) ||
      category.name.toLowerCase().includes(keyword)
    return matchFilter && matchQuery
  })
  const internalCount = links.filter((link) => link.internal).length
  const usedCollections = categories.filter((category) =>
    links.some((link) => categoryIdOf(link) === category.id),
  ).length
  const countForCategory = (categoryId: string) =>
    links.filter((link) => categoryIdOf(link) === categoryId).length

  useEffect(() => {
    if (!editor && !pendingDelete && !categoryEditor) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setEditor(null)
      setPendingDelete(null)
      setCategoryEditor(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [categoryEditor, editor, pendingDelete])

  const saveLink = (link: LinkItem) => {
    const editing = links.some((item) => item.id === link.id)
    onChange(editing ? links.map((item) => (item.id === link.id ? link : item)) : [link, ...links])
    if (!editing) setFilter('all')
    onToast(editing ? '已更新收藏' : `已收藏 ${link.domain}`)
    setEditor(null)
  }

  const deleteLink = () => {
    if (!pendingDelete) return
    onChange(links.filter((link) => link.id !== pendingDelete.id))
    onToast(`已删除 ${pendingDelete.title}`)
    setPendingDelete(null)
  }

  const saveCategory = (data: { name: string; colorVar: string }) => {
    if (categoryEditor?.category) {
      onCategoriesChange(
        categories.map((category) =>
          category.id === categoryEditor.category?.id ? { ...category, ...data } : category,
        ),
      )
      onToast('已更新收藏集合')
    } else {
      const category: LinkCategory = {
        id: `link-cat-${Date.now()}`,
        name: data.name,
        colorVar: data.colorVar,
      }
      onCategoriesChange([...categories, category])
      setFilter(category.id)
      onToast('已创建收藏集合')
    }
    setCategoryEditor(null)
  }

  const deleteCategory = () => {
    const category = categoryEditor?.category
    if (!category || !fallbackCategory || category.id === fallbackCategory.id) return
    onChange(
      links.map((link) =>
        categoryIdOf(link) === category.id ? { ...link, categoryId: fallbackCategory.id } : link,
      ),
    )
    onCategoriesChange(categories.filter((item) => item.id !== category.id))
    if (filter === category.id) setFilter(fallbackCategory.id)
    onToast(`已删除集合，相关收藏移至 ${fallbackCategory.name}`)
    setCategoryEditor(null)
  }

  return (
    <div className="view links-view">
      <div className="page-head links-head">
        <div>
          <h1 className="page-title">收藏链接</h1>
          <p className="page-sub">
            {links.length} 条收藏 · {internalCount} 条内部链接 · {categories.length} 个集合
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn primary" onClick={() => setEditor({})}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            添加链接
          </button>
        </div>
      </div>

      <div className="links-library">
        <aside className="link-collections">
          <div className="link-collections-head">
            <span>收藏集合</span>
            <b>{categories.length}</b>
          </div>
          <button
            type="button"
            className={cn('collection-item', filter === 'all' && 'active')}
            onClick={() => setFilter('all')}
          >
            <FolderSimple size={13} />
            <span>全部链接</span>
            <b>{links.length}</b>
          </button>
          <div className="collection-list">
            {categories.map((category) => {
              const count = countForCategory(category.id)
              return (
                <div className="collection-item-wrap" key={category.id}>
                  <button
                    type="button"
                    className={cn(
                      'collection-item',
                      filter === category.id && 'active',
                      count === 0 && 'is-empty',
                    )}
                    onClick={() => setFilter(category.id)}
                    title={category.name}
                  >
                    <span
                      className="collection-dot"
                      style={{ background: `var(${category.colorVar})` }}
                    />
                    <span>{category.name}</span>
                    <b>{count}</b>
                  </button>
                  <button
                    type="button"
                    className="collection-edit"
                    aria-label={`编辑集合 ${category.name}`}
                    title="编辑集合"
                    onClick={() => setCategoryEditor({ category })}
                  >
                    <PencilSimple size={10} />
                  </button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            className="collection-add"
            onClick={() => setCategoryEditor({})}
          >
            <Plus size={11} /> 新建集合
          </button>
          <div className="link-collections-foot">
            <span className="collection-foot-dot" />
            内部链接 {internalCount} 条 · {usedCollections} 个集合有收藏
          </div>
        </aside>

        <section className="link-library-main">
          <div className="library-toolbar">
            <label className="library-search">
              <MagnifyingGlass size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、域名、说明或集合…"
              />
              {query ? (
                <button
                  type="button"
                  className="library-search-clear"
                  onClick={() => setQuery('')}
                  aria-label="清空搜索"
                >
                  <X size={12} />
                </button>
              ) : null}
            </label>
            <span className="library-result">{filtered.length} 条</span>
          </div>

          {filtered.length === 0 ? (
            <div className="library-empty">
              <span className="library-empty-icon">
                <LinkSimple size={22} />
              </span>
              <b>
                {links.length === 0
                  ? '收藏夹还是空的'
                  : query
                    ? '没有匹配的链接'
                    : '这个集合还没有链接'}
              </b>
              <span>
                {links.length === 0
                  ? '把经常打开的网址收进来，从安全标准、工具平台开始。'
                  : query
                    ? '换个关键词，或者回到全部分类。'
                    : '把合适的链接收藏到这个集合，列表会自动更新。'}
              </span>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  if (query) setQuery('')
                  else if (filter !== 'all') setFilter('all')
                  else setEditor({})
                }}
              >
                {query ? '清空搜索' : filter !== 'all' ? '查看全部链接' : <><Plus size={11} /> 添加第一条收藏</>}
              </button>
            </div>
          ) : (
            <div className="library-panel">
              {filtered.map((link) => {
                const category = resolveCategory(link.categoryId)
                return (
                  <article className="library-row" key={link.id}>
                    <button
                      type="button"
                      className="library-hit"
                      onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                      title={`打开 ${link.url}`}
                    >
                      <span className="library-avatar" style={categoryStyle(category)}>
                        {link.letter}
                      </span>
                      <span className="library-copy">
                        <span className="library-title">
                          {link.title}
                          {link.internal ? (
                            <span className="library-internal">
                              <LockSimple size={9} /> 内部
                            </span>
                          ) : null}
                        </span>
                        <span className="library-desc">{link.description}</span>
                        <span className="library-meta">
                          <span className="library-cat" style={categoryStyle(category)}>
                            <span className="dot" />
                            {category.name}
                          </span>
                          <span className="library-domain">{link.domain}</span>
                        </span>
                      </span>
                      <ArrowUpRight size={14} className="library-open" />
                    </button>
                    <div className="library-actions">
                      <button
                        type="button"
                        className="library-action"
                        aria-label={`编辑 ${link.title}`}
                        title="编辑"
                        onClick={() => setEditor({ link })}
                      >
                        <PencilSimple size={13} />
                      </button>
                      <button
                        type="button"
                        className="library-action danger"
                        aria-label={`删除 ${link.title}`}
                        title="删除"
                        onClick={() => setPendingDelete(link)}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {editor ? (
        <LinkEditorModal
          initial={editor.link}
          existingLinks={links}
          categories={categories}
          defaultCategory={
            filter === 'all'
              ? categories.find((category) => category.id === 'standards')?.id ??
                fallbackCategory?.id
              : filter
          }
          onClose={() => setEditor(null)}
          onSave={saveLink}
        />
      ) : null}

      {categoryEditor ? (
        <LinkCategoryModal
          initial={categoryEditor.category}
          categories={categories}
          linkCount={categoryEditor.category ? countForCategory(categoryEditor.category.id) : 0}
          onClose={() => setCategoryEditor(null)}
          onSave={saveCategory}
          onDelete={deleteCategory}
        />
      ) : null}

      {pendingDelete ? (
        <>
          <div className="scrim" onMouseDown={() => setPendingDelete(null)} />
          <div
          className="modal-layer link-confirm-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null)
          }}
        >
            <div className="modal-card link-confirm-card">
              <div className="modal-inner">
                <div className="modal-head">
                  <div>
                    <div className="modal-title">删除这条收藏？</div>
                    <div className="modal-sub">不会删除原网站，只从本地收藏夹移除。</div>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setPendingDelete(null)}
                    aria-label="关闭"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="modal-body link-confirm-body">
                  <span className="link-confirm-icon">
                    <WarningCircle size={18} />
                  </span>
                  <div>
                    <b>{pendingDelete.title}</b>
                    <span>{pendingDelete.domain}</span>
                  </div>
                </div>
                <div className="modal-foot">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setPendingDelete(null)}
                  >
                    取消
                  </button>
                  <button type="button" className="btn danger" onClick={deleteLink}>
                    <Trash size={12} />
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
