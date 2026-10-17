# Q-Panel · 可点击 UI 原型

Q-Panel 是给应用安全负责人自用的「季度作战工作台」：季度任务 → 周计划 → 长期项目里程碑，容量、提醒和 AI 串成一条闭环。

**当前阶段：v0.2 可点击 UI 原型（假数据，未接 Electron / 真实存储 / 模型）。**

## 立即体验

开发服务器已启动：

### http://127.0.0.1:5178/

建议浏览器 `⌃⌘F` 全屏，获得最接近 Mac 刘海面板的体验。

如果服务器停了：

```bash
cd prototype
npm install
npm run dev
```

## 主工作台只有三项

- **首页**：Q4 季度任务 + 容量 + 分类分配 + 本季度日历；
- **周计划**：周切换、7 天日期条、项目自动排期、本周必做、关联季度任务/项目；
- **项目**：项目卡片 → 项目工作规划（总工时 / 工作项 / 周排期 / 里程碑）。

统计、随笔记、链接收藏移到了 **顶栏「工具」菜单**，不再占侧边栏。

## 重点可点

| 操作 | 效果 |
| --- | --- |
| 点击顶部黑色刘海 / 点桌面空白 / `Esc` | 展开、收起面板 |
| 右上角 `◐` 图标 | 切换 Noir / Ops 两套皮肤 |
| 周计划 → 上一周 / 下一周 / 回到本周 | 切周；W43 会显示请假后的容量和 -8h 超载 |
| 项目 → 等保 2.0 整改 | 进入工作规划；编辑总工时、工作项工时、安排周 |
| 工作项改「安排周」 | 自动同步到对应周的「项目自动排期」，计入已排工时 |
| 工作项右侧箭头 | 跳到对应周计划，直接看自动排期 |
| 季度页 → 统计 | 打开统计与容量页 |
| 顶栏 `工具`（四宫格） | 统计与容量 / 随笔记 / 链接收藏 |
| ⌘K | 全局跳转：页面、季度、项目、未完成事项 |
| ⌘J / 右上角 AI | AI 抽屉；生成提案后确认写入 |
| 右上角铃铛 | 顶部提醒弹窗：完成 / 稍后 / 打开 |
| 年度总览 / 2027 Q1 | 年度四季度卡片 / 官方日历未发布提示 |

提醒弹窗会在打开页面约 5 秒后自动出现一次（演示用）。不想被它打断用 `?noreminder=1`。

## 直接链接

```text
/?view=quarter&theme=noir&noreminder=1     # 首页 · Noir
/?view=quarter&theme=ops&noreminder=1      # 首页 · Ops
/?view=week&theme=noir&noreminder=1        # 周计划
/?view=projects&theme=noir&noreminder=1    # 项目
/?view=stats&theme=noir&noreminder=1       # 统计（工具）
/?view=notes&theme=noir&noreminder=1       # 笔记（工具）
/?view=links&theme=noir&noreminder=1       # 链接（工具）
/?view=quarter&ai=1&noreminder=1           # AI 抽屉
/?view=quarter&settings=1&noreminder=1     # 设置
/?view=quarter&reminder=1                  # 提醒弹窗
/?collapsed=1&noreminder=1                 # 收起后的刘海态
```

## 项目规划模型

```text
Project
├─ plannedHours        项目总规划工时（可直接编辑）
├─ workItems[]         工作项
│   ├─ title
│   ├─ plannedHours    该工作项规划工时
│   ├─ weekKey         安排周 → 自动进入该周周计划
│   └─ status          todo / done
└─ milestones[]        里程碑（项目进度 = 已完成里程碑 / 总里程碑）
```

周页的「项目自动排期」按 `weekKey` 自动聚合，不需要手动搬事项；勾选完成会同步回项目工作项。

## 数据口径

- 时间冻结在 **2026-10-17（周六）19:22**；
- 2026 Q4：**62 个工作日 × 8h − 16h 年假 = 480h 可用**；已分配 384h（80%），剩余 96h；
- 2026 全年：**248 个工作日 / 1984h**；扣请假后 1968h；
- 2026 官方日历：10/1–10/7 国庆假、10/10 调休上班、10/20–10/21 年假；
- 2027 年数据未发布，明确显示“按周末规则估算 + 待更新”。

## 验证

```bash
npm run build      # TypeScript + Vite 构建
npm run lint       # 0 errors
npm run shot       # 12 张页面截图
npm run interact   # 关键交互回归（含项目编辑→周计划自动同步）
```

`scripts/interact.mjs` 会输出每一步 OK/FAIL 并检查 console error；当前全部通过。

## 下一步

1. 确认首页/周/项目三页的密度和默认展开页；
2. 确认项目“总规划工时 + 工作项 + 自动排期”的模型；
3. 确认周页自动排期和超载提示；
4. 进入 Electron P0：真实刘海窗口、菜单栏常驻、工作区存储、系统通知。

完整方案见 [../docs/PRODUCT-PLAN.md](../docs/PRODUCT-PLAN.md)。
