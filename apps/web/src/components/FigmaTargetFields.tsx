import { useMemo } from 'react';
import { useT } from '../i18n';
import type { Dict } from '../i18n/types';
import type {
  FigmaOutputSettings,
  FigmaTarget,
  FigmaTargetMode,
} from '../types';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export interface FigmaTargetDraft {
  target: FigmaTarget;
  outputSettings: FigmaOutputSettings;
}

interface Props {
  value: FigmaTargetDraft;
  onChange: (next: FigmaTargetDraft) => void;
  designSystemTitle?: string | null;
  compact?: boolean;
}

const FIGMA_URL_RE = /^https:\/\/(?:www\.)?figma\.com\/(?:design|file|proto|board)\/[A-Za-z0-9_-]+(?:[/?#].*)?$/i;

export function defaultFigmaTargetDraft(): FigmaTargetDraft {
  return {
    target: {
      mode: 'existing-file',
      editorType: 'design',
    },
    outputSettings: {
      outputMode: 'figma-native',
      preferDesignSystemReuse: true,
      allowPrimitiveFallback: true,
      runCanvasLint: true,
      requireScreenshotCheck: true,
      requireVariableCheck: true,
    },
  };
}

export function isFigmaTargetUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return FIGMA_URL_RE.test(trimmed);
}

export function normalizeFigmaTargetDraft(
  draft: FigmaTargetDraft,
): FigmaTargetDraft | null {
  const target = trimTarget(draft.target);
  if (target.mode !== 'new-file') {
    const fileUrl = target.fileUrl ?? '';
    if (!fileUrl || !isFigmaTargetUrl(fileUrl)) return null;
  }
  if (target.mode === 'new-file') {
    target.allowCreateNewFile = true;
    delete target.fileUrl;
    delete target.fileKey;
    delete target.nodeId;
  }
  if (target.mode !== 'existing-selection') {
    delete target.nodeId;
  }
  return {
    target,
    outputSettings: {
      ...draft.outputSettings,
      outputMode: 'figma-native',
    },
  };
}

export function FigmaTargetFields({
  value,
  onChange,
  designSystemTitle,
  compact = false,
}: Props) {
  const t = useT();
  const urlValid = isFigmaTargetUrl(value.target.fileUrl ?? '');
  const showUrl = value.target.mode !== 'new-file';
  const showSelection = value.target.mode === 'existing-selection';
  const showPlanKey = value.target.mode === 'new-file';
  const dsLabel = designSystemTitle ?? t('newproj.figmaDesignSystemNone');

  const modeOptions = useMemo<Array<{ value: FigmaTargetMode; label: string; hint: string }>>(
    () => [
      {
        value: 'existing-file',
        label: t('newproj.figmaModeExistingFile'),
        hint: t('newproj.figmaModeExistingFileHint'),
      },
      {
        value: 'existing-selection',
        label: t('newproj.figmaModeSelection'),
        hint: t('newproj.figmaModeSelectionHint'),
      },
      {
        value: 'new-file',
        label: t('newproj.figmaModeNewFile'),
        hint: t('newproj.figmaModeNewFileHint'),
      },
    ],
    [t],
  );

  function patchTarget(patch: Partial<FigmaTarget>) {
    onChange({ ...value, target: { ...value.target, ...patch } });
  }

  function patchOutput(patch: Partial<FigmaOutputSettings>) {
    onChange({
      ...value,
      outputSettings: { ...value.outputSettings, ...patch },
    });
  }

  return (
    <div
      className={`figma-target-fields${compact ? ' compact' : ''}`}
      data-testid="figma-target-fields"
    >
      <div className="figma-target-head">
        <div>
          <span className="figma-target-title">
            {t('newproj.figmaTargetLabel')}
          </span>
          <span className="figma-target-sub">
            {t('newproj.figmaTargetHelp')}
          </span>
        </div>
        <a
          href="https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/"
          target="_blank"
          rel="noreferrer"
          className="figma-target-doc"
        >
          {t('newproj.figmaMcpDocs')}
        </a>
      </div>

      <div className="figma-mode-grid">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`figma-mode-card${value.target.mode === option.value ? ' active' : ''}`}
            onClick={() => patchTarget({ mode: option.value })}
            aria-pressed={value.target.mode === option.value}
          >
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </button>
        ))}
      </div>

      {showUrl ? (
        <label className="figma-target-field">
          <span>{t('newproj.figmaUrlLabel')}</span>
          <input
            data-testid="figma-target-url"
            value={value.target.fileUrl ?? ''}
            onChange={(event) => patchTarget({ fileUrl: event.target.value })}
            placeholder={t('newproj.figmaUrlPlaceholder')}
            aria-invalid={!urlValid}
          />
          {!urlValid ? (
            <small className="figma-target-error">
              {t('newproj.figmaUrlInvalid')}
            </small>
          ) : null}
        </label>
      ) : null}

      {showSelection ? (
        <label className="figma-target-field">
          <span>{t('newproj.figmaNodeLabel')}</span>
          <input
            value={value.target.nodeId ?? ''}
            onChange={(event) => patchTarget({ nodeId: event.target.value })}
            placeholder={t('newproj.figmaNodePlaceholder')}
          />
        </label>
      ) : null}

      <div className="figma-target-row">
        <label className="figma-target-field">
          <span>{t('newproj.figmaPageLabel')}</span>
          <input
            value={value.target.pageName ?? ''}
            onChange={(event) => patchTarget({ pageName: event.target.value })}
            placeholder={t('newproj.figmaPagePlaceholder')}
          />
        </label>
        <label className="figma-target-field">
          <span>{t('newproj.figmaFrameLabel')}</span>
          <input
            value={value.target.rootFrameName ?? ''}
            onChange={(event) => patchTarget({ rootFrameName: event.target.value })}
            placeholder={t('newproj.figmaFramePlaceholder')}
          />
        </label>
      </div>

      {showPlanKey ? (
        <label className="figma-target-field">
          <span>{t('newproj.figmaPlanKeyLabel')}</span>
          <input
            value={value.target.planKey ?? ''}
            onChange={(event) => patchTarget({ planKey: event.target.value })}
            placeholder={t('newproj.figmaPlanKeyPlaceholder')}
          />
        </label>
      ) : null}

      <div className="figma-target-settings">
        <span>{t('newproj.figmaDesignSystemLabel', { name: dsLabel })}</span>
        <label>
          <input
            type="checkbox"
            checked={value.outputSettings.preferDesignSystemReuse !== false}
            onChange={(event) =>
              patchOutput({ preferDesignSystemReuse: event.target.checked })
            }
          />
          {t('newproj.figmaPreferReuse')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.outputSettings.allowPrimitiveFallback !== false}
            onChange={(event) =>
              patchOutput({ allowPrimitiveFallback: event.target.checked })
            }
          />
          {t('newproj.figmaAllowPrimitives')}
        </label>
      </div>
    </div>
  );
}

function trimTarget(target: FigmaTarget): FigmaTarget {
  return {
    mode: target.mode,
    fileUrl: emptyToUndefined(target.fileUrl),
    fileKey: emptyToUndefined(target.fileKey),
    nodeId: emptyToUndefined(target.nodeId),
    pageName: emptyToUndefined(target.pageName),
    rootFrameName: emptyToUndefined(target.rootFrameName),
    planKey: emptyToUndefined(target.planKey),
    editorType: target.editorType ?? 'design',
    allowCreateNewFile: target.mode === 'new-file' ? true : target.allowCreateNewFile,
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
