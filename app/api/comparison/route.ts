import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      wrestlerProfileId,
      comparisonType,
      frameAId,
      frameBId,
      autoMatchElite,
    } = body;

    if (!comparisonType || !frameAId) {
      return NextResponse.json({ error: 'comparisonType and frameAId are required' }, { status: 400 });
    }

    let resolvedFrameBId = frameBId;
    let eliteTechnique = null;

    // If self_vs_elite with autoMatch, find best matching elite technique
    if (comparisonType === 'self_vs_elite' && autoMatchElite && !frameBId) {
      // Parse frameAId to get analysis_id and frame_index
      const [analysisId, frameIdx] = frameAId.split(':');

      // Fetch the analysis to find technique info
      const { data: analysis } = await supabase
        .from('match_analyses')
        .select('analysis_json, action_summary')
        .eq('id', analysisId)
        .single();

      if (analysis) {
        // Try to determine technique from action windows or frame evidence
        const actionSummary = analysis.action_summary as any;
        let technique = 'double_leg_shot'; // default

        if (actionSummary?.shotAttempts?.total > 0) technique = 'double_leg_shot';
        else if (actionSummary?.escapeAttempts?.total > 0) technique = 'standup_escape';
        else if (actionSummary?.turnAttempts?.total > 0) technique = 'tilt_series';

        // Find matching elite technique
        const { data: eliteMatches } = await supabase
          .from('elite_technique_library')
          .select('*')
          .eq('technique_name', technique)
          .limit(1);

        if (eliteMatches && eliteMatches.length > 0) {
          eliteTechnique = eliteMatches[0];
          resolvedFrameBId = `elite:${eliteTechnique.id}`;
        }
      }
    }

    // If self_vs_elite with explicit frameBId starting with 'elite:'
    if (comparisonType === 'self_vs_elite' && resolvedFrameBId?.startsWith('elite:')) {
      const eliteId = resolvedFrameBId.replace('elite:', '');
      const { data: elite } = await supabase
        .from('elite_technique_library')
        .select('*')
        .eq('id', eliteId)
        .single();

      if (elite) {
        eliteTechnique = elite;
      }
    }

    // Compute comparison metrics
    let metrics = null;
    if (eliteTechnique) {
      // Get athlete's biomechanical measurements for the frame
      const [analysisId] = frameAId.split(':');
      const { data: analysis } = await supabase
        .from('match_analyses')
        .select('biomechanical_measurements, biomechanical_summary')
        .eq('id', analysisId)
        .single();

      if (analysis?.biomechanical_summary) {
        const athleteMeasurements = analysis.biomechanical_summary as Record<string, any>;
        const eliteMeasurements = eliteTechnique.biomechanical_measurements as Record<string, number>;

        const deltas: Record<string, { athlete: number; reference: number; delta: number }> = {};
        const recommendations: string[] = [];

        for (const [key, eliteVal] of Object.entries(eliteMeasurements)) {
          const athleteVal = athleteMeasurements[`avg_${key}`] ?? athleteMeasurements[key];
          if (athleteVal !== undefined && athleteVal !== null) {
            const delta = athleteVal - eliteVal;
            deltas[`${key}_delta`] = { athlete: athleteVal, reference: eliteVal, delta };

            if (Math.abs(delta) > 15) {
              const direction = delta > 0 ? 'higher' : 'lower';
              recommendations.push(
                `Your ${key.replace(/_/g, ' ')} is ${Math.abs(delta).toFixed(0)}° ${direction} than elite execution. ${
                  delta > 0 ? 'Reduce' : 'Increase'
                } for better technique.`
              );
            }
          }
        }

        const summaryParts = Object.entries(deltas)
          .filter(([, v]) => Math.abs(v.delta) > 10)
          .map(([key, v]) => `${key.replace('_delta', '').replace(/_/g, ' ')}: ${v.delta > 0 ? '+' : ''}${v.delta.toFixed(0)}°`);

        metrics = {
          ...deltas,
          summary: summaryParts.length > 0
            ? `Key differences from elite: ${summaryParts.join(', ')}`
            : 'Measurements are close to elite execution.',
          recommendations,
        };
      }
    }

    // Save comparison to database
    const { data: comparison, error: insertError } = await supabase
      .from('comparisons')
      .insert({
        wrestler_profile_id: wrestlerProfileId || null,
        comparison_type: comparisonType,
        frame_a_id: frameAId,
        frame_b_id: resolvedFrameBId || '',
        metrics,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[LevelUp] Comparison insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save comparison' }, { status: 500 });
    }

    return NextResponse.json({
      id: comparison?.id,
      comparisonType,
      frameAId,
      frameBId: resolvedFrameBId,
      metrics,
      eliteTechnique: eliteTechnique ? {
        id: eliteTechnique.id,
        techniqueName: eliteTechnique.technique_name,
        athleteName: eliteTechnique.athlete_name,
        notes: eliteTechnique.notes,
        source: eliteTechnique.source,
        biomechanicalMeasurements: eliteTechnique.biomechanical_measurements,
      } : null,
    });

  } catch (err: any) {
    console.error('[LevelUp] Comparison error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
