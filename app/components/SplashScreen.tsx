import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const LETTERS = ['O', 'R', 'C', 'A'];

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const letterOpacities = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const letterAnims = letterOpacities.map((opacity) =>
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    );

    Animated.sequence([
      Animated.stagger(300, letterAnims),
      Animated.delay(400),
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: splashOpacity }]}>
      <View style={styles.letterRow}>
        {LETTERS.map((letter, i) => (
          <Animated.Text
            key={letter}
            style={[styles.letter, { opacity: letterOpacities[i] }]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  letterRow: {
    flexDirection: 'row',
  },
  letter: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginHorizontal: 8,
  },
});
