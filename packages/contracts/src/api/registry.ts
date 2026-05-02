export interface AgentModelOption {
  id: string;
  label: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  bin: string;
  available: boolean;
  path?: string;
  version?: string | null;
  models?: AgentModelOption[];
  reasoningOptions?: AgentModelOption[];
}

export interface AgentsResponse {
  agents: AgentInfo[];
}

export interface FigmaSkillMetadata {
  requiresMcp: boolean;
  requiresFullSeat: boolean;
  defaultEditor: 'design' | 'figjam' | null;
  outputKind: string | null;
  supportsExistingFile: boolean;
  supportsCreateNewFile: boolean;
  validation: {
    metadata: boolean;
    screenshot: boolean;
    variableDefs: boolean;
  } | null;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  mode:
    | 'prototype'
    | 'deck'
    | 'template'
    | 'design-system'
    | 'figma'
    | 'image'
    | 'video'
    | 'audio';
  surface?: 'web' | 'figma' | 'image' | 'video' | 'audio';
  platform?: 'desktop' | 'mobile' | 'tablet' | 'responsive' | null;
  scenario?: string | null;
  previewType: string;
  designSystemRequired: boolean;
  figma?: FigmaSkillMetadata | null;
  defaultFor: string[];
  upstream: string | null;
  featured?: number | null;
  fidelity?: 'wireframe' | 'high-fidelity' | null;
  speakerNotes?: boolean | null;
  animations?: boolean | null;
  craftRequires?: string[];
  hasBody: boolean;
  examplePrompt: string;
}

export interface SkillDetail extends SkillSummary {
  body: string;
}

export interface SkillsResponse {
  skills: SkillSummary[];
}

export interface SkillResponse {
  skill: SkillDetail;
}

export interface FigmaDesignSystemSummary {
  hasGuidance: boolean;
  hasTokens: boolean;
  hasComponentMap: boolean;
}

export interface FigmaDesignSystemDetail {
  guidance: string | null;
  tokens: unknown | null;
  componentMap: unknown | null;
}

export interface DesignSystemSummary {
  id: string;
  title: string;
  category: string;
  summary: string;
  swatches?: string[];
  surface?: 'web' | 'figma' | 'image' | 'video' | 'audio';
  figma?: FigmaDesignSystemSummary | null;
}

export type DesignSystemDetail = Omit<DesignSystemSummary, 'figma'> & {
  body: string;
  figma?: FigmaDesignSystemDetail | null;
};

export interface DesignSystemsResponse {
  designSystems: DesignSystemSummary[];
}

export interface DesignSystemResponse {
  designSystem: DesignSystemDetail;
}

export interface HealthResponse {
  ok: true;
  service?: 'daemon';
  version?: string;
}
