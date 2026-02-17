import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

type Props = {
  isActive: boolean;
  size?: number;
  color?: string;
};

export default function TapIndicator({ isActive, size = 40, color = '#2563EB' }: Props) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);
  const innerOpacity = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 600 }),
          withTiming(0.6, { duration: 600 }),
        ),
        -1,
      );
      innerOpacity.value = 1;
    } else {
      ringScale.value = 1;
      ringOpacity.value = 0;
      innerOpacity.value = 0;
    }
  }, [isActive, ringScale, ringOpacity, innerOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: innerOpacity.value,
  }));

  const outerSize = size;
  const innerSize = size * 0.5;

  return (
    <Animated.View
      style={[
        styles.container,
        { width: outerSize, height: outerSize },
      ]}
    >
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderColor: color,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.inner,
          innerStyle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  inner: {
    // positioned by flexbox centering
  },
});
