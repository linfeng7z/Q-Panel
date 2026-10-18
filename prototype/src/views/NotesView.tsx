import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Eye,
  MagnifyingGlass,
  NotePencil,
  PencilSimple,
  Plus,
  PushPin,
  Trash,
} from '@phosphor-icons/react'
import type { Note } from '../types'
import { cn } from '../utils'
import { Card, EmptyState } from '../components/ui'

interface NotesViewProps {
  notes: Note[]
  onChange: (notes: Note[]) => void
  onToast: (message: string) => void
}

function Markdown({ content, onEdit }: { content: string; onEdit?: () => void }) {
  const blocks: ReactNode[] = []
  const bullets: string[] = []
  let key = 0
  const flush = () => {
    if (!bullets.length) return
    key += 1
    blocks.push(
      <ul key={`ul-${key}`}>
        {bullets.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>,
    )
    bullets.length = 0
  }
  content.split('\n').forEach((line) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2))
      return
    }
    flush()
    key += 1
    if (!line.trim()) {
      blocks.push(<div key={`space-${key}`} className="md-space" />)
      return
    }
    if (line.startsWith('## ')) {
      blocks.push(<h3 key={`h3-${key}`}>{line.slice(3)}</h3>)
      return
    }
    if (line.startsWith('# ')) {
      blocks.push(<h2 key={`h2-${key}`}>{line.slice(2)}</h2>)
      return
    }
    blocks.push(<p key={`p-${key}`}>{line}</p>)
  })
  flush()
  return (
    <div className="md scroll" onDoubleClick={onEdit} title={onEdit ? '双击进入编辑' : undefined}>
      {blocks}
    </div>
  )
}

export function NotesView({ notes, onChange, onToast }: NotesViewProps) {
  const [selectedId, setSelectedId] = useState(notes[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(true)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0]
  const filtered = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content.toLowerCase().includes(query.toLowerCase()),
  )

  useEffect(() => {
    if (!preview) editorRef.current?.focus()
  }, [preview, selectedId])

  const addNote = () => {
    const id = `n-${Date.now()}`
    const note: Note = {
      id,
      title: '未命名笔记',
      updatedAt: '刚刚',
      content: '# 未命名笔记\n\n',
    }
    onChange([note, ...notes])
    setSelectedId(id)
    setPreview(false)
    onToast('已新建一条笔记')
  }

  const updateContent = (content: string) => {
    if (!selected) return
    onChange(
      notes.map((note) =>
        note.id === selected.id ? { ...note, content, updatedAt: '刚刚' } : note,
      ),
    )
  }

  const togglePin = () => {
    if (!selected) return
    onChange(
      notes.map((note) =>
        note.id === selected.id ? { ...note, pinned: !note.pinned } : note,
      ),
    )
  }

  const deleteNote = () => {
    if (!selected) return
    const index = notes.findIndex((note) => note.id === selected.id)
    const next = notes.filter((note) => note.id !== selected.id)
    onChange(next)
    const fallback = next[index] ?? next[index - 1] ?? next[0]
    setSelectedId(fallback?.id ?? '')
    setPreview(true)
    onToast(`已删除「${selected.title}」`)
  }

  return (
    <div className="view notes-view">
      <div className="page-head" style={{ marginBottom: 13 }}>
        <div>
                    <h1 className="page-title">临时笔记</h1>
          <p className="page-sub">{notes.length} 条笔记 · 纯本地保存 · 自动写入工作区</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn primary" onClick={addNote}>
            <span className="icon-circle">
              <Plus size={12} weight="bold" />
            </span>
            新建笔记
          </button>
        </div>
      </div>

      <div className="notes-layout">
        <Card className="note-list-pane">
          <div className="note-list-head">
            <div className="note-list-title">全部笔记</div>
            <span className="card-meta">{filtered.length}</span>
          </div>
          <div className="note-search">
            <MagnifyingGlass size={12} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或正文…"
            />
          </div>
          <div className="note-items scroll">
            {filtered.map((note) => (
              <button
                key={note.id}
                type="button"
                className={cn('note-item', selected?.id === note.id && 'active')}
                onClick={() => {
                  setSelectedId(note.id)
                  setPreview(true)
                }}
              >
                <div className="note-item-top">
                  {note.pinned ? (
                    <span className="note-pin">
                      <PushPin size={9} weight="fill" />
                    </span>
                  ) : null}
                  <span className="note-item-title">{note.title}</span>
                  <span className="note-item-date">{note.updatedAt}</span>
                </div>
                <div className="note-item-preview">
                  {note.content.replace(/^#+\s*/gm, '').replace(/\n/g, ' ').slice(0, 46)}
                </div>
              </button>
            ))}
            {filtered.length === 0 ? <div className="task-empty">没有匹配的笔记。</div> : null}
          </div>
        </Card>

        <Card className="note-editor-pane">
          {selected ? (
            <>
              <div className="note-editor-toolbar">
                <span className="note-editor-title">{selected.title}</span>
                <button
                  type="button"
                  className={cn('icon-btn', selected.pinned && 'active')}
                  onClick={togglePin}
                  title={selected.pinned ? '取消置顶' : '置顶'}
                >
                  <PushPin size={14} weight={selected.pinned ? 'fill' : 'regular'} />
                </button>
                <button
                  type="button"
                  className="icon-btn note-delete-btn"
                  onClick={deleteNote}
                  title="删除笔记"
                  aria-label="删除笔记"
                >
                  <Trash size={14} />
                </button>
                <button
                  type="button"
                  className={cn('note-mode-toggle', !preview && 'active')}
                  onClick={() => setPreview((value) => !value)}
                  title={preview ? '进入编辑' : '切换到预览'}
                >
                  {preview ? <PencilSimple size={13} /> : <Eye size={13} />}
                  <span>{preview ? '编辑' : '预览'}</span>
                </button>
              </div>
              <div className="note-editor-meta">
                更新于 {selected.updatedAt} · Markdown · {selected.content.length} 字符
              </div>
              {preview ? (
                <Markdown content={selected.content} onEdit={() => setPreview(false)} />
              ) : (
                <textarea
                  ref={editorRef}
                  className="note-textarea scroll"
                  autoFocus
                  value={selected.content}
                  onChange={(event) => updateContent(event.target.value)}
                  spellCheck={false}
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={<NotePencil size={20} />}
              title="还没有笔记"
              sub="新建一条，用来放会议纪要、汇报要点或随手想法。"
              action={
                <button type="button" className="btn primary sm" onClick={addNote}>
                  <Plus size={12} /> 新建笔记
                </button>
              }
            />
          )}
        </Card>
      </div>
    </div>
  )
}
