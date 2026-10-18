import {
  CalendarDots,
  FolderSimple,
  House,
  LinkSimple,
  NotePencil,
} from '@phosphor-icons/react'
import type { SidebarGroupKey, SidebarLabels, ViewId } from '../types'
import { fmtDays } from '../utils'
import { catStyle } from './ui'
import { t } from '../i18n'

interface SidebarProps {
  view: ViewId
  onView: (view: ViewId) => void
  groupLabels: SidebarLabels
  weekCount: number
  weekPlanned: number
  weekAvailable: number
  weekLabel: string
}

interface NavItem {
  id: ViewId
  label: string
  icon: typeof House
  badge?: 'week'
  note?: string
}

interface NavGroup {
  id: SidebarGroupKey
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    id: 'plan',
    items: [
      { id: 'quarter', label: '季度规划', icon: House },
      { id: 'week', label: '本周安排', icon: CalendarDots, badge: 'week' },
      { id: 'projects', label: '项目', icon: FolderSimple, note: '全局' },
    ],
  },
  {
    id: 'archive',
    items: [
      { id: 'notes', label: '临时笔记', icon: NotePencil },
      { id: 'links', label: '收藏链接', icon: LinkSimple },
    ],
  },
]

export function Sidebar({ view, onView, groupLabels, weekCount, weekPlanned, weekAvailable, weekLabel }: SidebarProps) {
  const ratio = weekAvailable > 0 ? Math.min(100, Math.round((weekPlanned / weekAvailable) * 100)) : 0
  const over = weekPlanned > weekAvailable

  return (
    <aside className="sidebar">
      {navGroups.map((group) => (
        <div className="side-section" key={group.id}>
          <div className="side-label">{t(groupLabels[group.id])}</div>
          <div className="side-group">
            {group.items.map((item) => {
              const Icon = item.icon
              const badge = item.badge === 'week' ? weekCount : null
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item${view === item.id ? ' active' : ''}`}
                  onClick={() => onView(item.id)}
                >
                  <span className="nav-icon">
                    <Icon size={17} />
                  </span>
                  {t(item.label)}
                  {item.note ? <span className="nav-note">{t(item.note)}</span> : null}
                  {badge ? <span className="nav-badge num">{badge}</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="sidebar-bottom">
        <div className="side-cap" style={catStyle('appsec')}>
          <div className="side-cap-top">
            <span>{t(weekLabel)}</span>
            <b className={over ? 'over' : undefined}>
              {fmtDays(weekPlanned)}
              <span className="faint"> / {weekAvailable} {t('人日')}</span>
            </b>
          </div>
          <div className="side-cap-bar">
            <div className="bar">
              <i style={{ width: `${ratio}%` }} />
            </div>
          </div>
          <div className={`side-cap-foot${over ? ' over' : ''}`}>
            {over
              ? t('超出 {n} 人日 · 建议延期', { n: fmtDays(weekPlanned - weekAvailable) })
              : t('剩余 {n} 人日 · 按工作日计', { n: fmtDays(weekAvailable - weekPlanned) })}
          </div>
        </div>
      </div>
    </aside>
  )
}
