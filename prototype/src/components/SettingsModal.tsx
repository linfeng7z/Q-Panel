import { useState } from 'react'
import {
  Bell,
  CalendarBlank,
  Check,
  HardDrives,
  Minus,
  Plus,
  SlidersHorizontal,
  SidebarSimple,
  Sparkle,
  Tag,
  Trash,
  X,
} from '@phosphor-icons/react'
import type { AiConfigPublic, ReminderDefaults, SidebarLabels, ThemeId, UserPreferences } from '../types'
import type { CalendarAdjustment } from '../calendar'
import { CATEGORIES, CATEGORY_COLORS } from '../data/mock'
import { cn } from '../utils'
import { Toggle } from './ui'
import { TimeSelect } from './TimeSelect'
import { BlurStrengthControl } from './BlurStrengthControl'

export type SettingsTab = 'general' | 'work' | 'categories' | 'sidebar' | 'reminders' | 'ai' | 'data'

const MODEL_GROUPS = [
  { label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
  { label: '通义千问', models: ['qwen-plus', 'qwen-max'] },
  { label: 'Ollama', models: ['qwen2.5:14b', 'llama3.1:8b'] },
]

interface SettingsModalProps {
  onClose: () => void
  theme: ThemeId
  onTheme: (theme: ThemeId) => void
  onTestReminder: () => void
  onToast: (message: string) => void
  initialTab?: SettingsTab
  onAddCategory: (name: string, colorVar: string) => void
  onExportWorkspace: () => void
  onImportWorkspace: () => void
  categoryUsage: Record<string, number>
  onDeleteCategory: (categoryId: string) => void
  aiModel: string
  onAiModelChange: (model: string) => void
  preferences: UserPreferences
  onPreferencesChange: (preferences: UserPreferences) => void
  aiConfig: AiConfigPublic
  onAiConfigSave: (payload: { baseUrl: string; model: string; apiKey?: string }) => Promise<{ ok: boolean; error?: string }>
  onAiTest: () => Promise<{ ok: boolean; error?: string; status?: number }>
  reminderDefaults: ReminderDefaults
  onReminderDefaultsChange: (defaults: ReminderDefaults) => void
  calendarAdjustments: CalendarAdjustment[]
  onCalendarAdjustmentsChange: (adjustments: CalendarAdjustment[]) => void
  sidebarLabels: SidebarLabels
  onUpdateSidebarLabel: (key: keyof SidebarLabels, label: string) => void
  onResetSidebarLabels: () => void
}

const THEME_OPTIONS: Array<{ id: ThemeId; name: string; desc: string }> = [
  { id: 'noir', name: 'Noir', desc: '黑玻璃' },
  { id: 'ops', name: 'Ops', desc: '数据看板' },
  { id: 'aurora', name: 'Aurora', desc: '冷紫极光' },
  { id: 'ember', name: 'Ember', desc: '暖橙余烬' },
]

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Bell }> = [
  { id: 'general', label: '通用', icon: SlidersHorizontal },
  { id: 'work', label: '人日与日历', icon: CalendarBlank },
  { id: 'categories', label: '分类', icon: Tag },
  { id: 'sidebar', label: '侧边栏', icon: SidebarSimple },
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
  onExportWorkspace,
  onImportWorkspace,
  categoryUsage,
  onDeleteCategory,
  aiModel,
  onAiModelChange,
  preferences,
  onPreferencesChange,
  aiConfig,
  onAiConfigSave,
  onAiTest,
  reminderDefaults,
  onReminderDefaultsChange,
  calendarAdjustments,
  onCalendarAdjustmentsChange,
  sidebarLabels,
  onUpdateSidebarLabel,
  onResetSidebarLabels,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [categoryName, setCategoryName] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [leaveLabel, setLeaveLabel] = useState('')
  const [provider, setProvider] = useState('OpenAI 兼容')
  const [baseUrl, setBaseUrl] = useState(aiConfig.baseUrl)
  const [apiKey, setApiKey] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiStatus, setAiStatus] = useState('')

  const updatePreferences = (patch: Partial<UserPreferences>) => {
    onPreferencesChange({ ...preferences, ...patch })
  }

  const addCategoryFromInput = () => {
    const name = categoryName.trim()
    if (!name) {
      onToast('请输入分类名称')
      return
    }
    if (CATEGORIES.some((item) => item.name === name)) {
      onToast('分类名称已存在')
      return
    }
    const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)].value
    onAddCategory(name, color)
    setCategoryName('')
  }

  const addCalendarAdjustment = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(leaveDate)) {
      onToast('请选择请假日期')
      return
    }
    if (calendarAdjustments.some((item) => item.date === leaveDate)) {
      onToast('这个日期已经设置过了')
      return
    }
    const next = [
      ...calendarAdjustments,
      {
        date: leaveDate,
        kind: 'leave' as const,
        days: 1,
        label: leaveLabel.trim() || '请假',
      },
    ].sort((a, b) => a.date.localeCompare(b.date))
    onCalendarAdjustmentsChange(next)
    setLeaveDate('')
    setLeaveLabel('')
  }

  const removeCalendarAdjustment = (date: string) => {
    onCalendarAdjustmentsChange(calendarAdjustments.filter((item) => item.date !== date))
  }

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <div
        className="modal-layer settings-modal"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div className="modal-card">
          <div className="modal-inner">
            <div className="modal-head">
              <div>
                <div className="modal-title">设置</div>
                <div className="modal-sub">所有配置只保存在本机 · 自动写入本地工作区</div>
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
                        {THEME_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={cn('theme-card', theme === option.id && 'active')}
                            onClick={() => onTheme(option.id)}
                            aria-pressed={theme === option.id}
                          >
                            <div className={`theme-preview ${option.id}`}>
                              <span className="tp-bar" />
                              <span className="tp-card" />
                              <span className="tp-dot" />
                            </div>
                            <div className="theme-name">
                              {option.name} <span>{theme === option.id ? '当前' : option.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">背景</div>
                      <div className="settings-range-row">
                        <div>
                          <div className="settings-label">背景模糊度</div>
                          <div className="settings-help">拖动立即预览，从轻磨砂到完全隔离桌面；最高值不透出后方文字。</div>
                        </div>
                        <BlurStrengthControl
                          value={preferences.blurStrength}
                          onCommit={(blurStrength) => updatePreferences({ blurStrength })}
                        />
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">启动</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">开机自动启动</div>
                          <div className="settings-help">提醒依赖 App 常驻菜单栏；关闭后仅在手动打开时提醒。</div>
                        </div>
                        <Toggle on={preferences.autoLaunch} onChange={(value) => updatePreferences({ autoLaunch: value })} />
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
                        <select
                          className="select"
                          style={{ width: 120 }}
                          value={preferences.defaultView}
                          onChange={(event) => updatePreferences({ defaultView: event.target.value as UserPreferences['defaultView'] })}
                        >
                          <option value="quarter">季度规划</option>
                          <option value="week">本周安排</option>
                          <option value="projects">全局项目</option>
                          <option value="stats">容量与复盘</option>
                          <option value="notes">临时笔记</option>
                          <option value="links">收藏链接</option>
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
                          <button type="button" onClick={() => updatePreferences({ bufferPercent: Math.max(0, preferences.bufferPercent - 5) })}>
                            <Minus size={11} />
                          </button>
                          <span>{preferences.bufferPercent}%</span>
                          <button type="button" onClick={() => updatePreferences({ bufferPercent: Math.min(40, preferences.bufferPercent + 5) })}>
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">请假 / 占用</div>
                      <div className="settings-help" style={{ margin: '0 0 4px 2px' }}>
                        每添加 1 天，会从所在季度和对应周的可用人日中扣减 1 人日；历史与未来季度都会重新计算。
                      </div>
                      {calendarAdjustments.length === 0 ? (
                        <div className="calendar-adjust-empty">还没有请假或占用记录</div>
                      ) : (
                        calendarAdjustments.map((item) => (
                          <div className="settings-row calendar-adjust-row" key={item.date}>
                            <div>
                              <div className="settings-label num">{item.date}</div>
                              <div className="settings-help">
                                {item.label ?? '请假'} · 扣减 {item.days} 人日
                              </div>
                            </div>
                            <button
                              type="button"
                              className="icon-btn sm"
                              title="删除这条请假记录"
                              aria-label={`删除 ${item.date} 的请假记录`}
                              onClick={() => removeCalendarAdjustment(item.date)}
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        ))
                      )}
                      <div className="calendar-adjust-form">
                        <input
                          className="input"
                          type="date"
                          value={leaveDate}
                          onChange={(event) => setLeaveDate(event.target.value)}
                          aria-label="请假日期"
                        />
                        <input
                          className="input"
                          value={leaveLabel}
                          onChange={(event) => setLeaveLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') addCalendarAdjustment()
                          }}
                          placeholder="说明，如年假 / 培训"
                          aria-label="请假说明"
                        />
                        <button type="button" className="btn sm" onClick={addCalendarAdjustment}>
                          <Plus size={11} /> 添加
                        </button>
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">日历数据</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">2026 官方节假日数据</div>
                          <div className="settings-help">已内置 2024–2026 节假日、调休和补班记录，按日期逐天计算。</div>
                        </div>
                        <span className="tag">已内置</span>
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
                          <div className="category-actions">
                            <span className="card-meta">{categoryUsage[category.id] ?? 0} 项使用</span>
                            {category.id.startsWith('cat-') ? (
                              <button
                                type="button"
                                className="icon-btn sm"
                                disabled={(categoryUsage[category.id] ?? 0) > 0}
                                title={
                                  (categoryUsage[category.id] ?? 0) > 0
                                    ? '仍有事项使用该分类，先移动后再删除'
                                    : '删除分类'
                                }
                                onClick={() => onDeleteCategory(category.id)}
                                aria-label={`删除分类 ${category.name}`}
                              >
                                <Trash size={13} />
                              </button>
                            ) : (
                              <span className="card-meta">内置</span>
                            )}
                          </div>
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
                              addCategoryFromInput()
                            }
                          }}
                          placeholder="例如：合规审计"
                          maxLength={12}
                        />
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={addCategoryFromInput}
                        >
                          <Plus size={12} />
                          添加
                        </button>
                      </div>
                      <div className="settings-help" style={{ padding: '6px 18px 2px' }}>
                        只删除自定义分类；仍被事项使用的分类需先移走。原型数据刷新后恢复默认。
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'sidebar' ? (
                  <>
                    <div className="settings-pane-title">侧边栏</div>
                    <div className="settings-pane-sub">
                      只自定义分组标题；导航项和顺序保持固定，避免改变工作路径。原型刷新会重置。
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">分组名称</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">第一组</div>
                          <div className="settings-help">季度规划 / 本周安排 / 项目</div>
                        </div>
                        <input
                          className="input sidebar-label-input"
                          value={sidebarLabels.plan}
                          maxLength={10}
                          onChange={(event) => onUpdateSidebarLabel('plan', event.target.value)}
                          onBlur={(event) => {
                            if (!event.target.value.trim()) onUpdateSidebarLabel('plan', '规划与推进')
                          }}
                          aria-label="侧边栏第一组名称"
                        />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">第二组</div>
                          <div className="settings-help">容量与复盘 / 临时笔记 / 收藏链接</div>
                        </div>
                        <input
                          className="input sidebar-label-input"
                          value={sidebarLabels.archive}
                          maxLength={10}
                          onChange={(event) => onUpdateSidebarLabel('archive', event.target.value)}
                          onBlur={(event) => {
                            if (!event.target.value.trim()) onUpdateSidebarLabel('archive', '其它')
                          }}
                          aria-label="侧边栏第二组名称"
                        />
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">恢复</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">恢复默认分组名</div>
                          <div className="settings-help">只重置名称，不改导航项。</div>
                        </div>
                        <button type="button" className="btn ghost sm" onClick={onResetSidebarLabels}>
                          恢复默认
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {tab === 'reminders' ? (
                  <>
                    <div className="settings-pane-title">提醒</div>
                    <div className="settings-pane-sub">新建任务或项目时可以选择自定义提醒；不指定则跟随这里的全局默认。系统通知按 24 小时制精确到分钟。</div>

                    <div className="settings-section">
                      <div className="settings-section-label">默认提醒规则</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">提前量</div>
                          <div className="settings-help">分类和事项可以单独覆盖。</div>
                        </div>
                        <select
                          className="select"
                          style={{ width: 130 }}
                          value={reminderDefaults.offsetDays}
                          onChange={(event) =>
                            onReminderDefaultsChange({
                              ...reminderDefaults,
                              offsetDays: Number(event.target.value),
                            })
                          }
                        >
                          <option value={0}>当天</option>
                          <option value={1}>提前 1 天</option>
                          <option value={2}>提前 2 天</option>
                          <option value={3}>提前 3 天</option>
                          <option value={7}>提前 1 周</option>
                        </select>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">提醒时刻</div>
                          <div className="settings-help">24 小时制（HH:mm） · 系统通知精确到分钟。</div>
                        </div>
                        <TimeSelect
                          value={reminderDefaults.time}
                          onChange={(time) => onReminderDefaultsChange({ ...reminderDefaults, time })}
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
                        <Toggle on={preferences.reminderPopup} onChange={(value) => updatePreferences({ reminderPopup: value })} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">macOS 系统通知</div>
                          <div className="settings-help">同时进入通知中心，作为记录与兜底。</div>
                        </div>
                        <Toggle on={preferences.nativeNotifications} onChange={(value) => updatePreferences({ nativeNotifications: value })} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">勿扰时段</div>
                          <div className="settings-help">22:30 – 08:30 之间暂停系统通知，应用内提醒仍保留。</div>
                        </div>
                        <Toggle on={preferences.dndEnabled} onChange={(value) => updatePreferences({ dndEnabled: value })} />
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
                        <input className="input" aria-label="AI Base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
                      </div>
                      <div className="field" style={{ marginTop: 9 }}>
                        <label>模型</label>
                        <select className="select" value={aiModel} onChange={(event) => onAiModelChange(event.target.value)}>
                          {MODEL_GROUPS.map((group) => (
                            <optgroup label={group.label} key={group.label}>
                              {group.models.map((item) => (
                                <option value={item} key={item}>
                                  {item}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="field" style={{ marginTop: 9 }}>
                        <label>API KEY</label>
                        <input
                          className="input"
                          aria-label="API Key"
                          type="password"
                          value={apiKey}
                          onChange={(event) => setApiKey(event.target.value)}
                          placeholder={aiConfig.hasKey ? '已保存，留空则不修改' : 'sk-...'}
                        />
                      </div>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-label">权限与隐私</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">发送给 AI 的上下文</div>
                          <div className="settings-help">摘要包含当前周期、季度任务、项目与本周事项的标题/状态/人日；笔记与链接默认不发送。</div>
                        </div>
                        <select
                          className="select"
                          style={{ width: 150 }}
                          value={preferences.aiScope}
                          onChange={(event) => updatePreferences({ aiScope: event.target.value as UserPreferences['aiScope'] })}
                        >
                          <option value="minimal">最小</option>
                          <option value="summary">摘要（推荐）</option>
                          <option value="all">全部</option>
                        </select>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">写入前确认</div>
                          <div className="settings-help">AI 创建/修改事项前展示预览卡，确认后才落库；AI 永远不能删除事项。</div>
                        </div>
                        <Toggle on={preferences.confirmAiWrites} onChange={(value) => updatePreferences({ confirmAiWrites: value })} />
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">连接测试</div>
                          <div className="settings-help">先保存配置，再发送一条最小请求验证 Base URL、模型与 Key。</div>
                        </div>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={aiSaving}
                          onClick={async () => {
                            setAiSaving(true)
                            setAiStatus('测试中…')
                            const result = await onAiTest()
                            setAiSaving(false)
                            setAiStatus(result.ok ? '连接成功' : `失败：${result.error ?? 'unknown'}`)
                          }}
                        >
                          测试连接
                        </button>
                      </div>
                      <div className="settings-ai-actions">
                        <button
                          type="button"
                          className="btn primary sm"
                          disabled={aiSaving}
                          onClick={async () => {
                            setAiSaving(true)
                            setAiStatus('保存中…')
                            const result = await onAiConfigSave({
                              baseUrl,
                              model: aiModel,
                              ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
                            })
                            setAiSaving(false)
                            setAiStatus(result.ok ? '已保存' : `失败：${result.error ?? 'unknown'}`)
                            if (result.ok) setApiKey('')
                          }}
                        >
                          保存配置
                        </button>
                        <span className={cn('settings-ai-status', aiStatus.startsWith('连接成功') || aiStatus === '已保存' ? 'ok' : '')}>
                          {aiStatus}
                        </span>
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
                        <button type="button" className="btn sm" onClick={onExportWorkspace}>
                          导出 JSON
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">导入工作区</div>
                          <div className="settings-help">从 JSON 恢复；导入前会自动备份当前工作区，旧版 schema 会自动迁移。</div>
                        </div>
                        <button type="button" className="btn sm" onClick={onImportWorkspace}>
                          导入 JSON
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

          </div>
        </div>
      </div>
    </>
  )
}
