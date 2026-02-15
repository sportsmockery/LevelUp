import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  ScrollView,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Zap,
  Maximize2,
  Minimize2,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { AnalysisResult, WrestlingPosition, SINGLET_COLORS } from '@/lib/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_HEIGHT = (SCREEN_W * 9) / 16;
const ANNOTATION_PAUSE_MS = 2500;

type Props = {
  frameUris: string[];
  frameTimestamps?: number[];
  videoUri?: string;
  result: AnalysisResult;
  singletColors?: string[];
};

const POSITION_COLORS: Record<WrestlingPosition, { bg: string; border: string; text: string }> = {
  standing:   { bg: '#2563EB', border: '#3B82F6', text: '#fff' },
  top:        { bg: '#22C55E', border: '#4ADE80', text: '#fff' },
  bottom:     { bg: '#EAB308', border: '#FACC15', text: '#000' },
  transition: { bg: '#E91E8C', border: '#F472B6', text: '#fff' },
  other:      { bg: '#71717A', border: '#A1A1AA', text: '#fff' },
};

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
};

// --- Telestration helpers ---
type ActionDirection = 'down' | 'up' | 'back' | 'rotate';

const getActionDirection = (action: string): ActionDirection | null => {
  const lower = action.toLowerCase();
  if (/shot|takedown|level.?change|penetration|double.?leg|single.?leg|breakdown|pressure|tilt|turn|cradle|half.?nelson/.test(lower)) return 'down';
  if (/standup|escape|stand.?up|get.?up|base|rise/.test(lower)) return 'up';
  if (/sprawl|defend|back|whizzer|block/.test(lower)) return 'back';
  if (/switch|reversal|roll|granby|sit.?out|hip.?heist/.test(lower)) return 'rotate';
  return null;
};

const ACTION_INFO: Record<ActionDirection, { arrow: string; label: string; color: string }> = {
  down:   { arrow: '\u2193', label: 'ATTACK',  color: '#EF4444' },
  up:     { arrow: '\u2191', label: 'ESCAPE',  color: '#22C55E' },
  back:   { arrow: '\u2190', label: 'DEFEND',  color: '#3B82F6' },
  rotate: { arrow: '\u21BB', label: 'REVERSE', color: '#A855F7' },
};

type TechniqueQuality = 'positive' | 'negative' | 'neutral';

const getAnnotationQuality = (rubricImpact?: string, detail?: string): TechniqueQuality => {
  const text = `${rubricImpact || ''} ${detail || ''}`.toLowerCase();
  const pos = /good|clean|explosive|tight|effective|strong|excellent|sharp|quick|scored|successful|solid|great|deep|controlled|decisive/.test(text);
  const neg = /weak|poor|slow|late|sloppy|missed|failed|vulnerable|off.?balance|struggled|lost|lack|unable|no control|exposed/.test(text);
  if (pos && !neg) return 'positive';
  if (neg && !pos) return 'negative';
  return 'neutral';
};

const formatTimestamp = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

export default function VideoReviewOverlay({ frameUris, frameTimestamps, videoUri, result, singletColors }: Props) {
  const videoRef = useRef<Video>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pausedForAnnotation, setPausedForAnnotation] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [framesExpanded, setFramesExpanded] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const selectedFrameRef = useRef<number | null>(null);
  const nextAnnotationIdx = useRef(0);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalPlayRef = useRef(false);
  const totalFrames = frameUris.length;
  const [timelineWidth, setTimelineWidth] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const hasVideo = !!videoUri && !!frameTimestamps && frameTimestamps.length > 0;

  // Fallback: frame slideshow for history entries without video
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!hasVideo && playing && totalFrames > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % totalFrames);
      }, 1200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasVideo, playing, totalFrames]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  // Key moment pulse animation
  useEffect(() => {
    const ann = result.frame_annotations?.[currentFrame];
    const shouldShow = pausedForAnnotation || !hasVideo || !playing || selectedFrame !== null;
    if (ann?.is_key_moment && shouldShow) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [currentFrame, pausedForAnnotation, hasVideo, playing, selectedFrame]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded || !frameTimestamps) return;
    if (!intentionalPlayRef.current) return;
    const posMs = status.positionMillis;

    // ---- SELECTED FRAME LOOP MODE ----
    const sf = selectedFrameRef.current;
    if (sf !== null && status.isPlaying) {
      const loopEnd = sf < frameTimestamps.length - 1
        ? frameTimestamps[sf + 1] - 100
        : frameTimestamps[sf] + 3000;
      if (posMs >= loopEnd) {
        videoRef.current?.setPositionAsync(frameTimestamps[sf]);
      }
      return;
    }

    // ---- PLAY-THROUGH MODE (annotation pause system) ----
    const idx = nextAnnotationIdx.current;
    if (status.isPlaying && idx < frameTimestamps.length) {
      if (posMs >= frameTimestamps[idx] - 100) {
        videoRef.current?.pauseAsync();
        setCurrentFrame(idx);
        setPausedForAnnotation(true);
        nextAnnotationIdx.current = idx + 1;
        pauseTimerRef.current = setTimeout(() => {
          setPausedForAnnotation(false);
          videoRef.current?.playAsync();
        }, ANNOTATION_PAUSE_MS);
      }
    }
    if (status.didJustFinish) {
      intentionalPlayRef.current = false;
      nextAnnotationIdx.current = 0;
      setCurrentFrame(0);
      setPlaying(false);
    }
  }, [frameTimestamps]);

  const startVideoPlayback = async () => {
    if (!hasVideo) { setPlaying(true); return; }
    selectedFrameRef.current = null;
    setSelectedFrame(null);
    intentionalPlayRef.current = true;
    nextAnnotationIdx.current = 0;
    setCurrentFrame(0);
    setPausedForAnnotation(false);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    await videoRef.current?.setPositionAsync(0);
    await videoRef.current?.playAsync();
    setPlaying(true);
  };

  const togglePlay = async () => {
    if (!hasVideo) { setPlaying((p) => !p); return; }
    if (playing) {
      intentionalPlayRef.current = false;
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setPausedForAnnotation(false);
      await videoRef.current?.pauseAsync();
      setPlaying(false);
    } else if (selectedFrameRef.current !== null) {
      // Resume loop on selected frame
      intentionalPlayRef.current = true;
      await videoRef.current?.setPositionAsync(frameTimestamps![selectedFrameRef.current]);
      await videoRef.current?.playAsync();
      setPlaying(true);
    } else {
      await startVideoPlayback();
    }
  };

  const jumpToFrame = async (idx: number) => {
    selectedFrameRef.current = idx;
    setSelectedFrame(idx);
    setCurrentFrame(idx);
    setPausedForAnnotation(false);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (hasVideo && frameTimestamps) {
      intentionalPlayRef.current = true;
      await videoRef.current?.setPositionAsync(frameTimestamps[idx]);
      await videoRef.current?.playAsync();
      setPlaying(true);
    }
  };

  const prevFrame = () => jumpToFrame((currentFrame - 1 + totalFrames) % totalFrames);
  const nextFrame = () => jumpToFrame((currentFrame + 1) % totalFrames);
  const toggleFullscreen = () => setFullscreen((f) => !f);

  // Play through all frames — deselects any looping frame, continues from current position
  const playThrough = async () => {
    const sf = selectedFrameRef.current;
    selectedFrameRef.current = null;
    setSelectedFrame(null);
    setPausedForAnnotation(false);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    if (hasVideo && frameTimestamps) {
      // Start from the frame after the selected one (or from beginning)
      const startIdx = sf !== null && sf + 1 < frameTimestamps.length ? sf + 1 : 0;
      nextAnnotationIdx.current = startIdx;
      setCurrentFrame(startIdx);
      intentionalPlayRef.current = true;
      const startPos = startIdx < frameTimestamps.length ? frameTimestamps[startIdx] : 0;
      await videoRef.current?.setPositionAsync(startPos);
      await videoRef.current?.playAsync();
      setPlaying(true);
    } else {
      setPlaying(true);
    }
  };

  const singletInfo = (singletColors || []).map((c) => {
    const found = SINGLET_COLORS.find((sc) => sc.value === c);
    return { hex: found?.hex || '#71717A', label: found?.label || c };
  });

  if (totalFrames === 0) return null;

  const annotation = result.frame_annotations?.[currentFrame];
  const posStyle = annotation
    ? POSITION_COLORS[annotation.position] || POSITION_COLORS.other
    : null;
  const quality: TechniqueQuality = annotation ? getAnnotationQuality(annotation.rubric_impact, annotation.detail) : 'neutral';
  const actionDir = annotation ? getActionDirection(annotation.action) : null;
  const showAnnotation = pausedForAnnotation || !hasVideo || !playing || selectedFrame !== null;
  const isFS = fullscreen;

  // ---------- VIDEO PLAYER (clean, no analysis overlaid) ----------
  const videoPlayer = (
    <View style={[
      styles.videoBox,
      { height: isFS ? SCREEN_H - 160 : FRAME_HEIGHT },
      isFS && styles.videoBoxFS,
    ]}>
      {hasVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.videoPlayer}
          resizeMode={isFS ? ResizeMode.CONTAIN : ResizeMode.COVER}
          shouldPlay={false}
          isMuted
          onLoad={() => setVideoLoaded(true)}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      ) : (
        <Image
          source={{ uri: frameUris[currentFrame] }}
          style={styles.videoPlayer}
          resizeMode="cover"
        />
      )}

      {/* Sharp frame while paused */}
      {hasVideo && pausedForAnnotation && frameUris[currentFrame] && (
        <Image
          source={{ uri: frameUris[currentFrame] }}
          style={styles.frameOverlayImg}
          resizeMode={isFS ? 'contain' : 'cover'}
        />
      )}

      {/* Telestration overlay */}
      {showAnnotation && annotation && (
        <View style={styles.telestrationLayer} pointerEvents="none">
          {/* Position color strip - left edge */}
          <View style={[styles.telPositionStrip, { backgroundColor: posStyle?.bg || '#71717A' }]} />

          {/* Quality indicator strip - bottom edge */}
          {quality !== 'neutral' && (
            <View style={[styles.telQualityStrip, { backgroundColor: quality === 'positive' ? '#22C55E' : '#EF4444' }]} />
          )}

          {/* Action direction indicator */}
          {actionDir && (
            <View style={styles.telActionPill}>
              <Text style={[styles.telActionArrow, { color: ACTION_INFO[actionDir].color }]}>{ACTION_INFO[actionDir].arrow}</Text>
              <Text style={styles.telActionLabel}>{ACTION_INFO[actionDir].label}</Text>
            </View>
          )}

          {/* Key moment pulse ring */}
          {annotation.is_key_moment && (
            <Animated.View style={[styles.telKeyRing, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.telKeyRingInner} />
            </Animated.View>
          )}

          {/* Score badge */}
          <View style={[styles.telScoreBadge, { backgroundColor: getScoreColor(result.overall_score) + '33' }]}>
            <Text style={[styles.telScoreText, { color: getScoreColor(result.overall_score) }]}>{result.overall_score}</Text>
          </View>
        </View>
      )}

      {/* Fallback banner */}
      {result.model === 'fallback' && (
        <View style={styles.fallbackBanner}>
          <Text style={styles.fallbackText}>DEMO MODE — CONNECT API KEY FOR REAL ANALYSIS</Text>
        </View>
      )}

      {/* Big play button */}
      {hasVideo && !playing && !pausedForAnnotation && videoLoaded && selectedFrame === null && (
        <TouchableOpacity style={styles.bigPlayOverlay} onPress={startVideoPlayback} activeOpacity={0.8}>
          <View style={styles.bigPlayBtn}>
            <Play size={28} color="#fff" />
          </View>
          <Text style={styles.bigPlayLabel}>TAP TO PLAY WITH ANALYSIS</Text>
        </TouchableOpacity>
      )}

      {/* Bottom gradient for controls */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.bottomGrad} />

      {/* Controls bar — on the video */}
      <View style={styles.controlsBar}>
        {/* Interactive timeline scrubber */}
        <View
          style={styles.timelineScrubber}
          onLayout={(e) => setTimelineWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e: GestureResponderEvent) => {
            if (timelineWidth > 0) {
              const idx = Math.min(totalFrames - 1, Math.max(0, Math.floor((e.nativeEvent.locationX / timelineWidth) * totalFrames)));
              jumpToFrame(idx);
            }
          }}
          onResponderMove={(e: GestureResponderEvent) => {
            if (timelineWidth > 0) {
              const idx = Math.min(totalFrames - 1, Math.max(0, Math.floor((e.nativeEvent.locationX / timelineWidth) * totalFrames)));
              jumpToFrame(idx);
            }
          }}
        >
          {frameUris.map((_, i) => {
            const ann = result.frame_annotations?.[i];
            const segBg = ann ? (POSITION_COLORS[ann.position]?.bg || '#555') : '#555';
            return (
              <View
                key={i}
                style={[
                  styles.timelineSegment,
                  { backgroundColor: segBg },
                  i > currentFrame && styles.timelineSegmentDim,
                  i === currentFrame && styles.timelineSegmentActive,
                ]}
              >
                {ann?.is_key_moment && <View style={styles.timelineKeyMarker} />}
              </View>
            );
          })}
        </View>
        <View style={styles.controlRow}>
          <TouchableOpacity onPress={prevFrame} style={styles.ctrlBtn}>
            <SkipBack size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
            {playing || pausedForAnnotation
              ? <Pause size={16} color="#fff" />
              : <Play size={16} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={nextFrame} style={styles.ctrlBtn}>
            <SkipForward size={14} color="#fff" />
          </TouchableOpacity>
          {hasVideo && (
            <TouchableOpacity onPress={toggleFullscreen} style={styles.ctrlBtn}>
              {isFS ? <Minimize2 size={14} color="#fff" /> : <Maximize2 size={14} color="#fff" />}
            </TouchableOpacity>
          )}
          <Text style={styles.frameNum}>
            {frameTimestamps && frameTimestamps[currentFrame] !== undefined
              ? `${formatTimestamp(frameTimestamps[currentFrame])} \u00B7 ${currentFrame + 1}/${totalFrames}`
              : `${currentFrame + 1}/${totalFrames}`}
          </Text>
        </View>
      </View>
    </View>
  );

  // ---------- ANALYSIS CARD (below the video) ----------
  const analysisCard = showAnnotation && annotation ? (
    <View style={[
      styles.analysisCard,
      posStyle && { borderTopColor: posStyle.bg, borderTopWidth: 3 },
    ]}>
      {/* Row 1: position + key moment + score */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopLeft}>
          {posStyle && (
            <View style={[styles.posChip, { backgroundColor: posStyle.bg }]}>
              <Text style={[styles.posChipText, { color: posStyle.text }]}>
                {annotation.position.toUpperCase()}
              </Text>
            </View>
          )}
          {annotation.is_key_moment && (
            <View style={styles.keyChip}>
              <Zap size={10} color="#EAB308" />
              <Text style={styles.keyChipText}>
                {(annotation.key_moment_type || 'KEY MOMENT').toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardScore, { color: getScoreColor(result.overall_score) }]}>
          {result.overall_score}
        </Text>
      </View>

      {/* Row 2: action + detail */}
      <Text style={styles.cardAction}>{annotation.action}</Text>
      <Text style={styles.cardDetail}>{annotation.detail}</Text>

      {/* Row 3: tracking + visibility */}
      <View style={styles.cardBottomRow}>
        {singletInfo.length > 0 && (
          <View style={styles.trackBadge}>
            {singletInfo.map((s, i) => (
              <React.Fragment key={i}>
                <View style={[styles.trackDot, { backgroundColor: s.hex }]} />
                <Text style={styles.trackLabel}>{s.label}</Text>
              </React.Fragment>
            ))}
            <Text style={styles.trackTag}>TRACKING</Text>
          </View>
        )}
        {annotation.wrestler_visible === false && (
          <View style={styles.notVisibleChip}>
            <EyeOff size={10} color="#EF4444" />
            <Text style={styles.notVisibleLabel}>NOT VISIBLE</Text>
          </View>
        )}
      </View>
    </View>
  ) : null;

  // ---------- FRAMES MENU (collapsible, large tap targets) ----------
  const framesMenu = (
    <View style={styles.framesContainer}>
      <View style={styles.framesHeader}>
        <TouchableOpacity
          style={styles.framesHeaderToggle}
          onPress={() => setFramesExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <Text style={styles.framesHeaderText}>
            ALL FRAMES ({totalFrames})
          </Text>
          {framesExpanded
            ? <ChevronUp size={16} color="#A1A1AA" />
            : <ChevronDown size={16} color="#A1A1AA" />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.framesPlayBtn, selectedFrame === null && styles.framesPlayBtnDim]}
          onPress={playThrough}
          activeOpacity={0.7}
        >
          <Play size={12} color="#fff" />
          <Text style={styles.framesPlayLabel}>PLAY ALL</Text>
        </TouchableOpacity>
      </View>
      {framesExpanded && (
        <ScrollView style={styles.framesList} nestedScrollEnabled>
          {result.frame_annotations?.map((ann, i) => {
            const ps = POSITION_COLORS[ann.position] || POSITION_COLORS.other;
            const isSelected = i === selectedFrame;
            const isCurrent = i === currentFrame;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.frameRow,
                  isCurrent && styles.frameRowActive,
                  isSelected && styles.frameRowSelected,
                ]}
                onPress={() => jumpToFrame(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.frameRowNum, isCurrent && styles.frameRowNumActive]}>
                  {i + 1}
                </Text>
                <View style={[styles.confidenceDot, { backgroundColor: (ann.confidence ?? 0.5) >= 0.7 ? '#22C55E' : (ann.confidence ?? 0.5) >= 0.4 ? '#EAB308' : '#EF4444' }]} />
                <View style={[styles.frameRowPosChip, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.frameRowPosText, { color: ps.text }]}>
                    {ann.position.toUpperCase().slice(0, 5)}
                  </Text>
                </View>
                <View style={styles.frameRowContent}>
                  <Text style={styles.frameRowAction} numberOfLines={1}>{ann.action}</Text>
                </View>
                {frameTimestamps && frameTimestamps[i] !== undefined && (
                  <Text style={styles.frameRowTimestamp}>{formatTimestamp(frameTimestamps[i])}</Text>
                )}
                {ann.is_key_moment && (
                  <View style={styles.frameRowKeyBadge}>
                    <Zap size={10} color="#EAB308" />
                  </View>
                )}
                {isSelected && (
                  <Text style={styles.frameRowLoopLabel}>LOOP</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ---------- RENDER ----------
  if (isFS) {
    return (
      <>
        {/* Placeholder to keep scroll position */}
        <View style={[styles.container, { height: FRAME_HEIGHT + 16 }]} />
        <Modal
          visible
          animationType="fade"
          supportedOrientations={['portrait', 'landscape']}
          statusBarTranslucent
          onRequestClose={toggleFullscreen}
        >
          <StatusBar hidden />
          <View style={styles.fsModal}>
            {videoPlayer}
            <ScrollView style={styles.fsScrollArea}>
              {analysisCard}
              {framesMenu}
            </ScrollView>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.container}>
      {videoPlayer}
      {analysisCard}
      {framesMenu}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },

  // ---- VIDEO BOX (clean) ----
  videoBox: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  videoBoxFS: {
    borderRadius: 0,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  frameOverlayImg: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%',
    height: '100%',
  },
  fallbackBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
    paddingVertical: 3,
    alignItems: 'center',
    zIndex: 10,
  },
  fallbackText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1.5,
  },
  bigPlayOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 5,
  },
  bigPlayBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(37,99,235,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
  bigPlayLabel: {
    fontSize: 10, fontWeight: '700', color: '#fff',
    letterSpacing: 1, marginTop: 8,
  },
  bottomGrad: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 70,
  },

  // ---- CONTROLS (on the video, bottom) ----
  controlsBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  frameIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 5,
  },
  frameDot: {
    width: 7, height: 7, borderRadius: 3.5,
  },
  frameDotActive: {
    width: 16, borderRadius: 3.5,
    borderWidth: 1.5, borderColor: '#fff',
  },
  frameDotKey: {
    borderWidth: 1.5, borderColor: '#EAB308',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%', borderRadius: 1,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ctrlBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  playBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(37,99,235,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  frameNum: {
    fontSize: 10, color: 'rgba(255,255,255,0.5)',
    fontWeight: '600', position: 'absolute', right: 0,
  },

  // ---- ANALYSIS CARD (below video) ----
  analysisCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    marginTop: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  posChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  posChipText: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1,
  },
  keyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  keyChipText: {
    fontSize: 9, fontWeight: '800', color: '#EAB308', letterSpacing: 0.5,
  },
  cardScore: {
    fontSize: 24, fontWeight: '900',
  },
  cardAction: {
    fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2,
  },
  cardDetail: {
    fontSize: 13, color: '#A1A1AA', lineHeight: 18, marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trackDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#3F3F46',
  },
  trackLabel: {
    fontSize: 10, fontWeight: '700', color: '#E4E4E7',
    marginRight: 2,
  },
  trackTag: {
    fontSize: 8, fontWeight: '700', color: '#71717A',
    letterSpacing: 1, marginLeft: 4,
  },
  notVisibleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  notVisibleLabel: {
    fontSize: 9, fontWeight: '800', color: '#EF4444',
  },

  // ---- FRAMES MENU (collapsible) ----
  framesContainer: {
    marginTop: 8,
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  framesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  framesHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  framesHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 1.5,
  },
  framesPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  framesPlayBtnDim: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
  },
  framesPlayLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  framesList: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    gap: 10,
  },
  frameRowActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  frameRowSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  frameRowNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    width: 20,
    textAlign: 'center',
  },
  frameRowNumActive: {
    color: '#2563EB',
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  frameRowPosChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 42,
    alignItems: 'center',
  },
  frameRowPosText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  frameRowContent: {
    flex: 1,
  },
  frameRowAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  frameRowKeyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  frameRowLoopLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1,
  },

  // ---- FULLSCREEN ----
  fsModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fsScrollArea: {
    flexShrink: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // ---- TELESTRATION OVERLAY ----
  telestrationLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 3,
  },
  telPositionStrip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
  },
  telQualityStrip: {
    position: 'absolute',
    left: 4, right: 0,
    bottom: 72,
    height: 3,
    opacity: 0.7,
  },
  telActionPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  telActionArrow: {
    fontSize: 18,
    fontWeight: '900',
  },
  telActionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  telKeyRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  telKeyRingInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2.5,
    borderColor: 'rgba(234, 179, 8, 0.6)',
  },
  telScoreBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  telScoreText: {
    fontSize: 18,
    fontWeight: '900',
  },

  // ---- TIMELINE SCRUBBER ----
  timelineScrubber: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  timelineSegment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineSegmentDim: {
    opacity: 0.3,
  },
  timelineSegmentActive: {
    borderTopWidth: 2,
    borderTopColor: '#fff',
  },
  timelineKeyMarker: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EAB308',
  },
  frameRowTimestamp: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '600',
    marginRight: 4,
  },
});
