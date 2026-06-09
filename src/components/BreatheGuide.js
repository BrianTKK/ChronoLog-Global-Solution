import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Animated, Easing, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

export default function BreatheGuide({ pace = 'normal' }) {
  const [label, setLabel] = useState('Inspire');
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let isMounted = true;

    // Função para rodar o ciclo de respiração
    const runBreathCycle = () => {
      const breathDuration = pace === 'slow' ? 6000 : 4000;
      
      // Fase 1: Inalar (4s ou 6s se lento)
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: breathDuration,
          useNativeDriver: Platform.OS !== 'web',
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: breathDuration,
          useNativeDriver: Platform.OS !== 'web',
          easing: Easing.inOut(Easing.ease),
        }),
      ]).start(() => {
        if (!isMounted) return;
        
        // Vibração suave no topo da inalação
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setLabel('Expire');

        // Fase 2: Exalar (4s ou 6s se lento)
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: breathDuration,
            useNativeDriver: Platform.OS !== 'web',
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.4,
            duration: breathDuration,
            useNativeDriver: Platform.OS !== 'web',
            easing: Easing.inOut(Easing.ease),
          }),
        ]).start(() => {
          if (!isMounted) return;
          
          // Vibração suave na base da exalação
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setLabel('Inspire');
          
          // Reinicia ciclo
          runBreathCycle();
        });
      });
    };

    // Iniciar ciclo de respiração guiada
    runBreathCycle();

    return () => {
      isMounted = false;
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [pace]);

  return (
    <View style={styles.container}>
      {/* Outer Halo / Glow */}
      <Animated.View
        style={[
          styles.halo,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, 1.2) }],
            opacity: Animated.multiply(opacityAnim, 0.3),
          },
        ]}
      />

      {/* Mid Layer Organic Container */}
      <Animated.View
        style={[
          styles.midLayer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />

      {/* Core Interactive Circle */}
      <View style={styles.coreCircle}>
        <MaterialIcons name="spa" size={36} color={COLORS.primary} style={styles.icon} />
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.primary,
  },
  midLayer: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 15px rgba(45, 212, 191, 0.15)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
      },
    }),
  },
  icon: {
    opacity: 0.8,
    marginBottom: 8,
  },
  labelText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 26,
    color: COLORS.onBackground,
    letterSpacing: 1,
  },
});
