# 浏览器插件发布指南

## 一、发布前准备

### 1. 图标文件

在 `public/` 目录创建：

```
public/
  icon-16.png    (16x16)
  icon-48.png    (48x48)
  icon-96.png    (96x96)
  icon-128.png   (128x128)
```

更新 `wxt.config.ts` 添加 icons 配置：

```typescript
export default defineConfig({
  manifest: {
    // ...现有配置
    icons: {
      16: '/icon-16.png',
      48: '/icon-48.png',
      96: '/icon-96.png',
      128: '/icon-128.png',
    },
  },
});
```

### 2. 商店素材

| 素材 | 尺寸 | Chrome | Edge | Firefox |
|------|------|--------|------|---------|
| 截图 | 1280x800 px | 必须(1-5张) | 必须(1-6张) | 推荐 |
| 小宣传图 | 440x280 px | 强烈推荐 | 推荐 | 不需要 |
| 商店图标 | 300x300 px | 不需要 | 必须 | 不需要 |

---

## 二、三个平台注册开发者账号

| | Chrome Web Store | Edge Add-ons | Firefox AMO |
|---|---|---|---|
| **费用** | 一次性 $5 | 免费 | 免费 |
| **需要** | Google 账号 | Microsoft 账号 | Mozilla 账号 |
| **注册地址** | https://chrome.google.com/webstore/devconsole | https://partner.microsoft.com/dashboard/microsoftedge/public/login | https://addons.mozilla.org/en-US/developers/ |
| **审核周期** | 1-7 天 | 最长 7 个工作日 | 几天到两周 |

建议注册顺序：Firefox (免费) → Edge (免费) → Chrome ($5)

---

## 三、手动首次发布（每个平台第一次必须手动）

### Chrome Web Store

```bash
npx wxt zip
# 产出: .output/x-simplify-{version}-chrome.zip
```

1. 打开 Chrome 开发者面板 → "New Item" → 上传 zip
2. 填写描述、截图、分类 → 提交审核

### Edge Add-ons

```bash
npx wxt zip -b edge
# Edge 和 Chrome 都是 Chromium，也可直接用 chrome 的 zip
```

1. 打开 Partner Center → "Create new extension" → 上传 zip
2. 填写信息并提交

### Firefox AMO

```bash
npx wxt zip -b firefox
# 产出: 插件 zip + 源码 zip（Firefox 要求提交源码，WXT 自动生成）
```

1. 打开 AMO 开发者中心 → "Submit a New Add-on" → 上传插件 zip
2. 上传源码 zip → 填写信息并提交

---

## 四、自动化发布 — GitHub Actions

WXT 内置 `wxt submit` 命令，支持一键发布到三个平台。

### 第 1 步：获取各平台 API 凭据

**Chrome（4 个 secret）：**

1. 去 Google Cloud Console (https://console.cloud.google.com/) 创建项目
2. 启用 "Chrome Web Store API"
3. 配置 OAuth 同意屏幕 → 创建 OAuth 2.0 凭据（桌面应用类型）
4. 通过 OAuth Playground 获取 refresh token
5. 需要：`CHROME_EXTENSION_ID`、`CHROME_CLIENT_ID`、`CHROME_CLIENT_SECRET`、`CHROME_REFRESH_TOKEN`

**Firefox（3 个 secret）：**

1. 去 AMO API Keys (https://addons.mozilla.org/en-US/developers/addon/api/key/) 生成凭据
2. 需要：`FIREFOX_EXTENSION_ID`、`FIREFOX_JWT_ISSUER`、`FIREFOX_JWT_SECRET`

**Edge（4 个 secret）：**

1. 去 Partner Center → Publish API → 创建 API 凭据
2. 注意：API key 72 天过期，需定期更新
3. 需要：`EDGE_PRODUCT_ID`、`EDGE_CLIENT_ID`、`EDGE_CLIENT_SECRET`、`EDGE_ACCESS_TOKEN_URL`

### 第 2 步：添加 GitHub Secrets

仓库 Settings → Secrets and variables → Actions，把上面 11 个值全部添加。

### 第 3 步：创建 workflow 文件

创建 `.github/workflows/release.yml`：

```yaml
name: Release Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm install

      - run: npx wxt zip
      - run: npx wxt zip -b firefox

      - run: >
          npx wxt submit
          --chrome-zip .output/*-chrome.zip
          --firefox-zip .output/*-firefox.zip
          --firefox-sources-zip .output/*-sources.zip
          --edge-zip .output/*-chrome.zip
        env:
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
          CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
          CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
          FIREFOX_EXTENSION_ID: ${{ secrets.FIREFOX_EXTENSION_ID }}
          FIREFOX_JWT_ISSUER: ${{ secrets.FIREFOX_JWT_ISSUER }}
          FIREFOX_JWT_SECRET: ${{ secrets.FIREFOX_JWT_SECRET }}
          EDGE_PRODUCT_ID: ${{ secrets.EDGE_PRODUCT_ID }}
          EDGE_CLIENT_ID: ${{ secrets.EDGE_CLIENT_ID }}
          EDGE_CLIENT_SECRET: ${{ secrets.EDGE_CLIENT_SECRET }}
          EDGE_ACCESS_TOKEN_URL: ${{ secrets.EDGE_ACCESS_TOKEN_URL }}
```

### 第 4 步：发版流程

```bash
# 1. 更新 wxt.config.ts 中的 version
# 2. commit & push
# 3. 打 tag 触发自动发布
git tag v0.2.0
git push --tags
```

---

## 五、推荐行动顺序

1. 制作图标（可以用简单的 "XS" 字母图标）
2. 准备截图（裁剪到 1280x800）
3. 注册三个平台账号
4. 手动首次发布到各平台（拿到 extension ID）
5. 配置 GitHub Secrets（用拿到的 ID + API 凭据）
6. 创建 release workflow（之后每次打 tag 自动发布）
