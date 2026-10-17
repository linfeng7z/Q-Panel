import { useState } from 'react'
import {
  Bell,
  CalendarBlank,
  Check,
  FolderSimple,
  HardDrives,
  Minus,
  Plus,
  SlidersHorizontal,
  Sparkle,
  Tag,
  X,
} from '@phosphor-icons/react'
import type { ThemeId } from '../types'
import { CATEGORIES, CATEGORY_COLORS } from '../data/mock'
import { cn } from '../utils'
import { Toggle } from './ui'

export type SettingsTab = 'general' | 'work' | 'categories' | 'reminders' | 'ai' | 'data'

interface SettingsModalProps {
  onClose: () => void
  theme: ThemeId
  onTheme: (theme: ThemeId) => void
  onTestReminder: () => void
  onToast: (message: string) => void
  initialTab?: SettingsTab
  onAddCategory: (name: string, colorVar: string) => void
}

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Bell }> = [
  { id: 'general', label: '通用', icon: SlidersHorizontal },
  { id: 'work', label: '人日与日历', icon: CalendarBlank },
  { id: 'categories', label: '分类', icon: Tag },
  { id: 'reminders', label: '提醒', icon: Bell },
  { id: 'ai', label: 'AI 助手', icon: Sparkle },
  { id: 'data', label: '数据', icon: HardDrives },
]

export function SettingsModal({
  onClose,
  theme,
  onTheme,
  onTestReminder,
  onToast,
  initialTab = 'general',
  onAddCategory,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0].value)
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [popup, setPopup] = useState(true)
  const [nativeNotif, setNativeNotif] = useState(true)
  const [dnd, setDnd] = useState(false)
  const [confirmWrites, setConfirmWrites] = useState(true)
  const [buffer, setBuffer] = useState(0)
  const [defaultOffset, setDefaultOffset] = useState('提前 2 天')
  const [defaultTime, setDefaultTime] = useState('09:30')
  const [defaultView, setDefaultView] = useState('季度规划')
  const [provider, setProvider] = useState('OpenAI 兼容')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('sk-••••••••••••••••')
  const [scope, setScope] = useState('摘要（推荐）')

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div className="modal-layer settings-modal">
        <div className="modal-card">
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                <div className="modal-title">设置</div>
                <div className="modal-sub">所有配置只保存在本机 · 原型阶段仅演示交互</div>
              </div>
              <button type="button" className="modal-close" onClick={onClose} aria-label="关闭设置">
                <X size={16} />
              </button>
            </div>

            <div className="settings-layout">
              <div className="settings-nav">
                {tabs.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn('settings-tab', tab === item.id && 'active')}
                      onClick={() => setTab(item.id)}
                    >
                      <Icon size={15} />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div className="settings-pane scroll">
                {tab === 'general' ? (
                  <>
                    <div className="settings-pane-title">外观与启动</div>
                    <div className="settings-pane-sub">换皮肤不会影响数据与布局。</div>

                    <div className="settings-section">
                      <div className="settings-section-label">皮肤</div>
                      <div className="theme-cards">
                        <button
                          type="button"
                          className={cn('theme-card', theme === 'noir' && 'active')}
                          onClick={() => onTheme('noir')}
                        >
                          <div className="theme-preview noir">
                            <span className="tp-bar" />
                            <span className="tp-card" />
                            <span className="tp-dot" />
                          </div>
                          <div className="theme-name">
                            Noir <span>{theme === 'noir' ? '当前' : '黑玻璃'}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={cn('theme-card', theme === 'ops' && 'active')}
                          onClick={() => onTheme('ops')}
                        >
                          <div className="theme-preview ops">
                            <span className="tp-bar" />
                            <span className="tp-card" />
                            <span className="tp-dot" />
                          </div>
                          <div className="theme-name">
                            Ops <span>{theme === 'ops' ? '当前' : '数据看板'}</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">启动</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">开机自动启动</div>
                          <div className="settings-help">提醒依赖 App 常驻菜单栏；关闭后仅在手动打开时提醒。</div>
                        </div>
                        <Toggle on={autoLaunch} onChange={setAutoLaunch} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">全局快捷键</div>
                          <div className="settings-help">唤起 / 收起顶部面板。</div>
                        </div>
                        <div className="settings-code" style={{ minWidth: 130, justifyContent: 'center' }}>
                          ⌥ Space
                        </div>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">默认展开页</div>
                          <div className="settings-help">点击刘海展开时先看到的页面。</div>
                        </div>
                        <select className="select" style={{ width: 120 }} value={defaultView} onChange={(event) => setDefaultView(event.target.value)}>
                          <option>季度规划</option>
                          <option>本周安排</option>
                          <option>全局项目</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'work' ? (
                  <>
                    <div className="settings-pane-title">人日与日历</div>
                    <div className="settings-pane-sub">按中国法定节假日 + 调休补班日计算可用人日；1 人日 = 1 个正常工作日。</div>

                    <div className="settings-section">
                      <div className="settings-section-label">容量口径</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">时间单位</div>
                          <div className="settings-help">本版按人日规划，不再按小时折算；支持 0.25 / 0.5 人日。</div>
                        </div>
                        <span className="tag">人日</span>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">季度容量</div>
                          <div className="settings-help">可用人日 = 工作日 − 请假/占用天数；剩余可为负数。</div>
                        </div>
                        <span className="card-meta">人日</span>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">计划缓冲</div>
                          <div className="settings-help">预留不可用于季度任务的会议 / 杂事时间，默认 0%。</div>
                        </div>
                        <div className="stepper">
                          <button type="button" onClick={() => setBuffer((value) => Math.max(0, value - 5))}>
                            <Minus size={11} />
                          </button>
                          <span>{buffer}%</span>
                          <button type="button" onClick={() => setBuffer((value) => Math.min(40, value + 5))}>
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">日历数据</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">2026 官方节假日数据</div>
                          <div className="settings-help">来源：国务院办公厅 2025 年 11 月公告 · 已内置 39 条调休记录。</div>
                        </div>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => onToast('节假日数据已是最新（2026 官方版）')}
                        >
                          检查更新
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">2027 年数据</div>
                          <div className="settings-help">官方安排尚未发布，当前按周一至周五估算；发布后可更新或手动导入。</div>
                        </div>
                        <span className="tag" style={{ color: 'var(--warn)' }}>
                          待发布
                        </span>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">请假 / 占用</div>
                          <div className="settings-help">10/20 – 10/21 年假 · 共扣减 2 人日；10/17 之后的新增会实时影响季度容量。</div>
                        </div>
                        <button type="button" className="btn sm" onClick={() => onToast('请假管理将在功能版接入')}>
                          管理
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'categories' ? (
                  <>
                    <div className="settings-pane-title">分类</div>
                    <div className="settings-pane-sub">
                      分类用于筛选季度任务、本周事项和全局项目；新增后立即出现在所有选择器。
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">现有分类</div>
                      {CATEGORIES.map((category) => (
                        <div className="settings-row" key={category.id}>
                          <div>
                            <div className="settings-label category-label">
                              <span
                                className="dot"
                                style={{ background: `var(${category.colorVar})` }}
                              />
                              {category.name}
                            </div>
                            <div className="settings-help">
                              {category.id.startsWith('cat-') ? '自定义分类' : '内置分类'}
                            </div>
                          </div>
                          <span className="card-meta">{category.id.startsWith('cat-') ? '自定义' : '默认'}</span>
                        </div>
                      ))}
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">新增分类</div>
                      <div className="settings-row category-add-row">
                        <input
                          className="input"
                          value={categoryName}
                          onChange={(event) => setCategoryName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              const name = categoryName.trim()
                              if (!name) {
                                onToast('请输入分类名称')
                                return
                              }
                              if (CATEGORIES.some((item) => item.name === name)) {
                                onToast('分类名称已存在')
                                return
                              }
                              onAddCategory(name, categoryColor)
                              setCategoryName('')
                            }
                          }}
                          placeholder="例如：合规审计"
                          maxLength={12}
                        />
                        <select
                          className="select"
                          value={categoryColor}
                          onChange={(event) => setCategoryColor(event.target.value)}
                        >
                          {CATEGORY_COLORS.map((color) => (
                            <option value={color.value} key={color.value}>
                              {color.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={() => {
                            const name = categoryName.trim()
                            if (!name) {
                              onToast('请输入分类名称')
                              return
                            }
                            if (CATEGORIES.some((item) => item.name === name)) {
                              onToast('分类名称已存在')
                              return
                            }
                            onAddCategory(name, categoryColor)
                            setCategoryName('')
                          }}
                        >
                          <Plus size={12} />
                          添加
                        </button>
                      </div>
                      <div className="settings-help" style={{ padding: '6px 18px 2px' }}>
                        当前原型新增分类保存在内存中，刷新页面会恢复默认分类；功能版写入本地工作区。
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'reminders' ? (
                  <>
                    <div className="settings-pane-title">提醒</div>
                    <div className="settings-pane-sub">每个事项可以覆盖默认规则；例如「离截止还差 2 天」。</div>

                    <div className="settings-section">
                      <div className="settings-section-label">默认提醒规则</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">提前量</div>
                          <div className="settings-help">分类和事项可以单独覆盖。</div>
                        </div>
                        <select className="select" style={{ width: 130 }} value={defaultOffset} onChange={(event) => setDefaultOffset(event.target.value)}>
                          <option>提前 1 天</option>
                          <option>提前 2 天</option>
                          <option>提前 3 天</option>
                          <option>提前 1 周</option>
                          <option>当天</option>
                        </select>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">提醒时刻</div>
                          <div className="settings-help">只有日期的事项默认在这个时间提醒。</div>
                        </div>
                        <input
                          className="input"
                          style={{ width: 100 }}
                          type="time"
                          value={defaultTime}
                          onChange={(event) => setDefaultTime(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">通知方式</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">应用内顶部弹窗</div>
                          <div className="settings-help">不抢焦点，可完成 / 稍后 / 打开。</div>
                        </div>
                        <Toggle on={popup} onChange={setPopup} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">macOS 系统通知</div>
                          <div className="settings-help">同时进入通知中心，作为记录与兜底。</div>
                        </div>
                        <Toggle on={nativeNotif} onChange={setNativeNotif} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">勿扰时段</div>
                          <div className="settings-help">22:30 – 08:30 之间只入队，不弹窗。</div>
                        </div>
                        <Toggle on={dnd} onChange={setDnd} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">测试提醒</div>
                          <div className="settings-help">立即弹出一条示例提醒，检查弹窗和系统通知。</div>
                        </div>
                        <button type="button" className="btn sm" onClick={onTestReminder}>
                          测试
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'ai' ? (
                  <>
                    <div className="settings-pane-title">AI 助手</div>
                    <div className="settings-pane-sub">API Key 使用 macOS 钥匙串加密，只保存在本机。</div>

                    <div className="settings-section">
                      <div className="settings-section-label">模型服务</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">服务类型</div>
                          <div className="settings-help">一套 OpenAI 兼容接口，兼容 DeepSeek、方舟、Ollama。</div>
                        </div>
                        <select className="select" style={{ width: 150 }} value={provider} onChange={(event) => setProvider(event.target.value)}>
                          <option>OpenAI 兼容</option>
                          <option>DeepSeek</option>
                          <option>火山方舟</option>
                          <option>Ollama</option>
                        </select>
                      </div>
                      <div className="field" style={{ marginTop: 12 }}>
                        <label>BASE URL</label>
                        <input className="input" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
                      </div>
                      <div className="field" style={{ marginTop: 9 }}>
                        <label>模型</label>
                        <input className="input" value={model} onChange={(event) => setModel(event.target.value)} />
                      </div>
                      <div className="field" style={{ marginTop: 9 }}>
                        <label>API KEY</label>
                        <input className="input" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">权限与隐私</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">发送给 AI 的上下文</div>
                          <div className="settings-help">摘要包含当前周期、季度任务、项目与本周事项的标题/状态/人日；笔记与链接默认不发送。</div>
                        </div>
                        <select className="select" style={{ width: 150 }} value={scope} onChange={(event) => setScope(event.target.value)}>
                          <option>最小</option>
                          <option>摘要（推荐）</option>
                          <option>全部</option>
                        </select>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">写入前确认</div>
                          <div className="settings-help">AI 创建/修改事项前展示预览卡，确认后才落库；AI 永远不能删除事项。</div>
                        </div>
                        <Toggle on={confirmWrites} onChange={setConfirmWrites} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">连接测试</div>
                          <div className="settings-help">发送一条最小请求，验证 Base URL、模型与 Key。</div>
                        </div>
                        <button type="button" className="btn sm" onClick={() => onToast('连接成功 · 模型可用（原型模拟）')}>
                          测试连接
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'data' ? (
                  <>
                    <div className="settings-pane-title">数据</div>
                    <div className="settings-pane-sub">纯本地工作区，换电脑复制整个目录即可。</div>

                    <div className="settings-section">
                      <div className="settings-section-label">工作区</div>
                      <div className="settings-code">
                        ~/Library/Application Support/Q-Panel/workspace
                        <button type="button" onClick={() => onToast('已在 Finder 中打开（原型模拟）')}>
                          <FolderSimple size={14} />
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">自动备份</div>
                          <div className="settings-help">每天一份快照，保留最近 14 天；迁移或导入前强制备份。</div>
                        </div>
                        <select className="select" style={{ width: 100 }}>
                          <option>14 天</option>
                          <option>30 天</option>
                          <option>7 天</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">导入 / 导出</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">导出工作区</div>
                          <div className="settings-help">导出 JSON（包含设置、季度任务、周事项、项目、笔记、链接）。</div>
                        </div>
                        <button type="button" className="btn sm" onClick={() => onToast('已导出 q-panel-workspace.json（原型模拟）')}>
                          导出
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">导入工作区</div>
                          <div className="settings-help">导入前会校验 schema 并预览变更，不会直接覆盖。</div>
                        </div>
                        <button type="button" className="btn sm" onClick={() => onToast('导入向导将在功能版接入')}>
                          导入
                        </button>
                      </div>
                    </div>

                    <div className="settings-note">
                      <Check size={13} style={{ flex: '0 0 13px', marginTop: 1 }} />
                      隐私说明：零遥测、零埋点。除你配置的 AI 接口、手动检查节假日更新、链接元数据抓取外，Q-Panel 不发起任何网络请求。
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn primary" onClick={onClose}>
                <span className="icon-circle">
                  <Check size={11} weight="bold" />
                </span>
                完成
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
