# Figma Native Result Report Template

Canvas critique uses the same `figma_native_result` envelope as generation, with `created` and `updated` usually empty unless the user explicitly asked for repair. Put audit findings in `issues` and repair steps in `nextActions`.

```json
{
  "kind": "figma_native_result",
  "status": "completed",
  "fileUrl": "...",
  "fileKey": "...",
  "pageName": "...",
  "rootFrame": { "name": "...", "nodeId": "...", "width": 1440, "height": 3200 },
  "created": [],
  "updated": [],
  "reusedComponents": [],
  "variablesUsed": [],
  "stylesUsed": [],
  "hardcodedValues": [],
  "checks": {
    "metadata": "passed",
    "screenshot": "passed",
    "variables": "passed",
    "autoLayout": "passed",
    "semanticNames": "passed",
    "textReadability": "passed",
    "textOverlap": "passed"
  },
  "readabilityCheck": {
    "status": "passed",
    "repairAttempts": 0,
    "fixedNodeIds": [],
    "remainingNodeIds": [],
    "ignoredCount": 0,
    "summary": "No text-text overlap detected after lint."
  },
  "textOverlapCheck": {
    "status": "passed",
    "repairAttempts": 0,
    "fixedNodeIds": [],
    "remainingNodeIds": [],
    "ignoredCount": 0
  },
  "issues": [
    {
      "priority": "P1",
      "severity": "warning",
      "check": "autoLayout",
      "message": "Main content group is absolute-positioned instead of Auto Layout.",
      "nodeId": "12:34",
      "repair": "Use use_figma to set layoutMode and spacing on the main content frame."
    }
  ],
  "nextActions": [
    "Repair P1 auto layout issue on 12:34 before adding new visual polish."
  ]
}
```
