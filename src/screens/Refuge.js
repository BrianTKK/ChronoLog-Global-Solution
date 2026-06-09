import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BreatheGuide from '../components/BreatheGuide';
import { playSound, pauseSound, resumeSound, stopSound, getActiveSoundId } from '../services/audio';
import { COLORS, SPACING, ROUNDNESS, GLASS_STYLE } from '../styles/theme';

export default function Refuge({ onClose, comfortMessage, tensionDetected, recommendedSoundId, recommendedBreathePace }) {
  const [playingId, setPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlaySound = async (soundId) => {
    const activeId = getActiveSoundId();
    if (playingId === soundId && activeId === soundId) {
      if (isPlaying) {
        await pauseSound();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await resumeSound();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      setPlayingId(soundId);
      const sound = await playSound(soundId, (status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
        }
      });
      setIsLoading(false);
      if (sound) {
        setIsPlaying(true);
      }
    }
  };

  // Pré-selecionar o som recomendado se houver (sem tocar automaticamente) e garantir limpeza ao sair
  useEffect(() => {
    if (recommendedSoundId) {
      setPlayingId(recommendedSoundId);
    }
    return () => {
      stopSound();
    };
  }, [recommendedSoundId]);


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>O Refúgio</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content Scroll Wrapper */}
        <ScrollView style={styles.contentWrapper} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Card de Feedback do Copiloto Mental se houver mensagem */}
          {comfortMessage ? (
            <View style={[styles.comfortCard, tensionDetected ? styles.comfortCardTense : styles.comfortCardCalm]}>
              <View style={styles.comfortCardHeader}>
                <MaterialIcons 
                  name={tensionDetected ? "psychology" : "check-circle"} 
                  size={22} 
                  color={tensionDetected ? COLORS.secondary : COLORS.primary} 
                />
                <Text style={styles.comfortCardTitle}>
                  {tensionDetected ? "Feedback do Copiloto Mental (Offline)" : "Diretrizes de Saúde Mental"}
                </Text>
              </View>
              <Text style={styles.comfortCardBody}>{comfortMessage}</Text>
            </View>
          ) : null}

          {/* Breathing Guide Canvas */}
          <View style={styles.canvas}>
            <BreatheGuide pace={recommendedBreathePace} />
          </View>

          {/* Binaural Sounds Section */}
          <View style={styles.soundsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sons Binaurais</Text>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.soundsScroll}
              snapToInterval={280}
              decelerationRate="fast"
            >
              {/* Card 1: Rain */}
              <View style={[styles.soundCard, playingId === 'rain' && styles.soundCardActive]}>
                <View style={styles.soundCardInfo}>
                  <View style={[styles.iconCircle, playingId === 'rain' && styles.iconActive]}>
                    <MaterialIcons name="umbrella" size={20} color={COLORS.secondary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.soundTitle}>Som de chuva</Text>
                    <Text style={styles.soundSubtitle}>Chuva Real • Relaxamento</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.playButton} 
                  onPress={() => handlePlaySound('rain')}
                  disabled={isLoading}
                >
                  {isLoading && playingId === 'rain' ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <MaterialIcons 
                      name={playingId === 'rain' && isPlaying ? "pause" : "play-arrow"} 
                      size={24} 
                      color={COLORS.onBackground} 
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Card 2: Focus */}
              <View style={[styles.soundCard, playingId === 'focus' && styles.soundCardActive]}>
                <View style={styles.soundCardInfo}>
                  <View style={[styles.iconCircle, playingId === 'focus' && styles.iconActive]}>
                    <MaterialIcons name="waves" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.soundTitle}>Frequência de foco</Text>
                    <Text style={styles.soundSubtitle}>Binaural Beta • 20 Hz</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.playButton} 
                  onPress={() => handlePlaySound('focus')}
                  disabled={isLoading}
                >
                  {isLoading && playingId === 'focus' ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <MaterialIcons 
                      name={playingId === 'focus' && isPlaying ? "pause" : "play-arrow"} 
                      size={24} 
                      color={COLORS.onBackground} 
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.spacer} />
            </ScrollView>
          </View>
        </ScrollView>

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
    backgroundColor: COLORS.background,
  },
  header: {
    height: SPACING.touchTargetMin + 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginSide,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    color: COLORS.onSurfaceVariant,
    opacity: 0.6,
  },
  headerSpacer: {
    width: 44,
  },
  contentWrapper: {
    flex: 1,
    marginTop: 70, // Inicia logo abaixo do Header absoluto
  },
  scrollContent: {
    paddingBottom: 40,
  },
  comfortCard: {
    ...GLASS_STYLE,
    marginHorizontal: SPACING.marginSide,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: ROUNDNESS.default,
    gap: 8,
    borderWidth: 1,
  },
  comfortCardTense: {
    borderColor: 'rgba(251, 191, 36, 0.4)', // Dourado do Refúgio para o card de crise
    backgroundColor: 'rgba(28, 31, 42, 0.9)',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(251, 191, 36, 0.20)',
      },
      default: {
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  comfortCardCalm: {
    borderColor: 'rgba(45, 212, 191, 0.2)', // Verde-água para logs normais
    backgroundColor: 'rgba(28, 31, 42, 0.7)',
  },
  comfortCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comfortCardTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: COLORS.onSurface,
    fontWeight: 'bold',
  },
  comfortCardBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  canvas: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  soundsSection: {
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.marginSide,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  // Removidos estilos não utilizados stopButton e stopText
  soundsScroll: {
    paddingHorizontal: SPACING.marginSide,
    gap: 16,
  },
  soundCard: {
    ...GLASS_STYLE,
    width: 280,
    borderRadius: ROUNDNESS.default,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundCardActive: {
    borderColor: 'rgba(45, 212, 191, 0.3)',
    backgroundColor: 'rgba(28, 31, 42, 0.7)',
  },
  soundCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderColor: 'rgba(45, 212, 191, 0.2)',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  soundTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  soundSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  spacer: {
    width: 16,
  },
});
