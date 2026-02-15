// Annotation Engine — Tier 2 Feature 7
//
// Manages coach annotations on video frames:
// - Drawing annotations (lines, circles, arrows as SVG/JSON paths)
// - Text annotations (positioned comments on frames)
// - Voice annotations (URL references to recorded audio)
// - Sharing via share tokens

export type AnnotationType = 'drawing' | 'text' | 'voice';

export type DrawingData = {
  type: 'line' | 'circle' | 'arrow' | 'freehand' | 'rectangle';
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  label?: string;
};

export type FrameAnnotation = {
  id?: string;
  analysisId: string;
  frameIndex: number;
  coachId: string;
  coachName: string;
  annotationType: AnnotationType;
  drawingData?: DrawingData;
  textContent?: string;
  voiceUrl?: string;
  voiceDurationSeconds?: number;
  position?: { x: number; y: number };
  timestamp?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AnnotationGroup = {
  coachId: string;
  coachName: string;
  annotations: FrameAnnotation[];
};

export type ShareInfo = {
  shareId: string;
  shareToken: string;
  shareUrl: string;
  expiresAt?: string;
};

/**
 * Validate an annotation before saving.
 */
export function validateAnnotation(annotation: Partial<FrameAnnotation>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!annotation.analysisId) errors.push('analysisId is required');
  if (annotation.frameIndex === undefined) errors.push('frameIndex is required');
  if (!annotation.coachId) errors.push('coachId is required');

  const validTypes: AnnotationType[] = ['drawing', 'text', 'voice'];
  if (!annotation.annotationType || !validTypes.includes(annotation.annotationType)) {
    errors.push(`annotationType must be one of: ${validTypes.join(', ')}`);
  }

  if (annotation.annotationType === 'drawing' && !annotation.drawingData) {
    errors.push('drawingData is required for drawing annotations');
  }

  if (annotation.annotationType === 'text' && !annotation.textContent) {
    errors.push('textContent is required for text annotations');
  }

  if (annotation.annotationType === 'voice' && !annotation.voiceUrl) {
    errors.push('voiceUrl is required for voice annotations');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Group annotations by coach.
 */
export function groupByCoach(annotations: FrameAnnotation[]): AnnotationGroup[] {
  const groups: Record<string, AnnotationGroup> = {};

  for (const ann of annotations) {
    const coachId = ann.coachId;
    if (!groups[coachId]) {
      groups[coachId] = {
        coachId,
        coachName: ann.coachName,
        annotations: [],
      };
    }
    groups[coachId].annotations.push(ann);
  }

  return Object.values(groups);
}

/**
 * Convert annotation to DB record format.
 */
export function toDBRecord(annotation: FrameAnnotation): Record<string, unknown> {
  return {
    analysis_id: annotation.analysisId,
    frame_index: annotation.frameIndex,
    coach_id: annotation.coachId,
    coach_name: annotation.coachName,
    annotation_type: annotation.annotationType,
    drawing_data: annotation.drawingData || null,
    text_content: annotation.textContent || null,
    voice_url: annotation.voiceUrl || null,
    voice_duration_seconds: annotation.voiceDurationSeconds || null,
    position: annotation.position || null,
    timestamp: annotation.timestamp || null,
  };
}

/**
 * Convert DB record to annotation format.
 */
export function fromDBRecord(record: Record<string, unknown>): FrameAnnotation {
  return {
    id: record.id as string,
    analysisId: record.analysis_id as string,
    frameIndex: record.frame_index as number,
    coachId: record.coach_id as string,
    coachName: (record.coach_name as string) || 'Coach',
    annotationType: record.annotation_type as AnnotationType,
    drawingData: record.drawing_data as DrawingData | undefined,
    textContent: record.text_content as string | undefined,
    voiceUrl: record.voice_url as string | undefined,
    voiceDurationSeconds: record.voice_duration_seconds as number | undefined,
    position: record.position as { x: number; y: number } | undefined,
    timestamp: record.timestamp as number | undefined,
    createdAt: record.created_at as string | undefined,
    updatedAt: record.updated_at as string | undefined,
  };
}

/**
 * Generate a frame ID for annotation loading.
 * Format: "analysisId:frameIndex"
 */
export function makeFrameId(analysisId: string, frameIndex: number): string {
  return `${analysisId}:${frameIndex}`;
}

/**
 * Parse a frame ID back into components.
 */
export function parseFrameId(frameId: string): { analysisId: string; frameIndex: number } | null {
  const parts = frameId.split(':');
  if (parts.length !== 2) return null;

  const frameIndex = parseInt(parts[1], 10);
  if (isNaN(frameIndex)) return null;

  return { analysisId: parts[0], frameIndex };
}

/**
 * Create an SVG representation of drawing annotations for export.
 */
export function drawingsToSVG(
  drawings: DrawingData[],
  width: number = 1280,
  height: number = 720,
): string {
  const elements: string[] = [];

  for (const drawing of drawings) {
    const color = drawing.color || '#ff0000';
    const strokeWidth = drawing.strokeWidth || 2;

    switch (drawing.type) {
      case 'line':
        if (drawing.points.length >= 2) {
          const p1 = drawing.points[0];
          const p2 = drawing.points[1];
          elements.push(
            `<line x1="${p1.x * width}" y1="${p1.y * height}" x2="${p2.x * width}" y2="${p2.y * height}" stroke="${color}" stroke-width="${strokeWidth}" />`
          );
        }
        break;

      case 'circle':
        if (drawing.points.length >= 2) {
          const center = drawing.points[0];
          const edge = drawing.points[1];
          const r = Math.sqrt(
            ((edge.x - center.x) * width) ** 2 +
            ((edge.y - center.y) * height) ** 2
          );
          elements.push(
            `<circle cx="${center.x * width}" cy="${center.y * height}" r="${r}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" />`
          );
        }
        break;

      case 'arrow':
        if (drawing.points.length >= 2) {
          const start = drawing.points[0];
          const end = drawing.points[1];
          elements.push(
            `<line x1="${start.x * width}" y1="${start.y * height}" x2="${end.x * width}" y2="${end.y * height}" stroke="${color}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)" />`
          );
        }
        break;

      case 'freehand':
        if (drawing.points.length >= 2) {
          const pathData = drawing.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * width} ${p.y * height}`)
            .join(' ');
          elements.push(
            `<path d="${pathData}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" />`
          );
        }
        break;

      case 'rectangle':
        if (drawing.points.length >= 2) {
          const tl = drawing.points[0];
          const br = drawing.points[1];
          elements.push(
            `<rect x="${Math.min(tl.x, br.x) * width}" y="${Math.min(tl.y, br.y) * height}" width="${Math.abs(br.x - tl.x) * width}" height="${Math.abs(br.y - tl.y) * height}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" />`
          );
        }
        break;
    }

    // Add label if present
    if (drawing.label && drawing.points.length > 0) {
      const labelPos = drawing.points[0];
      elements.push(
        `<text x="${labelPos.x * width}" y="${(labelPos.y * height) - 5}" fill="${color}" font-size="14" font-family="sans-serif">${escapeXml(drawing.label)}</text>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
    </marker>
  </defs>
  ${elements.join('\n  ')}
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
