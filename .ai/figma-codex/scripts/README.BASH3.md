# Bash 3 compatible scripts

These scripts are intended for macOS `/bin/bash` 3.2.

Recommended clean rebuild:

```bash
unzip -o open-design-canvas-bash3-scripts-final.zip -d .
chmod +x .ai/figma-codex/scripts/*.sh
bash .ai/figma-codex/scripts/check-bash3-scripts.sh
bash .ai/figma-codex/scripts/rebuild-beads.sh
ODC_AUTOPILOT_MAX_RUNS=80 bash .ai/figma-codex/scripts/codex-autopilot.sh
```

`init-beads-tasks.sh` creates a tracking epic and labels all work items with `odc-upgrade` and `figma-native`.
By default the epic is non-blocking (`ODC_EPIC_MODE=track`) so `bd ready` can still expose child tasks.
If you explicitly want parent/child grouping, run with `ODC_EPIC_MODE=parent`, but this may affect `bd ready` semantics.
