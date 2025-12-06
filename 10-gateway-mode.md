# Gateway Mode

Gateway Mode provides ultra-low latency voice conversations by connecting Asterisk directly to LLM providers that handle speech natively.

## Overview

Unlike Standard Mode which uses separate STT/LLM/TTS services, Gateway Mode passes audio directly to providers like OpenAI Realtime API or ElevenLabs Conversational AI.

### Architecture

```
┌────────────┐    8kHz PCM     ┌─────────────────┐    24kHz PCM    ┌───────────────────┐
│  Asterisk  │ ───────────────>│     VEXYL       │ ──────────────> │  OpenAI Realtime  │
│ AudioSocket│                 │   Gateway       │                  │  or ElevenLabs    │
│            │ <───────────────│   (Resampler)   │ <────────────── │  Conversational   │
└────────────┘    8kHz PCM     └─────────────────┘    24kHz PCM    └───────────────────┘
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| Lower Latency | 200-500ms vs 2-5 seconds |
| Natural Interruptions | Native barge-in support |
| Single Provider | No separate STT/TTS |
| Simpler Pipeline | Direct audio passthrough |

### When to Use Gateway Mode

**Best for:**
- Real-time conversational AI
- Voice assistants with interruptions
- Customer service automation
- Low latency requirements

**Not ideal for:**
- Custom STT/TTS requirements
- Non-English/non-supported languages
- Budget constraints (gateway APIs cost more)
- Custom LLM workflows

---

## Supported Providers

### OpenAI Realtime API

**WebSocket URL:**
```
wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
```

**Features:**
- Real-time voice conversation
- Multiple voice options
- Server-side VAD (Voice Activity Detection)
- Custom instructions and temperature
- Audio transcription (optional)

**Audio Format:**
- Input: 24kHz PCM16
- Output: 24kHz PCM16

**Available Voices:**
- alloy (default)
- echo
- fable
- onyx
- nova
- shimmer

### ElevenLabs Conversational AI

**WebSocket URL:**
```
wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_AGENT_ID
```

**Features:**
- Pre-configured AI agents
- Premium voice quality
- Natural conversation flow
- Multi-language support
- Barge-in capability

**Audio Format:**
- Input: 16kHz PCM16
- Output: 16kHz PCM16

**Configuration:**
Agents are configured in the ElevenLabs dashboard:
https://elevenlabs.io/app/conversational-ai

---

## Configuration

### Enable Gateway Mode

```bash
# Enable gateway mode
GATEWAY_MODE=true

# Disable for standard STT/LLM/TTS pipeline
GATEWAY_MODE=false
```

### OpenAI Configuration

```bash
GATEWAY_MODE=true

# OpenAI Realtime API
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
LLM_API_KEY=sk-proj-your_openai_key

# Audio format (required)
AUDIO_FORMAT=pcm16
SAMPLE_RATE=24000

# Session configuration
GATEWAY_VOICE=alloy
GATEWAY_MODALITIES=audio,text
GATEWAY_INSTRUCTIONS=You are a helpful customer service agent. Be concise and conversational.
GATEWAY_TEMPERATURE=0.8
GATEWAY_MAX_TOKENS=4096

# Voice Activity Detection
GATEWAY_VAD_TYPE=server_vad
GATEWAY_VAD_THRESHOLD=0.5
GATEWAY_VAD_PREFIX_MS=300
GATEWAY_VAD_SILENCE_MS=500
```

### ElevenLabs Configuration

```bash
GATEWAY_MODE=true

# ElevenLabs Conversational AI
LLM_WEBSOCKET_URL=wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_AGENT_ID
LLM_API_KEY=sk_your_elevenlabs_key

# Audio format (required)
AUDIO_FORMAT=pcm16
SAMPLE_RATE=16000
```

### Session Settings

```bash
# Voice selection (OpenAI)
GATEWAY_VOICE=alloy    # alloy, echo, fable, onyx, nova, shimmer

# Response modalities
GATEWAY_MODALITIES=audio,text    # audio,text or audio only

# System instructions
GATEWAY_INSTRUCTIONS=You are a helpful AI assistant. Be concise.

# Response creativity (0.0-1.0)
GATEWAY_TEMPERATURE=0.8

# Maximum response tokens
GATEWAY_MAX_TOKENS=4096
```

### VAD Settings (OpenAI)

```bash
# VAD type
GATEWAY_VAD_TYPE=server_vad    # server_vad or none

# Detection threshold (0.0-1.0)
GATEWAY_VAD_THRESHOLD=0.5

# Audio to include before speech (ms)
GATEWAY_VAD_PREFIX_MS=300

# Silence before turn ends (ms)
GATEWAY_VAD_SILENCE_MS=500
```

### Advanced Settings

```bash
# Transcription (OpenAI)
GATEWAY_ENABLE_TRANSCRIPTION=false
GATEWAY_TRANSCRIPTION_MODEL=whisper-1

# Logging
GATEWAY_LOG_TRANSCRIPTS=true
GATEWAY_LOG_RATE_LIMITS=false

# Buffer on Asterisk silence detection
GATEWAY_COMMIT_ON_SILENCE=false
```

### Memory Management

```bash
# Prevent memory overflow
MAX_AUDIO_BUFFER_SIZE=100       # Max input chunks
MAX_PLAYBACK_QUEUE_SIZE=50      # Max output chunks

# Circuit breaker
GATEWAY_MAX_ERRORS=10           # Errors before circuit opens
```

---

## Audio Pipeline

### Resampling Process

Gateway mode handles audio format conversion automatically:

**OpenAI (24kHz):**
```
Input:  Asterisk 8kHz → Upsample (3x) → 24kHz → OpenAI
Output: OpenAI 24kHz → Downsample (3x) → 8kHz → Asterisk
```

**ElevenLabs (16kHz):**
```
Input:  Asterisk 8kHz → Upsample (2x) → 16kHz → ElevenLabs
Output: ElevenLabs 16kHz → Downsample (2x) → 8kHz → Asterisk
```

### Processing Latency

| Component | OpenAI | ElevenLabs |
|-----------|--------|------------|
| Upsampling | 0-1ms | 0-1ms |
| Network (outbound) | 50-200ms | 50-200ms |
| LLM Processing | 100-500ms | 100-500ms |
| Network (inbound) | 50-200ms | 50-200ms |
| Downsampling | 0-2ms | 50-100ms |
| **Total** | **200-900ms** | **250-1000ms** |

### Playback Queue

Audio is queued to maintain proper playback timing:

```
LLM Audio → Downsample → Queue → 20ms delay → Asterisk
                          ↓
              [chunk1, chunk2, chunk3, ...]
```

Benefits:
- Prevents audio playing too fast
- Maintains consistent playback speed
- Handles variable processing times
- Smooth audio output

---

## Features

### Circuit Breaker

Automatic error recovery prevents cascade failures:

```
States:
CLOSED     - Normal operation
OPEN       - Too many errors, rejecting requests
HALF_OPEN  - Testing recovery

Flow:
Error → Count++ → If count >= 10 → OPEN
OPEN → Wait 30s → HALF_OPEN → Test
Success → CLOSED | Failure → OPEN
```

### Queue Size Limits

Prevents memory overflow:

```bash
MAX_AUDIO_BUFFER_SIZE=100    # Input buffer
MAX_PLAYBACK_QUEUE_SIZE=50   # Output buffer
```

When limits exceeded, oldest chunks are dropped (circular buffer).

### API Key Redaction

Sensitive data is redacted in logs:

```
Before: wss://api.openai.com?key=sk-proj-abc123...
After:  wss://api.openai.com?key=***REDACTED***
```

### Input Validation

All configuration is validated on startup:

- WebSocket URL format (ws:// or wss://)
- API key presence and length
- Audio format (pcm16, g711_ulaw, g711_alaw)
- Sample rate (8000, 16000, 24000)
- Queue sizes >= 1

### Provider Auto-Detection

Provider type is detected from WebSocket URL:

```
api.openai.com    → OpenAI
api.elevenlabs.io → ElevenLabs
Other             → Custom
```

---

## Asterisk Dialplan

### Basic Setup

```ini
[gateway]
exten => 1000,1,Answer()
exten => 1000,n,AudioSocket(gateway-session,127.0.0.1:8080)
exten => 1000,n,Hangup()
```

### With Session Metadata

```ini
[gateway-enhanced]
exten => _X.,1,Answer()
exten => _X.,n,Set(SESSION_UUID=${UNIQUEID})
exten => _X.,n,Set(CALLER_ID=${CALLERID(num)})
exten => _X.,n,Set(CALLER_NAME=${CALLERID(name)})

; Store metadata via HTTP
exten => _X.,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,callerid=${CALLER_ID}&name=${CALLER_NAME}&channel=${CHANNEL})})

; Connect to gateway
exten => _X.,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => _X.,n,Hangup()
```

---

## Running Gateway Mode

### Configuration

Set the following in your environment or `.env` file:

```bash
GATEWAY_MODE=true
```

### Verify Startup

Look for these log messages:

```
INFO: Gateway Mode enabled
INFO: LLM WebSocket URL: wss://api.openai.com/...
INFO: Sample rate: 24000 Hz
INFO: AudioSocket server listening on 127.0.0.1:8080
```

### Process Management

Using PM2 or Docker, restart the gateway to apply configuration changes:

```bash
# Docker
docker restart vexyl-gateway

# PM2
pm2 restart vexyl-gateway

# View logs
docker logs -f vexyl-gateway
# or
pm2 logs vexyl-gateway
```

---

## Monitoring

### Key Metrics

1. **Connection Metrics**
   - Active sessions
   - Connection success rate
   - Circuit breaker state

2. **Audio Metrics**
   - Queue sizes
   - Resampling latency
   - Dropped chunks

3. **Error Metrics**
   - Error count
   - Error types
   - Circuit breaker opens

4. **API Metrics**
   - Response times
   - Rate limit hits

### Log Monitoring

```bash
# Watch for errors
tail -f logs/server.log | grep ERROR

# Monitor circuit breaker
tail -f logs/server.log | grep "Circuit breaker"

# Track sessions
tail -f logs/server.log | grep "Gateway Session"

# Check queue overflow
tail -f logs/server.log | grep "queue full"
```

---

## Troubleshooting

### Connection Issues

**WebSocket Connection Fails:**
```
ERROR: LLM WebSocket connection timeout
ERROR: LLM WebSocket error: ECONNREFUSED
```

Solutions:
- Verify `LLM_WEBSOCKET_URL` is correct
- Check API key is valid
- Ensure firewall allows outbound WebSocket
- Test manually:
  ```bash
  wscat -c "wss://api.openai.com/v1/realtime" -H "Authorization: Bearer YOUR_KEY"
  ```

### Audio Issues

**No Audio Output:**
- Check sample rate matches provider
- Verify Asterisk AudioSocket working:
  ```bash
  asterisk -rx "core show channels"
  ```
- Check playback queue not full

**Choppy Audio:**
- Reduce `MAX_PLAYBACK_QUEUE_SIZE` to 20
- Check network latency
- Verify Asterisk codec settings

**Fast/Slow Playback:**
- Verify sample rate configuration
- Check resampling logs
- Ensure 20ms playback delays working

### Circuit Breaker Opens

```
ERROR: Circuit breaker OPENED - too many errors (10)
```

Solutions:
- Check error logs for root cause
- Verify API key hasn't expired
- Check provider service status
- Increase `GATEWAY_MAX_ERRORS` for transient issues
- Wait 30 seconds for automatic recovery

---

## Limitations

### Audio Quality

- **8kHz Limitation**: Asterisk AudioSocket uses 8kHz
- **Resampling Artifacts**: 3x resampling introduces quality loss
- Not "true" OpenAI quality due to bandwidth constraint

### Provider-Specific

**OpenAI:**
- Cannot customize VAD dynamically
- No function calling in audio mode
- Rate limits vary by plan

**ElevenLabs:**
- Requires pre-configured agent
- Agent configuration via web console only
- Higher latency (FFmpeg downsampling)

### General

- Single language per session
- No built-in recording
- Cannot modify responses before playback
- No DTMF passthrough

---

## Comparison: Gateway vs Standard Mode

| Feature | Gateway Mode | Standard Mode |
|---------|--------------|---------------|
| Latency | 200-900ms | 2-5 seconds |
| STT Provider | Built-in | Choose (Sarvam, Groq, etc.) |
| TTS Provider | Built-in | Choose (Deepgram, Google, etc.) |
| LLM | OpenAI/ElevenLabs | Any (n8n, Flowise, etc.) |
| Interruptions | Native | Barge-in implementation |
| Custom Workflows | No | Yes (n8n, etc.) |
| TTS Caching | No | Yes |
| Cost | Higher | Variable |
| Languages | English focused | Multi-language |

---

## Switching Modes

### Standard to Gateway

Update your `.env` file:

```bash
GATEWAY_MODE=true
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
LLM_API_KEY=sk-your_key
SAMPLE_RATE=24000
```

Then restart your deployment (Docker or PM2).

### Gateway to Standard

Update your `.env` file:

```bash
GATEWAY_MODE=false
LLM_PROVIDER=n8n
STT_PROVIDER=auto
TTS_PROVIDER=deepgram
```

Then restart your deployment (Docker or PM2).

---

## Cost Considerations

| Provider | Approximate Cost |
|----------|------------------|
| OpenAI Realtime | ~$0.06/minute |
| ElevenLabs | Varies by plan |

Compare to Standard Mode:
- STT: ~$0.01/minute (Groq)
- LLM: ~$0.02/minute (GPT-4)
- TTS: ~$0.01/minute (Deepgram)
- **Total**: ~$0.04/minute

Gateway mode costs more but provides lower latency.

---

## Provider Comparison

```
Latency Priority:
└── OpenAI Realtime (fastest)

Voice Quality:
└── ElevenLabs (premium voices)

Customization:
└── OpenAI (more control)

Ease of Setup:
└── ElevenLabs (agent dashboard)

Cost:
└── OpenAI (generally lower)
```

