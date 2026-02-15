// Training Data Export Script — Feature 9
//
// Exports AI-coach validation pairs for model fine-tuning and calibration.
// Run: npx tsx scripts/export-training-data.ts [--type scoring_calibration|vision_finetune|full_pipeline]

import { createClient } from '@supabase/supabase-js';
import { evaluateModel, generateCalibrationAdjustments } from '../lib/model-evaluation';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const exportType = (process.argv[2]?.replace('--type=', '') || 'scoring_calibration') as string;
  console.log(`\n=== LevelUp Training Data Export (${exportType}) ===\n`);

  // Fetch validations
  const { data: validations, error: valError } = await supabase
    .from('expert_validations')
    .select('*')
    .order('created_at', { ascending: true });

  if (valError || !validations || validations.length === 0) {
    console.log('No expert validations found. Submit coach scores first at /coach/validate');
    process.exit(0);
  }

  console.log(`Found ${validations.length} expert validations.`);

  // Fetch analyses
  const analysisIds = [...new Set(validations.map((v: any) => v.analysis_id))];
  const { data: analyses } = await supabase
    .from('match_analyses')
    .select('id, overall_score, standing, top, bottom, sub_scores, match_style, analysis_json')
    .in('id', analysisIds);

  if (!analyses || analyses.length === 0) {
    console.log('No matching analyses found.');
    process.exit(0);
  }

  const analysisMap = new Map((analyses as any[]).map(a => [a.id, a]));

  // Build pairs
  const pairs = [];
  for (const v of validations as any[]) {
    const analysis = analysisMap.get(v.analysis_id);
    if (!analysis) continue;
    const scores = v.scores as any;
    if (!scores) continue;

    pairs.push({
      analysisId: v.analysis_id,
      aiOverall: analysis.overall_score,
      coachOverall: scores.overall || 0,
      aiStanding: analysis.standing,
      coachStanding: scores.standing || 0,
      aiTop: analysis.top,
      coachTop: scores.top || 0,
      aiBottom: analysis.bottom,
      coachBottom: scores.bottom || 0,
      coachName: v.coach_name,
      matchStyle: analysis.match_style,
      ...(exportType === 'full_pipeline' ? { analysisJson: analysis.analysis_json } : {}),
    });
  }

  console.log(`Built ${pairs.length} AI-coach pairs.\n`);

  // Evaluate
  const metrics = evaluateModel(pairs);
  console.log('=== Model Evaluation Metrics ===');
  console.log(`Sample size: ${metrics.sampleSize}`);
  console.log(`Overall MAE: ${metrics.overall.mae} | Correlation: ${metrics.overall.correlation}`);
  console.log(`Standing MAE: ${metrics.standing.mae} | Top MAE: ${metrics.top.mae} | Bottom MAE: ${metrics.bottom.mae}`);
  console.log(`Bias: ${metrics.biasProfile.direction} (${metrics.biasProfile.magnitude} pts)`);
  console.log(`Agreement: ${metrics.overall.percentWithin10}% within 10 pts\n`);

  // Calibration
  const calibrations = generateCalibrationAdjustments(metrics);
  if (calibrations.length > 0) {
    console.log('=== Calibration Recommendations ===');
    for (const cal of calibrations) {
      console.log(`  [${cal.category}] ${cal.reasoning}`);
    }
    console.log();
  }

  // Write export file
  const output = {
    exportType,
    exportedAt: new Date().toISOString(),
    pairCount: pairs.length,
    metrics,
    calibrations,
    pairs,
  };

  const filename = `training-export-${exportType}-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  console.log(`Export written to ${filename} (${pairs.length} pairs)`);

  // Record in database
  await supabase.from('training_data_exports').insert({
    export_type: exportType,
    analysis_count: pairs.length,
    validation_count: validations.length,
    file_path: filename,
    metadata: { metrics, calibrations },
  });

  console.log('Export recorded in database. Done.');
}

main().catch(console.error);
