# 标签智能扫描 (Label Scanner)

用摄像头对准产品/物流标签，自动识别 **SN（序列号）** 等编码并记录；支持重复检测、导出 CSV。前端为 React + Vite，视觉识别使用 **火山引擎豆包（Doubao）** 多模态 API（OpenAI 兼容接口）。

---

## 快速理解

| 项目 | 说明 |
|------|------|
| **做什么** | 扫描标签图 → 调用豆包识图 → 解析 SN/other_codes → 列表展示、去重、导出 CSV |
| **技术栈** | React 19, TypeScript, Vite 6, Tailwind, `openai` 包调豆包 API |
| **模型** | 火山引擎豆包（默认 `Doubao-Seed-1.6-flash`，可在环境变量覆盖） |
| **权限** | 需要摄像头（见 `metadata.json` 的 `requestFramePermissions`） |

---

## 项目结构（便于 AI / 二次开发）

```
├── App.tsx                 # 主入口：状态、Toast、扫描/停止、导出 CSV、重置批次
├── index.tsx / index.html  # 入口与 HTML
├── types.ts                # ScanResult、GeminiResponse 等类型
├── components/
│   ├── Scanner.tsx         # 摄像头取流、稳定性检测、自动截帧、调用 onCapture(base64)
│   └── HistoryList.tsx     # 展示识别结果列表、删除、编辑占位
├── services/
│   └── geminiService.ts    # 豆包 API 调用：recognizeLabel(base64) → { sn, other_codes, confidence }
├── utils/
│   └── snValidation.ts    # SN 校验等工具
├── vite.config.ts          # 端口 3000、env 注入 ARK_* / API_KEY
├── Dockerfile              # 多阶段构建：Node 构建静态资源 → nginx 提供
├── cloudbuild.yaml         # Google Cloud Build：构建镜像 → 推 GCR → 部署到 Cloud Run
├── metadata.json           # 例如请求摄像头权限
└── README.md               # 本文件
```

- **改识别逻辑/模型/提示词**：编辑 `services/geminiService.ts`（`SYSTEM_INSTRUCTION`、模型名、解析逻辑）。
- **改 UI/流程**：`App.tsx`、`components/Scanner.tsx`、`components/HistoryList.tsx`。

---

## 本地运行

**环境要求：** Node.js（建议 18+）

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**  
   在项目根目录创建 `.env.local`（不要提交到 Git）：
   ```env
   ARK_API_KEY=你的火山引擎豆包_API_Key
   ARK_API_BASE=https://ark.cn-beijing.volces.com/api/v3
   ARK_MODEL=Doubao-Seed-1.6-flash
   ```
   - `ARK_API_BASE`、`ARK_MODEL` 可不写，有默认值。
   - 豆包 API Key 在火山引擎控制台创建（Ark 模型服务）。

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   浏览器访问 `http://localhost:3000`，允许摄像头后即可使用。

4. **构建与预览**
   ```bash
   npm run build
   npm run preview
   ```

---

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ARK_API_KEY` | 火山引擎豆包 API Key（必填） | - |
| `ARK_API_BASE` | 豆包 API 地址 | `https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_MODEL` | 模型名称 | `Doubao-Seed-1.6-flash` |
| `API_KEY` | 兼容旧配置，可当 ARK_API_KEY 用 | - |

本地：Vite 通过 `vite.config.ts` 的 `define` 把上述变量注入到前端；  
Docker/Cloud Run：构建时通过 `ARG`/`ENV` 打进静态资源（见下方）。

---

## Google Cloud Run 部署（Googlerun）

本项目支持通过 **Google Cloud Build** 构建 Docker 镜像并部署到 **Cloud Run**，实现线上访问（无需自己管服务器）。

- **流程简述**：`cloudbuild.yaml` 里会：
  1. 用 `Dockerfile` 构建镜像（构建阶段会传入 `ARK_API_KEY`、`ARK_API_BASE`、`ARK_MODEL`，被 Vite 打进前端）。
  2. 将镜像推到 Google Container Registry：`gcr.io/$PROJECT_ID/label-scanner:latest`。
  3. 在 **Cloud Run** 上部署服务 `label-scanner`（例如区域 `us-central1`，端口 80，允许未认证访问）。

- **重要：不要将真实 API Key 提交到仓库。**  
  `cloudbuild.yaml` 里若写了 `--build-arg ARK_API_KEY=...`，请改为：
  - 使用 **Secret Manager** 在 Cloud Build 中注入密钥，或  
  - 使用 CI 中的环境变量/密钥（如 GitHub Actions secrets），在触发 build 时传入 `--build-arg ARK_API_KEY=$ARK_API_KEY`。  
  部署前务必检查 `cloudbuild.yaml` 中是否还有明文 Key，若有请删除并改用上述方式。

- **本地用 Cloud Build 部署示例**（需已安装并登录 `gcloud`、并设置好 `PROJECT_ID`）：
  ```bash
  gcloud builds submit --config=cloudbuild.yaml .
  ```
  部署完成后，Cloud Run 会给出服务 URL，在浏览器中打开即可使用（HTTPS、需允许摄像头）。

- **修改部署配置**：编辑 `cloudbuild.yaml`（镜像名、区域、端口等）和 `Dockerfile`（基础镜像、构建参数、nginx 配置等）。

---

## 常见调整

- **换模型**：改 `.env.local` 的 `ARK_MODEL`，或改 `vite.config.ts` 里 `ARK_MODEL` 的默认值；Cloud Run 则改 Docker 的 `ARG`/`ENV` 或 `cloudbuild.yaml` 的 `--build-arg ARK_MODEL=...`。
- **改识别字段或规则**：改 `services/geminiService.ts` 的 `SYSTEM_INSTRUCTION` 和返回 JSON 的解析逻辑；类型在 `types.ts` 的 `GeminiResponse`。
- **改端口**：改 `vite.config.ts` 的 `server.port`。
- **改重复检测/导出逻辑**：在 `App.tsx` 中修改 `handleCapture`、`exportToCSV` 等。

---

## 参考

- 豆包（火山引擎）Ark 模型 API 文档：按当前官网「开放平台」文档为准。  
- 本项目最初由 Google AI Studio 导出并改为使用火山引擎豆包；若从 AI Studio 再次导出，可对比本仓库的 `App.tsx`、`geminiService.ts` 做合并。
