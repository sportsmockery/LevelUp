// Structured logging for the analysis pipeline.
// Replaces ad-hoc console.log calls with typed, timestamped entries.

export type PipelineStage =
  | 'triage_start'
  | 'triage_complete'
  | 'pass1_start'
  | 'pass1_batch'
  | 'pass1_complete'
  | 'identity_check'
  | 'pose_estimation'
  | 'temporal_analysis'
  | 'pass2_start'
  | 'pass2_complete'
  | 'validation'
  | 'save'
  | 'error';

type LogEntry = {
  stage: PipelineStage;
  elapsed_ms: number;
  data: Record<string, unknown>;
};

export class PipelineLogger {
  private entries: LogEntry[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  log(stage: PipelineStage, data: Record<string, unknown>) {
    const elapsed = Date.now() - this.startTime;
    this.entries.push({ stage, elapsed_ms: elapsed, data });
    console.log(`[LevelUp] [${stage}] +${elapsed}ms ${JSON.stringify(data)}`);
  }

  warn(stage: PipelineStage, data: Record<string, unknown>) {
    const elapsed = Date.now() - this.startTime;
    this.entries.push({ stage, elapsed_ms: elapsed, data });
    console.warn(`[LevelUp] [${stage}] +${elapsed}ms ${JSON.stringify(data)}`);
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  summary(): { total_ms: number; stages: number; entries: LogEntry[] } {
    return {
      total_ms: Date.now() - this.startTime,
      stages: this.entries.length,
      entries: this.entries,
    };
  }
}
