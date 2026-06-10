import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type SkeletonProps = { width?: number | string; height?: number; radius?: number; style?: any };

/** Pulsing placeholder block for loading states. */
export function Skeleton({ width = '100%', height = 16, radius = 6, style }: SkeletonProps) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, opacity: anim, backgroundColor: 'rgba(255,255,255,0.05)' },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton for station/route placeholders. */
export function SkeletonCard() {
  return (
    <View style={{ padding: 16, borderRadius: 14, backgroundColor: '#0D1525', gap: 12 }}>
      <Skeleton width="60%" height={16} />
      <Skeleton width="35%" height={12} />
    </View>
  );
}

/** Row of 3 skeleton cards. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

export default Skeleton;
