import { AppleLogo, BatteryFull, MagnifyingGlass, WifiHigh } from '@phosphor-icons/react'
import { NOW, WEEKDAY_CN } from '../data/mock'

export function MenuBar() {
  const date = NOW
  const weekday = WEEKDAY_CN[date.getDay()]
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  return (
    <div className="menubar" aria-hidden="true">
      <div className="menubar-left">
        <span className="menubar-apple">
          <AppleLogo size={14} weight="fill" />
        </span>
        <span className="menubar-brand">Q-Panel</span>
        <span className="menubar-menu">
          <span>文件</span>
          <span>编辑</span>
          <span>显示</span>
        </span>
      </div>
      <div className="menubar-right">
        <span className="menubar-status">
          <WifiHigh size={15} />
          <BatteryFull size={17} weight="fill" />
          <MagnifyingGlass size={14} />
        </span>
        <span className="menubar-date">
          {date.getMonth() + 1}月{date.getDate()}日 周{weekday} {time}
        </span>
      </div>
    </div>
  )
}
