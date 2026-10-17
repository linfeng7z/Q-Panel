import {
  CalendarCheck,
  CalendarDots,
  ChartLineUp,
  DotsThree,
  FolderSimple,
  House,
  LinkSimple,
  NotePencil,
} from '@phosphor-icons/react'
import type { ViewId } from '../types'
import { catStyle } from './ui'

interface SidebarProps {
  view: ViewId
  onView: (view: ViewId) => void
  todayCount: number
  weekCount: number
  weekPlanned: number
  weekAvailable: number
}

const mainNav: Array<{ id: ViewId; label: string; icon: typeof House; badge?: 'today' | 'week' }> = [
  { id: 'today', label: '今日', icon: House, badge: 'today' },
  { id: 'quarter', label: '季度', icon: CalendarCheck },
  { id: 'week', label: '周', icon: CalendarDots, badge: 'week' },
  { id: 'projects', label: '项目', icon: FolderSimple },
  { id: 'stats', label: '统计', icon: ChartLineUp },
]

const toolNav: Array<{ id: ViewId; label: string; icon: typeof House }> = [
  { id: 'notes', label: '笔记', icon: NotePencil },
  { id: 'links', label: '链接', icon: LinkSimple },
]

export function Sidebar({
  view,
  onView,
  todayCount,
  weekCount,
  weekPlanned,
  weekAvailable,
}: SidebarProps) {
  const ratio = weekAvailable > 0 ? Math.min(100, Math.round((weekPlanned / weekAvailable) * 100)) : 0

  return (
    <aside className="sidebar">
      <div className="side-label">工作台</div>
      <div className="side-group">
        {mainNav.map((item) => {
          const Icon = item.icon
          const badge = item.badge === 'today' ? todayCount : item.badge === 'week' ? weekCount : null
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
              {badge ? <span className="nav-badge num">{badge}</span> : null}
            </button>
          )
        })}
      </div>

      <div className="side-label">工具</div>
      <div className="side-group">
        {toolNav.map((item) => {
          const Icon = item.icon
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
            </button>
          )
        })}
      </div>

      <div className="sidebar-bottom">
        <div className="side-cap" style={catStyle('appsec')}>
          <div className="side-cap-top">
            <span>本周容量</span>
            <b>
              {weekPlanned}
              <span className="faint"> / {weekAvailable}h</span>
            </b>
          </div>
          <div className="side-cap-bar">
            <div className="bar">
              <i style={{ width: `${ratio}%` }} />
            </div>
          </div>
          <div className="side-cap-foot">
            剩余 {Math.max(0, weekAvailable - weekPlanned)}h · 5 个工作日
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
