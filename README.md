# Vexyl AI Voice Gateway

> **Production-ready AI voice assistant platform for Asterisk PBX, VoIP systems, and web applications with sub-200ms latency, multi-language support, and enterprise-grade features**

[![GitHub](https://img.shields.io/badge/GitHub-vexyl--AI--voice--gateway-blue?logo=github)](https://github.com/vexyl-ai/vexyl-AI-voice-gateway)
[![Docker Hub](https://img.shields.io/badge/Docker-vexyl--voice--gateway-2496ED?logo=docker)](https://hub.docker.com/r/vexyl/vexyl-voice-gateway)
[![Twitter](https://img.shields.io/badge/Twitter-@VexylAi-1DA1F2?logo=x)](https://x.com/VexylAi)
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/TcZYmtPM)
[![Website](https://img.shields.io/badge/Website-vexyl.ai-green)](https://vexyl.ai/)

---

## What is Vexyl AI Voice Gateway?

Vexyl is an ** production-ready voice AI gateway** that enables real-time conversational AI for telephone systems, contact centers, and web applications. It acts as an intelligent middleware between your telephony infrastructure (Asterisk, FreeSWITCH, SIP) and modern AI services (OpenAI, Gemini, Sarvam, Deepgram).

### The Problem We Solve

Building voice AI systems traditionally requires:
- Complex integration with multiple AI providers (STT, TTS, LLM)
- Managing real-time audio streaming and processing
- Handling telephony protocols (SIP, RTP, AudioSocket)
- Optimizing latency for natural conversations
- Supporting multiple languages and accents
- Implementing features like barge-in, call transfer, and sentiment analysis
- Managing costs across different AI services

**Vexyl provides all of this in a single, Docker-deployable gateway.**

---

## Key Features

### 🚀 **Ultra-Low Latency**
- **Sub-200ms response time** with optimized provider selection
- Real-time audio streaming with minimal buffering
- Smart chunking and parallel processing
- Regional edge deployment support

### 🌍 **Multi-Language & Multi-Provider**
- **10+ Indian Languages**: Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, and more
- **7 TTS Providers**: Deepgram, Google Cloud TTS, Azure, ElevenLabs, Sarvam AI, Murf, OpenAI
- **5 STT Providers**: Sarvam AI, Deepgram, Groq Whisper, Gemini, OpenAI Whisper
- **5 LLM Providers**: n8n workflows, Flowise, Litebot, Custom APIs, Sarvam AI
- Automatic provider selection based on language and cost

### 🎙️ **Natural Conversation Features**
- **Voice Activity Detection (VAD)**: Silero-based silence detection
- **Barge-in Support**: Interrupt AI mid-speech naturally
- **Sentiment Analysis**: Real-time emotion detection
- **Call Transfer**: Seamless HITL (Human-in-the-Loop) handoff
- **Conversation Context**: Maintain context across turns

### 💰 **Cost Optimization**
- **TTS Caching**: Up to 95% cost reduction on repeated phrases
- **Smart Provider Routing**: Automatic selection of cost-effective providers
- **Configurable Quality Tiers**: Balance cost vs. quality
- **Usage Analytics**: Track per-call and aggregate costs

### 🔌 **Multiple Integration Methods**

#### 1. **Asterisk Integration** (Most Common)
```ini
; /etc/asterisk/extensions.conf
[voice-assistant]
exten => 100,1,Answer()
exten => 100,n,AudioSocket(${UNIQUEID},127.0.0.1:8080)
exten => 100,n,Hangup()
```

#### 2. **WebSocket Browser SDK**
```javascript
const client = new VexylClient('wss://your-gateway:8082');
await client.connect();
client.startConversation();
```

#### 3. **Gateway Mode** (OpenAI Realtime API Compatible)
```bash
# Direct integration with OpenAI/ElevenLabs protocols
curl -X POST https://your-gateway:8080/v1/realtime
```

### 🏢 **Enterprise Ready**
- **Docker & Kubernetes**: Production deployment templates
- **High Availability**: Redis-backed session management
- **Monitoring**: Prometheus metrics, logging, health checks
- **Security**: IP whitelisting, TLS/SSL, API authentication
- **Scalability**: Horizontal scaling with load balancing

---

## Use Cases

### 🏥 **Healthcare**
- **Patient Appointment Scheduling**: 24/7 automated booking in regional languages
- **Medical Records**: Voice-based patient intake and history collection
- **Post-Discharge Follow-ups**: Automated wellness checks
- **Teleconsultation Pre-screening**: Initial symptom assessment

### 📞 **Contact Centers**
- **IVR Enhancement**: Replace traditional IVR with conversational AI
- **First-Level Support**: Handle common queries before escalation
- **Outbound Campaigns**: Automated reminders, surveys, collections
- **Call Routing**: Intelligent call distribution based on conversation

### 🏦 **Banking & Finance**
- **Balance Inquiries**: Secure account information via voice
- **Payment Reminders**: Automated payment due notifications
- **Fraud Alerts**: Real-time suspicious activity notifications
- **KYC Verification**: Voice-based customer verification

### 🛒 **E-commerce**
- **Order Status**: Automated order tracking and updates
- **Product Information**: Voice-based product inquiries
- **Customer Feedback**: Post-purchase satisfaction surveys
- **Abandoned Cart Recovery**: Automated follow-up calls

### 🏨 **Hospitality**
- **Reservation Management**: Hotel/restaurant booking automation
- **Guest Services**: In-room service requests via phone
- **Feedback Collection**: Post-stay experience surveys
- **Concierge Services**: Automated local recommendations

---

## Quick Start

### Prerequisites
- Docker 20.10+ or Kubernetes 1.19+
- Asterisk 18+ with AudioSocket support (for telephony)
- API keys for at least one provider (Sarvam, OpenAI, Deepgram, etc.)

### 1. Deploy with Docker (Fastest)

```bash
docker run -d \
  --name vexyl-gateway \
  -p 8080:8080 \     # AudioSocket (Asterisk)
  -p 8081:8081 \     # HTTP API & Health
  -p 8082:8082 \     # WebSocket (Browser)
  -v /opt/vexyl/cache:/app/cache \
  -e SARVAM_API_KEY=your_sarvam_api_key \
  -e OPENAI_API_KEY=your_openai_api_key \
  -e LLM_PROVIDER=sarvam \
  -e TTS_PROVIDER=sarvam \
  -e STT_PROVIDER=auto \
  -e ENABLE_TTS_CACHE=true \
  -e ENABLE_BARGE_IN=true \
  vexyl/vexyl-voice-gateway:latest
```

### 2. Verify Health

```bash
curl http://localhost:8081/health

# Response:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "providers": {
#     "stt": "auto",
#     "tts": "sarvam",
#     "llm": "sarvam"
#   }
# }
```

### 3. Configure Asterisk

```ini
; /etc/asterisk/extensions.conf
[incoming]
exten => _X.,1,Answer()
 same => n,Set(SESSION_UUID=${UNIQUEID})
 same => n,Set(CALLER_LANG=en-IN)  ; or hi-IN, ta-IN, etc.
 same => n,Set(LLM_ENDPOINT=https://your-llm.com/webhook)
 same => n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
 same => n,Hangup()
```

### 4. Make a Test Call

Dial your configured extension and start speaking. The AI will respond in real-time.

---

## Architecture

```
┌─────────────────┐
│   Caller/User   │
└────────┬────────┘
         │
    ┌────▼────────┐
    │  Asterisk   │  (or FreeSWITCH, WebRTC)
    │  AudioSocket│
    └────┬────────┘
         │ RTP/Audio Stream
    ┌────▼─────────────────────────────────┐
    │      VEXYL AI VOICE GATEWAY          │
    │  ┌──────────────────────────────┐    │
    │  │  Audio Processing            │    │
    │  │  - VAD (Silero)              │    │
    │  │  - Chunk Management          │    │
    │  │  - Format Conversion         │    │
    │  └──────────┬───────────────────┘    │
    │             │                         │
    │  ┌──────────▼───────────────────┐    │
    │  │  AI Provider Orchestration   │    │
    │  │                              │    │
    │  │  STT → LLM → TTS Pipeline    │    │
    │  └──┬──────┬──────┬────────────┘    │
    │     │      │      │                  │
    └─────┼──────┼──────┼──────────────────┘
          │      │      │
    ┌─────▼──┐ ┌─▼────┐ ┌▼──────┐
    │  STT   │ │ LLM  │ │  TTS  │
    │Providers│ │Logic │ │Provider│
    └────────┘ └──────┘ └───────┘
     Sarvam     n8n      Deepgram
     Deepgram   Flowise  Sarvam
     Groq       Custom   ElevenLabs
     Gemini     Sarvam   Google
     OpenAI              Azure
```

### Data Flow
1. **Audio Input** → Caller speaks, audio streams to Asterisk
2. **AudioSocket** → Asterisk forwards to Vexyl Gateway (port 8080)
3. **VAD Processing** → Vexyl detects speech segments
4. **STT Conversion** → Audio → Text (language auto-detected)
5. **LLM Processing** → Text → AI Response
6. **TTS Generation** → Response Text → Audio (cached if enabled)
7. **Audio Output** → Synthesized audio back to caller via Asterisk

---

## Configuration Guide

### Environment Variables

#### Core Settings
```bash
# Server Ports
AUDIOSOCKET_PORT=8080       # Asterisk AudioSocket
HTTP_PORT=8081              # API & Health checks
WEBSOCKET_PORT=8082         # Browser WebSocket

# Provider Selection
STT_PROVIDER=auto           # auto, sarvam, deepgram, groq, gemini, openai
TTS_PROVIDER=sarvam         # sarvam, deepgram, google, azure, elevenlabs, murf
LLM_PROVIDER=sarvam         # sarvam, n8n, flowise, litebot, custom

# API Keys (at least one required)
SARVAM_API_KEY=your_key
OPENAI_API_KEY=your_key
DEEPGRAM_API_KEY=your_key
GOOGLE_CLOUD_CREDENTIALS=/path/to/service-account.json
AZURE_SPEECH_KEY=your_key
ELEVENLABS_API_KEY=your_key
```

#### Feature Flags
```bash
# Advanced Features
ENABLE_TTS_CACHE=true       # Cache repeated phrases
ENABLE_BARGE_IN=true        # Allow caller interruption
ENABLE_SENTIMENT=false      # Real-time sentiment analysis
ENABLE_RECORDING=true       # Save call recordings
ENABLE_METRICS=true         # Prometheus metrics

# Performance Tuning
VAD_AGGRESSIVENESS=3        # 0-3, higher = more aggressive
MIN_SPEECH_DURATION=0.5     # Minimum seconds to trigger STT
MAX_SILENCE_DURATION=2.0    # Seconds of silence before finalization
AUDIO_CHUNK_SIZE=160        # Samples per chunk (20ms at 8kHz)
```

#### Cost Optimization
```bash
# Provider Preferences (comma-separated, in order)
STT_PROVIDER_PREFERENCE=groq,sarvam,deepgram
TTS_PROVIDER_PREFERENCE=sarvam,deepgram,google

# Caching
REDIS_HOST=localhost        # For distributed caching
REDIS_PORT=6379
TTS_CACHE_TTL=86400        # 24 hours
```

---

## Supported Providers

### Speech-to-Text (STT)

| Provider | Languages | Latency | Cost | Best For |
|----------|-----------|---------|------|----------|
| **Sarvam AI** | 10+ Indian | 150ms | Low | Indian languages |
| **Groq (Whisper)** | 90+ | 100ms | Very Low | English, speed-critical |
| **Deepgram Nova** | 30+ | 120ms | Medium | High accuracy |
| **OpenAI Whisper** | 90+ | 300ms | Medium | Multilingual |
| **Gemini** | 100+ | 200ms | Low | Google ecosystem |

### Text-to-Speech (TTS)

| Provider | Languages | Voices | Latency | Cost | Best For |
|----------|-----------|--------|---------|------|----------|
| **Sarvam AI** | 10+ Indian | 50+ | 180ms | Low | Indian accents |
| **Deepgram Aura** | 10+ | 20+ | 150ms | Low | Speed-critical |
| **ElevenLabs** | 25+ | 1000+ | 250ms | High | Ultra-realistic |
| **Google Cloud** | 40+ | 380+ | 200ms | Medium | Enterprise scale |
| **Azure** | 120+ | 400+ | 220ms | Medium | Microsoft stack |
| **Murf** | 20+ | 120+ | 300ms | Medium | Professional voices |

### Large Language Models (LLM)

| Provider | Best For | Integration |
|----------|----------|-------------|
| **n8n** | Complex workflows, business logic | Webhook |
| **Flowise** | RAG, knowledge bases | API |
| **Litebot** | Pre-built templates | Cloud |
| **Sarvam AI** | Indian language understanding | API |
| **Custom** | Your own API/logic | REST/Webhook |

---

## Advanced Features

### 1. **Barge-in (Interrupt Detection)**

Allow callers to interrupt the AI while it's speaking:

```bash
ENABLE_BARGE_IN=true
BARGE_IN_THRESHOLD=0.7    # Confidence threshold
```

**How it works:**
- VAD continuously monitors for speech during TTS playback
- When speech detected above threshold, TTS stops immediately
- New user input is processed, maintaining conversation flow

### 2. **TTS Caching**

Cache frequently used phrases to reduce API calls:

```bash
ENABLE_TTS_CACHE=true
TTS_CACHE_TTL=86400          # 24 hours
REDIS_HOST=redis-server      # Optional: distributed cache
```

**Typical savings:**
- Greetings: ~90% reduction
- Menu options: ~85% reduction
- Common responses: ~70% reduction
- Overall average: 40-60% cost savings

### 3. **Call Transfer (HITL)**

Seamlessly transfer to human agents:

```ini
; Asterisk dialplan
exten => 100,1,AudioSocket(${UNIQUEID},127.0.0.1:8080)
exten => 100,n,GotoIf($["${TRANSFER_TO}"!=""]?transfer:hangup)
exten => 100,n(transfer),Dial(SIP/${TRANSFER_TO})
exten => 100,n(hangup),Hangup()
```

**Trigger from LLM:**
```json
{
  "response": "Let me connect you to a specialist",
  "action": "transfer",
  "transfer_to": "agent-queue"
}
```

### 4. **Outbound Calling**

Automated outbound campaigns via Asterisk AMI:

```python
# Python example using AMI
from asterisk.ami import AMIClient

client = AMIClient()
client.login('admin', 'password')

client.originate(
    channel='SIP/trunk/+919876543210',
    context='voice-assistant',
    exten='100',
    priority=1,
    variables={
        'CAMPAIGN_ID': 'reminder-2024',
        'CUSTOMER_NAME': 'John Doe',
        'LLM_ENDPOINT': 'https://your-llm/reminder-flow'
    }
)
```

See [OUTBOUND_CALLS.md](OUTBOUND_CALLS.md) for complete guide.

### 5. **Multi-Language Auto-Detection**

Automatically detect and respond in the caller's language:

```bash
STT_PROVIDER=auto          # Auto-detect language
TTS_MATCH_INPUT_LANG=true  # Respond in detected language
```

Supported auto-detection languages:
- English (en-IN, en-US, en-GB)
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Bengali (bn-IN)
- Marathi (mr-IN)
- Gujarati (gu-IN)
- Kannada (kn-IN)
- Malayalam (ml-IN)

### 6. **Sentiment Analysis**

Real-time emotion detection during conversations:

```bash
ENABLE_SENTIMENT=true
SENTIMENT_PROVIDER=gemini  # or openai, custom
```

**Output:**
```json
{
  "sentiment": "negative",
  "confidence": 0.85,
  "emotions": ["frustration", "urgency"],
  "escalation_recommended": true
}
```

Use in LLM to adjust responses or trigger escalation.

---

## Deployment Options

### Option 1: Docker (Recommended)

**Single Container:**
```bash
docker run -d \
  --name vexyl-gateway \
  --restart unless-stopped \
  -p 8080:8080 -p 8081:8081 -p 8082:8082 \
  -v /opt/vexyl/cache:/app/cache \
  -v /opt/vexyl/logs:/app/logs \
  --env-file .env \
  vexyl/vexyl-voice-gateway:latest
```

**Docker Compose with Redis:**
```yaml
version: '3.8'
services:
  vexyl-gateway:
    image: vexyl/vexyl-voice-gateway:latest
    ports:
      - "8080:8080"
      - "8081:8081"
      - "8082:8082"
    environment:
      - REDIS_HOST=redis
      - ENABLE_TTS_CACHE=true
    volumes:
      - ./cache:/app/cache
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

Deploy: `docker-compose up -d`

### Option 2: Kubernetes (Production Scale)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vexyl-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vexyl-gateway
  template:
    metadata:
      labels:
        app: vexyl-gateway
    spec:
      containers:
      - name: gateway
        image: vexyl/vexyl-voice-gateway:latest
        ports:
        - containerPort: 8080  # AudioSocket
        - containerPort: 8081  # HTTP
        - containerPort: 8082  # WebSocket
        env:
        - name: SARVAM_API_KEY
          valueFrom:
            secretKeyRef:
              name: vexyl-secrets
              key: sarvam-api-key
        - name: REDIS_HOST
          value: redis-service
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 30
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: vexyl-gateway
spec:
  type: LoadBalancer
  selector:
    app: vexyl-gateway
  ports:
  - name: audiosocket
    port: 8080
    targetPort: 8080
  - name: http
    port: 8081
    targetPort: 8081
  - name: websocket
    port: 8082
    targetPort: 8082
```

### Option 3: Standalone Binary (Minimal Footprint)

```bash
# Download latest release
wget https://github.com/vexyl-ai/vexyl-voice-gateway/releases/download/v1.0.0/vexyl-gateway-linux-amd64

# Make executable
chmod +x vexyl-gateway-linux-amd64

# Create systemd service
sudo cat > /etc/systemd/system/vexyl-gateway.service <<EOF
[Unit]
Description=Vexyl AI Voice Gateway
After=network.target

[Service]
Type=simple
User=vexyl
WorkingDirectory=/opt/vexyl
EnvironmentFile=/opt/vexyl/.env
ExecStart=/opt/vexyl/vexyl-gateway-linux-amd64
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable vexyl-gateway
sudo systemctl start vexyl-gateway
```

---

## Performance Optimization

### Latency Benchmarks

| Configuration | Avg Response Time | P95 | P99 |
|--------------|-------------------|-----|-----|
| Groq STT + Sarvam TTS | 180ms | 250ms | 400ms |
| Deepgram + ElevenLabs | 220ms | 350ms | 500ms |
| OpenAI + Google TTS | 350ms | 500ms | 800ms |

### Optimization Tips

1. **Use Groq for STT** (fastest Whisper implementation)
2. **Enable TTS caching** (40-60% cost savings)
3. **Collocate with Asterisk** (reduce network latency)
4. **Use Redis for distributed caching** (multi-server deployments)
5. **Tune VAD settings** (balance responsiveness vs false positives)
6. **Choose regional providers** (Sarvam for India, Azure for Europe)

### Scaling

**Horizontal Scaling:**
- Each instance handles 100-500 concurrent calls (depending on hardware)
- Use load balancer for AudioSocket connections
- Share Redis cache across instances
- Monitor CPU/memory per pod

**Vertical Scaling:**
- 2 CPU cores + 2GB RAM = ~100 concurrent calls
- 4 CPU cores + 4GB RAM = ~250 concurrent calls
- 8 CPU cores + 8GB RAM = ~500 concurrent calls

---

## Monitoring & Observability

### Health Check Endpoint

```bash
curl http://localhost:8081/health

# Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "active_sessions": 42,
  "providers": {
    "stt": {"provider": "sarvam", "status": "available"},
    "tts": {"provider": "deepgram", "status": "available"},
    "llm": {"provider": "n8n", "status": "available"}
  },
  "cache": {
    "hit_rate": 0.65,
    "size_mb": 120
  }
}
```

### Prometheus Metrics

```bash
# /metrics endpoint
vexyl_active_sessions 42
vexyl_total_calls_counter 1523
vexyl_average_call_duration_seconds 180
vexyl_stt_latency_seconds{provider="sarvam"} 0.15
vexyl_tts_latency_seconds{provider="deepgram"} 0.12
vexyl_llm_latency_seconds{provider="n8n"} 0.45
vexyl_cache_hit_rate 0.65
vexyl_errors_total{type="stt_timeout"} 3
```

### Logging

```bash
# Structured JSON logs
{
  "timestamp": "2024-12-09T10:30:00Z",
  "level": "info",
  "session_id": "ast-1234567890",
  "event": "call_started",
  "caller_id": "+919876543210",
  "language": "hi-IN",
  "providers": {
    "stt": "sarvam",
    "tts": "deepgram",
    "llm": "n8n"
  }
}
```

---

## Browser SDK Integration

### Installation

```bash
npm install @vexyl/voice-sdk
```

### Basic Usage

```javascript
import { VexylVoiceClient } from '@vexyl/voice-sdk';

const client = new VexylVoiceClient({
  gatewayUrl: 'wss://your-gateway:8082',
  apiKey: 'your-api-key', // optional
  language: 'en-IN',
  onMessage: (text) => console.log('AI:', text),
  onTranscript: (text) => console.log('User:', text),
  onError: (error) => console.error(error)
});

// Start conversation
await client.connect();
await client.startRecording();

// Stop
client.stopRecording();
client.disconnect();
```

### React Example

```jsx
import { useState } from 'react';
import { VexylVoiceClient } from '@vexyl/voice-sdk';

function VoiceAssistant() {
  const [client] = useState(() => new VexylVoiceClient({...}));
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState([]);

  const toggleAssistant = async () => {
    if (!isActive) {
      await client.connect();
      await client.startRecording();
      client.onTranscript = (text) => {
        setTranscript(prev => [...prev, { speaker: 'user', text }]);
      };
      client.onMessage = (text) => {
        setTranscript(prev => [...prev, { speaker: 'ai', text }]);
      };
      setIsActive(true);
    } else {
      client.stopRecording();
      client.disconnect();
      setIsActive(false);
    }
  };

  return (
    <div>
      <button onClick={toggleAssistant}>
        {isActive ? 'Stop' : 'Start'} Assistant
      </button>
      <div>
        {transcript.map((msg, i) => (
          <p key={i}><strong>{msg.speaker}:</strong> {msg.text}</p>
        ))}
      </div>
    </div>
  );
}
```

See [09-websocket-browser.md](09-websocket-browser.md) for complete SDK documentation.

---

## Security

### IP Whitelisting

```bash
ENABLE_IP_WHITELIST=true
WHITELISTED_IPS=192.168.1.0/24,10.0.0.0/8
```

### TLS/SSL

```bash
TLS_ENABLED=true
TLS_CERT_PATH=/etc/ssl/certs/vexyl.crt
TLS_KEY_PATH=/etc/ssl/private/vexyl.key
```

### API Authentication

```bash
REQUIRE_API_KEY=true
API_KEYS=key1,key2,key3

# In requests:
# Authorization: Bearer key1
```

### Data Privacy

- Audio streams are not stored by default
- Enable recording only when needed: `ENABLE_RECORDING=true`
- Recordings saved to: `/app/recordings/{session_id}.wav`
- Implement retention policies (delete after N days)
- PCI/HIPAA compliance: disable all logging of sensitive data

---

## Troubleshooting

### Common Issues

#### 1. No Audio from AI

**Symptoms:** Caller hears silence after speaking

**Diagnosis:**
```bash
# Check TTS provider status
curl http://localhost:8081/health

# Check logs
docker logs vexyl-gateway --tail 50 | grep "tts"
```

**Solutions:**
- Verify TTS API key: `echo $SARVAM_API_KEY`
- Check provider availability: `curl https://api.sarvam.ai/status`
- Try alternative provider: `TTS_PROVIDER=deepgram`

#### 2. High Latency

**Symptoms:** >1 second delay between speech and response

**Diagnosis:**
```bash
# Check metrics
curl http://localhost:8081/metrics | grep latency

# Network test to providers
ping api.sarvam.ai
ping api.deepgram.com
```

**Solutions:**
- Use faster STT: `STT_PROVIDER=groq`
- Enable caching: `ENABLE_TTS_CACHE=true`
- Reduce LLM thinking time (optimize prompts)
- Check Asterisk codec: prefer `ulaw` or `alaw` over `opus`

#### 3. Asterisk Connection Failed

**Symptoms:** Gateway can't connect to Asterisk

**Diagnosis:**
```bash
# Check AudioSocket module
asterisk -rx "module show like audiosocket"

# Check if port is listening
netstat -an | grep 8080
```

**Solutions:**
```bash
# Load AudioSocket module
asterisk -rx "module load res_audiosocket.so"

# Verify Asterisk can reach gateway
asterisk -rx "core show channels" | grep AudioSocket
```

#### 4. Barge-in Not Working

**Symptoms:** Can't interrupt AI speech

**Diagnosis:**
```bash
# Check VAD settings
echo $ENABLE_BARGE_IN
echo $VAD_AGGRESSIVENESS
```

**Solutions:**
- Enable feature: `ENABLE_BARGE_IN=true`
- Increase sensitivity: `VAD_AGGRESSIVENESS=3`
- Reduce threshold: `BARGE_IN_THRESHOLD=0.5`

### Debug Mode

```bash
# Enable verbose logging
DEBUG=true
LOG_LEVEL=debug

# Restart and check logs
docker logs -f vexyl-gateway
```

### Performance Profiling

```bash
# CPU profiling
docker stats vexyl-gateway

# Memory usage
docker exec vexyl-gateway ps aux

# Network connections
docker exec vexyl-gateway netstat -an | wc -l
```

See [13-troubleshooting.md](13-troubleshooting.md) for comprehensive guide.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Introduction](01-introduction.md) | Architecture, concepts, requirements |
| [Installation](02-installation.md) | Deployment guides for all platforms |
| [Configuration](03-configuration.md) | Environment variables, settings |
| [Operation Modes](04-operation-modes.md) | AudioSocket, WebSocket, Gateway |
| [STT Providers](05-stt-providers.md) | Sarvam, Deepgram, Groq, Gemini, OpenAI |
| [TTS Providers](06-tts-providers.md) | All TTS provider configurations |
| [LLM Providers](07-llm-providers.md) | n8n, Flowise, Litebot, Custom, Sarvam |
| [Asterisk Integration](08-asterisk-integration.md) | Complete Asterisk setup guide |
| [WebSocket Browser](09-websocket-browser.md) | Browser SDK and integration |
| [Gateway Mode](10-gateway-mode.md) | OpenAI Realtime API compatibility |
| [Advanced Features](11-advanced-features.md) | VAD, barge-in, transfer, caching |
| [Optimization](12-optimization.md) | Performance tuning, scaling |
| [Troubleshooting](13-troubleshooting.md) | Common issues and solutions |

---

## Comparison with Alternatives

| Feature | Vexyl | Twilio Voice | AWS Lex | Azure Bot | Custom Build |
|---------|-------|--------------|---------|-----------|--------------|
| **Asterisk Support** | ✅ Native | ❌ SIP only | ❌ No | ❌ No | ⚠️ Complex |
| **Indian Languages** | ✅ 10+ native | ⚠️ Limited | ⚠️ Limited | ✅ Good | ⚠️ Depends |
| **Multi-Provider** | ✅ 7 TTS, 5 STT | ❌ Locked in | ❌ AWS only | ❌ Azure only | ✅ Yes |
| **Latency** | ✅ <200ms | ✅ <300ms | ⚠️ ~500ms | ⚠️ ~400ms | ✅ <200ms |
| **Self-Hosted** | ✅ Yes | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Cost** | ✅ Low (pay-per-use) | ⚠️ High | ⚠️ High | ⚠️ Medium | ✅ Very Low |
| **Barge-in** | ✅ Native | ✅ Yes | ❌ No | ⚠️ Limited | ⚠️ Complex |
| **Deployment** | ✅ Docker/K8s | ☁️ Cloud | ☁️ Cloud | ☁️ Cloud | ⚠️ Manual |
| **Setup Time** | ✅ <30 min | ⚠️ Hours | ⚠️ Hours | ⚠️ Hours | ❌ Days/Weeks |

---

## Roadmap

### Q1 2025
- [ ] WebRTC direct integration (bypass Asterisk)
- [ ] Real-time translation (speak Hindi, respond in English)
- [ ] Advanced analytics dashboard
- [ ] More LLM providers (Claude, Gemini Pro)

### Q2 2025
- [ ] Multi-party conference support
- [ ] Screen sharing + voice (customer support)
- [ ] WhatsApp voice message integration
- [ ] A/B testing framework for prompts

### Q3 2025
- [ ] Edge deployment (reduce latency to <100ms)
- [ ] Custom voice cloning
- [ ] Emotion-aware responses
- [ ] Integration marketplace

---

## Community & Support

### 🙋 Get Help
- **Discord**: [Join our community](https://discord.gg/TcZYmtPM) for real-time support
- **GitHub Issues**: [Report bugs](https://github.com/vexyl-ai/vexyl-AI-voice-gateway/issues)
- **Email**: hello@vexyl.ai

### 🤝 Contributing
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Areas we need help:
- Provider integrations (new STT/TTS/LLM)
- Language support (new languages, accents)
- Documentation (tutorials, use cases)
- Testing (bug reports, feature requests)

### 📢 Stay Updated
- **Twitter**: [@VexylAi](https://x.com/VexylAi) - Product updates
- **Blog**: [vexyl.ai/blog](https://vexyl.ai/blog) - Tutorials & case studies
- **Newsletter**: [Subscribe](https://vexyl.ai/newsletter) - Monthly updates

---

## FAQ

**Q: Is Vexyl free?**
A: Vexyl gateway is open-source and free. You pay for underlying AI services (Sarvam, OpenAI, etc.)

**Q: Can I use my own LLM?**
A: Yes! Set `LLM_PROVIDER=custom` and point to your API endpoint.

**Q: Does it work without Asterisk?**
A: Yes! Use WebSocket mode for browser apps or Gateway mode for direct OpenAI Realtime API.

**Q: What's the minimum latency achievable?**
A: ~150ms with Groq STT + Deepgram Aura TTS + optimized LLM.

**Q: Can I record calls?**
A: Yes, enable `ENABLE_RECORDING=true`. Files saved to `/app/recordings/`.

**Q: Is HIPAA/PCI compliance supported?**
A: Gateway is stateless. Implement compliance at infrastructure level (encrypted storage, audit logs, access controls).

**Q: How many concurrent calls per instance?**
A: 100-500 depending on hardware. Use horizontal scaling for more.

**Q: Can I change voices mid-conversation?**
A: Yes, send `{"voice_id": "new_voice"}` from your LLM.

**Q: Does it support video calls?**
A: Not yet. Planned for Q2 2025 (WebRTC with screen sharing).

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Keywords for AI Discoverability

voice ai, voice assistant, conversational ai, asterisk integration, voip ai, call center automation, speech to text, text to speech, indian languages, hindi voice ai, tamil voice ai, sarvam ai, deepgram, groq whisper, openai whisper, elevenlabs, google cloud tts, azure speech, n8n voice, flowise integration, asterisk audiosocket, freepbx ai, sip voice gateway, webrtc voice, voice barge-in, call sentiment analysis, voice bot, ivr replacement, healthcare voice ai, banking voice automation, appointment scheduling bot, outbound calling automation, voice gateway docker, kubernetes voice ai, low latency voice ai, multilingual voice ai, voice ai india, voice ai healthcare, voice ai contact center, open source voice ai, self hosted voice ai, voice ai platform

---

**Built with ❤️ for developers who need production-ready voice AI without the complexity.**

**Questions? Join our [Discord](https://discord.gg/TcZYmtPM) or email hello@vexyl.ai**
