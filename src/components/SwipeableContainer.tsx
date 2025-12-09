import React, { useRef, useCallback, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  ViewStyle,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

interface SwipeableContainerProps {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: ViewStyle;
}

export function SwipeableContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  style,
}: SwipeableContainerProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Refs para manter os callbacks atualizados
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);

  // Atualiza as refs quando os callbacks mudam
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [translateX]);

  const animateSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const toValue = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;

      Animated.parallel([
        Animated.timing(translateX, {
          toValue,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Executa o callback (muda o mês/ano) usando a ref atualizada
        if (direction === 'left') {
          onSwipeLeftRef.current();
        } else {
          onSwipeRightRef.current();
        }

        // Posiciona do lado oposto para entrada
        translateX.setValue(direction === 'left' ? SCREEN_WIDTH * 0.3 : -SCREEN_WIDTH * 0.3);
        opacity.setValue(0.3);

        // Anima a entrada do novo conteúdo
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [translateX, opacity]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const { dx, dy } = gestureState;
          // Só ativa se o movimento horizontal for significativamente maior que o vertical
          return Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 10;
        },

        onPanResponderMove: (_, gestureState) => {
          // Limita o arrasto para dar feedback visual
          const clampedDx = Math.max(-150, Math.min(150, gestureState.dx));
          translateX.setValue(clampedDx);

          // Diminui opacidade conforme arrasta
          const newOpacity = 1 - Math.abs(clampedDx) / 300;
          opacity.setValue(Math.max(0.5, newOpacity));
        },

        onPanResponderRelease: (_, gestureState) => {
          const { dx, vx } = gestureState;

          // Verifica se passou do threshold
          if (dx < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD) {
            // Swipe para esquerda = próximo período
            animateSwipe('left');
          } else if (dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD) {
            // Swipe para direita = período anterior
            animateSwipe('right');
          } else {
            // Não passou do threshold, volta à posição original
            resetPosition();
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }
        },

        onPanResponderTerminate: () => {
          resetPosition();
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateX, opacity, animateSwipe, resetPosition]
  );

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{ translateX }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
