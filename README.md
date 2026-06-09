# 🪐 ChronoLog: Suporte Psicossocial e Monitoramento Mental Orbital
> **FIAP - Global Solution 2026 | Indústria Espacial**  
> **Turma: 2TWDOA**

---

## 👥 Integrantes do Grupo
*   **Kauanny Teles Batista** - RM 562574
*   **Brian Henrique Dantas** - RM 562939
*   **Rebeca Luana Tavares Rodrigues Vicente** - RM 566403

---

## 📝 O Desafio da Saúde Mental no Espaço Profundo
Quando pensamos em explorar o espaço, radiação e falta de oxigênio parecem os maiores perigos. No entanto, o isolamento social, o confinamento prolongado e a ausência de referências terrestres geram uma crise silenciosa: a deterioração mental. 

A uma distância de 54 milhões de quilômetros (como em Marte), o vácuo espacial impõe um delay de até **20 minutos** para que uma mensagem chegue à Terra. Em um momento de crise de pânico ou solidão, o astronauta está fisicamente isolado e a latência de rede amplifica o desespero.

O **ChronoLog** é uma solução móvel *offline-first* projetada para transformar o atraso tecnológico de comunicação em um momento terapêutico guiado, oferecendo diagnóstico local imediato e ponte assíncrona com a base terrestre.

---

## ⚙️ Arquitetura e Engenharia de IA

O sistema adota uma **Arquitetura Híbrida de IA (Edge-to-Cloud)** para garantir resiliência absoluta mesmo em cenários de falha total de comunicação com a Terra:

```
[ Astronauta Brian ]
        │
        ▼
[ Registro de Diário ] ──(Áudio / Texto)
        │
        ├─────────────────────────────────────────┐
        ▼ (Processamento Local - Offline First)   ▼ (Uplink Terrestre - Assíncrono)
┌───────────────────────────────────────┐ ┌──────────────────────────────────────┐
│  DSP Acústico (Ritmo, Tremor, Silêncio)│ │       Transmissão com Delay          │
│                 +                     │ │                 │                    │
│   Mobile Copilot (Gemini Local)       │ │                 ▼                    │
└───────────────────┬───────────────────┘ │    Base Terrestre (Uplink)         │
                    ▼                     │  Análise Clínica Profunda (Gemini)   │
┌───────────────────────────────────────┐ │                 │                    │
│    Ação Terapêutica Imediata          │ │                 ▼                    │
│  (Refúgio: Respiração + Frequência)    │ │   Histórico Clínico e Protocolos     │
└───────────────────────────────────────┘ └──────────────────────────────────────┘
```

### 1. Inferência de Borda (Edge AI - Offline-First)
*   **DSP de Voz (Processamento Digital de Sinais):** Extrai em tempo real biomarcadores acústicos diretamente do áudio gravado (velocidade de fala, oscilação de amplitude/tremor vocal (*shimmer*) e taxa de pausas/silêncio).
*   **Copiloto Local (Simulado via Gemini Flash Lite):** Classifica instantaneamente o nível de estresse (de 0.0 a 1.0) e sugere ações de descompressão antes mesmo de qualquer sinal ser transmitido para a Terra. Em caso de crise crítica, intercepta o astronauta direcionando-o ao **Refúgio**.

### 2. Diagnóstico Terrestre (Cloud AI - Assíncrono)
*   **Uplink de Redundância:** Os logs de áudio e texto são enfileirados e transmitidos com o delay simulado de rede orbital para os servidores terrestres.
*   **Análise Clínica Profunda:** Na Terra, modelos cognitivos robustos analisam a coerência semântica, buscando sinais de depressão sorridente, delírios ou ideação autolítica, gerando um **Relatório Clínico Terrestre** detalhado (Síntese, Aspectos Positivos, Vulnerabilidades e Recomendações Médicas).

---

## 🎨 Design System e UI/UX (Refúgio de Vidro)

A interface utiliza os princípios de **Glassmorphism** e **Dark Theme** futurista para evocar calma e estabilidade:
*   **Tipografia Dinâmica:** Fontes modernas como *Space Grotesk* e *Inter*.
*   **Estilo Premium:** Cartões semi-transparentes com desfoque de fundo (*backdrop blur*) e bordas brilhantes sutis que simulam o painel de uma cúpula de observação orbital.
*   **Feedback Não-Invasivo:** Em vez de jogar pontuações de estresse diretamente para o astronauta (o que amplificaria a ansiedade), o app apresenta mensagens acolhedoras e sugere o **Refúgio** de forma orgânica. As métricas clínicas detalhadas ficam restritas ao painel de controle da Base Terrestre (**Histórico**).
*   **Nota sobre o recurso de Vídeo:** O recurso de gravação de vídeo é exibido na interface como conceito, mas sua implementação funcional de processamento multimodal foi suprimida neste protótipo para otimizar o cronograma e priorizar a calibração do modelo acústico de voz.

---

## 🔧 Como Testar o Projeto Localmente

### Pré-requisitos
*   **Node.js** instalado (versão 18 ou superior).
*   Dispositivo físico com aplicativo **Expo Go** instalado ou emulador.

### Passo a Passo

1.  **Clonar o Repositório:**
    ```bash
    git clone <LINK_DO_REPOSITORIO>
    cd ChronoLog
    ```

2.  **Instalar Dependências:**
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente:**
    *   Renomeie o arquivo `.env.example` para `.env`:
        ```bash
        mv .env.example .env
        ```
    *   Abra o arquivo `.env` e defina a sua chave de API do Gemini obtida no [Google AI Studio](https://aistudio.google.com/):
        ```env
        EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
        ```

4.  **Iniciar o Servidor de Desenvolvimento:**
    *   Para rodar no navegador (Web):
        ```bash
        npm run web
        ```
    *   Para rodar no celular (iOS/Android) via Expo:
        ```bash
        npx expo start
        ```
        Escaneie o código QR exibido no console utilizando a câmera do celular (iOS) ou o app Expo Go (Android).

---

## 🧬 Conexão com os ODS da ONU
O ChronoLog atende diretamente ao **ODS 3 (Saúde e Bem-Estar)**, meta 3.4 (promover a saúde mental e o bem-estar), aplicando tecnologia espacial para garantir a saúde psicológica de populações confinadas em ambientes extremos.
