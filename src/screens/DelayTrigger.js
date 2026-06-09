import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDNESS } from '../styles/theme';

export default function DelayTrigger({ onDecompress, onSkip, comfortMessage }) {
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    // Animação de ondas de radar piscando lentamente
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim1, {
            toValue: 2,
            duration: 3000,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 3,
            duration: 4500,
            useNativeDriver,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver,
          })
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 0,
            useNativeDriver,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 0,
            useNativeDriver,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver,
          })
        ])
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Atmospheric Background Effects */}
        <View style={styles.backgroundContainer}>
          {/* Pulsing radar rings */}
          <Animated.View 
            style={[
              styles.radarRing, 
              { 
                transform: [{ scale: pulseAnim1 }],
                opacity: pulseAnim1.interpolate({
                  inputRange: [1, 2],
                  outputRange: [0.3, 0]
                })
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.radarRing, 
              { 
                transform: [{ scale: pulseAnim2 }],
                opacity: pulseAnim2.interpolate({
                  inputRange: [1, 3],
                  outputRange: [0.2, 0]
                })
              }
            ]} 
          />

          {/* Central Glow */}
          <Animated.View style={[styles.centralGlow, { opacity: glowAnim }]} />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          
          {/* Status Icon Indicator */}
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <View style={styles.iconCircle}>
              <MaterialIcons name="sensors" size={32} color={COLORS.secondary} />
            </View>
          </View>

          {/* Headings */}
          <View style={styles.textBlock}>
            <Text style={styles.headline}>
              Sua mensagem está a 54 milhões de km de distância.
            </Text>
            <Text style={styles.subtitle}>
              {comfortMessage || "Enquanto a base processa, notamos tensão em suas palavras."}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsBlock}>
            <TouchableOpacity style={styles.decompressButton} onPress={onDecompress}>
              <Text style={styles.decompressButtonText}>Iniciar descompressão (2 min)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Apenas aguardar e voltar à base</Text>
            </TouchableOpacity>
          </View>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  radarRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.15)',
  },
  centralGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(45, 212, 191, 0.04)',
    blurRadius: 30,
  },
  content: {
    zIndex: 10,
    width: '100%',
    maxWidth: 390,
    paddingHorizontal: SPACING.marginSide,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.sectionGapSm,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 198, 64, 0.15)',
    blurRadius: 15,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 198, 64, 0.3)',
    backgroundColor: 'rgba(28, 31, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    gap: 16,
    marginBottom: SPACING.sectionGapLg,
    alignItems: 'center',
  },
  headline: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  actionsBlock: {
    width: '100%',
    gap: 20,
  },
  decompressButton: {
    height: 48,
    backgroundColor: COLORS.secondary,
    borderRadius: ROUNDNESS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(251, 191, 36, 0.20)',
      },
      default: {
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  decompressButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: COLORS.onSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skipButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
});
