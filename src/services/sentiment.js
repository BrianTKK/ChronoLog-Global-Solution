/**
 * Analisador de Sentimento e Classificador NLP de Borda (Edge AI) - Simulação via Nuvem.
 * Este serviço simula o comportamento e a latência de um classificador de rede neural
 * local (ex: react-native-fast-tflite) fazendo chamadas síncronas rápidas para o Gemini 2.5 Flash,
 * além de extrair métricas acústicas locais via DSP de áudio.
 */

// --- AUXILIAR DE LIMPEZA E PARSE DE JSON ---

const repairTruncatedJSON = (jsonString) => {
  let cleaned = jsonString.trim();
  if (!cleaned) return "{}";

  const stack = [];
  let inString = false;
  let escaped = false;
  let repaired = "";

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    repaired += char;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  // Se terminou dentro de uma string, fecha aspas
  if (inString) {
    repaired += '"';
  }

  // Remover vírgulas ou dois pontos pendentes no final
  let temp = repaired.trim();
  while (temp.endsWith(',') || temp.endsWith(':')) {
    temp = temp.slice(0, -1).trim();
  }
  repaired = temp;

  // Fechar todos os colchetes e chaves abertos
  while (stack.length > 0) {
    const lastOpen = stack.pop();
    if (lastOpen === '{') {
      repaired += '}';
    } else if (lastOpen === '[') {
      repaired += ']';
    }
  }

  return repaired;
};

const cleanAndParseJSON = (text) => {
  let cleaned = text.trim();
  
  // Remover blocos de código markdown (```json ... ``` ou ``` ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  
  // Isolar o conteúdo entre as chaves principais { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1) {
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      // JSON está truncado e não tem o fechamento da chave principal
      cleaned = cleaned.substring(firstBrace);
    }
  }

  // Reparar o JSON se estiver incompleto/truncado
  const repaired = repairTruncatedJSON(cleaned);
  
  try {
    return JSON.parse(repaired);
  } catch (error) {
    console.error("Erro crítico ao fazer parse de JSON da IA:", error, "\nTexto original:", text, "\nTexto reparado:", repaired);
    return {}; // Retorna objeto vazio de fallback seguro para evitar crash do app
  }
};

// --- MÓDULOS DE PROCESSAMENTO ACÚSTICO (DSP) LOCAL ---

// Decodificador de Base64 para Uint8Array em JS Puro (Sem dependência do Node Buffer)
const decodeBase64ToArray = (base64String) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  let bufferLength = base64String.length * 0.75;
  const len = base64String.length;
  let p = 0;
  
  if (base64String[base64String.length - 1] === "=") {
    bufferLength--;
    if (base64String[base64String.length - 2] === "=") {
      bufferLength--;
    }
  }
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[base64String.charCodeAt(i)];
    const encoded2 = lookup[base64String.charCodeAt(i + 1)];
    const encoded3 = lookup[base64String.charCodeAt(i + 2)];
    const encoded4 = lookup[base64String.charCodeAt(i + 3)];
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  
  return bytes;
};

// Conversor de Bytes de Áudio WAV PCM para Float32Array (Sinalizado entre -1.0 e 1.0)
export const parseWavToFloats = (rawBytes) => {
  // Ignorar os 44 bytes de cabeçalho do arquivo WAV PCM padrão
  const pcmBytes = rawBytes.subarray(44);
  const sampleCount = Math.floor(pcmBytes.length / 2);
  const floatSamples = new Float32Array(sampleCount);
  
  for (let i = 0; i < sampleCount; i++) {
    // Leitura Little-Endian de 16-bit
    const low = pcmBytes[i * 2];
    const high = pcmBytes[i * 2 + 1];
    let val = (high << 8) | low;
    if (val & 0x8000) {
      val |= ~0xffff; // Extensão de sinal
    }
    floatSamples[i] = val / 32768.0; // Normalizar entre -1.0 e 1.0
  }
  
  return floatSamples;
};

// Analisador DSP de Amostras de Voz
export const analyzeAudioAcoustics = (floatSamples) => {
  if (!floatSamples || floatSamples.length === 0) {
    return {
      speechRate: 2.0,
      silenceRatio: 0.2,
      vocalInstability: 0.05,
      label: 'Nominal'
    };
  }

  const sampleRate = 16000;
  const frameSize = Math.floor(sampleRate * 0.05); // Blocos de 50ms
  const frameCount = Math.floor(floatSamples.length / frameSize);
  
  let silentFrames = 0;
  const frameRMS = new Float32Array(frameCount);
  
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    const start = i * frameSize;
    for (let j = 0; j < frameSize; j++) {
      const val = floatSamples[start + j];
      sum += val * val;
    }
    const rms = Math.sqrt(sum / frameSize);
    frameRMS[i] = rms;
    
    if (rms < 0.015) { // Limiar de silêncio
      silentFrames++;
    }
  }

  // 1. Proporção de silêncio no desabafo
  const silenceRatio = frameCount > 0 ? (silentFrames / frameCount) : 0;

  // 2. Velocidade da fala (Syallables/peaks por segundo)
  let energyPeaks = 0;
  let inPeak = false;
  for (let i = 1; i < frameCount; i++) {
    if (frameRMS[i] > 0.035 && frameRMS[i] > frameRMS[i - 1]) {
      if (!inPeak) {
        energyPeaks++;
        inPeak = true;
      }
    } else if (frameRMS[i] < 0.015) {
      inPeak = false;
    }
  }

  const durationSec = floatSamples.length / sampleRate;
  const speechRate = durationSec > 0 ? (energyPeaks / durationSec) : 0;

  // 3. Instabilidade Vocal (Variação da Amplitude nos blocos falados - Shimmer)
  let sumVoicedRMS = 0;
  let voicedCount = 0;
  for (let i = 0; i < frameCount; i++) {
    if (frameRMS[i] >= 0.015) {
      sumVoicedRMS += frameRMS[i];
      voicedCount++;
    }
  }
  
  const meanVoicedRMS = voicedCount > 0 ? (sumVoicedRMS / voicedCount) : 0;
  let varianceVoicedRMS = 0;
  for (let i = 0; i < frameCount; i++) {
    if (frameRMS[i] >= 0.015) {
      const diff = frameRMS[i] - meanVoicedRMS;
      varianceVoicedRMS += diff * diff;
    }
  }
  const vocalInstability = voicedCount > 0 ? Math.sqrt(varianceVoicedRMS / voicedCount) : 0;

  // Determinar rótulo acústico
  let label = 'Nominal';
  if (speechRate < 1.1 && silenceRatio > 0.45) {
    label = 'Lenta/Apática (Fadiga)';
  } else if (speechRate > 3.0 && vocalInstability > 0.07) {
    label = 'Acelerada/Instável (Ansiedade)';
  } else if (vocalInstability > 0.09) {
    label = 'Instável/Trêmula (Tensão)';
  }

  return {
    speechRate: parseFloat(speechRate.toFixed(2)),
    silenceRatio: parseFloat(silenceRatio.toFixed(2)),
    vocalInstability: parseFloat(vocalInstability.toFixed(2)),
    label
  };
};

// --- CONFIGURAÇÃO DE MODELOS GEMINI E RETRY FALLBACK ---

const LOCAL_AI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro'
];

const CLOUD_AI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro'
];

const localResponseSchema = {
  type: 'OBJECT',
  properties: {
    tensionDetected: { type: 'BOOLEAN' },
    score: { type: 'NUMBER' },
    tags: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    comfortMessage: { type: 'STRING' },
    recommendedSoundId: { type: 'STRING', enum: ['rain', 'focus'] },
    recommendedBreathePace: { type: 'STRING', enum: ['slow', 'normal'] }
  },
  required: ['tensionDetected', 'score', 'tags', 'comfortMessage', 'recommendedSoundId', 'recommendedBreathePace']
};

const cloudResponseSchema = {
  type: 'OBJECT',
  properties: {
    criticalLevel: { type: 'STRING', enum: ['ESTÁVEL', 'MODERADO', 'CRÍTICO'] },
    positiveFactors: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    vulnerabilities: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    recommendations: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    summary: { type: 'STRING' }
  },
  required: ['criticalLevel', 'positiveFactors', 'vulnerabilities', 'recommendations', 'summary']
};

const callGeminiWithFallback = async (models, prompt, responseMimeType = 'application/json', responseSchema = null) => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key EXPO_PUBLIC_GEMINI_API_KEY não configurada.");
  }

  let lastError = null;

  for (const model of models) {
    let timeoutId = null;
    try {
      console.log(`[Gemini API] Tentando modelo: ${model}`);
      
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000); // Timeout de 8 segundos por requisição

      const parts = Array.isArray(prompt) ? prompt : [{ text: prompt }];

      const generationConfig = {
        responseMimeType,
        temperature: 0.1,
        maxOutputTokens: 4096, // Aumentado para suportar tokens de pensamento
      };

      if (responseSchema) {
        generationConfig.responseSchema = responseSchema;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig,
          }),
          signal: controller.signal
        }
      );

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        console.log(`[Gemini API] Sucesso com o modelo: ${model}`);
        return responseText;
      }
      throw new Error("Resposta de texto vazia.");
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const errMsg = err.name === 'AbortError' ? 'Timeout excedido (8s)' : err.message;
      console.warn(`[Gemini API] Falha no modelo ${model}:`, errMsg);
      lastError = new Error(errMsg);
    }
  }

  throw new Error(`Todos os modelos Gemini falharam. Último erro: ${lastError ? lastError.message : "Desconhecido"}`);
};

// --- SIMULAÇÃO DE MODELO LOCAL TFLITE VIA GEMINI API ---

/**
 * Simula a inferência rápida e multimodal de um modelo TFLite de borda no celular.
 * Dispara uma chamada síncrona otimizada para a lista de modelos Gemini (fallback).
 */
export const runSimulatedLocalAI = async (text, audioBase64) => {
  // 1. Extração local de telemetria acústica via DSP (se houver áudio)
  let audioMetrics = null;
  let acousticLabel = 'Indisponível (Sem Áudio)';
  if (audioBase64) {
    try {
      const bytes = decodeBase64ToArray(audioBase64);
      const floats = parseWavToFloats(bytes);
      audioMetrics = analyzeAudioAcoustics(floats);
      acousticLabel = audioMetrics.label;
    } catch (e) {
      console.warn("Erro no processamento DSP local de voz:", e);
    }
  }

  const voiceTelemetry = audioMetrics
    ? `\nMETRICAS ACUSTICAS DE VOZ EXTRAIDAS POR DSP LOCAL:
- Ritmo de fala: ${audioMetrics.speechRate} picos/s
- Proporção de silêncio: ${Math.round(audioMetrics.silenceRatio * 100)}%
- Estabilidade vocal: ${audioMetrics.vocalInstability}
- Classificação acústica: ${audioMetrics.label}`
    : '';

  // Prompt simplificado projetado para máxima velocidade e controle de schema JSON
  const prompt = `Você é um modelo leve de Inteligência Artificial Local (Mobile Copilot) rodando via react-native-fast-tflite no dispositivo do astronauta Brian em órbita de Marte.
Analise o seguinte diário de bordo e a telemetria acústica de voz do astronauta. Seu objetivo é classificar a tensão mental de forma rápida e retornar diretrizes terapêuticas imediatas para a tela de descompressão do Refúgio.

TEXTO DO DIÁRIO: "${text.replace(/"/g, '\\"')}"${voiceTelemetry}

Você deve classificar o estado emocional e retornar um JSON com exatamente estes campos:
- "tensionDetected": true | false (true se houver sinais de isolamento, ansiedade, pânico, fadiga intensa ou crise crítica)
- "score": número decimal de 0.0 a 1.0 (nível de estresse detectado)
- "tags": lista de strings contendo no máximo 3 tags emocionais (ex: ["#TensãoMental", "#FadigaFísica", "#Isolamento", "#AlertaClinico", "#Estabilidade"])
- "comfortMessage": uma mensagem curta, empática e acolhedora de feedback do copiloto.
  - IMPORTANTE: Se o diário expressar ideação autolítica, pânico ou crise crítica de segurança/missão (o que gera a tag #AlertaClinico), a mensagem deve ser extremamente acolhedora e acalmar o astronauta, além de obrigatoriamente informar de forma clara que o relato está sendo transmitido para a base terrestre o mais breve possível (ex: "Brian, detectamos um pico crítico de tensão. Fique tranquilo: seus dados e telemetria de emergência já estão sendo transmitidos para a base na Terra com prioridade máxima e o mais breve possível. Afaste-se dos consoles operacionais e vamos nos acalmar no Refúgio.").
- "recommendedSoundId": "rain" (som de chuva) ou "focus" (frequência de foco)
- "recommendedBreathePace": "slow" (respiração lenta para ansiedade/crise) ou "normal" (respiração normal para foco/estabilidade)

Responda APENAS com o JSON puro, sem formatações markdown adicionais.`;

  // Construir payload multimodal caso haja gravação de áudio real (prioriza ouvir o áudio)
  let payload = prompt;
  if (audioBase64) {
    payload = [
      {
        inlineData: {
          mimeType: 'audio/wav',
          data: audioBase64
        }
      },
      {
        text: `${prompt}\n\nIMPORTANTE: Analise também o arquivo de áudio real anexo (escutando as nuances físicas de sua voz, tom, suspiros, hesitações e ritmo real) para obter um diagnóstico multimodal completo das emoções de Brian.`
      }
    ];
  }

  try {
    const responseText = await callGeminiWithFallback(LOCAL_AI_MODELS, payload, 'application/json', localResponseSchema);
    const parsed = cleanAndParseJSON(responseText);
    return {
      tensionDetected: !!parsed.tensionDetected,
      score: parseFloat(parsed.score) || 0.0,
      tags: parsed.tags || [],
      comfortMessage: parsed.comfortMessage || "Log registrado com sucesso.",
      acousticLabel,
      recommendedSoundId: parsed.recommendedSoundId || "focus",
      recommendedBreathePace: parsed.recommendedBreathePace || "normal",
      audioMetrics
    };
  } catch (error) {
    console.error("Erro geral na simulação de IA local (todas as tentativas falharam), usando fallback local offline:", error);
    // Simula a inferência do Copiloto Mental Offline local baseado em heurística de termos para resiliência total
    const isCritical = text.toLowerCase().includes('crítico') || 
                      text.toLowerCase().includes('suicid') || 
                      text.toLowerCase().includes('morrer') || 
                      text.toLowerCase().includes('desistir') || 
                      text.toLowerCase().includes('não aguento') ||
                      text.toLowerCase().includes('sumir') ||
                      text.toLowerCase().includes('panico') ||
                      text.toLowerCase().includes('pânico');
                      
    const defaultComfort = isCritical 
      ? "Brian, detectamos um pico crítico de tensão de forma offline. Fique tranquilo: seus dados e telemetria de emergência já foram enfileirados localmente para transmissão prioritária para a Terra. Afaste-se dos consoles operacionais e respire conosco."
      : "Brian, seu relato foi gravado no diário local. O sinal com a nuvem está oscilando, mas sua telemetria física está segura. Vamos relaxar no Refúgio.";
      
    return {
      tensionDetected: isCritical,
      score: isCritical ? 0.95 : 0.25,
      tags: isCritical ? ["#AlertaClinico", "#Offline"] : ["#Estabilidade", "#Offline"],
      comfortMessage: defaultComfort,
      acousticLabel,
      recommendedSoundId: isCritical ? "rain" : "focus",
      recommendedBreathePace: isCritical ? "slow" : "normal",
      audioMetrics
    };
  }
};

// --- ANÁLISE PROFUNDA DA BASE TERRESTRE (CLOUD AI ASSÍNCRONA) ---

/**
 * Faz a chamada assíncrona que simula o diagnóstico terrestre (que chega com delay de rede).
 */
export const fetchGeminiDiagnostic = async (text, sentimentResult, audioBase64) => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Chave EXPO_PUBLIC_GEMINI_API_KEY não encontrada. Usando diagnóstico de fallback.");
    return {
      positiveFactors: ['Canal de telemetria ativo.'],
      vulnerabilities: ['Sem sinal de conexão com a base terrestre.'],
      recommendations: ['Repousar no Refúgio.', 'Repetir telemetria acústica se necessário.'],
      criticalLevel: sentimentResult.tensionDetected ? 'CRÍTICO' : 'ESTÁVEL',
      score: sentimentResult.score,
      summary: 'Não foi possível obter a análise da base terrestre devido à falta de API Key.'
    };
  }

  try {
    const voiceTelemetry = sentimentResult.audioMetrics 
      ? `\nTELEMETRIA DE VOZ (EXTRAÍDA LOCALMENTE POR DSP):
- Ritmo de fala: ${sentimentResult.audioMetrics.speechRate} picos de energia/s
- Proporção de silêncio: ${Math.round(sentimentResult.audioMetrics.silenceRatio * 100)}%
- Instabilidade/Tremor vocal: ${sentimentResult.audioMetrics.vocalInstability}
- Diagnóstico acústico local: ${sentimentResult.acousticLabel}\n`
      : '';

    const prompt = `Você é um médico psiquiatra e psicólogo da equipe de suporte terrestre para astronautas em Marte.
Analise de forma abstrata e aprofundada o contexto do seguinte desabafo textual e dos dados de voz do astronauta. Identifique discursos incongruentes, paranoias, delírios, alucinações, perda de contato com a realidade ou ideação autolítica. Não dependa apenas de palavras-chave isoladas: analise o significado geral e a coerência do relato.

TEXTO DO ASTRONAUTA: "${text.replace(/"/g, '\\"')}"
${voiceTelemetry}
Retorne um objeto JSON contendo exatamente as seguintes chaves:
- "criticalLevel": "ESTÁVEL" | "MODERADO" | "CRÍTICO" (use CRÍTICO para risco de suicídio, delírios/psicose ativos, perda de realidade ou perigo à missão; MODERADO para fadiga/insônia/estresse comum; ESTÁVEL para rotina normal)
- "positiveFactors": lista de strings contendo forças ou pontos estabilizadores do tripulante
- "vulnerabilities": lista de strings contendo diagnósticos abstratos e sintomas clínicos detectados (ex: isolamento, depressão, desorientação de realidade, alucinação, fadiga extrema, ideação suicida)
- "recommendations": lista de strings contendo orientações médicas e protocolos de segurança ou clínicos para a base terrestre e para o astronauta
- "summary": uma string contendo uma síntese/resumo clínico ou operacional muito breve de 1 a 2 frases com os principais detalhes e fatos operacionais e emocionais reportados pelo tripulante, com foco no que foi dito (ex: se o astronauta diz que a missão está indo bem e segue o protocolo, o resumo deve sintetizar exatamente isso, por exemplo: "O tripulante relata que a missão está progredindo conforme os protocolos e aguarda novas instruções da base, demonstrando conformidade operacional.")

Responda APENAS o JSON puro, sem formatações markdown adicionais.`;

    let payload = prompt;
    if (audioBase64) {
      payload = [
        {
          inlineData: {
            mimeType: 'audio/wav',
            data: audioBase64
          }
        },
        {
          text: `${prompt}\n\nIMPORTANTE: Analise também o arquivo de áudio real anexo. Como psiquiatra da missão, escute a entonação de voz, tremores, suspiros e velocidade real de fala para complementar seu diagnóstico clínico profundo.`
        }
      ];
    }

    const responseText = await callGeminiWithFallback(CLOUD_AI_MODELS, payload, 'application/json', cloudResponseSchema);
    const parsed = cleanAndParseJSON(responseText);
    return {
      positiveFactors: parsed.positiveFactors || [],
      vulnerabilities: parsed.vulnerabilities || [],
      recommendations: parsed.recommendations || [],
      criticalLevel: parsed.criticalLevel || (sentimentResult.tensionDetected ? 'CRÍTICO' : 'ESTÁVEL'),
      score: sentimentResult.score,
      summary: parsed.summary || 'Resumo do relato orbital.'
    };
  } catch (error) {
    console.error("Erro na API do Gemini Terrestre após fallbacks, usando fallback terrestre offline:", error);
  }

  return {
    positiveFactors: ['Canal de telemetria ativo localmente.'],
    vulnerabilities: ['Perda de uplink com a base terrestre (todas as APIs de nuvem excederam a quota).'],
    recommendations: ['Manter suporte ativo do copiloto mental.', 'Agendar contato assim que a telemetria normalizar.'],
    criticalLevel: sentimentResult.tensionDetected ? 'CRÍTICO' : 'ESTÁVEL',
    score: sentimentResult.score,
    summary: 'Erro na conexão de uplink terrestre (as chaves excederam a quota diária no uplink orbital).'
  };
};
