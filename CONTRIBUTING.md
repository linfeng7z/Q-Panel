# Contributing to Q-Panel

感谢你愿意一起打磨 Q-Panel。

## Before opening an issue

- 搜索现有 issue / discussion，避免重复；
- 说明系统版本、Q-Panel 版本和复现步骤；
- 涉及数据、AI 配置或日志时，请先脱敏，不要粘贴 API Key、私人任务或本地路径。

## Pull requests

- 一个 PR 尽量只解决一个明确问题；
- 保持现有的本地优先、无账号、无遥测边界；
- 不引入会默认联网、上传数据或增加权限的依赖；
- UI 改动请附截图或 GIF，并说明亮/暗主题下的表现；
- 涉及容量、周排期、项目同步的改动，请在 PR 描述中写清楚口径变化。

## Development

```bash
cd prototype
npm install
npm run dev

# another terminal
cd ../electron
npm install
npm run dev
```

## Code of conduct

请保持尊重、具体、建设性的沟通。针对想法和代码，不针对人。
