# Q-Panel 签名与公证

当前 `release/Q-Panel-1.1.17-arm64.dmg` 使用 **ad-hoc 签名**（`identity: null`），供本机与内部测试安装。

## Ad-hoc 安装

1. 打开 DMG；
2. 将 Q-Panel 拖入「应用程序」；
3. 首次启动如被 Gatekeeper 拦截，右键 → 打开，或执行：

```bash
xattr -dr com.apple.quarantine /Applications/Q-Panel.app
```

## 升级为 Developer ID 签名

需要 Apple Developer Program 账号和 Developer ID Application 证书。

1. 在钥匙串中安装 `Developer ID Application: ...` 证书；
2. 修改 `electron/package.json` 的 `build.mac`：

```json
"identity": "Developer ID Application: Your Name (TEAMID)",
"hardenedRuntime": true,
"gatekeeperAssess": false
```

3. 设置公证凭据（推荐 App Store Connect API Key）：

```bash
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID"
```

4. 重新打包并公证：

```bash
cd electron
npm run pack
npx electron-builder --mac dmg notarize
```

5. 验证：

```bash
spctl --assess --type execute --verbose=4 release/mac-arm64/Q-Panel.app
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Q-Panel.app
xcrun stapler validate release/Q-Panel-1.1.17-arm64.dmg
```

> 未配置证书时不要开启 hardened runtime 或自动公证，否则构建会失败；当前 ad-hoc 配置是自洽的。
