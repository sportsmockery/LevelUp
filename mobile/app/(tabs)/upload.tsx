import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  readAsStringAsync,
  EncodingType,
  copyAsync,
  makeDirectoryAsync,
  documentDirectory,
} from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Upload,
  Video,
  Cpu,
  Camera,
  Wifi,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeFrames, submitAnalysis, identifyWrestler } from '@/lib/api';
import { pollForCompletion, savePendingJob, requestNotificationPermissions } from '@/lib/analysis-poller';
import { AnalysisResult, MatchStyle, MatchContext, AthleteIdentification, WrestlerIdentificationResult } from '@/lib/types';
import { addAnalysisEntry } from '@/lib/storage';
import { trackAnalysis } from '@/lib/athlete-tracking';
import AnalysisResults from '@/components/AnalysisResults';
import VideoReviewOverlay from '@/components/VideoReviewOverlay';

const MATCH_STYLES: { label: string; value: MatchStyle }[] = [
  { label: 'Youth Folk', value: 'youth_folkstyle' },
  { label: 'HS Folk', value: 'hs_folkstyle' },
  { label: 'College', value: 'college_folkstyle' },
  { label: 'Freestyle', value: 'freestyle' },
  { label: 'Greco', value: 'grecoRoman' },
];

const STYLE_INFO = [
  {
    name: 'Youth Folkstyle',
    usedBy: 'Ages 4-14 \u00B7 Youth Clubs, Rec Leagues & USA Wrestling Kids Tournaments',
    description: 'Same rules as high school folkstyle with shorter match periods. Used at most youth wrestling clubs and kids\u2019 tournaments across the country.',
  },
  {
    name: 'HS Folkstyle',
    usedBy: 'High School \u00B7 Grades 9-12 \u00B7 NFHS Rules',
    description: 'The standard American high school wrestling style. Emphasizes control, riding time, and escapes. Takedowns are worth 3 points.',
  },
  {
    name: 'College Folkstyle',
    usedBy: 'College \u00B7 NCAA Rules',
    description: 'Same as high school folkstyle with minor differences. Riding time counts toward a 1-point bonus if you hold a 1-minute net advantage.',
  },
  {
    name: 'Freestyle',
    usedBy: 'All Ages \u00B7 Olympic & International \u00B7 UWW Rules',
    description: 'The Olympic style. Focuses on explosive throws and back exposure. No riding time. Wrestlers are reset to standing frequently.',
  },
  {
    name: 'Greco-Roman',
    usedBy: 'All Ages, Males Only \u00B7 Olympic & International \u00B7 UWW Rules',
    description: 'Like freestyle but NO leg attacks allowed. All offense and defense must be above the waist. Emphasizes throws, body locks, and suplexes.',
  },
];

function getDefaultMatchStyle(birthYear?: number): MatchStyle {
  if (!birthYear) return 'youth_folkstyle';
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age <= 14) return 'youth_folkstyle';
  if (age <= 18) return 'hs_folkstyle';
  if (age <= 23) return 'college_folkstyle';
  return 'freestyle';
}

// Compress a local image URI to a smaller base64 for API transmission
async function compressForAPI(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG },
  );
  return readAsStringAsync(result.uri, { encoding: EncodingType.Base64 });
}

const MAX_API_FRAMES = 20;
const MAX_PAYLOAD_BYTES = 3_500_000; // 3.5MB safety margin under Vercel 4.5MB limit

// Check if the device is on Wi-Fi
async function checkWiFi(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI;
  } catch {
    // If we can't determine, allow the analysis (don't block on errors)
    return true;
  }
}

export default function UploadScreen() {
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [matchStyle, setMatchStyle] = useState<MatchStyle>('youth_folkstyle');
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [weightClass, setWeightClass] = useState('');
  const [competitionName, setCompetitionName] = useState('');
  const [roundNumber, setRoundNumber] = useState('');
  const [daysFromWeighIn, setDaysFromWeighIn] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [frameUris, setFrameUris] = useState<string[]>([]);
  const [frameTimestamps, setFrameTimestamps] = useState<number[]>([]);
  // Wrestler identification state
  const [idFrameUri, setIdFrameUri] = useState<string | null>(null);
  const [idFrameBase64, setIdFrameBase64] = useState<string | null>(null);
  const [idFrameIndex, setIdFrameIndex] = useState(0);
  const [idFrames, setIdFrames] = useState<{ uri: string; base64: string }[]>([]);
  const [wrestlerDetection, setWrestlerDetection] = useState<WrestlerIdentificationResult | null>(null);
  const [selectedWrestler, setSelectedWrestler] = useState<'a' | 'b' | null>(null);
  const [identifyingWrestler, setIdentifyingWrestler] = useState(false);
  const [extractingIdFrames, setExtractingIdFrames] = useState(false);
  // Split-frame wrestler side selection
  const [wrestlerSide, setWrestlerSide] = useState<'left' | 'right' | null>(null);
  const [leftHalfUri, setLeftHalfUri] = useState<string | null>(null);
  const [rightHalfUri, setRightHalfUri] = useState<string | null>(null);
  const [extractingPreview, setExtractingPreview] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [durationWarning, setDurationWarning] = useState<string | null>(null);

  // Smart default: set match style based on athlete's birth year from profile
  useEffect(() => {
    AsyncStorage.getItem('@levelup/athlete_profile').then((raw) => {
      if (raw) {
        try {
          const profile = JSON.parse(raw);
          if (profile.birthYear) {
            setMatchStyle(getDefaultMatchStyle(profile.birthYear));
          }
        } catch {}
      }
    });
  }, []);

  const checkVideoDuration = (asset: ImagePicker.ImagePickerAsset): boolean => {
    const duration = asset.duration ?? 0; // seconds
    if (duration > 600) {
      Alert.alert(
        'Video Too Long',
        'Videos must be under 10 minutes. Trim your video to a single match or key portion.',
        [{ text: 'OK' }],
      );
      return false;
    }
    if (duration > 420) {
      setDurationWarning('Long video — analysis may take 2-3 minutes. Shorter clips produce better results.');
    } else {
      setDurationWarning(null);
    }
    return true;
  };

  // Extract a frame at 1.5s, split left/right for wrestler side picker
  const extractWrestlerPreview = async (videoUri: string) => {
    setExtractingPreview(true);
    setWrestlerSide(null);
    setLeftHalfUri(null);
    setRightHalfUri(null);
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1500,
        quality: 0.85,
      });
      // Get dimensions via no-op manipulate
      const full = await ImageManipulator.manipulateAsync(thumbUri, []);
      const w = full.width;
      const h = full.height;
      const halfW = Math.floor(w / 2);

      const left = await ImageManipulator.manipulateAsync(
        thumbUri,
        [{ crop: { originX: 0, originY: 0, width: halfW, height: h } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const right = await ImageManipulator.manipulateAsync(
        thumbUri,
        [{ crop: { originX: halfW, originY: 0, width: w - halfW, height: h } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      setLeftHalfUri(left.uri);
      setRightHalfUri(right.uri);
    } catch (err) {
      console.warn('[LevelUp] Failed to extract wrestler preview:', err);
    } finally {
      setExtractingPreview(false);
    }
  };

  const pickVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length > 0) {
      if (!checkVideoDuration(res.assets[0])) return;
      setVideo(res.assets[0]);
      setResult(null);
      extractWrestlerPreview(res.assets[0].uri);
      extractIdFrames(res.assets[0].uri, res.assets[0].duration ?? 60);
    }
  };

  const recordVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 300,
    });
    if (!res.canceled && res.assets.length > 0) {
      if (!checkVideoDuration(res.assets[0])) return;
      setVideo(res.assets[0]);
      setResult(null);
      extractWrestlerPreview(res.assets[0].uri);
      extractIdFrames(res.assets[0].uri, res.assets[0].duration ?? 60);
    }
  };

  // Extract 5 ID frames from first 30s, find lowest-motion frame, send for detection
  const extractIdFrames = async (videoUri: string, durationSec: number) => {
    setExtractingIdFrames(true);
    setWrestlerDetection(null);
    setSelectedWrestler(null);
    setIdFrameIndex(0);
    try {
      const maxTimeSec = Math.min(durationSec, 30);
      const frameCount = 5;
      const timestamps = Array.from({ length: frameCount }, (_, i) =>
        Math.floor((i / (frameCount - 1)) * maxTimeSec * 1000),
      );

      const extracted: { uri: string; base64: string; base64Len: number }[] = [];
      for (const ts of timestamps) {
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time: ts,
            quality: 0.85,
          });
          const compressed = await ImageManipulator.manipulateAsync(
            thumbUri,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          );
          const b64 = await readAsStringAsync(compressed.uri, { encoding: EncodingType.Base64 });
          extracted.push({ uri: compressed.uri, base64: b64, base64Len: b64.length });
        } catch {
          // skip failed frame
        }
      }

      if (extracted.length === 0) {
        setExtractingIdFrames(false);
        return;
      }

      // Find lowest-motion frame (smallest delta from neighbors = most static)
      let bestIdx = 0;
      if (extracted.length >= 3) {
        let minDelta = Infinity;
        for (let i = 1; i < extracted.length - 1; i++) {
          const delta = Math.abs(extracted[i].base64Len - extracted[i - 1].base64Len) +
                        Math.abs(extracted[i].base64Len - extracted[i + 1].base64Len);
          if (delta < minDelta) {
            minDelta = delta;
            bestIdx = i;
          }
        }
      }

      const frameData = extracted.map((e) => ({ uri: e.uri, base64: e.base64 }));
      setIdFrames(frameData);
      setIdFrameUri(frameData[bestIdx].uri);
      setIdFrameBase64(frameData[bestIdx].base64);
      setIdFrameIndex(bestIdx);
      setExtractingIdFrames(false);

      // Run GPT-4o wrestler detection
      await runWrestlerDetection(frameData[bestIdx].base64);
    } catch (err) {
      console.warn('[LevelUp] Failed to extract ID frames:', err);
      setExtractingIdFrames(false);
    }
  };

  const runWrestlerDetection = async (frameBase64: string) => {
    setIdentifyingWrestler(true);
    try {
      const result = await identifyWrestler(frameBase64);
      setWrestlerDetection(result);
    } catch (err) {
      console.warn('[LevelUp] Wrestler detection failed:', err);
    } finally {
      setIdentifyingWrestler(false);
    }
  };

  const tryAnotherFrame = async () => {
    if (idFrames.length === 0) return;
    const nextIdx = (idFrameIndex + 1) % idFrames.length;
    setIdFrameIndex(nextIdx);
    setIdFrameUri(idFrames[nextIdx].uri);
    setIdFrameBase64(idFrames[nextIdx].base64);
    setWrestlerDetection(null);
    setSelectedWrestler(null);
    await runWrestlerDetection(idFrames[nextIdx].base64);
  };

  // Smart frame extraction: 1fps scan → action detection → select key frames
  const extractFramesSmart = async (
    uri: string,
    durationMs: number,
  ): Promise<{ frames: string[]; firstThumbUri: string | null; allFrameUris: string[]; frameTimestamps: number[] }> => {
    const durationSec = durationMs / 1000;
    const totalFpsFrames = Math.min(Math.floor(durationSec), 300); // Cap at 5 min

    if (totalFpsFrames < 5) {
      // Very short video: just extract all frames at 1fps
      return extractFramesDirect(uri, durationMs, totalFpsFrames);
    }

    // --- Phase 1: Extract at 1fps, low quality for action detection ---
    setStatusText('Scanning video for action...');
    const scanTimestamps: number[] = [];
    const scanBase64Lengths: number[] = [];

    for (let i = 0; i < totalFpsFrames; i++) {
      const timeMs = Math.floor((i + 0.5) * 1000); // Center of each second
      scanTimestamps.push(timeMs);
    }

    const scanResults: { timestamp: number; base64Length: number }[] = [];

    for (let i = 0; i < scanTimestamps.length; i++) {
      setProgress(Math.round((i / scanTimestamps.length) * 30));
      setStatusText(`Scanning video... ${i + 1}/${scanTimestamps.length}`);
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: scanTimestamps[i],
          quality: 0.3,
        });
        const base64 = await readAsStringAsync(thumbUri, { encoding: EncodingType.Base64 });
        scanResults.push({ timestamp: scanTimestamps[i], base64Length: base64.length });
        scanBase64Lengths.push(base64.length);
      } catch {
        scanResults.push({ timestamp: scanTimestamps[i], base64Length: 0 });
        scanBase64Lengths.push(0);
      }
    }

    // --- Phase 2: Compute frame deltas ---
    setStatusText('Detecting key moments...');
    setProgress(35);

    const validLengths = scanBase64Lengths.filter((l) => l > 0);
    if (validLengths.length === 0) {
      // Fallback to direct extraction
      return extractFramesDirect(uri, durationMs, Math.min(15, totalFpsFrames));
    }

    const medianLength = validLengths.sort((a, b) => a - b)[Math.floor(validLengths.length / 2)];
    const deltas: number[] = [];
    for (let i = 1; i < scanResults.length; i++) {
      const prev = scanResults[i - 1].base64Length;
      const curr = scanResults[i].base64Length;
      if (prev === 0 || curr === 0) {
        deltas.push(0);
      } else {
        deltas.push(Math.abs(curr - prev));
      }
    }

    // High delta threshold: 1.5x median delta
    const validDeltas = deltas.filter((d) => d > 0);
    const medianDelta = validDeltas.length > 0
      ? validDeltas.sort((a, b) => a - b)[Math.floor(validDeltas.length / 2)]
      : medianLength * 0.1;
    const highDeltaThreshold = medianDelta * 1.5;

    // --- Phase 3: Cluster action frames ---
    const actionIndices: number[] = [];
    for (let i = 0; i < deltas.length; i++) {
      if (deltas[i] > highDeltaThreshold) {
        actionIndices.push(i + 1); // +1 because deltas are between consecutive frames
      }
    }

    // Cluster consecutive action frames into windows
    const windows: { start: number; end: number; peakIdx: number; peakDelta: number }[] = [];
    let windowStart = -1;
    let peakIdx = -1;
    let peakDelta = 0;

    for (let i = 0; i < actionIndices.length; i++) {
      if (windowStart === -1) {
        windowStart = actionIndices[i];
        peakIdx = actionIndices[i];
        peakDelta = deltas[actionIndices[i] - 1] || 0;
      } else if (actionIndices[i] - actionIndices[i - 1] <= 2) {
        // Consecutive or near-consecutive — extend window
        const d = deltas[actionIndices[i] - 1] || 0;
        if (d > peakDelta) {
          peakDelta = d;
          peakIdx = actionIndices[i];
        }
      } else {
        // Gap — close current window, start new
        windows.push({ start: windowStart, end: actionIndices[i - 1], peakIdx, peakDelta });
        windowStart = actionIndices[i];
        peakIdx = actionIndices[i];
        peakDelta = deltas[actionIndices[i] - 1] || 0;
      }
    }
    if (windowStart !== -1) {
      windows.push({ start: windowStart, end: actionIndices[actionIndices.length - 1], peakIdx, peakDelta });
    }

    // --- Phase 4: Select representative frames ---
    const selectedIndices = new Set<number>();

    // Always include first and last frames
    selectedIndices.add(0);
    selectedIndices.add(scanResults.length - 1);

    // 3 frames per action window (start, peak, end)
    for (const w of windows) {
      selectedIndices.add(w.start);
      selectedIndices.add(w.peakIdx);
      selectedIndices.add(w.end);
    }

    // 1 frame per 5 seconds from static periods
    for (let i = 0; i < scanResults.length; i += 5) {
      if (!actionIndices.includes(i)) {
        selectedIndices.add(i);
      }
    }

    // Cap at MAX_API_FRAMES, prioritize action windows
    let selected = Array.from(selectedIndices).filter((i) => i >= 0 && i < scanResults.length).sort((a, b) => a - b);

    if (selected.length > MAX_API_FRAMES) {
      // Keep all action window frames, trim static ones
      const actionSet = new Set<number>();
      for (const w of windows) {
        actionSet.add(w.start);
        actionSet.add(w.peakIdx);
        actionSet.add(w.end);
      }
      actionSet.add(0);
      actionSet.add(scanResults.length - 1);

      const actionFrames = selected.filter((i) => actionSet.has(i));
      const staticFrames = selected.filter((i) => !actionSet.has(i));
      // Evenly sample from static frames to fill remaining slots
      const remaining = MAX_API_FRAMES - actionFrames.length;
      const step = Math.max(1, Math.floor(staticFrames.length / Math.max(remaining, 1)));
      const sampledStatic = staticFrames.filter((_, idx) => idx % step === 0).slice(0, remaining);
      selected = [...actionFrames, ...sampledStatic].sort((a, b) => a - b);
    }

    console.log(`[LevelUp] Action detection: ${windows.length} action windows, ${selected.length} frames selected from ${totalFpsFrames} scanned`);

    // --- Phase 5: Re-extract selected frames at high quality ---
    setStatusText(`Extracting ${selected.length} key frames...`);
    setProgress(40);

    const thumbDir = `${documentDirectory}thumbnails/`;
    await makeDirectoryAsync(thumbDir, { intermediates: true }).catch(() => {});
    const timestamp = Date.now();

    const frames: string[] = [];
    const allFrameUris: string[] = [];
    let firstThumbUri: string | null = null;
    const finalTimestamps: number[] = [];

    for (let i = 0; i < selected.length; i++) {
      const frameIdx = selected[i];
      const timeMs = scanResults[frameIdx]?.timestamp ?? Math.floor((frameIdx + 0.5) * 1000);
      setProgress(40 + Math.round((i / selected.length) * 20));
      setStatusText(`Extracting key frame ${i + 1}/${selected.length}...`);

      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: timeMs,
          quality: 0.85,
        });

        const persistentPath = `${thumbDir}analysis_${timestamp}_${i + 1}.jpg`;
        await copyAsync({ from: thumbUri, to: persistentPath });
        allFrameUris.push(persistentPath);

        if (i === 0) firstThumbUri = persistentPath;

        const base64 = await readAsStringAsync(thumbUri, { encoding: EncodingType.Base64 });
        frames.push(base64);
        finalTimestamps.push(timeMs);
      } catch {
        // skip failed frame
      }
    }

    return { frames, firstThumbUri, allFrameUris, frameTimestamps: finalTimestamps };
  };

  // Fallback: direct extraction at evenly spaced intervals
  const extractFramesDirect = async (
    uri: string,
    durationMs: number,
    frameCount: number,
  ): Promise<{ frames: string[]; firstThumbUri: string | null; allFrameUris: string[]; frameTimestamps: number[] }> => {
    const startMs = 500;
    const endMs = Math.max(durationMs - 500, startMs + 100);
    const timestamps: number[] = [];
    const step = (endMs - startMs) / (frameCount - 1 || 1);
    for (let i = 0; i < frameCount; i++) {
      timestamps.push(Math.floor(startMs + step * i));
    }

    const frames: string[] = [];
    const allFrameUris: string[] = [];
    let firstThumbUri: string | null = null;
    const thumbDir = `${documentDirectory}thumbnails/`;
    await makeDirectoryAsync(thumbDir, { intermediates: true }).catch(() => {});
    const ts = Date.now();

    for (let i = 0; i < frameCount; i++) {
      setProgress(Math.round(((i + 1) / frameCount) * 40));
      setStatusText(`Extracting frame ${i + 1}/${frameCount}...`);
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: timestamps[i],
          quality: 0.85,
        });

        const persistentPath = `${thumbDir}analysis_${ts}_${i + 1}.jpg`;
        await copyAsync({ from: thumbUri, to: persistentPath });
        allFrameUris.push(persistentPath);

        if (i === 0) firstThumbUri = persistentPath;

        const base64 = await readAsStringAsync(thumbUri, { encoding: EncodingType.Base64 });
        frames.push(base64);
      } catch {
        // skip
      }
    }

    return { frames, firstThumbUri, allFrameUris, frameTimestamps: timestamps };
  };

  const analyzeVideo = async () => {
    if (!video) return;

    // Wi-Fi check
    const isWiFi = await checkWiFi();
    if (!isWiFi) {
      Alert.alert(
        'Wi-Fi Required',
        'Video analysis requires a Wi-Fi connection. Please connect to Wi-Fi to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAnalyzing(true);
    setProgress(0);
    setStatusText('Preparing video...');

    try {
      const durationMs = (video.duration || 60) * 1000;

      // Second Wi-Fi check right before upload
      const stillWiFi = await checkWiFi();
      if (!stillWiFi) {
        Alert.alert(
          'Wi-Fi Lost',
          'Wi-Fi connection was lost. Please reconnect to Wi-Fi and try again.',
          [{ text: 'OK' }]
        );
        setAnalyzing(false);
        return;
      }

      const { frames: highQualityFrames, firstThumbUri, allFrameUris, frameTimestamps: extractedTimestamps } = await extractFramesSmart(video.uri, durationMs);
      setThumbnailUri(firstThumbUri);
      setFrameUris(allFrameUris);
      setFrameTimestamps(extractedTimestamps);

      // Re-encode frames at lower quality + max 1024px for API payload
      setProgress(62);
      setStatusText('Compressing frames for upload...');
      let apiFrames: string[] = [];
      for (let i = 0; i < allFrameUris.length; i++) {
        setProgress(62 + Math.round((i / allFrameUris.length) * 8));
        try {
          apiFrames.push(await compressForAPI(allFrameUris[i]));
        } catch {
          // If compression fails, fall back to original
          apiFrames.push(highQualityFrames[i]);
        }
      }

      // Payload size guard: drop frames if still too large
      let totalSize = apiFrames.reduce((sum, f) => sum + f.length, 0);
      while (totalSize > MAX_PAYLOAD_BYTES && apiFrames.length > 8) {
        // Remove the middle frame (least likely to be critical start/end)
        const midIdx = Math.floor(apiFrames.length / 2);
        apiFrames.splice(midIdx, 1);
        allFrameUris.splice(midIdx, 1);
        extractedTimestamps.splice(midIdx, 1);
        totalSize = apiFrames.reduce((sum, f) => sum + f.length, 0);
      }
      // Update state if frames were dropped
      setFrameUris([...allFrameUris]);
      setFrameTimestamps([...extractedTimestamps]);

      console.log(`[LevelUp] API payload: ${apiFrames.length} frames, ${Math.round(totalSize / 1024)}KB total`);

      setProgress(72);
      setStatusText(`Sending ${apiFrames.length} frames to LevelUp...`);

      const context: MatchContext | undefined = (weightClass || competitionName || roundNumber || daysFromWeighIn)
        ? {
            ...(weightClass ? { weightClass } : {}),
            ...(competitionName ? { competitionName } : {}),
            ...(roundNumber ? { roundNumber: parseInt(roundNumber, 10) || undefined } : {}),
            ...(daysFromWeighIn ? { daysFromWeighIn: parseInt(daysFromWeighIn, 10) } : {}),
          }
        : undefined;

      // Build wrestler identification data
      let athleteId: AthleteIdentification | undefined;
      let opponentId: AthleteIdentification | undefined;
      if (selectedWrestler && wrestlerDetection) {
        const selected = selectedWrestler === 'a' ? wrestlerDetection.wrestler_a : wrestlerDetection.wrestler_b;
        const opponent = selectedWrestler === 'a' ? wrestlerDetection.wrestler_b : wrestlerDetection.wrestler_a;
        athleteId = {
          position_in_id_frame: selected.position,
          uniform_description: selected.uniform_description,
          distinguishing_features: selected.distinguishing_features,
          bounding_box_pct: selected.bounding_box_pct,
        };
        opponentId = {
          position_in_id_frame: opponent.position,
          uniform_description: opponent.uniform_description,
          distinguishing_features: opponent.distinguishing_features,
          bounding_box_pct: opponent.bounding_box_pct,
        };
      }

      const videoDuration = video.duration || 60;
      const useAsync = videoDuration > 420; // 7+ minute videos use background mode
      let data: AnalysisResult;

      if (useAsync) {
        // Async mode: submit job, poll for completion
        await requestNotificationPermissions();
        setProgress(78);
        setStatusText('Submitting for background analysis...');

        const { jobId } = await submitAnalysis(
          apiFrames,
          matchStyle,
          'athlete',
          context,
          athleteId,
          opponentId,
          idFrameBase64 ?? undefined,
          wrestlerSide ?? undefined,
        );
        await savePendingJob(jobId);

        setProgress(82);
        setStatusText('Analyzing technique & scoring performance...');

        data = await pollForCompletion(jobId, (status, polls) => {
          const p = Math.min(82 + Math.round((polls / 60) * 16), 98);
          setProgress(p);
          if (polls <= 5) setStatusText('Analyzing technique & scoring performance...');
          else if (polls <= 15) setStatusText('Scoring against wrestling rubric...');
          else if (polls <= 30) setStatusText('Generating recommendations...');
          else setStatusText('Almost done — finalizing analysis...');
        });
      } else {
        // Sync mode: wait for full result
        setProgress(78);
        setStatusText('Analyzing technique & scoring performance...');

        data = await analyzeFrames(
          apiFrames,
          matchStyle,
          'athlete',
          context,
          athleteId,
          opponentId,
          idFrameBase64 ?? undefined,
          wrestlerSide ?? undefined,
        );
      }

      setProgress(100);
      setStatusText('Analysis complete!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(data);

      // Track for longitudinal progress
      await trackAnalysis(data, {
        competitionName: competitionName || undefined,
        weightClass: weightClass || undefined,
        matchStyle,
      });

      // Save to history
      await addAnalysisEntry({
        id: `analysis_${Date.now()}`,
        createdAt: new Date().toISOString(),
        thumbnailUri: firstThumbUri || '',
        frameUris: allFrameUris,
        frameTimestamps: extractedTimestamps,
        videoUri: video.uri,
        videoFileName: video.fileName || 'Match Video',
        videoDurationSeconds: video.duration || 0,
        singletColors: [],
        result: data,
      });
    } catch (err: any) {
      console.error('[LevelUp] Analysis error:', err);
      setStatusText(err?.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetUpload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVideo(null);
    setMatchStyle('youth_folkstyle');
    setShowContext(false);
    setWeightClass('');
    setCompetitionName('');
    setRoundNumber('');
    setDaysFromWeighIn('');
    setDurationWarning(null);
    setIdFrameUri(null);
    setIdFrameBase64(null);
    setIdFrameIndex(0);
    setIdFrames([]);
    setWrestlerDetection(null);
    setSelectedWrestler(null);
    setIdentifyingWrestler(false);
    setExtractingIdFrames(false);
    setWrestlerSide(null);
    setLeftHalfUri(null);
    setRightHalfUri(null);
    setExtractingPreview(false);
    setThumbnailUri(null);
    setFrameUris([]);
    setFrameTimestamps([]);
    setResult(null);
    setProgress(0);
    setStatusText('');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Results view
  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>LEVELUP ANALYSIS</Text>
            <Text style={styles.headerSub}>AI-Powered Wrestling Breakdown</Text>
          </View>

          {/* Video Review Overlay — plays video with annotation pauses */}
          {frameUris.length > 0 && (
            <VideoReviewOverlay
              frameUris={frameUris}
              frameTimestamps={frameTimestamps}
              videoUri={video?.uri}
              result={result}
              singletColors={[]}
            />
          )}

          <AnalysisResults
            result={result}
            thumbnailUri={frameUris.length > 0 ? null : thumbnailUri}
            videoFileName={video?.fileName || 'Match Video'}
            showUploadAnother
            onUploadAnother={resetUpload}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UPLOAD VIDEO</Text>
          <Text style={styles.headerSub}>Get LevelUp analysis of your match</Text>
        </View>

        {/* Video Picker */}
        <View style={styles.section}>
          {!video ? (
            <View style={styles.pickerOptions}>
              <TouchableOpacity style={styles.pickerCard} onPress={pickVideo}>
                <Upload size={40} color="#71717A" />
                <Text style={styles.pickerTitle}>Choose from Library</Text>
                <Text style={styles.pickerSub}>Select an existing video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerCard} onPress={recordVideo}>
                <Camera size={40} color="#71717A" />
                <Text style={styles.pickerTitle}>Record Video</Text>
                <Text style={styles.pickerSub}>Film a match live</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectedCard}>
              <View style={styles.selectedRow}>
                <Video size={32} color="#2563EB" />
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {video.fileName || 'Selected Video'}
                  </Text>
                  <Text style={styles.selectedMeta}>
                    {formatDuration(video.duration ?? undefined)} | {formatFileSize(video.fileSize)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={pickVideo}>
                <Text style={styles.changeBtn}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
          {durationWarning && video && (
            <View style={styles.durationWarning}>
              <Text style={styles.durationWarningText}>{durationWarning}</Text>
            </View>
          )}
        </View>

        {/* Split-Frame Wrestler Side Picker */}
        {video && !analyzing && !result && (extractingPreview || leftHalfUri) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WHICH SIDE IS YOUR WRESTLER?</Text>
            <Text style={styles.sectionHint}>Tap the side of the frame where your wrestler starts</Text>
            {extractingPreview ? (
              <View style={styles.wrestlerLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.wrestlerLoadingText}>Loading preview...</Text>
              </View>
            ) : (
              <View style={styles.sideSplitRow}>
                <TouchableOpacity
                  style={[styles.sideSplitCard, wrestlerSide === 'left' && styles.sideSplitCardSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setWrestlerSide(wrestlerSide === 'left' ? null : 'left');
                  }}
                  activeOpacity={0.8}
                >
                  {leftHalfUri && (
                    <Image source={{ uri: leftHalfUri }} style={styles.sideSplitImage} />
                  )}
                  <View style={styles.sideSplitLabelWrap}>
                    <Text style={[styles.sideSplitLabel, wrestlerSide === 'left' && styles.sideSplitLabelSelected]}>LEFT</Text>
                  </View>
                  {wrestlerSide === 'left' && (
                    <View style={styles.sideSplitBadge}>
                      <Text style={styles.sideSplitBadgeText}>YOUR WRESTLER</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sideSplitCard, wrestlerSide === 'right' && styles.sideSplitCardSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setWrestlerSide(wrestlerSide === 'right' ? null : 'right');
                  }}
                  activeOpacity={0.8}
                >
                  {rightHalfUri && (
                    <Image source={{ uri: rightHalfUri }} style={styles.sideSplitImage} />
                  )}
                  <View style={styles.sideSplitLabelWrap}>
                    <Text style={[styles.sideSplitLabel, wrestlerSide === 'right' && styles.sideSplitLabelSelected]}>RIGHT</Text>
                  </View>
                  {wrestlerSide === 'right' && (
                    <View style={styles.sideSplitBadge}>
                      <Text style={styles.sideSplitBadgeText}>YOUR WRESTLER</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Wrestler Identification — GPT-4o Detection */}
        {video && !analyzing && !result && (extractingIdFrames || identifyingWrestler || wrestlerDetection) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>IDENTIFY YOUR WRESTLER</Text>
            {extractingIdFrames && (
              <View style={styles.wrestlerLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.wrestlerLoadingText}>Extracting frames...</Text>
              </View>
            )}
            {!extractingIdFrames && identifyingWrestler && (
              <View style={styles.wrestlerLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.wrestlerLoadingText}>Detecting wrestlers...</Text>
              </View>
            )}
            {!extractingIdFrames && !identifyingWrestler && wrestlerDetection && idFrameUri && (
              <>
                {/* Annotated ID frame */}
                <View style={styles.idFrameContainer}>
                  <Image source={{ uri: idFrameUri }} style={styles.idFrameImage} />
                  {/* Bounding box overlays */}
                  <View style={[
                    styles.boundingBox,
                    styles.boundingBoxA,
                    {
                      left: `${wrestlerDetection.wrestler_a.bounding_box_pct.x * 100}%` as any,
                      top: `${wrestlerDetection.wrestler_a.bounding_box_pct.y * 100}%` as any,
                      width: `${wrestlerDetection.wrestler_a.bounding_box_pct.w * 100}%` as any,
                      height: `${wrestlerDetection.wrestler_a.bounding_box_pct.h * 100}%` as any,
                    },
                  ]}>
                    <Text style={styles.boundingBoxLabel}>A</Text>
                  </View>
                  <View style={[
                    styles.boundingBox,
                    styles.boundingBoxB,
                    {
                      left: `${wrestlerDetection.wrestler_b.bounding_box_pct.x * 100}%` as any,
                      top: `${wrestlerDetection.wrestler_b.bounding_box_pct.y * 100}%` as any,
                      width: `${wrestlerDetection.wrestler_b.bounding_box_pct.w * 100}%` as any,
                      height: `${wrestlerDetection.wrestler_b.bounding_box_pct.h * 100}%` as any,
                    },
                  ]}>
                    <Text style={styles.boundingBoxLabel}>B</Text>
                  </View>
                </View>

                {/* Wrestler cards */}
                <View style={styles.wrestlerCards}>
                  <TouchableOpacity
                    style={[
                      styles.wrestlerIdCard,
                      selectedWrestler === 'a' && styles.wrestlerIdCardSelected,
                      selectedWrestler === 'b' && styles.wrestlerIdCardDimmed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedWrestler(selectedWrestler === 'a' ? null : 'a');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.wrestlerIdCardHeader}>
                      <View style={[styles.wrestlerIdDot, { backgroundColor: '#454bd1' }]} />
                      <Text style={styles.wrestlerIdCardTitle}>Wrestler A</Text>
                    </View>
                    <Text style={styles.wrestlerIdCardDesc}>{`"${wrestlerDetection.wrestler_a.uniform_description}"`}</Text>
                    <Text style={styles.wrestlerIdCardSide}>{wrestlerDetection.wrestler_a.position === 'left' ? 'Left' : 'Right'} side of frame</Text>
                    <TouchableOpacity
                      style={[styles.thisIsMeBtn, selectedWrestler === 'a' && styles.thisIsMeBtnSelected]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedWrestler(selectedWrestler === 'a' ? null : 'a');
                      }}
                    >
                      <Text style={[styles.thisIsMeBtnText, selectedWrestler === 'a' && styles.thisIsMeBtnTextSelected]}>
                        {selectedWrestler === 'a' ? '\u2713 Your Wrestler' : 'THIS IS ME'}
                      </Text>
                    </TouchableOpacity>
                    {selectedWrestler === 'b' && (
                      <Text style={styles.opponentLabel}>Opponent</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.wrestlerIdCard,
                      selectedWrestler === 'b' && styles.wrestlerIdCardSelected,
                      selectedWrestler === 'a' && styles.wrestlerIdCardDimmed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedWrestler(selectedWrestler === 'b' ? null : 'b');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.wrestlerIdCardHeader}>
                      <View style={[styles.wrestlerIdDot, { backgroundColor: '#ff8c00' }]} />
                      <Text style={styles.wrestlerIdCardTitle}>Wrestler B</Text>
                    </View>
                    <Text style={styles.wrestlerIdCardDesc}>{`"${wrestlerDetection.wrestler_b.uniform_description}"`}</Text>
                    <Text style={styles.wrestlerIdCardSide}>{wrestlerDetection.wrestler_b.position === 'left' ? 'Left' : 'Right'} side of frame</Text>
                    <TouchableOpacity
                      style={[styles.thisIsMeBtn, selectedWrestler === 'b' && styles.thisIsMeBtnSelected]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedWrestler(selectedWrestler === 'b' ? null : 'b');
                      }}
                    >
                      <Text style={[styles.thisIsMeBtnText, selectedWrestler === 'b' && styles.thisIsMeBtnTextSelected]}>
                        {selectedWrestler === 'b' ? '\u2713 Your Wrestler' : 'THIS IS ME'}
                      </Text>
                    </TouchableOpacity>
                    {selectedWrestler === 'a' && (
                      <Text style={styles.opponentLabel}>Opponent</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Try another frame */}
                {idFrames.length > 1 && (
                  <TouchableOpacity onPress={tryAnotherFrame} style={styles.tryAnotherBtn}>
                    <Text style={styles.tryAnotherText}>Can't tell? Try another frame</Text>
                  </TouchableOpacity>
                )}

                {/* Low confidence tip */}
                {wrestlerDetection.confidence !== undefined && wrestlerDetection.confidence < 0.6 && (
                  <Text style={styles.lowConfidenceTip}>
                    Tip: If both wrestlers look similar, pick the one closest to the LEFT or RIGHT side of the frame and we'll track them from there.
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Match Style Picker */}
        {video && !analyzing && !result && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MATCH STYLE</Text>
            <Text style={styles.sectionHint}>
              Select the{' '}
              <Text
                style={styles.wrestlingStyleLink}
                onPress={() => setStyleModalVisible(true)}
              >
                wrestling style
              </Text>
              {' '}for scoring rules
            </Text>
            <View style={styles.styleRow}>
              {MATCH_STYLES.map((s) => {
                const active = matchStyle === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.styleChip, active && styles.styleChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMatchStyle(s.value);
                    }}
                  >
                    <Text style={[styles.styleLabel, active && styles.styleLabelActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Match Context (optional) */}
        {video && !analyzing && !result && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.contextToggle}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowContext(!showContext);
              }}
            >
              <Text style={styles.sectionLabel}>MATCH DETAILS <Text style={styles.optionalTag}>OPTIONAL</Text></Text>
              <Text style={styles.contextToggleArrow}>{showContext ? '\u25B2' : '\u25BC'}</Text>
            </TouchableOpacity>
            {showContext && (
              <View style={styles.contextFields}>
                <View style={styles.contextRow}>
                  <View style={styles.contextField}>
                    <Text style={styles.contextFieldLabel}>Weight Class</Text>
                    <TextInput
                      style={styles.contextInput}
                      placeholder="e.g. 126 lbs"
                      placeholderTextColor="#52525B"
                      value={weightClass}
                      onChangeText={setWeightClass}
                    />
                  </View>
                  <View style={styles.contextField}>
                    <Text style={styles.contextFieldLabel}>Round #</Text>
                    <TextInput
                      style={styles.contextInput}
                      placeholder="1"
                      placeholderTextColor="#52525B"
                      value={roundNumber}
                      onChangeText={setRoundNumber}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View style={styles.contextRow}>
                  <View style={styles.contextField}>
                    <Text style={styles.contextFieldLabel}>Competition</Text>
                    <TextInput
                      style={styles.contextInput}
                      placeholder="e.g. District Duals"
                      placeholderTextColor="#52525B"
                      value={competitionName}
                      onChangeText={setCompetitionName}
                    />
                  </View>
                  <View style={styles.contextField}>
                    <Text style={styles.contextFieldLabel}>Days Since Weigh-In</Text>
                    <TextInput
                      style={styles.contextInput}
                      placeholder="0"
                      placeholderTextColor="#52525B"
                      value={daysFromWeighIn}
                      onChangeText={setDaysFromWeighIn}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Analyze Button */}
        {video && !analyzing && (
          <View style={styles.section}>
            <TouchableOpacity onPress={analyzeVideo} activeOpacity={0.85}>
              <LinearGradient
                colors={['#2563EB', '#E91E8C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.analyzeBtn}
              >
                <Cpu size={20} color="#fff" />
                <Text style={styles.analyzeBtnText}>ANALYZE WITH LEVELUP</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.wifiNote}>
              <Wifi size={12} color="#52525B" />
              <Text style={styles.wifiNoteText}>Wi-Fi required for analysis</Text>
            </View>
          </View>
        )}

        {/* Progress */}
        {analyzing && (
          <View style={styles.progressSection}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.progressPercent}>{progress}%</Text>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#2563EB', '#E91E8C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` as any }]}
              />
            </View>
            <Text style={styles.progressStatus}>{statusText}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Match Style Info Modal */}
      <Modal
        visible={styleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStyleModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStyleModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Match Style</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {STYLE_INFO.map((style, idx) => (
                <View key={idx} style={styles.modalCard}>
                  <Text style={styles.modalCardName}>{style.name}</Text>
                  <Text style={styles.modalCardUsedBy}>Used by: {style.usedBy}</Text>
                  <Text style={styles.modalCardDesc}>{`\u201C${style.description}\u201D`}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setStyleModalVisible(false)}
            >
              <Text style={styles.modalDismissBtnText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  headerSub: { fontSize: 14, color: '#71717A', marginTop: 4 },
  section: { paddingHorizontal: 24, marginTop: 24 },
  pickerOptions: { gap: 12 },
  pickerCard: {
    borderWidth: 2,
    borderColor: '#27272A',
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pickerSub: { fontSize: 13, color: '#71717A' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A1A1AA',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionHint: { fontSize: 13, color: '#52525B', marginBottom: 14 },
  optionalTag: { fontSize: 10, color: '#52525B', fontWeight: '600' },
  wrestlerLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  wrestlerLoadingText: {
    fontSize: 13,
    color: '#71717A',
  },
  idFrameContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  idFrameImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  boundingBoxA: {
    borderColor: '#454bd1',
    backgroundColor: 'rgba(69,75,209,0.2)',
  },
  boundingBoxB: {
    borderColor: '#ff8c00',
    backgroundColor: 'rgba(255,140,0,0.2)',
  },
  boundingBoxLabel: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  wrestlerCards: {
    gap: 10,
    marginBottom: 8,
  },
  wrestlerIdCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#27272A',
  },
  wrestlerIdCardSelected: {
    borderColor: '#22c55e',
  },
  wrestlerIdCardDimmed: {
    opacity: 0.5,
  },
  wrestlerIdCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  wrestlerIdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  wrestlerIdCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  wrestlerIdCardDesc: {
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  wrestlerIdCardSide: {
    fontSize: 12,
    color: '#52525B',
    marginBottom: 10,
  },
  thisIsMeBtn: {
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  thisIsMeBtnSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  thisIsMeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  thisIsMeBtnTextSelected: {
    color: '#22c55e',
  },
  opponentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525B',
    textAlign: 'center',
    marginTop: 6,
  },
  tryAnotherBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tryAnotherText: {
    fontSize: 13,
    color: '#454bd1',
  },
  lowConfidenceTip: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  wrestlingStyleLink: {
    color: '#454bd1',
    fontSize: 13,
  },
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  styleChip: {
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#27272A',
  },
  styleChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB15',
  },
  styleLabel: { fontSize: 14, fontWeight: '700', color: '#71717A' },
  styleLabelActive: { color: '#fff' },
  selectedCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  selectedMeta: { fontSize: 12, color: '#71717A', marginTop: 4 },
  changeBtn: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  durationWarning: {
    marginTop: 10,
    backgroundColor: '#422006',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#854D0E',
  },
  durationWarningText: { fontSize: 13, color: '#FCD34D', textAlign: 'center' },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
  },
  analyzeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  contextToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextToggleArrow: { fontSize: 10, color: '#52525B' },
  contextFields: { marginTop: 12, gap: 10 },
  contextRow: { flexDirection: 'row', gap: 10 },
  contextField: { flex: 1 },
  contextFieldLabel: { fontSize: 11, color: '#71717A', fontWeight: '600', marginBottom: 4 },
  contextInput: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  wifiNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  wifiNoteText: { fontSize: 11, color: '#52525B' },
  progressSection: { alignItems: 'center', paddingHorizontal: 24, marginTop: 40, gap: 16 },
  progressPercent: { fontSize: 36, fontWeight: '800', color: '#fff' },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#27272A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressStatus: { fontSize: 14, color: '#A1A1AA', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: Dimensions.get('window').height * 0.75,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalCard: {
    backgroundColor: '#252547',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  modalCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modalCardUsedBy: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 6,
  },
  modalCardDesc: {
    fontSize: 13,
    color: '#71717A',
    lineHeight: 18,
  },
  modalDismissBtn: {
    backgroundColor: '#454bd1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDismissBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sideSplitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sideSplitCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#27272A',
    backgroundColor: '#18181B',
  },
  sideSplitCardSelected: {
    borderColor: '#2563EB',
  },
  sideSplitImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    resizeMode: 'cover',
  },
  sideSplitLabelWrap: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  sideSplitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
  },
  sideSplitLabelSelected: {
    color: '#2563EB',
  },
  sideSplitBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sideSplitBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
