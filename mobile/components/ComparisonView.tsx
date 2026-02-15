import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { AnalysisHistoryEntry } from '@/lib/types';

type Props = {
  entryA: AnalysisHistoryEntry;
  entryB: AnalysisHistoryEntry;
  onBack: () => void;
};

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
};

const getDeltaColor = (delta: number) => {
  if (delta > 0) return '#22C55E';
  if (delta < 0) return '#EF4444';
  return '#71717A';
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function ComparisonView({ entryA, entryB, onBack }: Props) {
  const [strengthsExpanded, setStrengthsExpanded] = useState(false);
  const [weaknessesExpanded, setWeaknessesExpanded] = useState(false);

  const a = entryA.result;
  const b = entryB.result;

  const overallDelta = b.overall_score - a.overall_score;
  const standingDelta = b.position_scores.standing - a.position_scores.standing;
  const topDelta = b.position_scores.top - a.position_scores.top;
  const bottomDelta = b.position_scores.bottom - a.position_scores.bottom;

  // Compare strengths
  const aStrengths = new Set(a.strengths.map((s) => s.toLowerCase().trim()));
  const bStrengths = new Set(b.strengths.map((s) => s.toLowerCase().trim()));
  const keptStrengths = a.strengths.filter((s) => bStrengths.has(s.toLowerCase().trim()));
  const newStrengths = b.strengths.filter((s) => !aStrengths.has(s.toLowerCase().trim()));
  const lostStrengths = a.strengths.filter((s) => !bStrengths.has(s.toLowerCase().trim()));

  // Compare weaknesses
  const aWeaknesses = new Set(a.weaknesses.map((w) => w.toLowerCase().trim()));
  const bWeaknesses = new Set(b.weaknesses.map((w) => w.toLowerCase().trim()));
  const fixedWeaknesses = a.weaknesses.filter((w) => !bWeaknesses.has(w.toLowerCase().trim()));
  const newWeaknesses = b.weaknesses.filter((w) => !aWeaknesses.has(w.toLowerCase().trim()));
  const persistingWeaknesses = a.weaknesses.filter((w) => bWeaknesses.has(w.toLowerCase().trim()));

  const DeltaIcon = ({ delta }: { delta: number }) => {
    if (delta > 0) return <TrendingUp size={14} color="#22C55E" />;
    if (delta < 0) return <TrendingDown size={14} color="#EF4444" />;
    return <Minus size={12} color="#71717A" />;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={18} color="#A1A1AA" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>MATCH COMPARISON</Text>

      {/* Match Cards */}
      <View style={styles.matchRow}>
        <View style={styles.matchCard}>
          {entryA.thumbnailUri && (
            <Image source={{ uri: entryA.thumbnailUri }} style={styles.matchThumb} />
          )}
          <Text style={styles.matchLabel}>EARLIER</Text>
          <Text style={styles.matchDate}>{formatDate(entryA.createdAt)}</Text>
          <Text style={styles.matchFile} numberOfLines={1}>{entryA.videoFileName}</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.matchCard}>
          {entryB.thumbnailUri && (
            <Image source={{ uri: entryB.thumbnailUri }} style={styles.matchThumb} />
          )}
          <Text style={styles.matchLabel}>LATER</Text>
          <Text style={styles.matchDate}>{formatDate(entryB.createdAt)}</Text>
          <Text style={styles.matchFile} numberOfLines={1}>{entryB.videoFileName}</Text>
        </View>
      </View>

      {/* Overall Score Comparison */}
      <View style={styles.overallRow}>
        <View style={styles.overallCard}>
          <Text style={[styles.overallScore, { color: getScoreColor(a.overall_score) }]}>
            {a.overall_score}
          </Text>
        </View>

        <View style={[styles.deltaCard, { backgroundColor: getDeltaColor(overallDelta) + '1A' }]}>
          <DeltaIcon delta={overallDelta} />
        </View>

        <View style={styles.overallCard}>
          <Text style={[styles.overallScore, { color: getScoreColor(b.overall_score) }]}>
            {b.overall_score}
          </Text>
        </View>
      </View>
      <Text style={styles.overallLabel}>OVERALL SCORE</Text>

      {/* Position Score Comparison */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>POSITION SCORES</Text>
        {[
          { label: 'STANDING', scoreA: a.position_scores.standing, scoreB: b.position_scores.standing, delta: standingDelta },
          { label: 'TOP', scoreA: a.position_scores.top, scoreB: b.position_scores.top, delta: topDelta },
          { label: 'BOTTOM', scoreA: a.position_scores.bottom, scoreB: b.position_scores.bottom, delta: bottomDelta },
        ].map((pos) => (
          <View key={pos.label} style={styles.positionRow}>
            <Text style={styles.posLabel}>{pos.label}</Text>
            <Text style={[styles.posScore, { color: getScoreColor(pos.scoreA) }]}>{pos.scoreA}</Text>
            <View style={styles.posArrow}>
              <DeltaIcon delta={pos.delta} />
            </View>
            <Text style={[styles.posScore, { color: getScoreColor(pos.scoreB) }]}>{pos.scoreB}</Text>
          </View>
        ))}
      </View>

      {/* Sub-Score Comparison (if enriched data available) */}
      {a.enriched?.sub_scores && b.enriched?.sub_scores && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUB-SCORE BREAKDOWN</Text>
          {[
            { group: 'Standing', items: [
              { label: 'Stance & Motion', a: a.enriched.sub_scores.standing.stance_motion, b: b.enriched.sub_scores.standing.stance_motion },
              { label: 'Shot Selection', a: a.enriched.sub_scores.standing.shot_selection, b: b.enriched.sub_scores.standing.shot_selection },
              { label: 'Shot Finishing', a: a.enriched.sub_scores.standing.shot_finishing, b: b.enriched.sub_scores.standing.shot_finishing },
              { label: 'Sprawl & Defense', a: a.enriched.sub_scores.standing.sprawl_defense, b: b.enriched.sub_scores.standing.sprawl_defense },
              { label: 'Re-attacks', a: a.enriched.sub_scores.standing.reattacks_chains, b: b.enriched.sub_scores.standing.reattacks_chains },
            ]},
            { group: 'Top', items: [
              { label: 'Ride Tightness', a: a.enriched.sub_scores.top.ride_tightness, b: b.enriched.sub_scores.top.ride_tightness },
              { label: 'Breakdowns', a: a.enriched.sub_scores.top.breakdowns, b: b.enriched.sub_scores.top.breakdowns },
              { label: 'Turns & NF', a: a.enriched.sub_scores.top.turns_nearfalls, b: b.enriched.sub_scores.top.turns_nearfalls },
              { label: 'Mat Returns', a: a.enriched.sub_scores.top.mat_returns, b: b.enriched.sub_scores.top.mat_returns },
            ]},
            { group: 'Bottom', items: [
              { label: 'Base & Posture', a: a.enriched.sub_scores.bottom.base_posture, b: b.enriched.sub_scores.bottom.base_posture },
              { label: 'Stand-ups', a: a.enriched.sub_scores.bottom.standups, b: b.enriched.sub_scores.bottom.standups },
              { label: 'Sit-outs', a: a.enriched.sub_scores.bottom.sitouts_switches, b: b.enriched.sub_scores.bottom.sitouts_switches },
              { label: 'Reversals', a: a.enriched.sub_scores.bottom.reversals, b: b.enriched.sub_scores.bottom.reversals },
            ]},
          ].map((group) => (
            <View key={group.group} style={styles.subScoreGroup}>
              <Text style={styles.subScoreGroupLabel}>{group.group}</Text>
              {group.items.map((item) => {
                const d = item.b - item.a;
                return (
                  <View key={item.label} style={styles.subScoreCard}>
                    <Text style={styles.subScoreLabel}>{item.label}</Text>
                    <View style={styles.subScoreStackedRow}>
                      <Text style={styles.subScoreTag}>A</Text>
                      <Text style={[styles.subScoreVal, { color: getScoreColor(item.a) }]}>{item.a}</Text>
                    </View>
                    <View style={styles.subScoreStackedRow}>
                      <Text style={styles.subScoreTag}>B</Text>
                      <Text style={[styles.subScoreVal, { color: getScoreColor(item.b) }]}>{item.b}</Text>
                      <DeltaIcon delta={d} />
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Strengths Comparison — Collapsible */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setStrengthsExpanded(!strengthsExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>STRENGTHS EVOLUTION</Text>
          <View style={styles.accordionBadgeRow}>
            {newStrengths.length > 0 && (
              <View style={[styles.accordionBadge, { backgroundColor: '#22C55E20' }]}>
                <TrendingUp size={10} color="#22C55E" />
                <Text style={[styles.accordionBadgeText, { color: '#22C55E' }]}>{newStrengths.length}</Text>
              </View>
            )}
            {lostStrengths.length > 0 && (
              <View style={[styles.accordionBadge, { backgroundColor: '#EF444420' }]}>
                <TrendingDown size={10} color="#EF4444" />
                <Text style={[styles.accordionBadgeText, { color: '#EF4444' }]}>{lostStrengths.length}</Text>
              </View>
            )}
            {strengthsExpanded ? <ChevronUp size={16} color="#71717A" /> : <ChevronDown size={16} color="#71717A" />}
          </View>
        </TouchableOpacity>
        {strengthsExpanded && (
          <>
            {newStrengths.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={styles.changeLabel}>NEW STRENGTHS</Text>
                {newStrengths.map((s, i) => (
                  <View key={i} style={styles.changeItem}>
                    <CheckCircle size={14} color="#22C55E" />
                    <Text style={styles.changeText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
            {keptStrengths.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={[styles.changeLabel, { color: '#71717A' }]}>MAINTAINED</Text>
                {keptStrengths.map((s, i) => (
                  <View key={i} style={styles.changeItem}>
                    <Minus size={14} color="#71717A" />
                    <Text style={[styles.changeText, { color: '#71717A' }]}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
            {lostStrengths.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={[styles.changeLabel, { color: '#EF4444' }]}>NO LONGER NOTED</Text>
                {lostStrengths.map((s, i) => (
                  <View key={i} style={styles.changeItem}>
                    <TrendingDown size={14} color="#EF4444" />
                    <Text style={[styles.changeText, { color: '#A1A1AA' }]}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* Weaknesses Comparison — Collapsible */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setWeaknessesExpanded(!weaknessesExpanded)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: '#E91E8C' }]}>WEAKNESSES EVOLUTION</Text>
          <View style={styles.accordionBadgeRow}>
            {fixedWeaknesses.length > 0 && (
              <View style={[styles.accordionBadge, { backgroundColor: '#22C55E20' }]}>
                <CheckCircle size={10} color="#22C55E" />
                <Text style={[styles.accordionBadgeText, { color: '#22C55E' }]}>{fixedWeaknesses.length}</Text>
              </View>
            )}
            {newWeaknesses.length > 0 && (
              <View style={[styles.accordionBadge, { backgroundColor: '#EF444420' }]}>
                <TrendingDown size={10} color="#EF4444" />
                <Text style={[styles.accordionBadgeText, { color: '#EF4444' }]}>{newWeaknesses.length}</Text>
              </View>
            )}
            {weaknessesExpanded ? <ChevronUp size={16} color="#71717A" /> : <ChevronDown size={16} color="#71717A" />}
          </View>
        </TouchableOpacity>
        {weaknessesExpanded && (
          <>
            {fixedWeaknesses.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={[styles.changeLabel, { color: '#22C55E' }]}>ADDRESSED</Text>
                {fixedWeaknesses.map((w, i) => (
                  <View key={i} style={styles.changeItem}>
                    <CheckCircle size={14} color="#22C55E" />
                    <Text style={[styles.changeText, { textDecorationLine: 'line-through', color: '#52525B' }]}>{w}</Text>
                  </View>
                ))}
              </View>
            )}
            {persistingWeaknesses.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={[styles.changeLabel, { color: '#EAB308' }]}>STILL PRESENT</Text>
                {persistingWeaknesses.map((w, i) => (
                  <View key={i} style={styles.changeItem}>
                    <AlertTriangle size={14} color="#EAB308" />
                    <Text style={styles.changeText}>{w}</Text>
                  </View>
                ))}
              </View>
            )}
            {newWeaknesses.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={[styles.changeLabel, { color: '#EF4444' }]}>NEW AREAS</Text>
                {newWeaknesses.map((w, i) => (
                  <View key={i} style={styles.changeItem}>
                    <TrendingDown size={14} color="#EF4444" />
                    <Text style={styles.changeText}>{w}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E4E4E7',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  matchCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  matchThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 8,
  },
  matchLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#52525B',
    letterSpacing: 1.5,
  },
  matchDate: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
    marginTop: 2,
  },
  matchFile: {
    fontSize: 10,
    color: '#52525B',
    marginTop: 2,
  },
  vsContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
  },

  // Overall
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  overallCard: {
    flex: 1,
    alignItems: 'center',
  },
  overallScore: {
    fontSize: 40,
    fontWeight: '900',
  },
  overallLabel: {
    fontSize: 11,
    color: '#52525B',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  deltaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deltaValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Position scores
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  posLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    width: 70,
  },
  posScore: {
    fontSize: 22,
    fontWeight: '800',
    width: 40,
    textAlign: 'center',
  },
  posArrow: {
    flex: 1,
    alignItems: 'center',
  },
  // Sub-scores (stacked layout)
  subScoreGroup: {
    marginBottom: 16,
  },
  subScoreGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  subScoreCard: {
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1F1F23',
  },
  subScoreLabel: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
    marginBottom: 6,
  },
  subScoreStackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subScoreTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#52525B',
    width: 14,
  },
  subScoreVal: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Changes
  changeGroup: {
    marginBottom: 14,
  },
  changeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 1,
    marginBottom: 6,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  changeText: {
    fontSize: 13,
    color: '#E4E4E7',
    flex: 1,
    lineHeight: 18,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  accordionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  accordionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
