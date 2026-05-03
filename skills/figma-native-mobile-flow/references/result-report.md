# Figma Native Result Report Template

```json
{
  "kind": "figma_native_result",
  "status": "completed",
  "fileUrl": "...",
  "fileKey": "...",
  "pageName": "...",
  "rootFrames": [
    { "name": "01 Onboarding / Default", "nodeId": "...", "width": 390, "height": 844, "state": "default" },
    { "name": "02 Plan Selection / Loading", "nodeId": "...", "width": 390, "height": 844, "state": "loading" },
    { "name": "03 Checkout / Error", "nodeId": "...", "width": 390, "height": 844, "state": "error" }
  ],
  "navigation": [
    { "from": "01 Onboarding / Default", "to": "02 Plan Selection / Loading", "trigger": "Tap primary CTA" },
    { "from": "02 Plan Selection / Loading", "to": "03 Checkout / Error", "trigger": "Plan loaded, tap continue" }
  ],
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
  "knownIssues": [],
  "nextIteration": []
}
```
