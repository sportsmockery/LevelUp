import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AnalysisResult } from './types';

type ExportOptions = {
  result: AnalysisResult;
  videoFileName?: string;
  matchDate?: string;
  coachNotes?: string;
};

function getScoreColor(score: number): string {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 80) return 'Advanced';
  if (score >= 70) return 'Solid';
  if (score >= 60) return 'Developing';
  return 'Beginner';
}

function buildReportHTML(options: ExportOptions): string {
  const { result, videoFileName, matchDate, coachNotes } = options;
  const date = matchDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const overallColor = getScoreColor(result.overall_score);

  const subScoresHTML = result.enriched?.sub_scores ? `
    <div class="sub-scores-section">
      <h3>Detailed Sub-Scores</h3>
      <div class="sub-score-group">
        <h4>Standing</h4>
        <table class="sub-scores-table">
          <tr><td>Stance & Motion</td><td class="score">${result.enriched.sub_scores.standing.stance_motion}/20</td></tr>
          <tr><td>Shot Selection</td><td class="score">${result.enriched.sub_scores.standing.shot_selection}/20</td></tr>
          <tr><td>Shot Finishing</td><td class="score">${result.enriched.sub_scores.standing.shot_finishing}/20</td></tr>
          <tr><td>Sprawl & Defense</td><td class="score">${result.enriched.sub_scores.standing.sprawl_defense}/20</td></tr>
          <tr><td>Re-attacks & Chains</td><td class="score">${result.enriched.sub_scores.standing.reattacks_chains}/20</td></tr>
        </table>
      </div>
      <div class="sub-score-group">
        <h4>Top</h4>
        <table class="sub-scores-table">
          <tr><td>Ride Tightness</td><td class="score">${result.enriched.sub_scores.top.ride_tightness}/25</td></tr>
          <tr><td>Breakdowns</td><td class="score">${result.enriched.sub_scores.top.breakdowns}/25</td></tr>
          <tr><td>Turns & Near Falls</td><td class="score">${result.enriched.sub_scores.top.turns_nearfalls}/25</td></tr>
          <tr><td>Mat Returns</td><td class="score">${result.enriched.sub_scores.top.mat_returns}/25</td></tr>
        </table>
      </div>
      <div class="sub-score-group">
        <h4>Bottom</h4>
        <table class="sub-scores-table">
          <tr><td>Base & Posture</td><td class="score">${result.enriched.sub_scores.bottom.base_posture}/25</td></tr>
          <tr><td>Stand-ups</td><td class="score">${result.enriched.sub_scores.bottom.standups}/25</td></tr>
          <tr><td>Sit-outs & Switches</td><td class="score">${result.enriched.sub_scores.bottom.sitouts_switches}/25</td></tr>
          <tr><td>Reversals</td><td class="score">${result.enriched.sub_scores.bottom.reversals}/25</td></tr>
        </table>
      </div>
    </div>
  ` : '';

  const fatigueHTML = result.enriched?.fatigue_analysis ? `
    <div class="fatigue-section">
      <h3>Fatigue Analysis</h3>
      <div class="fatigue-grid">
        <div class="fatigue-item">
          <span class="fatigue-label">1st Half Score</span>
          <span class="fatigue-value">${result.enriched.fatigue_analysis.first_half_score}</span>
        </div>
        <div class="fatigue-item">
          <span class="fatigue-label">2nd Half Score</span>
          <span class="fatigue-value">${result.enriched.fatigue_analysis.second_half_score}</span>
        </div>
        <div class="fatigue-item">
          <span class="fatigue-label">Delta</span>
          <span class="fatigue-value ${result.enriched.fatigue_analysis.score_delta < -10 ? 'negative' : ''}">${result.enriched.fatigue_analysis.score_delta > 0 ? '+' : ''}${result.enriched.fatigue_analysis.score_delta}</span>
        </div>
      </div>
      ${result.enriched.fatigue_analysis.conditioning_flag ? '<p class="conditioning-flag">&#9888; Conditioning flag: athlete shows significant fatigue indicators</p>' : ''}
      ${result.enriched.fatigue_analysis.conditioning_notes ? `<p class="fatigue-notes">${result.enriched.fatigue_analysis.conditioning_notes}</p>` : ''}
    </div>
  ` : '';

  const coachNotesHTML = coachNotes ? `
    <div class="coach-notes">
      <h3>Coach Notes</h3>
      <p>${coachNotes.replace(/\n/g, '<br/>')}</p>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; padding: 32px; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 3px solid #2563EB; padding-bottom: 24px; }
    .header h1 { font-size: 28px; color: #2563EB; letter-spacing: 2px; margin-bottom: 4px; }
    .header .subtitle { color: #666; font-size: 14px; }
    .header .meta { color: #999; font-size: 12px; margin-top: 8px; }
    .overall-score { text-align: center; margin: 24px 0; }
    .score-circle { display: inline-block; width: 100px; height: 100px; border-radius: 50%; border: 4px solid ${overallColor}; line-height: 92px; font-size: 42px; font-weight: 900; color: ${overallColor}; }
    .score-label { font-size: 12px; color: #666; letter-spacing: 2px; margin-top: 8px; font-weight: 700; }
    .score-level { font-size: 14px; color: ${overallColor}; font-weight: 600; margin-top: 4px; }
    .position-grid { display: flex; gap: 16px; margin: 24px 0; }
    .position-card { flex: 1; text-align: center; padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; }
    .position-card .pos-score { font-size: 28px; font-weight: 800; }
    .position-card .pos-label { font-size: 11px; color: #666; letter-spacing: 1px; font-weight: 700; margin-top: 4px; }
    h3 { font-size: 14px; color: #2563EB; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase; }
    .reasoning-card { background: #f9f9f9; border-radius: 10px; padding: 14px; margin-bottom: 10px; border-left: 3px solid #ddd; }
    .reasoning-card .label { font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
    .reasoning-card .text { font-size: 13px; color: #444; line-height: 1.6; }
    .list-section { margin: 24px 0; }
    .list-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
    .list-item .icon { font-size: 16px; flex-shrink: 0; }
    .drill-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
    .drill-num { width: 24px; height: 24px; border-radius: 12px; background: #2563EB; color: #fff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .drill-text { font-size: 13px; color: #333; line-height: 1.5; flex: 1; }
    .summary-card { background: #f0f7ff; border-radius: 10px; padding: 16px; margin: 16px 0; }
    .summary-card p { font-size: 14px; color: #333; line-height: 1.6; }
    .sub-scores-section { margin: 24px 0; }
    .sub-score-group { margin-bottom: 16px; }
    .sub-score-group h4 { font-size: 13px; color: #333; margin-bottom: 8px; font-weight: 600; }
    .sub-scores-table { width: 100%; border-collapse: collapse; }
    .sub-scores-table td { padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
    .sub-scores-table .score { text-align: right; font-weight: 700; color: #2563EB; }
    .fatigue-section { margin: 24px 0; background: #fff8f0; border-radius: 10px; padding: 16px; }
    .fatigue-grid { display: flex; gap: 16px; margin-bottom: 12px; }
    .fatigue-item { flex: 1; text-align: center; }
    .fatigue-label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; }
    .fatigue-value { font-size: 22px; font-weight: 800; color: #333; }
    .fatigue-value.negative { color: #EF4444; }
    .conditioning-flag { color: #EF4444; font-weight: 600; font-size: 13px; margin-top: 8px; }
    .fatigue-notes { color: #666; font-size: 13px; margin-top: 6px; line-height: 1.5; }
    .coach-notes { margin: 24px 0; background: #fffbef; border-radius: 10px; padding: 16px; border-left: 3px solid #EAB308; }
    .coach-notes p { font-size: 13px; color: #333; line-height: 1.6; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #aaa; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LEVELUP</h1>
    <div class="subtitle">Wrestling Analysis Report</div>
    <div class="meta">${date}${videoFileName ? ` &mdash; ${videoFileName}` : ''}${result.framesAnalyzed > 0 ? ` &mdash; ${result.framesAnalyzed} frames analyzed` : ''}</div>
  </div>

  <div class="overall-score">
    <div class="score-circle">${result.overall_score}</div>
    <div class="score-label">OVERALL SCORE</div>
    <div class="score-level">${getScoreLabel(result.overall_score)}</div>
  </div>

  <div class="position-grid">
    <div class="position-card">
      <div class="pos-score" style="color: ${getScoreColor(result.position_scores.standing)}">${result.position_scores.standing}</div>
      <div class="pos-label">STANDING</div>
    </div>
    <div class="position-card">
      <div class="pos-score" style="color: ${getScoreColor(result.position_scores.top)}">${result.position_scores.top}</div>
      <div class="pos-label">TOP</div>
    </div>
    <div class="position-card">
      <div class="pos-score" style="color: ${getScoreColor(result.position_scores.bottom)}">${result.position_scores.bottom}</div>
      <div class="pos-label">BOTTOM</div>
    </div>
  </div>

  ${result.position_reasoning ? `
  <div class="list-section">
    <h3>Score Reasoning</h3>
    <div class="reasoning-card" style="border-left-color: ${getScoreColor(result.position_scores.standing)}">
      <div class="label" style="color: ${getScoreColor(result.position_scores.standing)}">STANDING</div>
      <div class="text">${result.position_reasoning.standing}</div>
    </div>
    <div class="reasoning-card" style="border-left-color: ${getScoreColor(result.position_scores.top)}">
      <div class="label" style="color: ${getScoreColor(result.position_scores.top)}">TOP</div>
      <div class="text">${result.position_reasoning.top}</div>
    </div>
    <div class="reasoning-card" style="border-left-color: ${getScoreColor(result.position_scores.bottom)}">
      <div class="label" style="color: ${getScoreColor(result.position_scores.bottom)}">BOTTOM</div>
      <div class="text">${result.position_reasoning.bottom}</div>
    </div>
  </div>
  ` : ''}

  ${subScoresHTML}

  <div class="list-section">
    <h3>Strengths</h3>
    ${result.strengths.map((s) => `<div class="list-item"><span class="icon">&#10004;</span><span>${s}</span></div>`).join('')}
  </div>

  <div class="list-section">
    <h3>Areas to Improve</h3>
    ${result.weaknesses.map((w) => `<div class="list-item"><span class="icon" style="color: #E91E8C">&#9654;</span><span>${w}</span></div>`).join('')}
  </div>

  <div class="list-section">
    <h3>Recommended Drills</h3>
    ${result.drills.map((d, i) => `<div class="drill-item"><div class="drill-num">${i + 1}</div><div class="drill-text">${d}</div></div>`).join('')}
  </div>

  <div class="summary-card">
    <h3>Summary</h3>
    <p>${result.summary}</p>
  </div>

  ${fatigueHTML}
  ${coachNotesHTML}

  <div class="footer">
    Generated by LevelUp &mdash; AI Wrestling Coach
  </div>
</body>
</html>`;
}

export async function exportAnalysisPDF(options: ExportOptions): Promise<void> {
  const html = buildReportHTML(options);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share LevelUp Analysis Report',
    UTI: 'com.adobe.pdf',
  });
}

export async function canShare(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}
