import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';

type Props = {
  children: React.ReactNode;
};

export default function PhoneFrame({ children }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const frameWidth = Math.min(screenWidth * 0.68, 280);
  const frameHeight = frameWidth * (19.5 / 9);

  return (
    <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>9:41</Text>
        <View style={styles.statusIcons}>
          <View style={styles.signalDot} />
          <View style={styles.signalDot} />
          <View style={styles.signalDot} />
          <View style={[styles.battery, { marginLeft: 4 }]}>
            <View style={styles.batteryFill} />
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Home indicator */}
      <View style={styles.homeIndicatorRow}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    height: 28,
  },
  statusTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  signalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#71717A',
  },
  battery: {
    width: 16,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#71717A',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  batteryFill: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 1,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  homeIndicatorRow: {
    alignItems: 'center',
    paddingBottom: 6,
    paddingTop: 4,
  },
  homeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272A',
  },
});
