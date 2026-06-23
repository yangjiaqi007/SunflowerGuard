# 太阳花守护 · 官方网站

> 🌻 应用 **太阳花守护** 的官方网站，托管于 GitHub Pages，含下载计数功能（Cloudflare Workers + KV）。

## 目录结构

```
sunflower-guard.github.io/
├── index.html              # 官网主页（单页滚动，10 个区块）
├── privacy/
│   └── index.html          # 隐私政策（对齐 /privacy，华为审核必需）
├── disclaimer.html         # 免责声明
├── admin.html              # 下载统计后台（Token 鉴权，前端不显示数字）
├── 404.html
├── robots.txt              # 搜索引擎爬虫规则
├── sitemap.xml             # 站点地图
├── assets/
│   ├── css/
│   │   ├── style.css       # 全站样式（品牌色 + 深色模式）
│   │   └── doc.css         # 文档页样式（含深色模式）
│   ├── js/
│   │   ├── config.js       # 全局配置（WORKER_URL）
│   │   ├── main.js         # 导航/FAQ/滚动交互（ARIA + 键盘支持）
│   │   ├── download.js     # 下载按钮埋点（★ 需配置 LINKS）
│   │   └── admin.js        # 后台统计展示（读取 config.js）
│   └── img/
│       ├── logo.png        # 应用图标
│       ├── favicon.png
│       └── screenshots/    # 功能截图（★ 当前为占位，请用真机截图替换）
└── worker/
    ├── download-counter.js # Cloudflare Worker（计数 + KV + 鉴权 + 限流）
    ├── wrangler.toml       # Worker 配置
    └── gen_placeholders.py # 截图占位图生成脚本
```

---

## 部署步骤

### 第一步：部署官网（GitHub Pages）

> ⚠️ 域名必须为 `sunflower-guard.github.io`，因为 app 代码里硬编码了隐私政策地址 `https://sunflower-guard.github.io/privacy`（华为应用市场审核会校验）。若用自定义域名，需同步修改 app 中的 `PRIVACY_POLICY_URL`。

1. 在 GitHub 创建名为 **`sunflower-guard`** 的账号或组织。
2. 新建同名仓库 **`sunflower-guard.github.io`**（必须用这个完整名字）。
3. 把本目录所有文件推送上去：
   ```bash
   cd sunflower-guard.github.io
   git init
   git add .
   git commit -m "官网初始化"
   git branch -M main
   git remote add origin git@github.com:sunflower-guard/sunflower-guard.github.io.git
   git push -u origin main
   ```
4. 进入仓库 **Settings → Pages**，Source 选 `main` 分支、`/ (root)` 目录，保存。
5. 约 1 分钟后访问 `https://sunflower-guard.github.io`。

### 第二步：部署下载计数后端（Cloudflare Workers）

1. 注册 [Cloudflare](https://dash.cloudflare.com)（免费）。
2. 安装 wrangler 命令行工具：
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. 创建 KV 存储命名空间，记下返回的 `id`：
   ```bash
   cd worker
   wrangler kv:namespace create DOWNLOAD_COUNTS
   ```
4. 把返回的 `id` 填入 `worker/wrangler.toml` 的 `kv_namespaces.id`。
5. 设置后台访问 Token（**改成你自己的强随机字符串**，如 32 位）：
   ```bash
   wrangler secret put ADMIN_TOKEN
   # 按提示粘贴你的 Token
   ```
6. 部署：
   ```bash
   wrangler deploy
   ```
   部署完成后会得到一个地址，形如 `https://sg-counter.xxxxx.workers.dev`。

### 第三步：回填配置（共 2 处）

打开 `assets/js/config.js`，把 `WORKER_URL` 改成上一步得到的 Worker 地址：
```js
var SG_CONFIG = {
  WORKER_URL: 'https://sg-counter.xxxxx.workers.dev'
};
```

打开 `assets/js/download.js`，在 `LINKS` 里填入三平台安装包直链：
```js
const LINKS = {
  ios: 'https://你的域名/files/sunflower-guard-v3.2.0.ipa',
  harmonyos: 'https://你的域名/files/sunflower-guard-v3.2.0.hap',
  android: 'https://你的域名/files/sunflower-guard-v3.2.0.apk'
};
```
> 留 `'#'` 表示未配置，点击按钮会提示「即将上线」并自动计数。

提交推送，GitHub Pages 会自动更新。

### 第四步：替换截图（可选但推荐）

用真机/模拟器跑起应用，截 5 张图，按下方规范覆盖到 `assets/img/screenshots/`：

| 文件名 | 内容 | 尺寸 |
|---|---|---|
| `home.png` | 首页 · 今日用药计划 | 1080×2340（9:19.5） |
| `reminder.png` | 用药提醒全屏页 | 同上 |
| `infusion.png` | 挂水记录页 | 同上 |
| `history.png` | 历史记录页 | 同上 |
| `addplan.png` | 添加计划 / 文字输入建计划 | 同上 |

直接覆盖同名文件即可，**无需改任何代码**。

---

## 已实现的改进

### 安全性
- **时序安全比较**：Worker Token 验证使用常量时间比较函数，防止时序攻击
- **CORS 限制**：Worker 仅允许来自 `sunflower-guard.github.io` 和 `localhost:8000` 的请求
- **防刷机制**：Origin/Referer 校验 + IP 滑窗限流（每分钟 10 次）
- **Admin Token**：通过 Authorization header 传递，不经过 URL

### 可访问性
- **ARIA 属性**：为导航菜单、FAQ 折叠面板添加完整的 ARIA 标签
- **键盘导航**：支持 Enter/Space 触发 FAQ，ESC 键关闭移动端菜单
- **语义化 HTML**：下载卡片使用 `<ul>` 替代 `<br>` 换行

### 样式改进
- **深色模式**：全站支持 `prefers-color-scheme: dark`，含文档页
- **移动端优化**：点击区域至少 44×44px，矮屏 Hero 自适应
- **滚动动画**：使用 CSS class 替代内联样式
- **下载按钮禁用态**：CSS class `.is-coming-soon` 替代无效的 `<a disabled>`

### SEO 优化
- **结构化数据**：SoftwareApplication JSON-LD（含 `downloadUrl`、`author`）
- **社交分享**：首页 + 隐私政策 + 免责声明均含 Open Graph / Twitter Card
- **robots.txt / sitemap.xml**：引导搜索引擎正确抓取

### 代码质量
- **配置集中化**：`config.js` 统一管理 WORKER_URL（download.js 和 admin.js 共用）
- **现代语法**：全部 JS 使用 `const`/`let`，移除废弃的 `keyCode`
- **下载按钮安全**：使用 `innerHTML` 保留原始 DOM 结构，避免内容丢失

---

## 查看下载统计

1. 访问 `https://sunflower-guard.github.io/admin.html`。
2. 输入你在第二步设置的 `ADMIN_TOKEN`。
3. 即可看到各平台累计下载量与总下载量。

> 计数对访客完全不可见——前台页面不显示任何数字。

---

## 监控与分析（可选）

为提升网站质量，建议添加以下监控：

### 错误监控
```html
<!-- 在 </head> 前添加 -->
<script>
  window.onerror = function(msg, url, line, col, error) {
    var data = { msg: msg, url: url, line: line, col: col };
    if (error) data.stack = error.stack;
    // 发送到你的错误收集端点
    // navigator.sendBeacon('/api/error', JSON.stringify(data));
  };
</script>
```

### 性能监控
```html
<!-- 在 </body> 前添加 -->
<script>
  window.addEventListener('load', function() {
    if (window.performance) {
      var timing = performance.timing;
      var loadTime = timing.loadEventEnd - timing.navigationStart;
      console.log('Page load time: ' + loadTime + 'ms');
      // 可选：发送到分析端点
    }
  });
</script>
```

### 推荐工具
- **Simple Analytics**：隐私友好的分析工具，无需 Cookie 同意
- **Umami**：自托管的开源分析平台
- **Plausible**：轻量级、隐私优先的分析工具

---

## 本地预览

```bash
cd sunflower-guard.github.io
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

---

## 品牌配色（取自 app `color.json`）

| 变量 | 值 | 用途 |
|---|---|---|
| `--brand-primary` | `#4A9E4D` | 主色 |
| `--brand-primary-dark` | `#3A8A3D` | hover/选中 |
| `--brand-primary-light` | `#7BC67E` | 渐变终点 |
| 招牌渐变 | `#4A9E4D → #7BC67E` | Hero/顶栏/按钮 |
| `--bg-base` | `#F0F7F0` | 薄荷绿背景 |
| `--text-primary` | `#2D5A2D` | 深绿标题 |

---

© 2024-2026 Jiaqi YANG · 太阳花守护
