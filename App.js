import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Fonts setup
import { 
  useFonts, 
  SpaceGrotesk_400Regular, 
  SpaceGrotesk_600SemiBold, 
  SpaceGrotesk_700Bold 
} from '@expo-google-fonts/space-grotesk';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold 
} from '@expo-google-fonts/inter';

// Styles
import { COLORS } from './src/styles/theme';

// Screens & components
import Dashboard from './src/screens/Dashboard';
import RecordLog from './src/screens/RecordLog';
import DelayTrigger from './src/screens/DelayTrigger';
import Refuge from './src/screens/Refuge';
import History from './src/screens/History';

// Services
import { runSimulatedLocalAI, fetchGeminiDiagnostic } from './src/services/sentiment';
import { getLogs, saveLogs } from './src/utils/storage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard' | 'record' | 'delay' | 'refuge'
  const [logs, setLogs] = useState([]);
  const [activeComfortMessage, setActiveComfortMessage] = useState('');
  const [activeTensionDetected, setActiveTensionDetected] = useState(false);
  const [recommendedSoundId, setRecommendedSoundId] = useState('focus');
  const [recommendedBreathePace, setRecommendedBreathePace] = useState('normal');
  
  // Carregar fontes do Google Fonts para fidelidade ao Design System
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Carregar logs do Storage na inicialização
  useEffect(() => {
    const loadData = async () => {
      const data = await getLogs();
      setLogs(data);
    };
    loadData();
  }, []);

  // Simulador de trânsito de logs acelerado para testes rápidos (conclui em 1 segundo)
  useEffect(() => {
    const timer = setInterval(async () => {
      let changed = false;
      const updatedLogs = logs.map(log => {
        if (log.status === 'transit') {
          changed = true;
          const nextProgress = log.progress + 50; // Incremento de 50% por passo
          if (nextProgress >= 100) {
            return {
              ...log,
              progress: 100,
              status: 'delivered',
              timeLabel: 'Entregue • Relatório Clínico Enviado',
            };
          } else {
            return {
              ...log,
              progress: nextProgress,
              timeLabel: `Em trânsito • ${Math.round((100 - nextProgress) / 5)} min restantes`,
            };
          }
        }
        return log;
      });

      if (changed) {
        setLogs(updatedLogs);
        await saveLogs(updatedLogs);
      }
    }, 500); // Atualiza progressos a cada 500ms

    return () => clearInterval(timer);
  }, [logs]);

  // Handler de Envio do Log Real
  const handleTransmitLog = async (text, mediaType, audioUri, audioBase64) => {
    try {
      // 1. Executa a IA Local Multimodal Simulada (com carregamento e chamada Gemini síncrona de baixíssima latência)
      const localAIResult = await runSimulatedLocalAI(text, audioBase64);

      // 2. Cria nova entrada de log estruturada
      const newLog = {
        id: Date.now().toString(),
        title: mediaType === 'text' ? 'Diário de Bordo (Texto)' : mediaType === 'audio' ? 'Log de Áudio' : 'Log de Vídeo',
        text: text,
        audioUri: audioUri || null,
        timeLabel: 'Preparando envio...',
        date: new Date().toLocaleDateString('pt-BR'),
        type: mediaType,
        status: 'transit',
        progress: 0,
        eta: 20,
        sentiment: {
          score: localAIResult.score,
          tags: localAIResult.tags,
          comfortMessage: localAIResult.comfortMessage,
          acousticLabel: localAIResult.acousticLabel || null,
        },
        diagnosticReport: null, // Será carregado em background pela equipe terrestre
      };

      // 3. Atualizar logs locais com a entrada em trânsito
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await saveLogs(updatedLogs);

      // 4. Iniciar chamada à API do Gemini em background para a análise da base terrestre
      fetchGeminiDiagnostic(text, localAIResult, audioBase64).then(async (report) => {
        setLogs(currentLogs => {
          const updated = currentLogs.map(l => {
            if (l.id === newLog.id) {
              return { ...l, diagnosticReport: report };
            }
            return l;
          });
          saveLogs(updated);
          return updated;
        });
      });

      // 5. Direcionar astronauta imediatamente para a descompressão no Refúgio
      setActiveComfortMessage(localAIResult.comfortMessage);
      setActiveTensionDetected(localAIResult.tensionDetected);
      setRecommendedSoundId(localAIResult.recommendedSoundId);
      setRecommendedBreathePace(localAIResult.recommendedBreathePace);
      setCurrentScreen('refuge');
    } catch (error) {
      alert("Falha na Rede Orbital: Não foi possível processar a telemetria do Copiloto Mental. Verifique seu sinal de conexão.");
      throw error; // Repropaga para o botão na tela de gravação parar o estado de transmitindo
    }
  };

  // Se as fontes não carregaram, renderiza loading spinner
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Máquina de estados de navegação
  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      
      {currentScreen === 'dashboard' && (
        <Dashboard 
          logs={logs}
          onRecordPress={() => setCurrentScreen('record')}
          onHistoryPress={() => setCurrentScreen('history')}
          onRefugePress={() => {
            setActiveComfortMessage('');
            setActiveTensionDetected(false);
            setRecommendedSoundId('focus');
            setRecommendedBreathePace('normal');
            setCurrentScreen('refuge');
          }}
          onSettingsPress={() => alert('Configurações do Sistema Orbital')}
        />
      )}

      {currentScreen === 'history' && (
        <History 
          logs={logs}
          onHomePress={() => setCurrentScreen('dashboard')}
          onRefugePress={() => {
            setActiveComfortMessage('');
            setActiveTensionDetected(false);
            setRecommendedSoundId('focus');
            setRecommendedBreathePace('normal');
            setCurrentScreen('refuge');
          }}
          onRecordPress={() => setCurrentScreen('record')}
        />
      )}

      {currentScreen === 'record' && (
        <RecordLog 
          onBack={() => setCurrentScreen('dashboard')}
          onTransmit={handleTransmitLog}
        />
      )}

      {currentScreen === 'delay' && (
        <DelayTrigger 
          onDecompress={() => setCurrentScreen('refuge')}
          onSkip={() => setCurrentScreen('dashboard')}
          comfortMessage={activeComfortMessage}
        />
      )}

      {currentScreen === 'refuge' && (
        <Refuge 
          onClose={() => setCurrentScreen('dashboard')}
          comfortMessage={activeComfortMessage}
          tensionDetected={activeTensionDetected}
          recommendedSoundId={recommendedSoundId}
          recommendedBreathePace={recommendedBreathePace}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
