# Installation Guide

This guide covers deploying VEXYL AI Voice Gateway using Docker, standalone binary, or Kubernetes.

## Deployment Options

| Method | Best For | Complexity |
|--------|----------|------------|
| **Quick Install** | Linux servers (Ubuntu/Debian) | Very Low |
| **Docker** | Most deployments, easy updates | Low |
| **Docker Compose** | Single-server with Redis | Low |
| **Kubernetes** | High availability, auto-scaling | Medium |
| **Standalone Binary** | Minimal footprint, air-gapped systems | Low |
| **PM2** | Binary with process management | Low |

---

## Quick Install (Recommended for Linux)

The fastest way to get Vexyl Gateway running on Ubuntu or Debian is using our automated installer script.

```bash
curl -fsSL https://vexyl.ai/downloads/install_gateway.sh | sudo bash
```

**What this script does:**
1. Installs system dependencies (Node.js v20, PM2, unzip).
2. Downloads and installs the Vexyl Gateway binary to `/opt/vexyl`.
3. Configures the system service (PM2) to start on boot.
4. Generates a default configuration file.


---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Operating System | Ubuntu 20.04, Debian 10, CentOS 8 | Ubuntu 22.04 LTS |
| RAM | 2 GB | 4 GB+ |
| CPU | 2 cores | 4 cores |
| Disk Space | 1 GB | 10 GB (for TTS cache) |

### Network Requirements

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | TCP | AudioSocket (Asterisk connection) |
| 8081 | TCP | HTTP API |
| 8082 | TCP | WebSocket (Browser SDK) |

### External Dependencies

- **Asterisk PBX** - For telephone integration (separate installation)
- **Redis** - Optional, for distributed session storage

---

## Option 1: Docker (Recommended)

### Pull the Image

```bash
docker pull vexyl/voice-gateway:latest
```

### Run with Docker

```bash
docker run -d \
  --name vexyl-gateway \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8082:8082 \
  -v /opt/vexyl/cache:/app/cache \
  -v /opt/vexyl/audio:/app/audio \
  -e SARVAM_API_KEY=your_api_key \
  -e LLM_PROVIDER=sarvam \
  -e TTS_PROVIDER=sarvam \
  -e STT_PROVIDER=auto \
  --restart unless-stopped \
  vexyl/voice-gateway:latest
```

### Verify Container

```bash
# Check container status
docker ps

# View logs
docker logs -f vexyl-gateway

# Health check
curl http://localhost:8081/health
```

### Docker with Environment File

Create `.env` file:

```bash
# API Keys
SARVAM_API_KEY=your_sarvam_api_key
GROQ_API_KEY=your_groq_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key

# Provider Selection
LLM_PROVIDER=sarvam
TTS_PROVIDER=deepgram
STT_PROVIDER=auto

# Server Configuration
HTTP_PORT=8081
AUDIOSOCKET_PORT=8080
```

Run with env file:

```bash
docker run -d \
  --name vexyl-gateway \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8082:8082 \
  -v /opt/vexyl/cache:/app/cache \
  -v /opt/vexyl/audio:/app/audio \
  --env-file .env \
  --restart unless-stopped \
  vexyl/voice-gateway:latest
```

---

## Option 2: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vexyl-gateway:
    image: vexyl/voice-gateway:latest
    container_name: vexyl-gateway
    ports:
      - "8080:8080"  # AudioSocket
      - "8081:8081"  # HTTP API
      - "8082:8082"  # WebSocket
    volumes:
      - ./cache:/app/cache
      - ./audio:/app/audio
    environment:
      - SARVAM_API_KEY=${SARVAM_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - LLM_PROVIDER=sarvam
      - TTS_PROVIDER=sarvam
      - STT_PROVIDER=auto
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: vexyl-redis
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Option 3: Kubernetes

### Create Namespace

```bash
kubectl create namespace vexyl
```

### Create Secret for API Keys

```bash
kubectl create secret generic vexyl-secrets \
  --namespace vexyl \
  --from-literal=SARVAM_API_KEY=your_sarvam_key \
  --from-literal=GROQ_API_KEY=your_groq_key \
  --from-literal=DEEPGRAM_API_KEY=your_deepgram_key
```

### Deployment Manifest

Create `vexyl-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vexyl-gateway
  namespace: vexyl
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vexyl-gateway
  template:
    metadata:
      labels:
        app: vexyl-gateway
    spec:
      containers:
      - name: vexyl-gateway
        image: vexyl/voice-gateway:latest
        ports:
        - containerPort: 8080
          name: audiosocket
        - containerPort: 8081
          name: http
        - containerPort: 8082
          name: websocket
        envFrom:
        - secretRef:
            name: vexyl-secrets
        env:
        - name: LLM_PROVIDER
          value: "sarvam"
        - name: TTS_PROVIDER
          value: "sarvam"
        - name: STT_PROVIDER
          value: "auto"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        volumeMounts:
        - name: cache
          mountPath: /app/cache
        - name: audio
          mountPath: /app/audio
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: cache
        persistentVolumeClaim:
          claimName: vexyl-cache-pvc
      - name: audio
        persistentVolumeClaim:
          claimName: vexyl-audio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: vexyl-gateway
  namespace: vexyl
spec:
  type: LoadBalancer
  ports:
  - port: 8080
    targetPort: 8080
    name: audiosocket
  - port: 8081
    targetPort: 8081
    name: http
  - port: 8082
    targetPort: 8082
    name: websocket
  selector:
    app: vexyl-gateway
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vexyl-cache-pvc
  namespace: vexyl
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: vexyl-audio-pvc
  namespace: vexyl
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
```

### Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f vexyl-deployment.yaml

# Check deployment status
kubectl get pods -n vexyl

# View logs
kubectl logs -f deployment/vexyl-gateway -n vexyl

# Get service external IP
kubectl get svc -n vexyl
```

### Horizontal Pod Autoscaler (Optional)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vexyl-gateway-hpa
  namespace: vexyl
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vexyl-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Option 4: Standalone Binary

### Download Binary

```bash
# Create installation directory
sudo mkdir -p /opt/vexyl
cd /opt/vexyl

# Download the binary (get URL from your license portal)
wget https://releases.vexyl.ai/gateway/vexyl-gateway-linux-x64

# Make executable
chmod +x vexyl-gateway-linux-x64
```

### Create Configuration

Create `/opt/vexyl/.env`:

```bash
# API Keys
SARVAM_API_KEY=your_sarvam_api_key
GROQ_API_KEY=your_groq_api_key

# Provider Selection
LLM_PROVIDER=sarvam
TTS_PROVIDER=sarvam
STT_PROVIDER=auto

# Server Ports
HTTP_PORT=8081
AUDIOSOCKET_PORT=8080
WEBSOCKET_PORT=8082
```

### Run Binary

```bash
cd /opt/vexyl
./vexyl-gateway-linux-x64
```

### Expected Output

```
INFO: License check passed - PROFESSIONAL tier (25 concurrent calls)
INFO: STT Provider mode: auto
INFO: Using TTS Provider: sarvam
INFO: LLM Provider: sarvam
INFO: HTTP API server listening on 0.0.0.0:8081
INFO: AudioSocket server listening on 0.0.0.0:8080
INFO: WebSocket Audio Server started on ws://0.0.0.0:8082
```

---

## Option 5: PM2 (Binary with Process Management)

PM2 provides automatic restarts, log management, and monitoring for the standalone binary.

### Install PM2

```bash
# Install Node.js (required for PM2)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Create PM2 Ecosystem File

Create `/opt/vexyl/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'vexyl-gateway',
    script: '/opt/vexyl/vexyl-gateway-linux-x64',
    cwd: '/opt/vexyl',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      SARVAM_API_KEY: 'your_sarvam_api_key',
      GROQ_API_KEY: 'your_groq_api_key',
      LLM_PROVIDER: 'sarvam',
      TTS_PROVIDER: 'sarvam',
      STT_PROVIDER: 'auto',
      HTTP_PORT: 8081,
      AUDIOSOCKET_PORT: 8080,
      WEBSOCKET_PORT: 8082
    }
  }]
};
```

### Start with PM2

```bash
cd /opt/vexyl

# Start application
pm2 start ecosystem.config.js

# Save process list for auto-restart on reboot
pm2 save

# Configure startup script
pm2 startup

# View status
pm2 status

# View logs
pm2 logs vexyl-gateway

# Monitor resources
pm2 monit
```

### PM2 Commands Reference

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.config.js` | Start the application |
| `pm2 stop vexyl-gateway` | Stop the application |
| `pm2 restart vexyl-gateway` | Restart the application |
| `pm2 reload vexyl-gateway` | Zero-downtime reload |
| `pm2 logs vexyl-gateway` | View logs |
| `pm2 monit` | Real-time monitoring |
| `pm2 delete vexyl-gateway` | Remove from PM2 |

---

## Option 6: systemd Service (Binary)

For systems without PM2, use systemd directly.

### Create Service File

Create `/etc/systemd/system/vexyl-gateway.service`:

```ini
[Unit]
Description=VEXYL AI Voice Gateway
After=network.target

[Service]
Type=simple
User=vexyl
Group=vexyl
WorkingDirectory=/opt/vexyl
ExecStart=/opt/vexyl/vexyl-gateway-linux-x64
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/vexyl/.env

[Install]
WantedBy=multi-user.target
```

### Create User and Set Permissions

```bash
# Create service user
sudo useradd -r -s /bin/false vexyl

# Set ownership
sudo chown -R vexyl:vexyl /opt/vexyl
```

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable vexyl-gateway

# Start service
sudo systemctl start vexyl-gateway

# Check status
sudo systemctl status vexyl-gateway

# View logs
sudo journalctl -u vexyl-gateway -f
```

---

## Verification

After installation, verify the gateway is running:

### Health Check

```bash
curl http://localhost:8081/health
```

Expected response:

```json
{
  "status": "ok",
  "mode": "standard",
  "uptime": 123,
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### License Status

```bash
curl http://localhost:8081/license
```

### Active Calls

```bash
curl http://localhost:8081/calls/stats
```

---

## Firewall Configuration

### UFW (Ubuntu)

```bash
sudo ufw allow 8080/tcp  # AudioSocket
sudo ufw allow 8081/tcp  # HTTP API
sudo ufw allow 8082/tcp  # WebSocket
sudo ufw reload
```

### firewalld (CentOS/RHEL)

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --permanent --add-port=8082/tcp
sudo firewall-cmd --reload
```

---

## Volume Mounts

| Path | Purpose | Recommended Size |
|------|---------|------------------|
| `/app/cache` | TTS cache storage | 10 GB |
| `/app/audio` | Custom audio files | 1 GB |

**Important**: Mount persistent storage for the cache directory to preserve TTS cache across restarts.

---

## Complete Environment Variables Reference

This section documents all available configuration options for VEXYL AI Voice Gateway.

### Core Server Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_HOST` | 127.0.0.1 | HTTP API server bind address |
| `HTTP_PORT` | 8081 | HTTP API server port |
| `AUDIOSOCKET_HOST` | 127.0.0.1 | AudioSocket server bind address |
| `AUDIOSOCKET_PORT` | 8080 | AudioSocket server port |
| `DEFAULT_LANGUAGE` | ml-IN | Default language code |
| `LOG_LATENCY` | false | Enable latency logging |

### License & Security

| Variable | Default | Description |
|----------|---------|-------------|
| `LICENSE_KEY` | (empty) | Machine-bound license key |
| `HTTP_ALLOWED_IPS` | (empty) | IP whitelist (comma-separated, CIDR supported) |
| `HTTP_TRUST_PROXY` | false | Trust X-Forwarded-For header |

### Operation Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_MODE` | false | Enable Gateway Mode (direct LLM audio) |

---

### LLM Provider Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | sarvam | Provider: sarvam, flowise, litebot, custom, n8n |

**Sarvam LLM:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SARVAM_API_KEY` | (required) | Sarvam AI API key |

**Flowise LLM:**

| Variable | Default | Description |
|----------|---------|-------------|
| `FLOWISE_API_URL` | (required) | Flowise API endpoint |
| `FLOWISE_FLOW_ID` | (required) | Flowise flow ID |

**Litebot LLM:**

| Variable | Default | Description |
|----------|---------|-------------|
| `LITEBOT_API_URL` | http://localhost:3000 | Litebot API endpoint |
| `LITEBOT_BOT_ID` | customer-service | Default bot ID |
| `LITEBOT_TIMEOUT` | 30000 | API timeout (ms) |

**Custom Webhook LLM:**

| Variable | Default | Description |
|----------|---------|-------------|
| `CUSTOM_LLM_URL` | (required) | Custom webhook endpoint |
| `CUSTOM_LLM_API_KEY` | (none) | API key for authentication |
| `CUSTOM_LLM_TIMEOUT` | 30000 | API timeout (ms) |

**n8n Workflow LLM:**

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_WEBHOOK_URL` | (required) | n8n webhook endpoint |
| `N8N_TIMEOUT` | 30000 | API timeout (ms) |
| `N8N_AUTH_HEADER` | (none) | Authorization header |
| `N8N_RESPONSE_FIELD` | (auto) | Custom response field path |
| `N8N_SESSION_FIELD` | (auto) | Custom session field path |

---

### STT Provider Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `STT_PROVIDER` | auto | Provider: auto, sarvam, groq, gemini, deepgram, openai |

**Sarvam STT:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SARVAM_API_KEY` | (required) | Sarvam AI API key |

**Groq Whisper STT:**

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | (required) | Groq API key |
| `GROQ_MODEL` | whisper-large-v3-turbo | whisper-large-v3-turbo or whisper-large-v3 |

**Gemini STT:**

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Google Generative AI API key |
| `GEMINI_STT_MODEL` | gemini-2.0-flash-exp | Gemini model for STT |
| `GEMINI_STT_PROMPT` | (none) | Custom transcription instructions |

**Deepgram STT:**

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPGRAM_API_KEY` | (required) | Deepgram API key |
| `DEEPGRAM_STT_MODEL` | nova-2 | Model: nova-2 or nova-3 |
| `DEEPGRAM_STT_ENDPOINTING` | 500 | Silence detection (ms) |
| `DEEPGRAM_STT_INTERIM_RESULTS` | true | Enable interim results |
| `DEEPGRAM_STT_PUNCTUATE` | true | Add punctuation |
| `DEEPGRAM_STT_SMART_FORMAT` | true | Smart formatting |

**OpenAI Whisper STT:**

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key |
| `OPENAI_STT_MODEL` | whisper-1 | whisper-1 or gpt-4o-transcribe |

---

### TTS Provider Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `TTS_PROVIDER` | sarvam | Provider: sarvam, google, gemini, elevenlabs, deepgram, azure, murf |

**Sarvam TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SARVAM_API_KEY` | (required) | Sarvam AI API key |

**Google Cloud TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | (required) | Path to service account JSON |
| `GOOGLE_TTS_VOICE_NAME` | (auto) | Voice name override |

**Gemini TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Google Generative AI API key |
| `GEMINI_TTS_MODEL` | gemini-2.5-flash-tts | Gemini TTS model |
| `GEMINI_TTS_VOICE_NAME` | Achernar | Voice name |
| `GEMINI_TTS_TEMPERATURE` | 1.0 | Temperature (0.1-1.0) |

**ElevenLabs TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | (required) | ElevenLabs API key |
| `ELEVENLABS_MODEL` | eleven_multilingual_v2 | TTS model |
| `ELEVENLABS_VOICE_ID` | 21m00Tcm4TlvDq8ikWAM | Default voice ID |
| `ELEVENLABS_STABILITY` | 0.5 | Voice stability (0.0-1.0) |
| `ELEVENLABS_SIMILARITY_BOOST` | 0.75 | Voice clarity (0.0-1.0) |
| `ELEVENLABS_TIMEOUT` | 30000 | WebSocket timeout (ms) |

**Deepgram TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPGRAM_API_KEY` | (required) | Deepgram API key |
| `DEEPGRAM_MODEL` | aura-asteria-en | Default voice model |
| `DEEPGRAM_TIMEOUT` | 30000 | API timeout (ms) |

**Azure TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `AZURE_TTS_API_KEY` | (required) | Azure Cognitive Services key |
| `AZURE_TTS_REGION` | centralindia | Azure region |
| `AZURE_TTS_VOICE_NAME` | en-US-JennyNeural | Default voice |
| `AZURE_TTS_VOICE_STYLE` | (none) | Voice style |
| `AZURE_TTS_RATE` | 1.2 | Speech rate (0.5-2.0) |
| `AZURE_TTS_PITCH` | 0% | Pitch (-50% to +50%) |
| `AZURE_TTS_TIMEOUT` | 30000 | API timeout (ms) |

**Murf TTS:**

| Variable | Default | Description |
|----------|---------|-------------|
| `MURF_API_KEY` | (required) | Murf AI API key |
| `MURF_VOICE_ID` | en-US-natalie | Default voice ID |
| `MURF_MODEL` | GEN2 | Model: GEN2 or FALCON |
| `MURF_STYLE` | Conversational | Voice style |
| `MURF_SAMPLE_RATE` | 24000 | Sample rate (Hz) |

---

### Voice Activity Detection (VAD)

| Variable | Default | Description |
|----------|---------|-------------|
| `VAD_MODEL` | v5 | Silero VAD model version |
| `VAD_POSITIVE_THRESHOLD` | 0.5 | Speech start threshold (0.0-1.0) |
| `VAD_NEGATIVE_THRESHOLD` | 0.35 | Speech stop threshold |
| `VAD_REDEMPTION_FRAMES` | 8 | Pause tolerance (8 = 768ms) |
| `VAD_MIN_SPEECH_FRAMES` | 3 | Min speech frames (3 = 288ms) |
| `VAD_PRE_SPEECH_FRAMES` | 1 | Pre-buffer frames (1 = 96ms) |

---

### Audio Buffering

| Variable | Default | Description |
|----------|---------|-------------|
| `MIN_SPEECH_DURATION` | 500 | Min speech before processing (ms) |
| `MAX_SILENCE_DURATION` | 1000 | Max silence before finalizing (ms) |
| `MAX_BUFFER_DURATION` | 10000 | Max buffer before forcing STT (ms) |

---

### Barge-In (Interrupt AI)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_BARGE_IN` | true | Enable conversation interruption |
| `BARGE_IN_THRESHOLD` | 500 | Energy threshold for detection |
| `BARGE_IN_DELAY` | 200 | Min speech duration (ms) |
| `BARGE_IN_USE_VAD` | true | Use VAD for accurate detection |
| `BARGE_IN_VAD_THRESHOLD` | 0.5 | VAD probability threshold |

---

### TTS Response Splitting

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_TTS_SPLITTING` | true | Split long responses |
| `TTS_CHUNK_SIZE` | 100 | Max characters per chunk |
| `TTS_MAX_PARALLEL` | 3 | Parallel TTS requests |
| `TTS_SPLIT_DELIMITERS` | .!?। | Sentence delimiters |
| `TTS_PHRASE_DELIMITERS` | ,;: | Phrase delimiters |

---

### TTS Caching

| Variable | Default | Description |
|----------|---------|-------------|
| `TTS_CACHE_ENABLED` | false | Enable disk caching |
| `TTS_CACHE_DIR` | cache/tts | Cache directory |
| `TTS_CACHE_MAX_SIZE_MB` | 5000 | Max cache size (MB) |
| `TTS_CACHE_MAX_AGE_DAYS` | 90 | Max entry age (days) |
| `TTS_CACHE_CLEANUP_STRATEGY` | lru | Strategy: lru, size, ttl, none |
| `TTS_CACHE_STATS_LOGGING` | true | Enable cache stats |

---

### Utterance Window (Batch STT)

| Variable | Default | Description |
|----------|---------|-------------|
| `UTTERANCE_WINDOW_SIZE` | 5 | Max utterances to buffer |
| `UTTERANCE_TIMEOUT` | 3000 | Timeout after last utterance (ms) |
| `REDEMPTION_MS` | 1400 | Grace period for speech (ms) |
| `UTTERANCE_COMBINATION_WINDOW` | 10000 | Combine window (ms) |

---

### Outbound Calls

| Variable | Default | Description |
|----------|---------|-------------|
| `OUTBOUND_ENABLED` | false | Enable outbound calling |
| `OUTBOUND_ORIGINATE_ENDPOINT` | (none) | Webhook URL for call origination |
| `OUTBOUND_TIMEOUT` | 10000 | Webhook timeout (ms) |
| `OUTBOUND_GREETING_MODE` | static | Mode: static, dynamic, hybrid, wait |
| `OUTBOUND_STATIC_AUDIO_EN` | (none) | English greeting WAV file |
| `OUTBOUND_STATIC_AUDIO_ML` | (none) | Malayalam greeting WAV file |
| `OUTBOUND_DEFAULT_GREETING_EN` | (default) | English greeting text (TTS) |
| `OUTBOUND_DEFAULT_GREETING_ML` | (default) | Malayalam greeting text (TTS) |

---

### Call Transfer (HITL)

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSFER_ENABLED` | false | Enable call transfer |
| `TRANSFER_ENDPOINT` | (none) | Transfer webhook URL |
| `TRANSFER_TIMEOUT` | 5000 | Webhook timeout (ms) |
| `TRANSFER_MESSAGE` | (none) | Transfer message audio file |
| `TRANSFER_MESSAGE_TEXT_EN` | (default) | Transfer message (English) |
| `TRANSFER_ERROR_MESSAGE` | (none) | Transfer error audio file |
| `TRANSFER_ERROR_TEXT_EN` | (default) | Transfer error text |

---

### Goodbye/Hangup Messages

| Variable | Default | Description |
|----------|---------|-------------|
| `GOODBYE_MESSAGE` | (none) | Goodbye audio file |
| `GOODBYE_MESSAGE_TEXT_EN` | (default) | Goodbye text (English) |
| `GOODBYE_MESSAGE_TEXT_ML` | (default) | Goodbye text (Malayalam) |

---

### LLM Timeout Messages

| Variable | Default | Description |
|----------|---------|-------------|
| `TIMEOUT_MESSAGE_ENABLED` | true | Enable timeout messages |
| `LLM_TIMEOUT_MESSAGE` | (default) | Initial timeout message |
| `LLM_TIMEOUT_RETRY_MESSAGE` | (default) | Retry timeout message |
| `LLM_FINAL_TIMEOUT_MESSAGE` | (default) | Final timeout message |

---

### Processing Sound

| Variable | Default | Description |
|----------|---------|-------------|
| `PROCESSING_SOUND_ENABLED` | false | Enable processing sound |
| `PROCESSING_SOUND_FILE` | (none) | Path to sound file |
| `PROCESSING_SOUND_VOLUME` | 0.3 | Volume (0.0-1.0) |
| `PROCESSING_SOUND_LOOP` | true | Loop sound |
| `PROCESSING_SOUND_START_DELAY` | 2000 | Delay before playing (ms) |

---

### Session Storage (Redis)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | (none) | Redis hostname (enables Redis) |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | (none) | Redis password |
| `REDIS_DB` | 0 | Redis database number |
| `SESSION_TTL` | 3600 | Session TTL (seconds) |

---

### WebSocket Browser SDK

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBSOCKET_AUDIO_ENABLED` | false | Enable WebSocket server |
| `WEBSOCKET_AUDIO_PORT` | 8082 | WebSocket port |
| `WEBSOCKET_AUDIO_HOST` | 0.0.0.0 | WebSocket bind address |
| `WEBSOCKET_AUDIO_ALLOWED_ORIGINS` | (empty) | Allowed CORS origins |
| `WEBSOCKET_AUDIO_MAX_PER_IP` | 5 | Max connections per IP |
| `WEBSOCKET_AUDIO_API_KEY` | (none) | API key for authentication |

---

### Gateway Mode (OpenAI/ElevenLabs Direct)

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_WEBSOCKET_URL` | (none) | LLM WebSocket endpoint |
| `LLM_API_KEY` | (none) | LLM WebSocket API key |
| `AUDIO_FORMAT` | pcm16 | Audio format |
| `SAMPLE_RATE` | 8000 | Sample rate (Hz) |
| `GATEWAY_VOICE` | alloy | Voice ID |
| `GATEWAY_INSTRUCTIONS` | (default) | System instructions |
| `GATEWAY_TEMPERATURE` | 0.8 | Temperature (0.0-1.0) |
| `GATEWAY_MAX_TOKENS` | 4096 | Max response tokens |
| `GATEWAY_VAD_TYPE` | server_vad | VAD type: server_vad, none |
| `GATEWAY_VAD_THRESHOLD` | 0.5 | VAD threshold |
| `GATEWAY_VAD_SILENCE_MS` | 500 | Silence duration (ms) |
| `MAX_AUDIO_BUFFER_SIZE` | 100 | Max audio buffer chunks |
| `MAX_PLAYBACK_QUEUE_SIZE` | 50 | Max playback queue chunks |

---

### Testing/Debugging

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_TTS_ON_START` | false | Test TTS on startup |
| `TEST_STT_ON_START` | false | Test STT on startup |
| `TEST_GROQ_ON_START` | false | Test Groq on startup |

---

## Next Steps

1. **Configure Providers** - See [03-configuration.md](03-configuration.md)
2. **Set Up Asterisk** - See [08-asterisk-integration.md](08-asterisk-integration.md)
3. **Test Browser SDK** - Access `http://your-server:8081/demo.html`

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs vexyl-gateway

# Common issues:
# - Missing API keys in environment
# - Port already in use
# - Insufficient permissions on mounted volumes
```

### Health check fails

```bash
# Verify ports are accessible
netstat -tlnp | grep -E '8080|8081|8082'

# Check firewall rules
sudo ufw status
```

### Permission denied on volumes

```bash
# Docker: ensure proper ownership
sudo chown -R 1000:1000 /opt/vexyl/cache
sudo chown -R 1000:1000 /opt/vexyl/audio
```

### License not recognized

```bash
# Get machine ID for license
curl http://localhost:8081/license

# Contact support with the machine ID
```
