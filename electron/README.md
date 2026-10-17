# Q-Panel · Electron P0

正式桌面版外壳。渲染层复用 `prototype/` 中已确认的 React UI，Electron 负责原生窗口、刘海折叠、菜单栏常驻、本地工作区存储和安全边界。

## 运行

```bash
cd electron
npm install
npm run build
npm start
```

开发模式（先启动 `prototype` 的 Vite）：

```bash
# terminal 1
cd prototype && npm run dev

# terminal 2
cd electron && npm run dev
```

## 当前能力

- **原生面板窗口**：1280×760，无边框、透明背景、圆角、整窗拖拽；
- **刘海折叠**：点收起或 `Escape` 收进屏幕顶部，点刘海展开；
- **菜单栏常驻**：Tray 显示/隐藏/退出，`⌘⇧Space` 全局切换；
- **本地工作区**：首次启动从示例数据初始化，之后原子写入 `workspace.json`；
- **真实日期/周期**：默认打开系统当前年/季度/ISO 周；E2E 可用 `Q_PANEL_NOW` 冻结时间；
- **动态周次**：ISO 周按 2025–2028 生成，项目工作项只展示项目周期内的安排周；
- **每日备份**：`backups/workspace-YYYY-MM-DD.json`，保留最近 14 天；
- **完整 UI**：四套皮肤、季度/周/项目/统计/笔记/链接/设置/AI 抽屉/⌘K 都能在原生壳内使用；
- **日历调整**：设置里可以新增/删除请假占用，季度、周、月容量按日历引擎实时重算，随工作区持久化；
- **提醒调度**：解析工作区里的周事项/季度任务/项目提醒，主进程定时器到点发 macOS 通知，同时把提醒条目推给渲染层弹窗；
- **提醒补发/稍后**：记录 `reminder-state.json`；启动时补发上次运行以来错过的提醒并聚合通知；稍后 10 分钟会重排并持久化；
- **链接元数据**：粘贴网址后主进程安全抓取 `<title>` / description，自动填进收藏卡片；阻止私网、凭据 URL 和危险重定向；
- **真实 AI**：设置里配置 OpenAI 兼容 Base URL / 模型 / API Key；Key 经 `safeStorage` 加密写入 `ai-config.json`，渲染层永远拿不到明文；AI 生成事项先预览再落库；
- **AI 降级**：没配置 Key 时保留本地演示提案，配置后自动切到真实模型；
- **提醒动作**：完成会写回任务/季度任务/项目状态；稍后入口保留；设置里的「测试」可走完整 IPC 链路；
- **安全默认**：`contextIsolation` + `sandbox` + `nodeIntegration: false`，preload 只暴露工作区、窗口和刘海白名单；外部 http(s) 链接交给系统浏览器。

数据目录默认是 `~/Library/Application Support/Q-Panel/`。测试可用 `Q_PANEL_USER_DATA` 指向临时目录；测试模式不会碰到真实工作区。

## 测试

```bash
npm test
```

测试分两层（当前 Electron E2E 10/10）：

- `npm run test:unit`：提醒规则解析、错过/稍后调度、旧 schema 迁移、导入导出文件校验、链接元数据解析与 SSRF 防护、AI 输出解析与 OpenAI 兼容调用；
- `npm test`：先跑单测，再跑 Playwright Electron E2E。

Electron E2E 覆盖：

- 原生面板启动，模拟桌面/MenuBar 不存在；
- App 标题、Hydration、自动保存；
- 新增收藏链接 → 关闭 → 重启后仍然存在；
- `Escape` 收起 → 刘海窗口出现 → 点击刘海重新展开；
- 六页面导航、四皮肤、⌘K；
- 新建周事项、项目详情、设置、笔记；
- 原生提醒 IPC → 应用内提醒弹窗 → 稍后 10 分钟写入 reminder-state；
- 本地 HTML fixture → 原生元数据桥 → 收藏标题/描述自动填充；
- 本地 OpenAI 兼容 fixture → 保存加密 Key → 测试连接 → AI 生成提案 → 确认写入。
- 原生导出 JSON → 新工作区导入恢复；
- schema v1 旧工作区加载后自动迁移到 v2；
- 新增/删除请假 → Q4 可用人日 60 → 59 → 60 实时重算；
- 默认打开实际当前季度/周，测试通过 `Q_PANEL_NOW` 固定。

## 打包

```bash
npm run pack
```

产物：

```text
release/Q-Panel-1.0.0-arm64.dmg
release/mac-arm64/Q-Panel.app
```

当前为 ad-hoc 签名构建，供本机安装测试；Developer ID 签名/公证步骤见 `docs/SIGNING.md`。

## 目录

```text
electron/
├── main.mjs           # 窗口、刘海、托盘、IPC
├── preload.cjs        # contextBridge 白名单
├── lib/store.mjs      # 原子存储 / 每日备份
├── assets/            # App 图标、Tray template icon
├── test/              # Playwright Electron E2E
└── release/           # npm run pack 产物（gitignored）
```

## 下一阶段

交付目标已达到：真实日历/容量、提醒、项目排期、工具页、真实 AI、工作区迁移/导入导出和全功能测试均已完成；当前为 ad-hoc 签名，Developer ID 可升级公证。
