import {
  CalendarDots,
  ChartLineUp,
  DotsThree,
  FolderSimple,
  House,
  LinkSimple,
  NotePencil,
} from '@phosphor-icons/react'
import type { ViewId } from '../types'
import { fmtDays } from '../utils'
import { catStyle } from './ui'

interface SidebarProps {
  view: ViewId
  onView: (view: ViewId) => void
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
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '工作台',
    items: [
      { id: 'quarter', label: '季度规划', icon: House },
      { id: 'week', label: '本周安排', icon: CalendarDots, badge: 'week' },
    ],
  },
  {
    label: '全局',
    items: [{ id: 'projects', label: '项目', icon: FolderSimple, note: '跨季度' }],
  },
  {
    label: '工具',
    items: [
      { id: 'stats', label: '统计与容量', icon: ChartLineUp },
      { id: 'notes', label: '临时笔记', icon: NotePencil },
      { id: 'links', label: '收藏链接', icon: LinkSimple },
    ],
  },
]

export function Sidebar({ view, onView, weekCount, weekPlanned, weekAvailable, weekLabel }: SidebarProps) {
  const ratio = weekAvailable > 0 ? Math.min(100, Math.round((weekPlanned / weekAvailable) * 100)) : 0
  const over = weekPlanned > weekAvailable

  return (
    <aside className="sidebar">
      {navGroups.map((group) => (
        <div className="side-section" key={group.label}>
          <div className="side-label">{group.label}</div>
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
                  {item.label}
                  {item.note ? <span className="nav-note">{item.note}</span> : null}
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
            <span>{weekLabel}</span>
            <b className={over ? 'over' : undefined}>
              {fmtDays(weekPlanned)}
              <span className="faint"> / {weekAvailable} 人日</span>
            </b>
          </div>
          <div className="side-cap-bar">
            <div className="bar">
              <i style={{ width: `${ratio}%` }} />
            </div>
          </div>
          <div className="side-cap-foot">
            {over
              ? `超出 ${fmtDays(weekPlanned - weekAvailable)} 人日 · 建议挪出`
              : `剩余 ${fmtDays(weekAvailable - weekPlanned)} 人日 · 按工作日计`}
          </div>
        </div>

        <button type="button" className="side-user">
          <span className="avatar">H</span>
          <span className="side-user-copy">
            <b>Huihui</b>
            <span>安全负责人</span>
          </span>
          <DotsThree size={16} className="more" />
        </button>
      </div>
    </aside>
  )
}
