# Q-Panel · 可点击 UI 原型

Q-Panel 是给应用安全负责人自用的「季度作战工作台」：年/Q 主线 → 周必做 → 长期项目里程碑，容量、提醒和 AI 串成一条闭环。

**当前阶段：v0.1 可点击 UI 原型（假数据，未接 Electron / 真实存储 / 模型）。**

## 立即体验

开发服务器已启动：

### http://127.0.0.1:5178/

建议在浏览器里按 `⌃⌘F` 全屏，获得最接近 Mac 刘海面板的体验。

如果服务器已停止：

```bash
cd prototype
npm install
npm run dev
```

## 原型里可以点什么

| 操作 | 效果 |
| --- | --- |
| 点击顶部黑色刘海 / 点桌面空白 / `Esc` | 展开、收起面板；收起态可看刘海形态 |
| 右上角 `◐` 图标 | 实时切换 **Noir** / **Ops** 两套皮肤 |
| 顶栏 `2026 Q4` | 打开期间跳转面板：年份 + Q1-Q4 容量卡片 |
| 侧栏 | 今日 / 季度 / 周 / 项目 / 统计 / 笔记 / 链接 |
| ⌘K | 全局跳转：页面、季度、项目、未完成事项 |
| ⌘J / 右上角 AI | AI 助手抽屉；点快捷指令生成提案，确认后写入本周 |
| 右上角铃铛 | 顶部提醒弹窗：完成 / 稍后 / 打开 |
| 季度页 → 年度总览 | Q1-Q4 四张容量卡片，点击跳转 |
| 季度页 → 2027 Q1 | 展示“2027 官方放假安排未发布 / 按周末估算”的产品提示 |
| 周页 → 新建事项 | 新建表单 → 本周列表立即出现 |
| 笔记 / 链接 | 笔记可编辑 + Markdown 预览；链接可搜索、筛选、添加 |

提醒弹窗会在打开页面约 5 秒后自动出现一次（演示用）。如果不想被它打断，使用 `?noreminder=1`。

## 直接链接（适合截图 / 演示）

```
/?view=quarter&theme=noir&noreminder=1     # 季度 · Noir
/?view=quarter&theme=ops&noreminder=1      # 季度 · Ops
/?view=week&theme=noir&noreminder=1        # 周
/?view=today&theme=noir&noreminder=1       # 今日
/?view=projects&theme=noir&noreminder=1    # 项目
/?view=stats&theme=noir&noreminder=1       # 统计
/?view=notes&theme=noir&noreminder=1       # 笔记
/?view=links&theme=noir&noreminder=1       # 链接
/?view=quarter&ai=1&noreminder=1           # AI 抽屉
/?view=quarter&settings=1&noreminder=1     # 设置
/?view=quarter&reminder=1                  # 提醒弹窗
/?collapsed=1&noreminder=1                 # 收起后的刘海态
```

## 原型里的数据口径

- 时间冻结在 **2026-10-17（周六）19:22**，方便演示“休息日 + 逾期 + 本周剩余”。
- 2026 Q4：**62 个工作日 × 8h − 16h 年假 = 480h 可用**；已分配 384h（80%），剩余 96h。
- 2026 全年：**248 个工作日 / 1984h**；扣请假后 1968h。
- 官方日历：10/1–10/7 国庆假、10/10 调休上班、10/20–10/21 年假；数据来自 2026 国务院公告。
- 2027 年数据尚未发布，原型明确显示“按周末规则估算 + 待更新”，不编造节假日。

## 目录

```text
q-panel/
├── prototype/        # 当前可点击原型（React 19 + TS + Vite）
│   ├── src/
│   │   ├── styles/   # tokens / shell / components / views
│   │   ├── components/
│   │   ├── views/
│   │   └── data/mock.ts
│   ├── scripts/      # Playwright 截图 / 交互回归
│   └── screenshots/  # 截图产物（不提交 git）
├── docs/
│   └── PRODUCT-PLAN.md
└── README.md
```

## 验证

```bash
cd prototype
npm run build      # TypeScript + Vite 构建
npm run shot       # 12 张静态页面截图
npm run interact   # 22 步点击回归（期间跳转/年度总览/AI 写入/提醒/皮肤/⌘K/收起）
```

`scripts/interact.mjs` 会输出每一步 OK/FAIL，并检查 console error；当前全部通过。

## 下一步（等你确认视觉方向）

1. 确认 Noir / Ops 两套皮肤、信息密度、默认展开页；
2. 确认今日/周/项目页的取舍与优先级；
3. 进入 Electron P0：真实刘海窗口、菜单栏常驻、工作区存储、系统通知；
4. 再按 P1–P5 接真实数据、提醒调度、AI 与打包。

完整的原产品/技术方案见 [docs/PRODUCT-PLAN.md](../docs/PRODUCT-PLAN.md)。
