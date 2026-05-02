你在 open-design fork 仓库根目录中。继续执行 Open Design → Figma-native 改造计划。

必须遵守：

1. 先读取：
   - AGENTS.md
   - README.FIGMA_CODEX_UPGRADE.md
   - .ai/figma-codex/docs/IMPLEMENTATION_GUIDE.md
   - .ai/figma-codex/docs/OPEN_DESIGN_PATCH_GUIDE.md

2. 使用 Beads 工作流：
   - `bd prime || true`
   - `bd ready --json`
   - 选择最高优先级且 unblocked 的一个任务
   - `bd show <id> --long`
   - `bd update <id> --claim`

3. 不允许只看标题就做事。必须读任务详情和验收标准。

4. 开始改代码前先 inspect 真实仓库结构；不要依赖文档假设路径。

5. 当前会话只做一个 bead。需要新增工作就创建新 bead 或更新 notes。

6. 完成时：
   - 运行相称验证命令
   - `bd update <id> --notes "完成摘要 + 验证结果 + 风险"`
   - 若通过，`bd close <id> --reason "Completed: ..."`
   - 最后 `bd ready --json` 并推荐下一项。

输出：任务 ID、实施摘要、修改文件、验证结果、Beads 更新、下一步。
