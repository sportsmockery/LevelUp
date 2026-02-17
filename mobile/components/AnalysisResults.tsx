import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle,
  ChevronRight,
  Cpu,
  RotateCcw,
  Video,
  AlertTriangle,
  Share2,
  Zap,
  Play,
} from 'lucide-react-native';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight as ArrowRightIcon,
} from 'lucide-react-native';
import { AnalysisResult } from '@/lib/types';
import { exportAnalysisPDF } from '@/lib/export';
import {
  getScoreTrendIndicator,
  formatPositionVsAvg,
} from '@/lib/score-comparison';

type Props = {
  result: AnalysisResult;
  thumbnailUri?: string | null;
  videoFileName?: string;
  athleteName?: string;
  showUploadAnother?: boolean;
  onUploadAnother?: () => void;
  previousScore?: number | null;
  positionAverages?: { standing: number; top: number; bottom: number } | null;
  frameTimestamps?: number[];
  onJumpToMoment?: (frameIndex: number) => void;
};

const formatTimestamp = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
};

export default function AnalysisResults({ result, thumbnailUri, videoFileName, athleteName, showUploadAnother, onUploadAnother, previousScore, positionAverages, frameTimestamps, onJumpToMoment }: Props) {
  const [coachNotes, setCoachNotes] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await exportAnalysisPDF({
        result,
        videoFileName,
        coachNotes: coachNotes.trim() || undefined,
        athleteName,
      });
    } catch (e: any) {
      if (!e?.message?.includes('dismissed')) {
        Alert.alert('Export Failed', e?.message || 'Could not generate PDF report.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      {/* Video Thumbnail Preview */}
      {thumbnailUri && (
        <View style={styles.thumbnailSection}>
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} />
          <View style={styles.thumbnailOverlay}>
            <Video size={24} color="#fff" />
          </View>
        </View>
      )}

      {/* Overall Score */}
      <View style={styles.scoreSection}>
        <LinearGradient
          colors={['#2563EB', '#E91E8C']}
          style={styles.scoreBadge}
        >
          <View style={styles.scoreInner}>
            <Text style={styles.scoreValue}>{result.overall_score}</Text>
          </View>
        </LinearGradient>
        <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
        {/* Score comparison badge */}
        {previousScore !== undefined && (() => {
          const delta = previousScore !== null ? result.overall_score - previousScore : null;
          const indicator = getScoreTrendIndicator(delta);
          return (
            <View style={[styles.comparisonBadge, { backgroundColor: indicator.bgColor }]}>
              {indicator.icon === 'up' || indicator.icon === 'up-double'
                ? <TrendingUp size={14} color={indicator.color} />
                : indicator.icon === 'down' || indicator.icon === 'down-double'
                ? <TrendingDown size={14} color={indicator.color} />
                : <ArrowRightIcon size={14} color={indicator.color} />}
              <Text style={[styles.comparisonText, { color: indicator.color }]}>
                {indicator.icon === 'up' || indicator.icon === 'up-double' ? '\u2191 ' : indicator.icon === 'down' || indicator.icon === 'down-double' ? '\u2193 ' : '\u2192 '}
                {indicator.label}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Position Scores */}
      <View style={styles.positionGrid}>
        {[
          { label: 'STANDING', key: 'standing' as const, score: result.position_scores.standing },
          { label: 'TOP', key: 'top' as const, score: result.position_scores.top },
          { label: 'BOTTOM', key: 'bottom' as const, score: result.position_scores.bottom },
        ].map((pos, i) => {
          const insufficient = pos.score === 0 && result.enriched?.confidence !== undefined && result.enriched.confidence < 0.3;
          const avgInfo = positionAverages && !insufficient
            ? formatPositionVsAvg(pos.label, pos.score, positionAverages[pos.key])
            : null;
          return (
            <View key={i} style={styles.positionCard}>
              {insufficient ? (
                <Text style={styles.insufficientText}>N/A</Text>
              ) : (
                <Text style={[styles.positionScore, { color: getScoreColor(pos.score) }]}>
                  {pos.score}
                </Text>
              )}
              <Text style={styles.positionLabel}>{pos.label}</Text>
              {insufficient && (
                <Text style={styles.insufficientLabel}>Insufficient footage</Text>
              )}
              {avgInfo && avgInfo.delta !== 0 && (
                <Text style={[styles.positionAvgDelta, { color: avgInfo.color }]}>
                  {avgInfo.text}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Score Reasoning */}
      {result.position_reasoning && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEVELUP SCORE REASONING</Text>
          {[
            { label: 'STANDING', reasoning: result.position_reasoning.standing, score: result.position_scores.standing },
            { label: 'TOP', reasoning: result.position_reasoning.top, score: result.position_scores.top },
            { label: 'BOTTOM', reasoning: result.position_reasoning.bottom, score: result.position_scores.bottom },
          ].map((pos, i) => (
            <View key={i} style={styles.reasoningCard}>
              <View style={styles.reasoningHeader}>
                <Text style={[styles.reasoningLabel, { color: getScoreColor(pos.score) }]}>
                  {pos.label}
                </Text>
                <Text style={[styles.reasoningScore, { color: getScoreColor(pos.score) }]}>
                  {pos.score}
                </Text>
              </View>
              <Text style={styles.reasoningText}>{pos.reasoning}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Key Moments */}
      {(() => {
        const keyMoments = (result.frame_annotations || [])
          .map((ann, i) => ({ ann, frameIdx: i }))
          .filter(({ ann }) => ann.is_key_moment);
        if (keyMoments.length === 0) return null;
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#EAB308' }]}>KEY MOMENTS</Text>
            {keyMoments.map(({ ann, frameIdx }, listIdx) => {
              const ts = frameTimestamps?.[frameIdx];
              const canJump = !!onJumpToMoment && ts !== undefined;
              return (
                <TouchableOpacity
                  key={frameIdx}
                  style={styles.keyMomentCard}
                  onPress={() => canJump && onJumpToMoment!(frameIdx)}
                  disabled={!canJump}
                  activeOpacity={canJump ? 0.7 : 1}
                >
                  <View style={styles.keyMomentLeft}>
                    <View style={styles.keyMomentIcon}>
                      <Zap size={14} color="#EAB308" />
                    </View>
                    <View style={styles.keyMomentContent}>
                      <Text style={styles.keyMomentAction}>{ann.action}</Text>
                      <Text style={styles.keyMomentDetail} numberOfLines={2}>{ann.detail}</Text>
                    </View>
                  </View>
                  <View style={styles.keyMomentRight}>
                    {ts !== undefined && (
                      <Text style={styles.keyMomentTimestamp}>{formatTimestamp(ts)}</Text>
                    )}
                    {canJump && <Play size={14} color="#2563EB" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })()}

      {/* Strengths */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STRENGTHS</Text>
        {result.strengths.map((s, i) => (
          <View key={i} style={styles.listItem}>
            <CheckCircle size={18} color="#22C55E" />
            <Text style={styles.listText}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Weaknesses */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#E91E8C' }]}>
          AREAS TO IMPROVE
        </Text>
        {result.weaknesses.map((w, i) => (
          <View key={i} style={styles.listItem}>
            <ChevronRight size={18} color="#E91E8C" />
            <Text style={styles.listText}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Drills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECOMMENDED DRILLS</Text>
        {result.drills.map((d, i) => (
          <View key={i} style={styles.drillItem}>
            <View style={styles.drillNumber}>
              <Text style={styles.drillNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.drillText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{result.summary}</Text>
        </View>
      </View>

      {/* AI Model Badge */}
      <View style={[
        styles.modelBadge,
        result.model === 'fallback' && styles.modelBadgeFallback,
      ]}>
        {result.model === 'fallback' ? (
          <AlertTriangle size={14} color="#EAB308" />
        ) : (
          <Cpu size={14} color="#22C55E" />
        )}
        <Text style={[
          styles.modelText,
          result.model === 'fallback' && styles.modelTextFallback,
        ]}>
          {result.model === 'fallback'
            ? 'Demo Mode — Connect API key for real analysis'
            : `Analyzed by LevelUp | ${result.framesAnalyzed} frames | +${result.xp} XP`
          }
        </Text>
      </View>

      {/* Coach Notes & Share */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MATCH NOTES</Text>
        <TextInput
          style={styles.coachNotesInput}
          placeholder="Add notes about this match..."
          placeholderTextColor="#52525B"
          value={coachNotes}
          onChangeText={setCoachNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.7}
        >
          <Share2 size={18} color="#fff" />
          <Text style={styles.shareButtonText}>
            {sharing ? 'GENERATING REPORT...' : 'SHARE PDF REPORT'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Another */}
      {showUploadAnother && onUploadAnother && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.resetButton} onPress={onUploadAnother}>
            <RotateCcw size={18} color="#fff" />
            <Text style={styles.resetButtonText}>UPLOAD ANOTHER</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  thumbnailSection: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreSection: { alignItems: 'center', marginTop: 24, gap: 12 },
  scoreBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: { fontSize: 44, fontWeight: '900', color: '#fff' },
  scoreLabel: { fontSize: 12, color: '#71717A', fontWeight: '700', letterSpacing: 2 },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  comparisonText: { fontSize: 12, fontWeight: '600' },
  positionGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  positionCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  positionScore: { fontSize: 32, fontWeight: '800' },
  positionLabel: { fontSize: 10, color: '#71717A', fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  insufficientText: { fontSize: 24, fontWeight: '800', color: '#52525B' },
  insufficientLabel: { fontSize: 8, color: '#52525B', marginTop: 2, textAlign: 'center' as const },
  positionAvgDelta: { fontSize: 9, fontWeight: '600', marginTop: 3, textAlign: 'center' as const },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  reasoningCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  reasoningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasoningLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  reasoningScore: { fontSize: 20, fontWeight: '800' },
  reasoningText: { fontSize: 14, color: '#A1A1AA', lineHeight: 22 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  listText: { fontSize: 15, color: '#E4E4E7', flex: 1 },
  drillItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  drillNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillNumberText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  drillText: { fontSize: 14, color: '#E4E4E7', flex: 1, paddingTop: 4 },
  summaryCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryText: { fontSize: 14, color: '#A1A1AA', lineHeight: 22 },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  modelText: { fontSize: 12, color: '#71717A' },
  modelBadgeFallback: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  modelTextFallback: { color: '#EAB308' },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#27272A',
    paddingVertical: 16,
    borderRadius: 20,
  },
  resetButtonText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  coachNotesInput: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    color: '#E4E4E7',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    marginBottom: 14,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 20,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 1 },

  // ---- KEY MOMENTS ----
  keyMomentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    borderLeftWidth: 3,
    borderLeftColor: '#EAB308',
  },
  keyMomentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  keyMomentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyMomentContent: {
    flex: 1,
  },
  keyMomentAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 2,
  },
  keyMomentDetail: {
    fontSize: 12,
    color: '#A1A1AA',
    lineHeight: 16,
  },
  keyMomentRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 10,
  },
  keyMomentTimestamp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EAB308',
    fontVariant: ['tabular-nums'],
  },
});
