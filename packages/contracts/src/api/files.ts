import type { OkResponse } from '../common.js';
import type { ArtifactKind, ArtifactManifest } from './artifacts.js';
import type { FigmaSnapshotResult } from '../figma-result.js';

export type ProjectFileKind =
  | 'html'
  | 'image'
  | 'video'
  | 'audio'
  | 'sketch'
  | 'text'
  | 'code'
  | 'pdf'
  | 'document'
  | 'presentation'
  | 'spreadsheet'
  | 'binary';

export interface ProjectFile {
  name: string;
  path?: string;
  type?: 'file' | 'dir';
  size: number;
  mtime: number;
  kind: ProjectFileKind;
  mime: string;
  artifactKind?: ArtifactKind;
  artifactManifest?: ArtifactManifest;
}

export interface ProjectFilesResponse {
  files: ProjectFile[];
}

export interface ProjectFileResponse {
  file: ProjectFile;
}

export interface UploadProjectFilesResponse extends ProjectFilesResponse {}

export interface DeleteProjectFileResponse extends OkResponse {}

export interface FigmaSnapshotSource {
  sourceFileKey?: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  sourceWidth: number;
  sourceHeight: number;
}

export interface FigmaSnapshotExportPlan {
  scale: number;
  desiredScale: number;
  expectedMinWidth: number;
  expectedMinHeight: number;
  maxLongestEdge: number;
  constraint: {
    type: 'SCALE';
    value: number;
  };
  degraded: boolean;
  warnings: string[];
}

export interface SaveFigmaSnapshotResponse {
  snapshot: FigmaSnapshotResult;
  file?: ProjectFile;
  exportPlan: FigmaSnapshotExportPlan;
}
