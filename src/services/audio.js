import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const SOUNDS = {
  rain: {
    url: require('../../assets/rain.mp3'),
    title: 'Som de chuva',
    subtitle: 'Chuva Real • Relaxamento',
  },
  focus: {
    url: require('../../assets/focus.wav'),
    title: 'Frequência de foco',
    subtitle: 'Binaural Beta • 20 Hz',
  }
};

let activeSoundObject = null;
let activeSoundId = null;

const FADE_DURATION = 350; // ms
const FADE_STEPS = 10;
const FADE_INTERVAL = FADE_DURATION / FADE_STEPS;
const TARGET_VOLUME = 0.8;

// --- WEB AUDIO API ENGINE ---
let webAudioCtx = null;
let webLfo = null;
let webMainGainNode = null;
let webActiveSources = [];

const initWebAudio = () => {
  if (webAudioCtx) return;
  const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  if (!AudioContextClass) return;
  webAudioCtx = new AudioContextClass();
  webMainGainNode = webAudioCtx.createGain();
  webMainGainNode.gain.setValueAtTime(0, webAudioCtx.currentTime);
  webMainGainNode.connect(webAudioCtx.destination);
};

const generateRainBuffer = (ctx) => {
  const sampleRate = ctx.sampleRate;
  const bufferSize = 3 * sampleRate; // 3 segundos de loop
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // Algoritmo de ruído rosa
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11; // normalizar
    b6 = white * 0.115926;
  }
  return buffer;
};

const cleanupWebAudioNodes = () => {
  webActiveSources.forEach(src => {
    try {
      src.stop();
      src.disconnect();
    } catch (e) {}
  });
  webActiveSources = [];
  if (webLfo) {
    try {
      webLfo.stop();
      webLfo.disconnect();
    } catch (e) {}
    webLfo = null;
  }
};

const webFadeIn = (targetVolume = 0.8, duration = 0.35) => {
  if (!webAudioCtx || !webMainGainNode) return;
  webAudioCtx.resume().catch(() => {});
  const now = webAudioCtx.currentTime;
  webMainGainNode.gain.cancelScheduledValues(now);
  webMainGainNode.gain.setValueAtTime(webMainGainNode.gain.value, now);
  webMainGainNode.gain.linearRampToValueAtTime(targetVolume, now + duration);
};

const webFadeOut = (duration = 0.35) => {
  return new Promise((resolve) => {
    if (!webAudioCtx || !webMainGainNode) {
      resolve();
      return;
    }
    const now = webAudioCtx.currentTime;
    webMainGainNode.gain.cancelScheduledValues(now);
    webMainGainNode.gain.setValueAtTime(webMainGainNode.gain.value, now);
    webMainGainNode.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(resolve, duration * 1000 + 20);
  });
};

// --- NATIVE AUDIO ENGINE (EXPO-AV) ---
const fadeInSound = async () => {
  if (!activeSoundObject) return;
  try {
    for (let i = 0; i <= FADE_STEPS; i++) {
      const vol = (TARGET_VOLUME * i) / FADE_STEPS;
      await activeSoundObject.setVolumeAsync(vol);
      await new Promise(resolve => setTimeout(resolve, FADE_INTERVAL));
    }
  } catch (error) {
    console.error('Erro no fade-in de áudio:', error);
    await activeSoundObject.setVolumeAsync(TARGET_VOLUME);
  }
};

const fadeOutSound = async () => {
  if (!activeSoundObject) return;
  try {
    for (let i = FADE_STEPS; i >= 0; i--) {
      const vol = (TARGET_VOLUME * i) / FADE_STEPS;
      await activeSoundObject.setVolumeAsync(vol);
      await new Promise(resolve => setTimeout(resolve, FADE_INTERVAL));
    }
  } catch (error) {
    console.error('Erro no fade-out de áudio:', error);
  }
};

// --- EXPORTED PUBLIC INTERFACE ---

export const playSound = async (soundId, onPlaybackStatusUpdate) => {
  try {
    // Parar som anterior se houver
    await stopSound();

    const soundDef = SOUNDS[soundId];
    if (!soundDef) return null;

    activeSoundId = soundId;

    if (Platform.OS === 'web') {
      initWebAudio();
      cleanupWebAudioNodes();

      const now = webAudioCtx.currentTime;

      if (soundId === 'focus') {
        const oscLeft = webAudioCtx.createOscillator();
        oscLeft.type = 'sine';
        oscLeft.frequency.setValueAtTime(200, now);

        const oscRight = webAudioCtx.createOscillator();
        oscRight.type = 'sine';
        oscRight.frequency.setValueAtTime(220, now);

        const pannerLeft = webAudioCtx.createStereoPanner ? webAudioCtx.createStereoPanner() : null;
        const pannerRight = webAudioCtx.createStereoPanner ? webAudioCtx.createStereoPanner() : null;

        if (pannerLeft && pannerRight) {
          pannerLeft.pan.setValueAtTime(-1.0, now);
          pannerRight.pan.setValueAtTime(1.0, now);

          oscLeft.connect(pannerLeft);
          pannerLeft.connect(webMainGainNode);

          oscRight.connect(pannerRight);
          pannerRight.connect(webMainGainNode);
        } else {
          oscLeft.connect(webMainGainNode);
          oscRight.connect(webMainGainNode);
        }

        oscLeft.start();
        oscRight.start();

        webActiveSources.push(oscLeft, oscRight);

      } else if (soundId === 'rain') {
        const rainBuffer = generateRainBuffer(webAudioCtx);

        const noiseNode = webAudioCtx.createBufferSource();
        noiseNode.buffer = rainBuffer;
        noiseNode.loop = true;

        const lpFilter = webAudioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(500, now);

        const lfo = webAudioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.1, now);

        const lfoGain = webAudioCtx.createGain();
        lfoGain.gain.setValueAtTime(0.15, now);

        const windGainNode = webAudioCtx.createGain();
        windGainNode.gain.setValueAtTime(0.6, now);

        lfo.connect(lfoGain);
        lfoGain.connect(windGainNode.gain);

        const hpNoiseNode = webAudioCtx.createBufferSource();
        hpNoiseNode.buffer = rainBuffer;
        hpNoiseNode.loop = true;

        const hpFilter = webAudioCtx.createBiquadFilter();
        hpFilter.type = 'bandpass';
        hpFilter.frequency.setValueAtTime(2000, now);
        hpFilter.Q.setValueAtTime(1.5, now);

        const hpGain = webAudioCtx.createGain();
        hpGain.gain.setValueAtTime(0.04, now);

        noiseNode.connect(lpFilter);
        lpFilter.connect(windGainNode);
        windGainNode.connect(webMainGainNode);

        hpNoiseNode.connect(hpFilter);
        hpFilter.connect(hpGain);
        hpGain.connect(webMainGainNode);

        lfo.start();
        noiseNode.start();
        hpNoiseNode.start();

        webLfo = lfo;
        webActiveSources.push(noiseNode, hpNoiseNode);
      }

      webFadeIn(0.8, 0.35);

      // Simular callback de status do expo-av de forma síncrona
      if (onPlaybackStatusUpdate) {
        setTimeout(() => {
          onPlaybackStatusUpdate({
            isLoaded: true,
            isPlaying: true,
            durationMillis: 100000,
            positionMillis: 0,
          });
        }, 50);
      }

      // Retorna uma interface compatível
      return {
        stopAsync: async () => stopSound(),
        pauseAsync: async () => pauseSound(),
        playAsync: async () => resumeSound(),
        unloadAsync: async () => cleanupWebAudioNodes(),
      };
    } else {
      // Configurar áudio no Expo Nativo
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
        staysActiveInBackground: true,
      });

      const source = typeof soundDef.url === 'string' ? { uri: soundDef.url } : soundDef.url;

      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: true, isLooping: true, volume: 0.0 },
        onPlaybackStatusUpdate
      );

      activeSoundObject = sound;

      // Fade-in suave de volume
      await fadeInSound();

      return sound;
    }
  } catch (error) {
    console.error('Erro ao tocar som:', error);
    return null;
  }
};

export const pauseSound = async () => {
  try {
    if (Platform.OS === 'web') {
      await webFadeOut(0.15);
      if (webAudioCtx) {
        await webAudioCtx.suspend();
      }
    } else {
      if (activeSoundObject) {
        await fadeOutSound();
        await activeSoundObject.pauseAsync();
      }
    }
  } catch (error) {
    console.error('Erro ao pausar som:', error);
  }
};

export const resumeSound = async () => {
  try {
    if (Platform.OS === 'web') {
      if (webAudioCtx) {
        await webAudioCtx.resume();
        webFadeIn(0.8, 0.25);
      }
    } else {
      if (activeSoundObject) {
        await activeSoundObject.playAsync();
        await fadeInSound();
      }
    }
  } catch (error) {
    console.error('Erro ao resumir som:', error);
  }
};

export const stopSound = async () => {
  try {
    if (Platform.OS === 'web') {
      await webFadeOut(0.20);
      cleanupWebAudioNodes();
      activeSoundId = null;
    } else {
      if (activeSoundObject) {
        await fadeOutSound();
        await activeSoundObject.stopAsync();
        await activeSoundObject.unloadAsync();
        activeSoundObject = null;
        activeSoundId = null;
      }
    }
  } catch (error) {
    console.error('Erro ao parar som:', error);
  }
};

export const getActiveSoundId = () => activeSoundId;
