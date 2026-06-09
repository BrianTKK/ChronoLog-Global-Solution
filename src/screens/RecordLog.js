import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, SPACING, ROUNDNESS, GLASS_STYLE } from '../styles/theme';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export default function RecordLog({ onBack, onTransmit }) {
  const [activeTab, setActiveTab] = useState('audio'); // 'text' | 'audio' | 'video' (default to audio!)
  const [logText, setLogText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [durationSecs, setDurationSecs] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  
  // Áudio e Transcrição Reais
  const [nativeRecording, setNativeRecording] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [webRecognition, setWebRecognition] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [audioBase64, setAudioBase64] = useState(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [currentSubtitle, setCurrentSubtitle] = useState('');

  // Contador de Gravação
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setDurationSecs((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Limpar recursos ao desmontar ou trocar de aba
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [activeTab]);

  const cleanupResources = async () => {
    if (nativeRecording) {
      try {
        await nativeRecording.stopAndUnloadAsync();
      } catch (e) {}
      setNativeRecording(null);
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (e) {}
      setMediaRecorder(null);
    }
    if (webRecognition) {
      try {
        webRecognition.stop();
      } catch (e) {}
      setWebRecognition(null);
    }
    setIsRecording(false);
    setDurationSecs(0);
    setAudioBase64(null);
    setCurrentSubtitle('');
  };

  const startRecording = async () => {
    try {
      setDurationSecs(0);
      setAudioUri(null);
      setAudioBase64(null);
      setTranscriptionText('');
      setCurrentSubtitle('');
      setIsRecording(true);

      if (Platform.OS === 'web') {
        // Gravação Web real com MediaRecorder API
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          setAudioUri(url);

          // Converter Blob para Base64 no Navegador
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            setAudioBase64(base64);
          };
          reader.readAsDataURL(blob);

          // Fechar tracks de áudio para liberar o hardware
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);

        // Transcrição Web Speech API em tempo real
        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'pt-BR';
          
          rec.onresult = (event) => {
            let finalText = '';
            let latestSegment = '';
            for (let i = 0; i < event.results.length; i++) {
              finalText += event.results[i][0].transcript;
              if (i === event.results.length - 1) {
                latestSegment = event.results[i][0].transcript;
              }
            }
            setTranscriptionText(finalText);
            
            // Subtítulo de 1 linha opaca (últimos termos falados)
            const words = latestSegment.trim().split(/\s+/);
            const lastWords = words.slice(-6).join(' '); // Mostra as últimas 6 palavras
            setCurrentSubtitle(lastWords);
          };

          rec.onerror = (err) => {
            console.warn('Speech Recognition error:', err);
          };

          rec.start();
          setWebRecognition(rec);
        } else {
          setTranscriptionText('Reconhecimento de voz automático indisponível neste navegador. Você pode digitar suas notas no campo abaixo.');
        }

      } else {
        // Gravação nativa móvel com expo-av em formato WAV PCM
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        // Configuração WAV PCM 16-bit 16000Hz mono para telemetria de sinal digital (DSP)
        const pcmWavOptions = {
          isRecording: true,
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        };

        const { recording } = await Audio.Recording.createAsync(pcmWavOptions);
        setNativeRecording(recording);
      }
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      setIsRecording(false);
      alert('Não foi possível acessar o microfone para gravação.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      if (Platform.OS === 'web') {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        if (webRecognition) {
          webRecognition.stop();
        }
      } else {
        if (nativeRecording) {
          await nativeRecording.stopAndUnloadAsync();
          const uri = nativeRecording.getURI();
          setAudioUri(uri);
          setNativeRecording(null);
          
          // Restaurar modo de áudio
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
          });

          // Ler o arquivo local como base64 de forma híbrida e compatível com Expo Go
          try {
            const response = await fetch(uri);
            const fileBlob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              setAudioBase64(base64);
            };
            reader.readAsDataURL(fileBlob);
          } catch (err) {
            console.warn("Erro ao decodificar áudio nativo para Base64:", err);
          }

          // Preencher um valor padrão caso não tenha reconhecimento offline no celular
          setTranscriptionText('Log de áudio orbital gravado.');
        }
      }
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
    }
  };

  const handleTransmitPress = async () => {
    let textToSend = logText;

    if (activeTab === 'audio') {
      textToSend = transcriptionText || 'Log de áudio orbital gravado.';
    } else if (activeTab === 'video') {
      textToSend = 'Log de vídeo orbital gravado.';
    }

    if (!textToSend.trim() && activeTab === 'text') {
      alert('Por favor, escreva o seu log antes de transmitir.');
      return;
    }

    if (activeTab === 'audio' && !audioUri) {
      alert('Por favor, grave o seu áudio antes de transmitir.');
      return;
    }

    if (activeTab === 'video' && !audioUri) {
      alert('Por favor, grave o seu vídeo antes de transmitir.');
      return;
    }

    setIsTransmitting(true);
    try {
      await onTransmit(textToSend, activeTab, audioUri, audioBase64);
    } catch (e) {
      console.warn("Erro ao transmitir log:", e);
    } finally {
      setIsTransmitting(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo Log</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Multimodal Tabs (Exclusively Audio & Video) */}
          {activeTab !== 'text' && (
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'audio' && styles.tabActive]} 
                onPress={() => { setActiveTab('audio'); cleanupResources(); }}
              >
                <MaterialIcons name="mic" size={18} color={activeTab === 'audio' ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
                <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>Áudio</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'video' && styles.tabActive]} 
                onPress={() => { setActiveTab('video'); cleanupResources(); }}
              >
                <MaterialIcons name="videocam" size={18} color={activeTab === 'video' ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
                <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>Vídeo</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'text' && (
            <View style={styles.textModeHeader}>
              <TouchableOpacity style={styles.backToMediaBtn} onPress={() => { setActiveTab('audio'); cleanupResources(); }}>
                <MaterialIcons name="keyboard-arrow-left" size={20} color={COLORS.primary} />
                <Text style={styles.backToMediaText}>Voltar para Áudio / Vídeo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputOuterContainer}>
            {/* Glow effect behind */}
            <View style={styles.ambientGlow} />

            {activeTab === 'text' ? (
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Como está a mente hoje, tripulante?"
                placeholderTextColor="rgba(223, 226, 241, 0.3)"
                value={logText}
                onChangeText={setLogText}
                textAlignVertical="top"
              />
            ) : activeTab === 'audio' ? (
              <View style={styles.mediaPlaceholder}>
                {isRecording ? (
                  // Recording UI
                  <View style={styles.mediaWorkingBox}>
                    <TouchableOpacity 
                      style={[styles.recordButton, styles.recordButtonActive]} 
                      onPress={toggleRecording}
                    >
                      <MaterialIcons name="stop" size={48} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.timerText}>{formatTime(durationSecs)}</Text>
                    <Text style={styles.mediaStatusText}>Capturando voz orbital...</Text>
                    
                    {/* Live Subtitle Legend */}
                    <View style={styles.liveSubtitleContainer}>
                      <Text style={styles.liveSubtitleText}>
                        {currentSubtitle ? `"${currentSubtitle}..."` : "Fale agora, capturando frequências..."}
                      </Text>
                    </View>
                  </View>
                ) : audioUri ? (
                  // Confirmation UI (No text editing!)
                  <View style={styles.confirmationBox}>
                    <View style={styles.successIconCircle}>
                      <MaterialIcons name="check" size={36} color={COLORS.primary} />
                    </View>
                    <Text style={styles.confirmationTitle}>Confirmar log de áudio?</Text>
                    <Text style={styles.confirmationSubtitle}>
                      O log está pronto e a telemetria acústica foi extraída de forma offline.
                    </Text>
                    
                    <TouchableOpacity style={styles.redoButton} onPress={startRecording}>
                      <MaterialIcons name="replay" size={16} color={COLORS.onSurfaceVariant} />
                      <Text style={styles.redoButtonText}>Gravar Novamente</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Ready to record UI
                  <View style={styles.mediaWorkingBox}>
                    <TouchableOpacity 
                      style={styles.recordButton} 
                      onPress={toggleRecording}
                    >
                      <MaterialIcons name="mic" size={48} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.mediaStatusText}>Toque no microfone para iniciar a gravação</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.mediaPlaceholder}>
                {isRecording ? (
                  // Video Recording Simulator UI
                  <View style={styles.mediaWorkingBox}>
                    <View style={styles.videoIndicatorRow}>
                      <View style={styles.pulsingDot} />
                      <Text style={styles.videoIndicatorText}>REC</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.recordButton, styles.recordButtonActive]} 
                      onPress={() => { setIsRecording(false); setAudioUri('simulated-video-uri'); }}
                    >
                      <MaterialIcons name="stop" size={48} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.timerText}>{formatTime(durationSecs)}</Text>
                    <Text style={styles.mediaStatusText}>Gravando câmera frontal...</Text>
                    <View style={styles.liveSubtitleContainer}>
                      <Text style={styles.liveSubtitleText}>Capturando telemetria visual e de voz...</Text>
                    </View>
                  </View>
                ) : audioUri ? (
                  // Video Confirmation UI (No text editing!)
                  <View style={styles.confirmationBox}>
                    <View style={styles.successIconCircle}>
                      <MaterialIcons name="check" size={36} color={COLORS.primary} />
                    </View>
                    <Text style={styles.confirmationTitle}>Confirmar log de vídeo?</Text>
                    <Text style={styles.confirmationSubtitle}>
                      O log de vídeo foi comprimido e processado localmente no dispositivo.
                    </Text>
                    
                    <TouchableOpacity style={styles.redoButton} onPress={() => { setAudioUri(null); setIsRecording(false); }}>
                      <MaterialIcons name="replay" size={16} color={COLORS.onSurfaceVariant} />
                      <Text style={styles.redoButtonText}>Gravar Novamente</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Ready to record Video UI
                  <View style={styles.mediaWorkingBox}>
                    <View style={styles.videoCameraSim}>
                      <MaterialIcons name="videocam" size={48} color={COLORS.primary} />
                    </View>
                    <TouchableOpacity style={styles.recordButtonVideo} onPress={() => { setIsRecording(true); setDurationSecs(0); }}>
                      <Text style={styles.recordVideoText}>Iniciar Gravação de Vídeo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Attachment icon */}
            {activeTab === 'text' && (
              <View style={styles.attachmentRow}>
                <TouchableOpacity style={styles.attachButton}>
                  <MaterialIcons name="attach-file" size={20} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Demoted Text Link at the bottom to discourage text input */}
          {activeTab !== 'text' && (
            <TouchableOpacity 
              style={styles.demotedTextLink} 
              onPress={() => { setActiveTab('text'); cleanupResources(); }}
            >
              <Text style={styles.demotedTextLinkText}>Prefere fazer um registro em texto?</Text>
            </TouchableOpacity>
          )}

          {/* Action Row */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.transmitButton, isTransmitting && styles.transmitButtonDisabled]} 
              onPress={handleTransmitPress}
              disabled={isTransmitting}
            >
              {isTransmitting ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <MaterialIcons name="send" size={20} color={COLORS.onPrimary} />
              )}
              <Text style={styles.transmitButtonText}>
                {isTransmitting ? "Processando Copiloto Local..." : "Transmitir para a Base"}
              </Text>
            </TouchableOpacity>

            <View style={styles.delayIndicator}>
              <MaterialIcons name="satellite-alt" size={14} color={COLORS.onSurfaceVariant} style={styles.delayIcon} />
              <Text style={styles.delayText}>Delay estimado: 20 minutos</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.marginSide,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.full,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 32,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: ROUNDNESS.full,
  },
  tabActive: {
    backgroundColor: COLORS.primaryContainer,
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  tabTextActive: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
  inputOuterContainer: {
    position: 'relative',
    flex: 1,
    minHeight: 250,
    marginBottom: 40,
  },
  ambientGlow: {
    position: 'absolute',
    left: 10,
    top: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(45, 212, 191, 0.03)',
    borderRadius: ROUNDNESS.default,
    blurRadius: 20,
  },
  textArea: {
    ...GLASS_STYLE,
    borderRadius: ROUNDNESS.default,
    padding: 24,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.onSurface,
    minHeight: 250,
    textAlignVertical: 'top',
  },
  attachmentRow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 20,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mediaPlaceholder: {
    ...GLASS_STYLE,
    borderRadius: ROUNDNESS.default,
    padding: 24,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(45, 212, 191, 0.30)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  recordButtonActive: {
    backgroundColor: COLORS.error,
    transform: [{ scale: 1.05 }],
  },
  mediaStatusText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  timerText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
    color: COLORS.error,
  },
  videoCameraSim: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recordButtonVideo: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.full,
  },
  recordVideoText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: COLORS.onPrimary,
    fontSize: 14,
  },
  actionContainer: {
    marginTop: 'auto',
    gap: 16,
  },
  transmitButton: {
    height: 48,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: ROUNDNESS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(45, 212, 191, 0.20)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  transmitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.5,
    ...Platform.select({
      web: {
        boxShadow: 'none',
      },
      default: {
        shadowOpacity: 0,
        elevation: 0,
      },
    }),
  },
  transmitButtonText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    color: COLORS.onPrimary,
  },
  delayIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  delayIcon: {
    marginRight: 6,
  },
  delayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  textModeHeader: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backToMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToMediaText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: COLORS.primary,
  },
  mediaWorkingBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  liveSubtitleContainer: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveSubtitleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.onSurface,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  confirmationBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmationTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  confirmationSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  redoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  redoButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  demotedTextLink: {
    alignSelf: 'center',
    marginVertical: 16,
    padding: 8,
  },
  demotedTextLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    opacity: 0.5,
    textDecorationLine: 'underline',
  },
  videoIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.sm,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  videoIndicatorText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 11,
    color: COLORS.error,
    letterSpacing: 1,
  },
});
