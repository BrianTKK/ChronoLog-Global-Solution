import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGS_KEY = '@chronolog:logs';

export const saveLogs = async (logs) => {
  try {
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Erro ao salvar logs:', error);
  }
};

export const getLogs = async () => {
  try {
    const data = await AsyncStorage.getItem(LOGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Filtrar e remover qualquer log de "Manutenção do Filtro" antigo salvo
      return parsed.filter(log => log.id !== '2' && log.title !== 'Manutenção do Filtro');
    }
    // Logs padrão iniciais baseados no design system do Stitch (sem o log do filtro)
    const defaultLogs = [
      {
        id: '1',
        title: 'Sintomas Biométricos',
        timeLabel: 'Há 2 horas • Pacote 03Z',
        date: '09/06/2026',
        type: 'text',
        text: 'Níveis de oxigênio corporal e ritmo cardíaco estáveis durante a atividade extraveicular. Leve aumento na temperatura no final do ciclo, mas retornado ao normal rapidamente.',
        status: 'delivered',
        progress: 100,
        eta: 0,
        sentiment: {
          score: 0.1,
          tags: ['#Biometria', '#Estabilidade']
        },
        diagnosticReport: {
          positiveFactors: ['Frequência cardíaca em repouso nominal.', 'Termorregulação eficiente durante esforços.'],
          vulnerabilities: ['Nenhum desvio biométrico ou psicológico crítico identificado.'],
          recommendations: ['Manter escala padrão de hidratação.', 'Continuar registros biométricos diários.'],
          criticalLevel: 'ESTÁVEL',
          score: 0.1,
          summary: 'O tripulante reporta estabilidade biométrica e bom condicionamento fisiológico durante a atividade extraveicular.'
        }
      }
    ];
    await saveLogs(defaultLogs);
    return defaultLogs;
  } catch (error) {
    console.error('Erro ao ler logs:', error);
    return [];
  }
};
