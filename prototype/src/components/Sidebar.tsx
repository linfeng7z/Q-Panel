import { CalendarDots, DotsThree, FolderSimple, House } from '@phosphor-icons/react'
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

const mainNav: Array<{ id: ViewId; label: string; icon: typeof House; badge?: 'week' }> = [
  { id: 'quarter', label: '首页', icon: House },
  { id: 'week', label: '周计划', icon: CalendarDots, badge: 'week' },
  { id: 'projects', label: '项目', icon: FolderSimple },
]

export function Sidebar({ view, onView, weekCount, weekPlanned, weekAvailable, weekLabel }: SidebarProps) {
  const ratio = weekAvailable > 0 ? Math.min(100, Math.round((weekPlanned / weekAvailable) * 100)) : 0
  const over = weekPlanned > weekAvailable

  return (
    <aside className="sidebar">
      <div className="side-label">工作台</div>
      <div className="side-group">
        {mainNav.map((item) => {
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
              {badge ? <span className="nav-badge num">{badge}</span> : null}
            </button>
          )
        })}
      </div>

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
