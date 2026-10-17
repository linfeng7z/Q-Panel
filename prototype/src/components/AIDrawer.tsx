import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Check,
  PaperPlaneTilt,
  Sparkle,
  X,
} from '@phosphor-icons/react'
import type { AiProposalTask, CategoryId } from '../types'
import { getCategory } from '../data/mock'
import { fmtDue } from '../utils'
import { catStyle } from './ui'

interface AIDrawerProps {
  onClose: () => void
  onCreateTasks: (tasks: AiProposalTask[]) => void
  onToast: (message: string) => void
}

interface Message {
  id: string
  role: 'bot' | 'user'
  text: string
  proposal?: {
    title: string
    tasks: AiProposalTask[]
  }
  consumed?: boolean
}

const SUGGESTS = [
  '把 Q4 应用安全任务拆成本周 3 件事',
  '汇总本周进展，生成周报',
  '新建长期项目：AI 安全治理',
]

function newId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function proposalTask(
  title: string,
  categoryId: CategoryId,
  dueDate: string,
  dueTime: string | undefined,
  estimateDays: number,
  objectiveId: string,
  projectId: string,
): AiProposalTask {
  return { title, categoryId, dueDate, dueTime: dueTime ?? '18:00', estimateDays, objectiveId, projectId }
}

export function AIDrawer({ onClose, onCreateTasks, onToast }: AIDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'hello',
      role: 'bot',
      text:
        '晚上好，Huihui。我可以帮你把季度任务拆成本周事项、创建长期项目、调整提醒。\n所有写入都会先给你预览，你确认后才会落库。',
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, thinking])

  const pushBot = (message: Omit<Message, 'id' | 'role'>) => {
    const id = newId()
    setMessages((value) => [...value, { id, role: 'bot', ...message }])
    return id
  }

  const send = (raw: string) => {
    const text = raw.trim()
    if (!text || thinking) return
    setMessages((value) => [...value, { id: newId(), role: 'user', text }])
    setInput('')
    setThinking(true)

    window.setTimeout(() => {
      setThinking(false)
      if (text.includes('拆') || text.includes('本周')) {
        const id = newId()
        setMessages((value) => [
          ...value,
          {
            id,
            role: 'bot',
            text:
              '我建议把「等保 2.0 差距分析闭环」拆成 3 条本周事项，都关联到项目「等保 2.0 整改」，并设置提前 2 天提醒。确认后我会写入第 42 周。',
            proposal: {
              title: '变更提案 · 创建 3 条周事项',
              tasks: [
                proposalTask('输出等保差距分析初稿', 'appsec', '2026-10-17', '23:30', 0.75, 'o1', 'p1'),
                proposalTask('对齐 12 个系统负责人访谈', 'appsec', '2026-10-18', undefined, 0.5, 'o1', 'p1'),
                proposalTask('整理差距分析证据清单', 'appsec', '2026-10-18', undefined, 0.5, 'o1', 'p1'),
              ],
            },
          },
        ])
        return
      }
      if (text.includes('周报') || text.includes('汇总')) {
        pushBot({
          text:
            '本周（第 42 周）进展摘要：\n• 等保：系统边界梳理完成，差距分析初稿进行中\n• SOC：降噪规则 v2 已评审，等待灰度\n• 红蓝：攻击面初筛进行中\n• 风险：制度修订尚未启动，建议下周排入\n需要我把它整理成可直接发给领导的周报吗？',
        })
        return
      }
      if (text.includes('项目') || text.includes('治理')) {
        pushBot({
          text:
            '创建长期项目会走同一套确认流程：项目名、分类、目标日期，以及 3 个里程碑。\n原型阶段先演示事项创建；功能版里我会生成项目 + 里程碑的提案卡，你确认后一次性写入。',
        })
        return
      }
      pushBot({
        text:
          '收到。接入模型后，我会把你的话解析成事项/项目/里程碑，并附上字段预览。\n现在可以试试上面的快捷指令，或直接说「这周还差什么」。',
      })
    }, 900)
  }

  const confirmProposal = (message: Message) => {
    if (!message.proposal) return
    onCreateTasks(message.proposal.tasks)
    setMessages((value) =>
      value.map((item) =>
        item.id === message.id ? { ...item, consumed: true } : item,
      ),
    )
    pushBot({
      text: `已创建 ${message.proposal.tasks.length} 条本周必做，并关联到「等保 2.0 差距分析闭环」。提醒已按提前 2 天自动继承。`,
    })
    onToast(`AI 已创建 ${message.proposal.tasks.length} 条事项`)
  }

  const cancelProposal = (message: Message) => {
    setMessages((value) =>
      value.map((item) =>
        item.id === message.id ? { ...item, consumed: true } : item,
      ),
    )
    pushBot({ text: '已取消，没有写入任何内容。' })
  }

  return (
    <div className="ai-layer" onMouseDown={onClose}>
      <div className="ai-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ai-head">
          <div className="ai-title-row">
            <span className="ai-orb">
              <Sparkle size={15} weight="fill" />
            </span>
            <div>
              <div className="ai-title">Q-Panel AI</div>
              <div className="ai-model">
                <span className="status-dot" />
                OpenAI 兼容 · deepseek-chat
              </div>
            </div>
            <button type="button" className="ai-close" onClick={onClose} aria-label="关闭 AI">
              <X size={15} />
            </button>
          </div>
          <div className="ai-context">
            <span className="tag">2026 Q4</span>
            <span className="tag">第 42 周</span>
            <span className="tag">上下文：摘要</span>
          </div>
        </div>

        <div className="ai-body scroll" ref={bodyRef}>
          {messages.map((message) => (
            <div key={message.id} className={`ai-msg ${message.role}`}>
              {message.role === 'bot' ? (
                <span className="ai-msg-avatar">
                  <Sparkle size={11} weight="fill" />
                </span>
              ) : null}
              <div className="ai-bubble">
                <div style={{ whiteSpace: 'pre-line' }}>{message.text}</div>
                {message.proposal ? (
                  <div className="ai-proposal">
                    <div className="ai-proposal-head">
                      <Check size={11} /> {message.proposal.title}
                    </div>
                    <div className="ai-proposal-title">写入前预览</div>
                    <div className="ai-proposal-list">
                      {message.proposal.tasks.map((task, index) => (
                        <div className="ai-proposal-item" key={task.title} style={catStyle(task.categoryId)}>
                          <span className="num">{index + 1}</span>
                          <div>
                            <b>{task.title}</b>
                            <span>
                              {getCategory(task.categoryId).name} · {fmtDue(task.dueDate, task.dueTime)} ·{' '}
                              {task.estimateDays} 人日
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {message.consumed ? (
                      <div className="ai-foot">
                        <Check size={10} /> 已处理
                      </div>
                    ) : (
                      <div className="ai-proposal-actions">
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={() => confirmProposal(message)}
                        >
                          <span className="icon-circle">
                            <Check size={11} weight="bold" />
                          </span>
                          确认写入
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => cancelProposal(message)}
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {messages.length === 1 && !thinking ? (
            <div className="ai-suggests">
              {SUGGESTS.map((suggest) => (
                <button key={suggest} type="button" className="ai-suggest" onClick={() => send(suggest)}>
                  {suggest}
                </button>
              ))}
            </div>
          ) : null}

          {thinking ? (
            <div className="ai-msg bot">
              <span className="ai-msg-avatar">
                <Sparkle size={11} weight="fill" />
              </span>
              <div className="ai-bubble">
                <div className="ai-thinking">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="ai-input-wrap">
          <div className="ai-input-box">
            <textarea
              className="ai-input"
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send(input)
                }
              }}
              placeholder="让 AI 帮你建事项、拆解任务…"
            />
            <button
              type="button"
              className="ai-send"
              disabled={!input.trim() || thinking}
              onClick={() => send(input)}
              aria-label="发送"
            >
              {input.trim() ? <ArrowUp size={14} weight="bold" /> : <PaperPlaneTilt size={13} />}
            </button>
          </div>
          <div className="ai-foot">
            <Sparkle size={10} />
            写入需确认 · 不会删除任何事项 · 数据只发送当前周期摘要
          </div>
        </div>
      </div>
    </div>
  )
}
