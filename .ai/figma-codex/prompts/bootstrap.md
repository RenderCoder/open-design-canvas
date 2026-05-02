你在 open-design fork 仓库根目录。请执行 bootstrap：

1. 读取 `README.FIGMA_CODEX_UPGRADE.md` 和 `GOLDEN_PROMPT.md`。
2. 运行 `bash .ai/figma-codex/scripts/install.sh`。
3. 确认 `bd` 可用；若 `.beads` 不存在，运行 `bd init`。
4. 运行 `bash .ai/figma-codex/scripts/init-beads-tasks.sh`。
5. 运行 `bd ready --json`，输出可执行任务列表。
6. 不开始改代码，只汇报 bootstrap 状态和下一条建议 prompt。
