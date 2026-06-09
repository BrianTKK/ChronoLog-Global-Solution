import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, SPACING, ROUNDNESS, GLASS_STYLE } from '../styles/theme';

export default function History({ logs = [], onHomePress, onRefugePress, onRecordPress }) {
  // Filtrar logs que já foram entregues (Histórico de logs antigos)
  const deliveredLogs = logs.filter(log => log.status === 'delivered');

  // Player de Áudio State
  const [playingLogId, setPlayingLogId] = useState(null);
  const [soundInstance, setSoundInstance] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Controle de expansão de relatórios
  const [expandedReports, setExpandedReports] = useState({});

  // Limpar áudio ao desmontar
  useEffect(() => {
    return () => {
      if (soundInstance) {
        soundInstance.unloadAsync().catch(() => {});
      }
    };
  }, [soundInstance]);

  const togglePlayAudio = async (log) => {
    if (!log.audioUri) return;

    try {
      // Se clicar no mesmo log que está tocando
      if (playingLogId === log.id && soundInstance) {
        if (isPlaying) {
          await soundInstance.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundInstance.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // Se clicar em outro log, descarregar o anterior
      if (soundInstance) {
        await soundInstance.stopAsync();
        await soundInstance.unloadAsync();
        setSoundInstance(null);
        setPlayingLogId(null);
        setIsPlaying(false);
        setPlaybackProgress(0);
      }

      // Configurar modo de áudio para reprodução
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
        staysActiveInBackground: true,
      });

      // Criar e tocar novo áudio
      const { sound } = await Audio.Sound.createAsync(
        { uri: log.audioUri },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setPlaybackProgress(status.positionMillis || 0);
            setPlaybackDuration(status.durationMillis || 1);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackProgress(0);
              setPlayingLogId(null);
            }
          }
        }
      );

      setSoundInstance(sound);
      setPlayingLogId(log.id);
      setIsPlaying(true);
    } catch (error) {
      console.error('Erro ao tocar áudio no histórico:', error);
      alert('Erro ao tentar reproduzir este arquivo de áudio.');
    }
  };

  const toggleReportExpand = (id) => {
    setExpandedReports(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Helper para gerar tags fictícias com base no tipo de log e texto
  const getTagsForLog = (log) => {
    if (log.type === 'audio') {
      return ['#LogDeVoz', '#SaúdeMental', '#Orbital'];
    }
    if (log.type === 'video') {
      return ['#VídeoCheck', '#FeedbackFísico', '#Diário'];
    }
    const titleLower = log.title?.toLowerCase() || '';
    if (titleLower.includes('rotina') || titleLower.includes('filtro')) {
      return ['#Rotina', '#ResoluçãoTécnica', '#Manutenção'];
    }
    return ['#Desabafo', '#Reflexão', '#DiárioDeBordo'];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* TopAppBar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onHomePress}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Acervo Cronológico</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Logs List Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introBlock}>
            <Text style={styles.introTitle}>Histórico de Logs</Text>
            <Text style={styles.introSubtitle}>
              Seu acervo de reflexões e relatórios gravados localmente durante a missão.
            </Text>
          </View>

          {deliveredLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="archive" size={48} color={COLORS.onSurfaceVariant} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>Nenhum log entregue no acervo ainda.</Text>
              <Text style={styles.emptySubtext}>Logs em trânsito aparecerão aqui assim que forem entregues à base terrestre.</Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {deliveredLogs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                      <MaterialIcons 
                        name={log.type === 'audio' ? 'mic' : log.type === 'video' ? 'videocam' : 'edit-document'} 
                        size={20} 
                        color={COLORS.primary} 
                      />
                      <Text style={styles.logTitle}>{log.title}</Text>
                    </View>
                    <Text style={styles.logDate}>{log.date || '09/06/2026'} • {log.timeLabel.replace(/^Entregue • /, '')}</Text>
                  </View>

                  <Text style={styles.logContent}>
                    {log.type === 'audio' 
                      ? `[Transcrição de Áudio]: ${log.text || 'Nenhuma fala transcrita.'}` 
                      : log.type === 'video'
                      ? `[Observações de Vídeo]: ${log.text || 'Nenhum comentário.'}`
                      : log.text || 'Registro vazio.'}
                  </Text>

                  {/* Player de Áudio Real se for log de voz gravado */}
                  {log.type === 'audio' && log.audioUri && (
                    <View style={styles.playerContainer}>
                      <TouchableOpacity 
                        style={styles.playPauseButton} 
                        onPress={() => togglePlayAudio(log)}
                      >
                        <MaterialIcons 
                          name={playingLogId === log.id && isPlaying ? "pause" : "play-arrow"} 
                          size={24} 
                          color={COLORS.onPrimary} 
                        />
                        <Text style={styles.playPauseButtonText}>
                          {playingLogId === log.id && isPlaying ? "Pausar Áudio" : "Ouvir Registro"}
                        </Text>
                      </TouchableOpacity>

                      {playingLogId === log.id && (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(playbackProgress / playbackDuration) * 100}%` }]} />
                          </View>
                          <Text style={styles.timerLabel}>
                            {formatTime(playbackProgress / 1000)} / {formatTime(playbackDuration / 1000)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Tags generated locally */}
                  <View style={styles.tagsContainer}>
                    {(log.sentiment?.tags || getTagsForLog(log)).map((tag, idx) => (
                      <View key={idx} style={styles.tagBadge}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                    {log.sentiment?.acousticLabel && (
                      <View style={[styles.tagBadge, { backgroundColor: 'rgba(251, 191, 36, 0.05)', borderColor: 'rgba(251, 191, 36, 0.2)' }]}>
                        <Text style={[styles.tagText, { color: COLORS.secondary }]}>🎙️ vocal: {log.sentiment.acousticLabel}</Text>
                      </View>
                    )}
                  </View>

                  {/* Relatório Clínico da Base (Uplink Diagnóstico) */}
                  {log.diagnosticReport && (
                    <View style={styles.diagnosticWrapper}>
                      <TouchableOpacity 
                        style={[styles.diagnosticHeaderBtn, expandedReports[log.id] && styles.diagnosticHeaderBtnActive]} 
                        onPress={() => toggleReportExpand(log.id)}
                      >
                        <MaterialIcons 
                          name={expandedReports[log.id] ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                          size={18} 
                          color={COLORS.secondary} 
                        />
                        <Text style={styles.diagnosticBtnText}>
                          [Relatório Clínico Terrestre] • Alerta: {log.diagnosticReport.criticalLevel}
                        </Text>
                      </TouchableOpacity>

                      {expandedReports[log.id] && (
                        <View style={styles.diagnosticDetailsBox}>
                          {log.diagnosticReport.summary && (
                            <View style={styles.summaryContainer}>
                              <Text style={styles.summaryTitle}>Síntese do Relato (Base Terrestre):</Text>
                              <Text style={styles.summaryText}>{log.diagnosticReport.summary}</Text>
                            </View>
                          )}

                          <Text style={styles.diagnosticSectionTitle}>Aspectos Positivos:</Text>
                          {log.diagnosticReport.positiveFactors.map((f, i) => (
                            <Text key={i} style={styles.diagnosticBullet}>• {f}</Text>
                          ))}

                          <Text style={styles.diagnosticSectionTitle}>Indicadores de Vulnerabilidade:</Text>
                          {log.diagnosticReport.vulnerabilities.map((v, i) => (
                            <Text key={i} style={[styles.diagnosticBullet, v.toLowerCase().includes('alerta') && { color: '#F87171' }]}>• {v}</Text>
                          ))}

                          <Text style={styles.diagnosticSectionTitle}>Recomendações da Equipe Médica:</Text>
                          {log.diagnosticReport.recommendations.map((r, i) => (
                            <Text key={i} style={styles.diagnosticBullet}>• {r}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={onHomePress}>
            <MaterialIcons name="dashboard" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItemActive}>
            <MaterialIcons name="history" size={24} color={COLORS.onPrimary} />
            <Text style={styles.navTextActive}>Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={onRefugePress}>
            <MaterialIcons name="spa" size={24} color={COLORS.onSurfaceVariant} />
            <Text style={styles.navText}>Refúgio</Text>
          </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },
  header: {
    height: SPACING.touchTargetMin + 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginSide,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginLeft: -10,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
    color: COLORS.onSurfaceVariant,
    opacity: 0.6,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: SPACING.marginSide,
    paddingTop: 24,
    paddingBottom: 100,
  },
  introBlock: {
    marginBottom: 24,
  },
  introTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    color: COLORS.onBackground,
    marginBottom: 8,
  },
  introSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  emptyContainer: {
    ...GLASS_STYLE,
    borderRadius: ROUNDNESS.default,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  emptyIcon: {
    opacity: 0.3,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.7,
  },
  logsList: {
    gap: 16,
  },
  logCard: {
    ...GLASS_STYLE,
    borderRadius: ROUNDNESS.default,
    padding: 20,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: COLORS.onSurface,
  },
  logDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  logContent: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.onSurface,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(45, 212, 191, 0.05)',
    borderRadius: ROUNDNESS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.15)',
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: COLORS.primary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(28, 31, 42, 0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },
  navTextActive: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
  playerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: ROUNDNESS.default,
    padding: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  playPauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  playPauseButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 13,
    color: COLORS.onPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  timerLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  diagnosticWrapper: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
  },
  diagnosticHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: ROUNDNESS.sm,
  },
  diagnosticHeaderBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  diagnosticBtnText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    color: COLORS.secondary,
  },
  diagnosticDetailsBox: {
    backgroundColor: 'rgba(28, 31, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderTopWidth: 0,
    borderBottomLeftRadius: ROUNDNESS.sm,
    borderBottomRightRadius: ROUNDNESS.sm,
    padding: 12,
    gap: 8,
  },
  summaryContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: ROUNDNESS.sm,
    padding: 10,
    marginBottom: 4,
  },
  summaryTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.onSurface,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  diagnosticSectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  diagnosticBullet: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.onSurface,
    lineHeight: 18,
    paddingLeft: 4,
  },
});
