# Target Architecture：Open Design Figma-native 模式

## 一句话架构

```text
Open Design = 设计方法论 / skills / design systems / prompt composer / UI / result review
Codex CLI   = 工程改造 / agent 执行 / JSONL event stream / MCP client
Figma MCP   = 真实 Figma-native canvas 写入 / design system search / metadata / screenshot / variables
Beads       = 长周期任务图 / 依赖 / 状态 / 上下文恢复
```

## 目标用户体验

用户在 Open Design UI 中：

1. 选择 Figma-native skill，例如 `figma-native-screen`、`figma-native-landing`、`figma-native-dashboard`。
2. 选择设计系统，例如 `figma-native-base` 或现有品牌 DESIGN.md。
3. 输入需求和 Figma target：
   - existing file URL / selection URL；或
   - create new Figma file。
4. Open Design 触发 discovery form 和 direction picker。
5. Codex 读取 skill / design system / Figma target，调用 Figma MCP 生成 canvas。
6. UI 展示：
   - Figma file URL
   - page/frame/node IDs
   - reused components
   - variables/styles used
   - hardcoded values / missing components
   - metadata/screenshot/token check status
   - next iteration suggestions

## 核心模块

### 1. Skill Registry 扩展

当前 Open Design skill frontmatter 已支持 `od.mode`、`od.platform`、`od.scenario`、`od.preview.type` 等字段。新增：

```yaml
od:
  mode: figma
  surface: figma
  platform: desktop | mobile | tablet | responsive
  scenario: design | marketing | operation | product
  preview:
    type: figma-canvas
  figma:
    requires_mcp: true
    requires_full_seat: true
    default_editor: design
    output_kind: native-canvas
    supports_existing_file: true
    supports_create_new_file: true
    validation:
      metadata: true
      screenshot: true
      variable_defs: true
```

实现注意：

- 保持 backward compatible。
- 不要破坏 prototype/deck/template/design-system/image/video/audio mode。
- UI 的 skill picker 可以把 figma mode 作为独立 filter 或 surface。

### 2. Project Metadata 扩展

新增 Figma target 信息：

```ts
type FigmaTarget = {
  mode: 'existing-file' | 'existing-selection' | 'new-file';
  fileUrl?: string;
  fileKey?: string;
  nodeId?: string;
  pageName?: string;
  frameName?: string;
  planKey?: string;
  editorType?: 'design' | 'figjam';
};

type FigmaOutputSettings = {
  outputMode: 'figma-native' | 'html-artifact' | 'hybrid-code-to-canvas';
  preferDesignSystemReuse: boolean;
  allowPrimitiveFallback: boolean;
  runCanvasLint: boolean;
  requireScreenshotCheck: boolean;
  requireVariableCheck: boolean;
};
```

### 3. Prompt Composer 扩展

新增 `FIGMA_NATIVE_DIRECTIVE`，当 active skill mode 是 `figma` 或 metadata.outputMode 是 `figma-native` 时注入。

指令必须包含：

- final deliverable is Figma-native canvas, not HTML。
- user must provide Figma URL or the agent must create a new file through `create_new_file`。
- use `search_design_system` before drawing primitives。
- use `use_figma` for pages/frames/components/variables/styles/Auto Layout。
- run `get_metadata` / `get_screenshot` / `get_variable_defs` after writing。
- return structured Figma result report。

### 4. Codex Adapter 扩展

目标：现代化 Codex 执行方式，并把 JSONL 事件转成 OD UI 事件。

要点：

- 使用 `codex exec --json`。
- 不使用 `--full-auto`。
- 优先 `--sandbox workspace-write`。
- JSONL parser 识别：
  - MCP tool calls
  - plan updates
  - command executions
  - file changes
  - final message
  - errors
- 将 Figma MCP tool calls 显示成 UX 友好事件：
  - connecting
  - design system searched
  - file created
  - canvas updated
  - metadata checked
  - screenshot checked
  - variable defs checked
  - lint warnings

### 5. Figma Result Schema

建议最终 agent 输出：

```json
{
  "kind": "figma_native_result",
  "status": "completed",
  "fileUrl": "https://www.figma.com/design/...",
  "fileKey": "...",
  "pageName": "AI Landing Exploration",
  "rootFrame": {
    "name": "Landing / Desktop / 1440",
    "nodeId": "...",
    "width": 1440,
    "height": 3200
  },
  "created": [
    { "type": "FRAME", "name": "Hero", "nodeId": "..." }
  ],
  "updated": [],
  "reusedComponents": [
    { "name": "Button / Primary", "source": "team library" }
  ],
  "variablesUsed": ["color/bg/default", "space/8"],
  "stylesUsed": ["Text/Display/Large"],
  "hardcodedValues": [],
  "checks": {
    "metadata": "passed",
    "screenshot": "passed",
    "variables": "passed",
    "autoLayout": "passed",
    "semanticNames": "passed"
  },
  "knownIssues": [],
  "nextIteration": ["Add mobile variant", "Swap placeholder illustrations"]
}
```

### 6. Canvas Lint

Canvas lint 不需要一开始就写复杂 Figma parser。MVP 可以让 agent 调用 Figma MCP 检查并输出结构化报告。

lint 维度：

- Auto Layout coverage
- semantic layer names
- component instance reuse
- variables/styles usage
- hardcoded hex / spacing / font sizes
- responsive resize sanity
- empty/loading/error states
- accessibility contrast
- content specificity
- visual hierarchy

## 不做什么

MVP 不做：

- 自研 Figma OAuth。
- 自研 Plugin API executor。
- 通过 Figma REST API 写画布。
- 一次性支持所有 OD skills。
- 生成组件库全量同步。
- 追求自动发布 Figma library。

## 最小可演示版本

最小演示：

```text
Prompt: 为 AI 写作工具做一个 SaaS landing page，风格现代极简，目标 Figma 文件 <URL>。
Result: Figma 文件中新增 Page 和 Desktop frame，包含 Hero、Features、Pricing、FAQ，使用 Auto Layout、语义命名、variables/styles，返回 result card。
```
