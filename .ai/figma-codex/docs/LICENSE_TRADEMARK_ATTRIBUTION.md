# License, Trademark, and Attribution Notes

Updated: 2026-05-03

This note records the Open Design Canvas pre-release audit for license,
trademark, and attribution boundaries. It is a maintainer checklist, not legal
advice.

## Summary

- The repository root is Apache-2.0.
- The upstream `nexu-io/open-design` repository also publishes Apache-2.0.
- No root `NOTICE` file is present in this working tree, so there is no NOTICE
  text to copy at this time. If upstream later adds a NOTICE file, include the
  applicable notices in this fork before distribution.
- Bundled third-party skill directories that include their own licenses keep
  those license files in place:
  - `skills/html-ppt/LICENSE` for the MIT-licensed `lewislulu/html-ppt-skill`
    integration.
  - `skills/guizang-ppt/LICENSE` for the MIT-licensed `op7418/guizang-ppt-skill`
    integration.
- The bundled product design systems are text descriptions and token/style
  references. They are inspiration material, not official brand kits.

## Apache-2.0 Redistribution Checks

Before a release, verify:

1. The root `LICENSE` remains Apache-2.0.
2. The root README keeps visible license and credit sections.
3. Any upstream copyright, patent, trademark, and attribution notices that
   apply to distributed source remain intact.
4. Any copied third-party package, skill, image, template, or generated gallery
   source keeps its original license metadata and attribution.
5. Any newly imported third-party source is added only when its license is
   compatible with Apache-2.0 distribution and its attribution requirements are
   documented.

## Trademark and Brand Boundary

Open Design Canvas can describe integrations with Figma MCP, Codex CLI, OpenAI
APIs, and other tools by name when that is needed for interoperability or user
instructions. Those names must not be presented as project ownership,
sponsorship, certification, partnership, or endorsement.

Use this wording pattern for vendor names:

```text
Open Design Canvas uses <vendor/tool> as an integration target.
Open Design Canvas is not affiliated with or endorsed by <vendor>.
```

Do not use vendor marks as project branding. In particular:

- Do not rename the product to a vendor-branded name such as
  `Open Design Figma`.
- Do not ship official Figma, OpenAI, Linear, Stripe, Apple, Notion, or other
  third-party logos, wordmarks, icon sets, screenshots, or proprietary brand
  assets unless there is explicit permission and a recorded license.
- Do not imply that bundled design-system prompts are official brand design
  systems.
- Do not generate or distribute third-party logos from text prompts. Use a
  neutral placeholder such as `Logo placeholder` and let the user provide a
  licensed asset.

## Design-System Boundary

The branded design-system folders under `design-systems/` are aesthetic
references. They may mention public-facing visual traits, colors, spacing, and
layout behavior so agents can create a similar mood for a user's own project.

They must not:

- include official logo files, wordmarks, proprietary illustrations, or brand
  templates;
- instruct agents to recreate a protected mark;
- use phrasing such as "official", "certified", "approved", or "brand kit"
  unless the repository contains explicit authorization;
- add private customer design content or private Figma file references.

For generated output, agents should produce generic components and neutral logo
placeholders unless the user supplies licensed assets.

## Figma-Native Template Boundary

`design-systems/figma-native-base/` is intentionally generic. It should remain
the safe starter for Figma-native work:

- no vendor logo requirements;
- no private component library names;
- no private Figma file IDs;
- no hardcoded customer tokens;
- no claim that output is an official Figma file, template, or library.

Figma-native skills should continue to route canvas writes through Figma MCP
tools and should describe Figma as the canvas backend, not as a project sponsor.

## Audit Commands

These commands were used for this audit and can be repeated before release:

```bash
find . -maxdepth 3 \( -iname 'notice*' -o -iname 'license*' -o -iname 'copying*' -o -iname 'third*party*' -o -iname 'attribution*' \) -print
rg --line-number "official|endors|trademark|brand assets|logos?|inspired|attribution|license|Apache|MIT|copyright" README.md README.FIGMA_CODEX_UPGRADE.md .ai/figma-codex/docs design-systems skills docs
find . -maxdepth 5 -type f \( -iname '*logo*' -o -iname '*brand*' -o -iname '*.svg' -o -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' \)
```

Audit result:

- Existing project images are Open Design UI/docs assets, screenshots, prompt
  preview assets with existing source attribution, or upstream skill docs.
- The Figma-native upgrade package adds text instructions, schemas, scripts,
  mocked fixtures, and generic Figma-native design-system files. It does not
  add official third-party logos or vendor brand assets.
