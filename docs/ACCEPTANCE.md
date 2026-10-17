# Q-Panel v1.0.0 验收记录

验收日期：2026-10-18  
环境：macOS Apple Silicon，Electron 44.9.0，Playwright Electron，Chrome（原型回归）  
交付：`electron/release/Q-Panel-1.0.0-arm64.dmg`（ad-hoc 签名，arm64）

## 自动化结果

| 套件 | 命令 | 结果 |
| --- | --- | --- |
| 原型日历引擎 | `cd prototype && npm run test:calendar` | 5/5 |
| Electron 单元 | `cd electron && npm run test:unit` | 12/12 |
| Electron E2E | `cd electron && npm test` | 13/13 |
| 原型构建 | `cd prototype && npm run build` | 通过 |
| 原型 lint | `cd prototype && npm run lint` | 0 error（1 条既有 fast-refresh warning） |
| 原型交互回归 | `cd prototype && node scripts/interact.mjs` | 0 console error |
| 打包 | `cd electron && npm run pack` | 通过 |

## 功能验收

### 原生壳
- [x] 无模拟桌面，面板 1280×760 原生窗口；
- [x] 刘海折叠/展开、置顶、菜单栏托盘、`⌥ Space`；
- [x] 单实例、本地持久化、原子写、每日备份；
- [x] 四套皮肤热切换并持久化。

### 规划与容量
- [x] 2026 Q4：62 个工作日 / 60 人日可用；
- [x] 季度任务、周事项、项目本季排期、超载提示；
- [x] 年度/季度/月/周容量动态计算；
- [x] 请假/占用增删后实时重算；
- [x] 2027 官方日历未发布时标记为估算；
- [x] 真实当前日期与当前 ISO 周；
- [x] 期间切换、年度总览、统计页、⌘K。

### 项目 / 工具
- [x] 项目全局规划人日、工作项、安排周、本季度排期；
- [x] 工作项自动进入本周安排、完成状态同步；
- [x] 笔记、收藏链接、自定义集合/分类、搜索；
- [x] 链接标题/描述安全自动识别（SSRF 防护）。

### 提醒
- [x] 周事项/季度任务/项目提醒解析；
- [x] 到点 macOS 通知 + 应用内弹窗；
- [x] 启动补发错过的提醒并聚合；
- [x] 稍后 10 分钟持久化；
- [x] 完成写回；
- [x] 通知方式/勿扰偏好持久化。

### AI
- [x] OpenAI 兼容 Base URL / 模型 / API Key 配置；
- [x] Key 经 macOS 钥匙串 `safeStorage` 加密，渲染层无明文；
- [x] 连接测试；
- [x] 上下文摘要 / 最小 / 全部范围；
- [x] 生成事项 → 预览 → 确认写入；
- [x] 未配置 Key 时本地演示降级。

### 数据
- [x] 工作区 schema v1 → v2 自动迁移并备份；
- [x] 原生 JSON 导出/导入，导入前备份；
- [x] 偏好、主题、分类、日历调整、AI 配置（独立文件）持久化；
- [x] 导出文件不包含 API Key 明文。

## 已知边界

- DMG 为 ad-hoc 签名，未做 Developer ID 公证；安装步骤见 `SIGNING.md`；
- 2027 官方放假安排尚未发布，容量按周末规则估算并明确标记；
- AI 当前返回一次性 JSON 提案，未实现流式输出和项目/里程碑工具调用；不影响已验收的事项创建闭环；
- Windows、多端同步、账号体系、工作区加密仍为后续可选范围。
