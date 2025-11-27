import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

type SkeletonPlaceholderProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export const SkeletonPlaceholder = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonPlaceholderProps) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const animatedStyle = {
    backgroundColor: shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E5EA', '#F2F2F7'],
    }),
  };

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

