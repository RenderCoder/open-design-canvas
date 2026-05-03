# Figma Native Result Report Template

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
  "snapshot": {
    "status": "passed",
    "fileName": "figma-20260503-142530-home-hero-refine.png",
    "projectRelativePath": "figma-20260503-142530-home-hero-refine.png",
    "pixelWidth": 2880,
    "pixelHeight": 1800,
    "scale": 2,
    "expectedMinWidth": 2800,
    "actualWidth": 2880,
    "actualHeight": 1800,
    "qualityStatus": "high_resolution",
    "sourceFileKey": "...",
    "sourceNodeId": "...",
    "sourceNodeName": "Home / Hero",
    "capturedAt": "2026-05-03T14:25:30.000Z",
    "purposeSlug": "home-hero-refine",
    "exportMethod": "figma_mcp_export_async",
    "warnings": []
  },
  "knownIssues": [],
  "nextIteration": []
}
```

If the Figma canvas work succeeds but snapshot export or save fails, keep the
canvas result and report the snapshot failure:

```json
{
  "kind": "figma_native_result",
  "status": "partial",
  "snapshot": {
    "status": "failed",
    "qualityStatus": "failed",
    "error": "Snapshot save failed: exported PNG did not meet the minimum resolution guard.",
    "exportMethod": "figma_mcp_export_async"
  },
  "knownIssues": [
    {
      "severity": "warning",
      "check": "snapshot",
      "message": "Figma canvas was updated, but the Design Files process snapshot could not be saved."
    }
  ]
}
```
