# Complete Configuration Reference

This document covers all environment variables available in VEXYL AI Voice Gateway.

## Configuration File Location

Configuration is provided via environment variables. For Docker deployments, use `-e` flags or an env file. For standalone binary, create a `.env` file in the same directory.

## Configuration Categories

1. [License Configuration](#license-configuration)
2. [Operation Mode](#operation-mode)
3. [Server Ports](#server-ports)
4. [Provider Selection](#provider-selection)
5. [STT Provider Settings](#stt-provider-settings)
6. [TTS Provider Settings](#tts-provider-settings)
7. [LLM Provider Settings](#llm-provider-settings)
8. [Audio Processing](#audio-processing)
9. [Session Storage](#session-storage)
10. [WebSocket Audio](#websocket-audio)
11. [Advanced Features](#advanced-features)

---

## License Configuration

```bash
# License key (leave empty for FREE tier - 4 concurrent calls)
LICENSE_KEY=
```

To get your machine ID for a machine-bound license, check the server logs on startup or access:
```bash
curl http://localhost:8081/license
```

| Tier | Concurrent Calls | Features |
|------|------------------|----------|
| FREE | 4 | All features, no expiry |
| Starter | 10 | All features |
| Professional | 25 | All features |
| Enterprise | 100 | All features |
| Unlimited | Unlimited | All features |

---

## Operation Mode

```bash
# Operation mode selection
# false = Standard Mode (STT → LLM → TTS pipeline)
# true = Gateway Mode (audio passthrough to OpenAI/ElevenLabs)
GATEWAY_MODE=false
```

### When to Use Each Mode

| Mode | Use Case | Latency | Cost |
|------|----------|---------|------|
| **Standard** | Custom STT/LLM/TTS combinations | Variable | Varies by provider |
| **Gateway** | OpenAI Realtime or ElevenLabs Conversational AI | Lower | Higher (single API) |

---

## Server Ports

```bash
# HTTP API Server
HTTP_HOST=127.0.0.1
HTTP_PORT=8081

# AudioSocket Server (Asterisk connections)
AUDIOSOCKET_HOST=127.0.0.1
AUDIOSOCKET_PORT=8080

# WebSocket Audio Server (browser connections)
WEBSOCKET_AUDIO_ENABLED=true
WEBSOCKET_AUDIO_HOST=0.0.0.0
WEBSOCKET_AUDIO_PORT=8082
```

### Port Reference

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | TCP | Asterisk AudioSocket |
| 8081 | HTTP | REST API, session metadata |
| 8082 | WebSocket | Browser audio streaming |

---

## Provider Selection

```bash
# Speech-to-Text Provider
# Options: auto, sarvam, groq, gemini, deepgram, openai
STT_PROVIDER=auto

# Text-to-Speech Provider
# Options: sarvam, google, gemini, elevenlabs, deepgram, azure
TTS_PROVIDER=deepgram

# LLM Provider
# Options: sarvam, flowise, litebot, custom, n8n
LLM_PROVIDER=n8n
```

### Auto STT Provider Selection

When `STT_PROVIDER=auto`, the system selects the best provider based on language:

| Language | Provider | Reason |
|----------|----------|--------|
| Indian languages (ml-IN, hi-IN, etc.) | Sarvam | Optimized for Indian languages |
| International languages | Groq | Best accuracy for global languages |

---

## STT Provider Settings

### Sarvam STT (Indian Languages)

```bash
SARVAM_API_KEY=your_api_key
```

### Groq Whisper (Global Languages)

```bash
GROQ_API_KEY=gsk_your_api_key
GROQ_MODEL=whisper-large-v3-turbo  # or whisper-large-v3
```

### Gemini STT

```bash
GEMINI_API_KEY=your_api_key
GEMINI_STT_MODEL=gemini-2.0-flash-exp
GEMINI_STT_PROMPT=  # Optional custom instructions
```

### OpenAI Whisper

```bash
OPENAI_API_KEY=sk-your_api_key
OPENAI_STT_MODEL=whisper-1  # or gpt-4o-transcribe
# OPENAI_STT_TEMPERATURE=0  # Optional: 0-1
```

### Deepgram Nova (Streaming)

```bash
DEEPGRAM_API_KEY=your_api_key
DEEPGRAM_STT_MODEL=nova-2  # or nova-3
DEEPGRAM_STT_ENDPOINTING=1000  # Silence duration (ms)
DEEPGRAM_STT_INTERIM_RESULTS=true
DEEPGRAM_STT_PUNCTUATE=true
DEEPGRAM_STT_SMART_FORMAT=true
```

---

## TTS Provider Settings

### Sarvam TTS (Indian Languages)

```bash
SARVAM_API_KEY=your_api_key  # Same as STT
```

### Google Cloud TTS

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# Voice is automatically selected based on language
GOOGLE_TTS_VOICE_NAME=en-IN-Chirp-HD-F  # Optional override
```

### Azure TTS

```bash
AZURE_TTS_API_KEY=your_api_key
AZURE_TTS_REGION=centralindia

# Default voice
AZURE_TTS_VOICE_NAME=en-US-JennyNeural

# Per-language overrides
AZURE_TTS_VOICE_ML_IN=ml-IN-SobhanaNeural

# Voice style (for supported voices)
AZURE_TTS_VOICE_STYLE=excited

# Speech rate (1.0 = normal, 1.2 = 20% faster)
AZURE_TTS_RATE_ML_IN=1.1

AZURE_TTS_TIMEOUT=30000
```

### ElevenLabs TTS

```bash
ELEVENLABS_API_KEY=sk_your_api_key
ELEVENLABS_WSS_URL=wss://api.elevenlabs.io
ELEVENLABS_API_URL=https://api.elevenlabs.io
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel

# Voice settings
ELEVENLABS_STABILITY=0.5
ELEVENLABS_SIMILARITY_BOOST=0.75
ELEVENLABS_STYLE=0.0
ELEVENLABS_USE_SPEAKER_BOOST=true

# Output format
ELEVENLABS_OUTPUT_FORMAT=pcm_16000

ELEVENLABS_TIMEOUT=30000
```

### Deepgram TTS

```bash
DEEPGRAM_API_KEY=your_api_key  # Same as STT
DEEPGRAM_API_URL=https://api.deepgram.com
DEEPGRAM_MODEL=aura-asteria-en
DEEPGRAM_TIMEOUT=30000
```

### Gemini TTS (Not Production Ready)

```bash
GEMINI_API_KEY=your_api_key
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE_NAME=Zephyr
GEMINI_TTS_TEMPERATURE=1.0
```

---

## LLM Provider Settings

### Sarvam LLM

```bash
SARVAM_API_KEY=your_api_key  # Same key for all Sarvam services
```

### Flowise

```bash
FLOWISE_API_URL=http://localhost:3000
FLOWISE_FLOW_ID=your_flow_id
```

### Litebot

```bash
LITEBOT_API_URL=http://localhost:3345
LITEBOT_BOT_ID=customer-service
LITEBOT_TIMEOUT=30000
```

### Custom Webhook

```bash
CUSTOM_LLM_URL=https://your-server.com/chat
CUSTOM_LLM_API_KEY=your_api_key
CUSTOM_LLM_TIMEOUT=30000
```

### n8n Workflows

```bash
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/voice-assistant
N8N_TIMEOUT=30000
N8N_AUTH_HEADER=Bearer your_token  # Optional

# Custom response field mapping (optional)
N8N_RESPONSE_FIELD=data.output.message
N8N_SESSION_FIELD=session.id
```

---

## Audio Processing

### Buffer Configuration

```bash
MIN_SPEECH_DURATION=500      # Minimum speech before processing (ms)
MAX_SILENCE_DURATION=1500    # Silence before processing (ms)
MAX_BUFFER_DURATION=5000     # Maximum buffer before forcing (ms)
```

### Voice Activity Detection (VAD)

```bash
VAD_MODEL=v5                    # Silero VAD version
VAD_POSITIVE_THRESHOLD=0.5      # Speech start threshold (0.0-1.0)
VAD_NEGATIVE_THRESHOLD=0.35     # Speech stop threshold
VAD_REDEMPTION_FRAMES=8         # Pause tolerance (8 = 768ms)
VAD_MIN_SPEECH_FRAMES=3         # Minimum speech frames (3 = 288ms)
VAD_PRE_SPEECH_FRAMES=1         # Pre-buffer frames (1 = 96ms)
```

### Utterance Window

```bash
UTTERANCE_WINDOW_SIZE=4              # Max utterances to buffer
REDEMPTION_MS=1400                   # Wait after last transcript (ms)
UTTERANCE_COMBINATION_WINDOW=10000   # Combine window (ms)
UTTERANCE_CHECK_INTERVAL=500         # Idle check interval (ms)
UTTERANCE_MAX_WAIT=30000             # Maximum wait time (ms)
```

### Barge-in (Interruption)

```bash
ENABLE_BARGE_IN=true           # Allow interrupting AI
BARGE_IN_THRESHOLD=500         # Energy threshold
BARGE_IN_DELAY=200             # Minimum speech before interrupt (ms)
BARGE_IN_USE_VAD=true          # Use VAD for detection
BARGE_IN_VAD_THRESHOLD=0.5     # VAD threshold (0.0-1.0)
```

### TTS Response Splitting

```bash
ENABLE_TTS_SPLITTING=true      # Split long responses
TTS_CHUNK_SIZE=100             # Characters per chunk
TTS_MAX_PARALLEL=2             # Parallel TTS requests
TTS_SPLIT_DELIMITERS=.!?।      # Sentence delimiters
TTS_PHRASE_DELIMITERS=,;:      # Phrase delimiters
```

---

## Session Storage

### Memory Storage (Default)

No configuration required. Sessions lost on restart.

### Redis Storage

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=              # Optional
REDIS_DB=0                   # Database number
SESSION_TTL=3600             # Session lifetime (seconds)
```

---

## WebSocket Audio

```bash
WEBSOCKET_AUDIO_ENABLED=true
WEBSOCKET_AUDIO_PORT=8082
WEBSOCKET_AUDIO_HOST=0.0.0.0

# Security
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://example.com,https://app.example.com
WEBSOCKET_AUDIO_MAX_PER_IP=5
WEBSOCKET_AUDIO_API_KEY=your_secret_key  # Optional
```

---

## Advanced Features

### TTS Caching

```bash
TTS_CACHE_ENABLED=true
TTS_CACHE_DIR=/opt/assist/cache/tts
TTS_CACHE_MAX_SIZE_MB=5000
TTS_CACHE_MAX_AGE_DAYS=90
TTS_CACHE_CLEANUP_STRATEGY=lru  # lru, size, ttl, none
TTS_CACHE_STATS_LOGGING=true
```

### Call Transfer (HITL)

```bash
TRANSFER_ENABLED=true
TRANSFER_ENDPOINT=http://your-server/transfer.php
TRANSFER_TIMEOUT=5000

# Audio messages (optional)
TRANSFER_MESSAGE=/opt/assist/audio/transfer-message.wav
TRANSFER_ERROR_MESSAGE=/opt/assist/audio/transfer-failed.wav

# TTS fallback text
TRANSFER_MESSAGE_TEXT_EN=Please hold while I transfer you.
TRANSFER_ERROR_TEXT_EN=Unable to transfer. Please try again.
```

### Goodbye Messages (LLM Hangup)

```bash
GOODBYE_MESSAGE=/opt/assist/audio/goodbye.wav
GOODBYE_MESSAGE_EN=/opt/assist/audio/goodbye-en.wav
GOODBYE_MESSAGE_TEXT_EN=Thank you for calling. Goodbye!
```

### Outbound Calls

```bash
OUTBOUND_ENABLED=true
OUTBOUND_ORIGINATE_ENDPOINT=http://localhost/originate.php
OUTBOUND_TIMEOUT=10000
OUTBOUND_GREETING_MODE=static  # static, dynamic, hybrid, wait

# Static greeting audio files
OUTBOUND_STATIC_AUDIO_EN=/opt/assist/audio/outbound-en.wav

# Dynamic greeting text
OUTBOUND_DEFAULT_GREETING_EN=Hello, this is AI calling.
```

### Timeout Messages

```bash
TIMEOUT_MESSAGE_ENABLED=true
LLM_TIMEOUT_MESSAGE=Processing your request. Please hold.
LLM_TIMEOUT_RETRY_MESSAGE=Still working. Taking longer than usual.
LLM_FINAL_TIMEOUT_MESSAGE=Unable to process. Please try again.

# Language-specific
LLM_TIMEOUT_MESSAGE_ML=നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നു.
```

### Processing Sound

```bash
PROCESSING_SOUND_ENABLED=false
PROCESSING_SOUND_FILE=/opt/assist/sounds/processing_ambient.wav
PROCESSING_SOUND_VOLUME=0.3
PROCESSING_SOUND_LOOP=true
PROCESSING_SOUND_TYPE=chime  # chime, ambient, beep
PROCESSING_SOUND_START_DELAY=0
```

---

## Gateway Mode Configuration

When `GATEWAY_MODE=true`:

```bash
# LLM WebSocket endpoint
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
LLM_API_KEY=sk-your_openai_key

# Audio settings
AUDIO_FORMAT=pcm16
SAMPLE_RATE=24000  # OpenAI=24000, ElevenLabs=16000

# Session settings
GATEWAY_MODALITIES=audio,text
GATEWAY_VOICE=alloy  # OpenAI voices
GATEWAY_INSTRUCTIONS=You are a helpful AI assistant.
GATEWAY_TEMPERATURE=0.8
GATEWAY_MAX_TOKENS=4096

# VAD settings
GATEWAY_VAD_TYPE=server_vad
GATEWAY_VAD_THRESHOLD=0.5
GATEWAY_VAD_PREFIX_MS=300
GATEWAY_VAD_SILENCE_MS=500

# Optional features
GATEWAY_ENABLE_TRANSCRIPTION=false
GATEWAY_LOG_TRANSCRIPTS=true
GATEWAY_COMMIT_ON_SILENCE=false

# Performance
MAX_AUDIO_BUFFER_SIZE=100
MAX_PLAYBACK_QUEUE_SIZE=50
GATEWAY_MAX_ERRORS=10
```

---

## Testing Configuration

```bash
# Test providers on startup
TEST_TTS_ON_START=false
TEST_STT_ON_START=false
TEST_GROQ_ON_START=false
```

---

## Configuration Best Practices

### Development Environment

```bash
# Use permissive settings
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=
WEBSOCKET_AUDIO_API_KEY=
GATEWAY_LOG_TRANSCRIPTS=true
TTS_CACHE_ENABLED=false
```

### Production Environment

```bash
# Use restrictive settings
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://yourdomain.com
WEBSOCKET_AUDIO_API_KEY=strong_random_key
GATEWAY_LOG_TRANSCRIPTS=false
TTS_CACHE_ENABLED=true
TTS_CACHE_MAX_SIZE_MB=5000

# Use Redis for sessions
REDIS_HOST=localhost
REDIS_PORT=6379
```

### High-Volume Environment

```bash
# Optimize for throughput
TTS_MAX_PARALLEL=4
TTS_CACHE_ENABLED=true
MAX_BUFFER_DURATION=3000
UTTERANCE_WINDOW_SIZE=2
WEBSOCKET_AUDIO_MAX_PER_IP=10
```
