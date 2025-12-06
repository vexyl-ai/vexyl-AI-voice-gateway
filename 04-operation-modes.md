# Operation Modes

VEXYL AI Voice Gateway supports three distinct operation modes, each optimized for different use cases.

## Mode Overview

| Mode | Description | Latency | Customization | Cost |
|------|-------------|---------|---------------|------|
| **Standard** | STT → LLM → TTS pipeline | 2-5 seconds | High | Variable |
| **Gateway** | Direct to OpenAI/ElevenLabs | 0.5-1.5 seconds | Low | Higher |
| **WebSocket** | Browser-based widget | 2-5 seconds | High | Variable |

## Standard Mode (Default)

Standard mode processes audio through a complete pipeline: Speech-to-Text, LLM processing, and Text-to-Speech.

### Architecture

```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Asterisk  │────▶│   STT    │────▶│   LLM    │────▶│   TTS    │
│  8kHz PCM  │     │ Provider │     │ Provider │     │ Provider │
└────────────┘     └──────────┘     └──────────┘     └──────────┘
      ▲                                                    │
      │                                                    │
      └────────────────────────────────────────────────────┘
                         8kHz PCM Response
```

### Configuration

```bash
# Disable gateway mode for standard operation
GATEWAY_MODE=false

# Select providers
STT_PROVIDER=auto          # auto, sarvam, groq, gemini, deepgram, openai
TTS_PROVIDER=deepgram      # sarvam, google, azure, deepgram, elevenlabs, gemini
LLM_PROVIDER=n8n           # sarvam, flowise, litebot, custom, n8n
```

### When to Use Standard Mode

**Best for:**
- Custom AI workflows (n8n, Flowise)
- Specific STT/TTS provider requirements
- Indian language optimization (Sarvam STT)
- Cost optimization (mix cheaper providers)
- Custom LLM integrations

**Not ideal for:**
- Ultra-low latency requirements
- Real-time conversation with interruptions

### Audio Processing Pipeline

1. **Audio Reception**: Asterisk sends 8kHz PCM audio via AudioSocket
2. **Upsampling**: Audio converted to 16kHz for STT providers
3. **VAD Detection**: Silero VAD detects speech boundaries
4. **Transcription**: STT provider converts speech to text
5. **LLM Processing**: Text sent to LLM for response
6. **TTS Synthesis**: Response converted to speech
7. **Downsampling**: Audio converted back to 8kHz
8. **Playback**: Audio sent to Asterisk

### Latency Breakdown

| Component | Typical Latency |
|-----------|-----------------|
| VAD + Buffering | 500-1000ms |
| STT (Groq/Gemini) | 1000-3000ms |
| STT (Sarvam streaming) | 300-800ms |
| LLM Processing | 500-2000ms |
| TTS Synthesis | 200-800ms |
| **Total** | **2-5 seconds** |

---

## Gateway Mode

Gateway mode bypasses the standard pipeline and connects directly to LLM providers that handle speech natively.

### Architecture

```
┌────────────┐     ┌────────────────┐     ┌──────────────────┐
│  Asterisk  │────▶│    Gateway     │────▶│  OpenAI Realtime │
│  8kHz PCM  │     │   Resampling   │     │  or ElevenLabs   │
└────────────┘     │   8kHz ↔ 24kHz │     │  Conversational  │
      ▲            └────────────────┘     └──────────────────┘
      │                    │                       │
      └────────────────────┴───────────────────────┘
                         Direct Audio Passthrough
```

### Configuration

```bash
# Enable gateway mode
GATEWAY_MODE=true

# OpenAI Realtime API
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
LLM_API_KEY=sk-your_openai_key
SAMPLE_RATE=24000

# OR ElevenLabs Conversational AI
LLM_WEBSOCKET_URL=wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_AGENT_ID
LLM_API_KEY=sk_your_elevenlabs_key
SAMPLE_RATE=16000

# Audio format
AUDIO_FORMAT=pcm16
```

### Supported Providers

#### OpenAI Realtime API

```bash
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
LLM_API_KEY=sk-proj-your_key
SAMPLE_RATE=24000

# Voice options: alloy, echo, fable, onyx, nova, shimmer
GATEWAY_VOICE=alloy

# Session configuration
GATEWAY_MODALITIES=audio,text
GATEWAY_INSTRUCTIONS=You are a helpful AI assistant.
GATEWAY_TEMPERATURE=0.8
GATEWAY_MAX_TOKENS=4096

# VAD configuration
GATEWAY_VAD_TYPE=server_vad
GATEWAY_VAD_THRESHOLD=0.5
GATEWAY_VAD_PREFIX_MS=300
GATEWAY_VAD_SILENCE_MS=500
```

#### ElevenLabs Conversational AI

```bash
LLM_WEBSOCKET_URL=wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_AGENT_ID
LLM_API_KEY=sk_your_elevenlabs_key
SAMPLE_RATE=16000

# Agent configuration is done in ElevenLabs dashboard
# https://elevenlabs.io/app/conversational-ai
```

### When to Use Gateway Mode

**Best for:**
- Lowest possible latency
- Natural interruption handling (barge-in)
- Simple voice assistant use cases
- OpenAI or ElevenLabs ecosystem

**Not ideal for:**
- Custom STT/TTS requirements
- Non-English/non-supported languages
- Budget-constrained projects
- Custom LLM workflows

### Latency Comparison

| Component | Gateway Mode | Standard Mode |
|-----------|--------------|---------------|
| Audio to Response | 200-500ms | 2000-5000ms |
| Interruption Handling | Native | Requires barge-in |
| Voice Quality | Limited by 8kHz | Limited by 8kHz |

### Gateway Mode Limitations

1. **Audio Quality**: Asterisk AudioSocket is limited to 8kHz, so resampling (8→24→8) degrades quality
2. **Single Provider**: Cannot mix STT/TTS providers
3. **Cost**: Gateway APIs typically cost more than separate providers
4. **Customization**: Limited control over conversation flow

---

## WebSocket Mode (Browser Widget)

WebSocket mode enables browser-based voice assistants using the same backend pipeline.

### Architecture

```
┌────────────┐     ┌────────────────┐     ┌──────────┐
│   Browser  │────▶│   WebSocket    │────▶│Standard  │
│  WebM/Opus │     │   Audio Server │     │Pipeline  │
└────────────┘     │   (Port 8082)  │     │(STT/LLM/ │
      ▲            └────────────────┘     │  TTS)    │
      │                    │              └──────────┘
      └────────────────────┘
           Audio Response
```

### Configuration

```bash
# Enable WebSocket server
WEBSOCKET_AUDIO_ENABLED=true
WEBSOCKET_AUDIO_PORT=8082
WEBSOCKET_AUDIO_HOST=0.0.0.0

# Security settings
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://yourdomain.com
WEBSOCKET_AUDIO_MAX_PER_IP=5
WEBSOCKET_AUDIO_API_KEY=optional_secret_key
```

### Browser SDK Integration

```html
<script src="aivg-sdk.js"></script>
<script>
const voice = new AIVoiceGateway({
    serverUrl: 'ws://localhost:8082',
    language: 'en-IN',

    onConnect: ({ uuid }) => console.log('Connected:', uuid),
    onStatus: (status) => console.log('Status:', status),
    onTranscript: (text, { isFinal }) => console.log('User:', text),
    onResponse: (text) => console.log('AI:', text),
    onError: ({ code, message }) => console.error('Error:', message)
});

await voice.connect();
await voice.startListening();
</script>
```

### When to Use WebSocket Mode

**Best for:**
- Website voice widgets
- Customer support portals
- Kiosk applications
- Web-based demos

**Not ideal for:**
- Telephone integrations (use Standard/Gateway)
- Mobile apps (use native SDKs)

### Demo Pages

The installation includes ready-to-use demo pages:

| Page | Description |
|------|-------------|
| `demo.html` | Full SDK test page with controls |
| `index.html` | Waveform visualizer |
| `3d.html` | 3D sphere visualization |

Access via: `http://your-server:8081/demo.html`

---

## Mode Selection Guide

### Decision Tree

```
Do you need telephone integration?
├── Yes: Do you need lowest latency?
│   ├── Yes: Use Gateway Mode (OpenAI/ElevenLabs)
│   └── No: Do you need custom LLM/workflows?
│       ├── Yes: Use Standard Mode
│       └── No: Use Gateway Mode
└── No: Do you need browser integration?
    └── Yes: Use WebSocket Mode + Standard Pipeline
```

### Feature Comparison

| Feature | Standard | Gateway | WebSocket |
|---------|----------|---------|-----------|
| Asterisk Integration | ✅ | ✅ | ❌ |
| Browser Integration | ❌ | ❌ | ✅ |
| Custom STT Provider | ✅ | ❌ | ✅ |
| Custom TTS Provider | ✅ | ❌ | ✅ |
| Custom LLM/Workflows | ✅ | ❌ | ✅ |
| Lowest Latency | ❌ | ✅ | ❌ |
| Native Interruption | ❌ | ✅ | ❌ |
| TTS Caching | ✅ | ❌ | ✅ |
| Multi-language | ✅ | Limited | ✅ |

---

## Switching Between Modes

### Standard → Gateway

Update your `.env` file:

```bash
GATEWAY_MODE=true
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
LLM_API_KEY=sk-your_key
SAMPLE_RATE=24000
```

Then restart your deployment (Docker or PM2).

### Gateway → Standard

Update your `.env` file:

```bash
GATEWAY_MODE=false
LLM_PROVIDER=n8n
STT_PROVIDER=auto
TTS_PROVIDER=deepgram
```

Then restart your deployment (Docker or PM2).

### Enable WebSocket (Any Mode)

Add to your environment (works with Standard or Gateway):

```bash
WEBSOCKET_AUDIO_ENABLED=true
WEBSOCKET_AUDIO_PORT=8082
```

Then restart your deployment (Docker or PM2).
