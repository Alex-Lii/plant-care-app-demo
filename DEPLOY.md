# 植语 · 部署与上架指南

从源码到 APK / AAB 再到应用商店的完整流程。分四步：后端 → 前端 → 原生壳 → 商店。

---

## 0. 架构总览

```
┌────────────────────────────────────────────────────────────────────┐
│ 用户设备                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Capacitor WebView (https://localhost)                        │  │
│  │                                                              │  │
│  │  前端 bundle  ──→  fetch('/api/cvh/...') ──┐                 │  │
│  │                     fetch('/api/iplant/...') ─┤               │  │
│  │                     fetch('https://zh.wikipedia.org/...')    │  │
│  └─────────────────────────────────────────────┼────────────────┘  │
└────────────────────────────────────────────────┼───────────────────┘
                                                 │ HTTPS
                                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│ 公网后端（Node 18+）                                              │
│  server/index.mjs                                                │
│  ├─ /api/cvh/*  → https://www.cvh.ac.cn/*  （补 Referer）        │
│  ├─ /api/iplant/* → https://www.iplant.cn/*  （补 Referer）      │
│  ├─ 所有响应带 Access-Control-Allow-Origin: *                     │
│  └─ 静态托管 dist/ （SPA fallback）                               │
│                                                                  │
│  端口：process.env.PORT ?? 8787                                  │
│  依赖：零（仅 node:http + node:fs + fetch）                      │
└────────────────────────────────────────────────────────────────────┘
```

**为什么必须有后端**：
- `cvh.ac.cn` 和 `iplant.cn` 的接口缺 Referer 会拒绝请求 / 返回空
- CVH 的 CORS 响应头是非法值 `www.cvh.ac.cn`，浏览器无法直连
- Capacitor WebView 跑在 `https://localhost`，目标服务器不给 CORS 就会被拦截

**VITE_API_BASE**：前端构建时注入的 API 基址。开发环境走 Vite 内置 proxy（`/api/*` 转发到上游），生产环境必须指向你自己的后端完整 URL。

---

## 1. 部署后端（拿到公网 HTTPS URL）

后端是一个 170 行左右零依赖的 Node 18+ 脚本。选一种方式：

### 方案 A · Render（最简单，免费额度足够）

```bash
cd plant-care-app
pushd server && git init && git add . && git commit -m "initial" && popd
# 在 Render 创建新 Web Service：Branch = main，Root Dir = server
# Build Command: 留空（无依赖）
# Start Command: node index.mjs
# Health Check Path: /privacy.html
```

Render 会给你一个 HTTPS URL，形如 `https://plant-care-server.onrender.com`。记下它。

### 方案 B · Vercel（需适配静态导出）

server/index.mjs 是 Node http 服务器，Vercel Serverless Functions 需要改成 `.vercel.json` 或者直接用方案 A / C。若坚持 Vercel，可把 server 改成 Express 再部署，不改代码建议选 A。

### 方案 C · 自托管（阿里云 / 腾讯云 + Docker）

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/index.mjs ./
COPY dist/ ./public
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.mjs"]
```

```bash
# 构建前端
npm run build
# 构建镜像
docker build -t plant-care .
# 运行（Nginx / Traefik 挂 443 + Let's Encrypt）
docker run -d --name plant-care -p 8787:8080 plant-care
```

### 验证后端

拿到 URL 后立刻测三个端点：

```bash
# 1. 首页（SPA fallback）
curl https://<你的后端>/ | head -c 200

# 2. CVH 代理（查香樟树的分布）
curl -s 'https://<你的后端>/api/cvh/taxon/spname?spname=Cinnamomum%20camphora' \
  | head -c 300

# 3. iplant 代理（搜"樟树"）
curl -s 'https://<你的后端>/api/iplant/ashx/searchautocomplete.ashx?query=%E6%A8%B9%E6%A0%91' \
  | head -c 300
```

三个都能返回内容 = 后端部署成功。**任何一个返回 `{"message":"access denied"}` 或空数组 → Referer 没补上，检查 proxyCvh / proxyIplant 函数。**

---

## 2. 前端构建

### 写环境变量

创建 `.env.production`（**不要**提交到 git，已被 `.gitignore` 排除）：

```bash
VITE_API_BASE=https://<你的后端>/api
```

不写 `.env.production` 也能构建，默认 `/api`。但打包后的 App 跑在 Capacitor 里 `/api` 会变成 `https://localhost/api`，请求永远失败。**必须填。**

### 构建

```bash
npm run build
```

产物在 `dist/`，包含：
- `index.html`（SPA 入口）
- `assets/index-*.js`（主 bundle，400+ KB）
- `privacy.html`（隐私政策页面，应用内可打开）
- `favicon.svg`

### 验证构建结果

```bash
# 本地跑一下看是不是对的
npm run server          # 用 dist/ 静态托管
curl -s http://localhost:8787/ | head -c 200
curl -s http://localhost:8787/api/iplant/ashx/searchautocomplete.ashx?query=%E6%A8%B9 \
  | head -c 200         # 应该是 JSON
```

---

## 3. 原生壳同步 + APK 打包

### 同步（把 dist/ 拷进 Android 工程）

```bash
# 首次（之前已跑过，会失败可以忽略）
# npx cap add android

# 每次改了前端代码后
npm run build                  # 先构建前端
npx cap sync android           # 把 dist/ 拷进 android/app/src/main/assets/public/
```

### APK（调试版，直接装真机测试）

```bash
cd android
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
# 装手机：adb install -r app/build/outputs/apk/debug/app-debug.apk
# 或者用 Android Studio：打开 android/ 目录 → Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### AAB（发布版，上 Play Store 用）

Play Store 现在要求 AAB（App Bundle），不接受 APK：

**方式一 · Android Studio（推荐）**

1. 打开 `android/` 目录
2. 菜单 Build → Generate Signed Bundle / APK
3. 选 Android App Bundle
4. **第一次**点 Create new keystore：
   - Key store path：`android/release-key.jks`（别丢了，上架后更新还要用）
   - Key alias：`release`
   - Key password：自己想一个强密码
5. Build Type = Release
6. Finish → 产物在 `android/app/build/outputs/bundle/release/app-release.aab`

**方式二 · 命令行**

先在 `android/app/` 下建 `build.gradle` 的 signingConfig（或者手动传参），然后：

```bash
cd android
./gradlew bundleRelease
# 产物：android/app/build/outputs/bundle/release/app-release.aab
```

### 打包前必测清单

调试版装到真机上，按顺序点一遍：

- [ ] 首页正常打开，启动页不卡住
- [ ] 点「使用当前位置」→ 授权成功 → 显示省排行
- [ ] 点搜索框 → 输入「樟」→ 本地结果 + 联网结果都能出来
- [ ] 点任意植物 → 详情面板正常打开（六格参数 / 暂无资料提示）
- [ ] 点收藏心形 → 确认条正常
- [ ] 切到「我的花园」→ 收藏列表对得上
- [ ] 切到「我的」→ 数据来源里的外链能打开
- [ ] 断网测试：未授权定位时，离线 20 种植物能正常浏览和收藏

任何一项挂了都别上架，先修。

---

## 4. Google Play 上架

### Play Console 账号

1. 去 [https://play.google.com/console](https://play.google.com/console) 注册开发者账号
2. 一次性付 25 美元注册费
3. 等审核通过（1–3 天）

### 创建应用

1. 创建应用 → 填应用名「植语」→ 默认语言中文
2. 选免费还是付费（本 App 免费）
3. 进入应用，左侧菜单依次填：

#### 应用详情（App content）

| 字段 | 值 |
|---|---|
| 应用名 | 植语 |
| 简短描述（≤80 字） | 手机端植物养护助手 · 离线图鉴 · 联网百科 |
| 完整描述（≤4000 字） | 自由填写，建议：功能特点 + 使用场景 + 数据来源说明 |
| 应用分类 | 生活方式 / 工具 |
| 标签 | plant, gardening, 植物 |
| 隐私政策 URL | `https://<你的后端>/privacy.html`（或直接把 `public/privacy.html` 托管到任意 HTTPS 静态站）|
| 联系邮箱 | 留一个能收到审核回复的邮箱 |

#### 应用隐私声明（Privacy）

选 **是** 收集以下数据：
- **精确位置**（GPS 坐标）→ 但要说明「仅在用户主动点击定位时申请权限」
- **粗略位置**（IP 定位）→ 同上，且仅限未授权 GPS 时的兜底
- 存储（localStorage）→ 收藏列表、最近浏览、定位结果

选 **否**：
- 账号 / 登录
- 崩溃日志 / 性能数据（本 App 没上任何分析 SDK）
- 广告追踪

#### 安全数据（Data safety）

- App 收集精确/粗略位置 → 用于反查省/市 → **不与第三方共享**，反查完即丢弃坐标
- App 存储收藏 / 浏览 / 定位 → 仅在设备本地，**不上传服务器**
- 不收集用户身份信息

#### 权限（Permissions）

只声明了两个定位权限：`ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`。不需要声明存储权限（localStorage 不触发）。

#### 图形资源

| 资源 | 尺寸 | 来源 |
|---|---|---|
| 应用图标 | 512×512 PNG | `store/icon-512.png` |
| 大图 / 功能图 | 至少 1 张 1024×500 或 512×256 | 可从 UI 设计稿裁剪 |
| 手机截图 | 至少 3 张 1080×1920 | 真机截图：首页 + 植物百科 + 详情 |
| 平板截图 | 可选 | 先跳过 |

#### 商店列表

- 免费 / 付费：免费
- 定价模板：全部国家免费

#### 内容分级（Content rating）

答问卷，App 内容：0 暴力、0 血腥、0 性内容、0 恐怖 → 评级 3+。

#### 发布（Production）

1. 上传刚才打的 `app-release.aab`
2. 审核自动扫权限 → 如果它觉得你"声明了位置但没说明为什么收集"，**用反查省/市作为理由**（定位展示本省植物排行）
3. 等审核通过（通常 2–7 天）

---

## 5. 常见坑

| 坑 | 现象 | 解法 |
|---|---|---|
| **不写 `.env.production`** | 联网搜索全空，控制台 404 | 后端 URL 填进 `.env.production` 再构建 |
| **iplant.cn / cvh.ac.cn 返回空或 `access denied`** | 接口有 CORS 或 Referer 校验 | 必须走后端代理，不能前端直连，代理要补 Referer 头 |
| **App 内打开 iplant.cn 白屏** | CSP `frame-ancestors` 禁止 | iplant.cn 用 `window.open` 外部打开，别用 InAppBrowser iframe |
| **Capacitor 里 fetch 报 CORS** | 控制台看到 CORS error | 后端要加 `Access-Control-Allow-Origin: *`（server/index.mjs 已加） |
| **Android 8+ 自适应图标显示默认白色** | 启动器图标是一张白板 | `android/app/src/main/res/drawable/ic_launcher_background.png` 要换成你生成的 cream 纸感底 |
| **审核被拒：定位权限用途不明** | Google Play 拒绝上传 | 在隐私政策里明确写"仅用于展示所在省份的常见植物排行" |
| **旧 App 卸载后重装数据没清** | 用户看到了收藏残留 | 这是 Android backup 机制，给 Manifest 加 `android:allowBackup="false"` 或自定义 backup rules |
| **上架后更新版本号被拒** | aab 版本号没涨 | `android/app/build.gradle` 里 versionCode 每次更新要 ++ |

---

## 6. 快速命令参考

```bash
# 全流程：后端部署 + 前端构建 + 同步 + APK
# 1. 后端部署（拿到 URL）→ 假设 https://pc.onrender.com/api
echo 'VITE_API_BASE=https://pc.onrender.com/api' > .env.production
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # 调试 APK
# 或 Android Studio Generate Signed Bundle → AAB

# 重新生成图标（换了 assets.jpg 后）
python3 scripts/build-icons.py
# 然后重新 sync
npx cap sync android

# 本地联调（前后端同机器）
npm run server &
npm run dev    # vite 用代理转发 /api/*，不走 Capacitor
```

---

## 7. 目录结构速查

```
plant-care-app/
├── android/                    # Capacitor 生成的 Android 原生工程
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml # 权限声明（INTERNET + 定位）
│   │   ├── res/mipmap-*/       # 应用图标（build-icons.py 生成）
│   │   └── assets/public/      # 由 npx cap sync 从 dist/ 拷贝
│   └── gradle                  # Gradle wrapper
├── ios/                        # 尚未生成（执行 npx cap add ios 后出现）
├── public/                     # Vite 静态资源（直接拷贝进 dist/）
│   ├── privacy.html            # 隐私政策页面
│   └── favicon.svg
├── server/index.mjs            # Node 轻量后端，零依赖
├── scripts/build-icons.py     # 图标生成脚本
├── assets.jpg                  # 应用图标源文件（AI 生成）
├── store/icon-512.png          # 商店用 512×512 图标
├── capacitor.config.ts         # Capacitor 配置
├── .env.production             # ⚠️ 必须自己创建，填后端 URL
└── dist/                       # 构建产物（gitignore，每次 build 覆盖）
```
