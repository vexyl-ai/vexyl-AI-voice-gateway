# Performance Optimization

This guide covers performance tuning, resource optimization, and scaling strategies for VEXYL AI Voice Gateway.

## Latency Optimization

### Pipeline Latency Breakdown

**Standard Mode:**
| Component | Typical Latency | Optimization Target |
|-----------|-----------------|---------------------|
| VAD + Buffering | 500-1000ms | Configure VAD thresholds |
| STT (streaming) | 300-800ms | Use Sarvam/Deepgram |
| STT (batch) | 1000-3000ms | Use Groq for speed |
| LLM Processing | 500-2000ms | Choose faster providers |
| TTS Synthesis | 200-800ms | Enable caching |
| **Total** | **2-5 seconds** | **Target: <3s** |

**Gateway Mode:**
| Component | Typical Latency |
|-----------|-----------------|
| Audio to LLM | 50-200ms |
| LLM Processing | 100-500ms |
| LLM to Audio | 50-200ms |
| **Total** | **200-900ms** |

### STT Optimization

**For Speed:**
```bash
# Use streaming providers
STT_PROVIDER=sarvam    # For Indian languages
STT_PROVIDER=deepgram  # For English

# Optimize VAD for faster response
VAD_REDEMPTION_FRAMES=6          # 576ms instead of 768ms
VAD_POSITIVE_THRESHOLD=0.5       # Balanced
```

**For Accuracy:**
```bash
# Use batch providers with best models
STT_PROVIDER=groq
GROQ_MODEL=whisper-large-v3      # Slower but most accurate

# Increase buffer for complete utterances
MAX_BUFFER_DURATION=5000
VAD_REDEMPTION_FRAMES=10         # 960ms pause tolerance
```

### TTS Optimization

**For Speed:**
```bash
# Use fastest providers
TTS_PROVIDER=deepgram            # <200ms latency
DEEPGRAM_MODEL=aura-asteria-en

# Enable caching
TTS_CACHE_ENABLED=true
TTS_CACHE_DIR=/opt/assist/cache/tts
```

**For Quality:**
```bash
TTS_PROVIDER=elevenlabs          # Premium quality
# or
TTS_PROVIDER=azure               # Neural voices with styles
```

### LLM Optimization

**For Speed:**
```bash
# Use Gateway Mode
GATEWAY_MODE=true

# Or optimize n8n workflows
N8N_TIMEOUT=15000                # Lower timeout
```

**For Custom Workflows:**
```bash
# Standard Mode with optimized providers
LLM_PROVIDER=n8n
STT_PROVIDER=deepgram            # Streaming
TTS_PROVIDER=deepgram            # Fastest
TTS_CACHE_ENABLED=true           # Reduce repeat TTS calls
```

---

## TTS Caching Strategy

### Cache Configuration

```bash
# Enable caching
TTS_CACHE_ENABLED=true
TTS_CACHE_DIR=/opt/assist/cache/tts

# Size limits
TTS_CACHE_MAX_SIZE_MB=5000       # 5 GB
TTS_CACHE_MAX_AGE_DAYS=90        # 3 months

# Cleanup strategy
TTS_CACHE_CLEANUP_STRATEGY=lru   # least-recently-used
```

### Cache Sizing Guide

| Bot Type | Unique Phrases | Recommended Size |
|----------|---------------|------------------|
| Small survey (10 Qs) | 50-100 | 100 MB |
| Medium survey (50 Qs) | 200-500 | 500 MB |
| Large IVR (100 options) | 500-1000 | 1000 MB |
| FAQ bot (500 answers) | 1000-2000 | 2000 MB |

### Maximizing Cache Hits

1. **Normalize LLM responses**
   ```
   // Instead of: "Hello John, it's 2:35 PM"
   // Use: "Hello, how can I help you today?"
   ```

2. **Separate dynamic data**
   ```
   // Cache: "Your appointment is on"
   // Dynamic: " November 25th at 3 PM"
   ```

3. **Pre-warm cache** by running common phrases through the TTS API before production use

### Cache Performance Metrics

Cache statistics are logged periodically when `TTS_CACHE_STATS_LOGGING=true`:

Sample output:
```
Hit Rate:        95.0%
API Calls Saved: 12,450
Cost Savings:    $37.35
```

---

## Memory Management

### Buffer Limits

```bash
# Prevent memory overflow
MAX_AUDIO_BUFFER_SIZE=100        # Max input audio chunks
MAX_PLAYBACK_QUEUE_SIZE=50       # Max output audio chunks

# Session limits
SESSION_TTL=3600                 # 1 hour
SESSION_CLEANUP_INTERVAL=300     # Check every 5 minutes
```

### Memory Usage Estimates

| Component | Per Session | 100 Concurrent |
|-----------|-------------|----------------|
| Base application | 50-100 MB | 50-100 MB |
| Audio buffers | 5-10 MB | 500-1000 MB |
| Session data | 1-2 MB | 100-200 MB |
| TTS cache | N/A | 500-5000 MB |
| **Total** | ~15 MB | ~2-6 GB |

### Memory Optimization

```bash
# Reduce buffer sizes for memory-constrained systems
MAX_AUDIO_BUFFER_SIZE=50
MAX_PLAYBACK_QUEUE_SIZE=25
TTS_CACHE_MAX_SIZE_MB=1000

# More aggressive cleanup
SESSION_TTL=1800                 # 30 minutes
SESSION_CLEANUP_INTERVAL=120     # 2 minutes
```

---

## CPU Optimization

### CPU Usage by Component

| Component | CPU Impact | Optimization |
|-----------|------------|--------------|
| VAD (Silero) | Low (<1%) | Use native ONNX |
| Audio resampling | Low-Medium | Use native methods |
| FFmpeg (TTS) | Medium | Cache results |
| WebSocket handling | Low | Use connection pooling |

### Reducing CPU Load

1. **Enable TTS caching** (eliminates repeat processing)
   ```bash
   TTS_CACHE_ENABLED=true
   ```

2. **Use native resampling** (no FFmpeg for simple cases)
   ```bash
   # Gateway mode uses native resampling
   GATEWAY_MODE=true
   ```

3. **Limit concurrent calls**
   ```bash
   MAX_CONCURRENT_CALLS=20      # Match available CPU cores
   ```

---

## Network Optimization

### Reduce API Latency

1. **Choose geographically close providers**
   ```bash
   # For India
   AZURE_TTS_REGION=centralindia
   # For US
   AZURE_TTS_REGION=eastus
   ```

2. **Use HTTP/2 connections**
   ```bash
   # Most providers support HTTP/2 automatically
   ```

3. **Connection pooling** (built-in)

### Reduce Bandwidth

1. **Use streaming providers** (smaller chunks)
   ```bash
   STT_PROVIDER=sarvam          # Streaming
   ```

2. **Optimize TTS output**
   ```bash
   TTS_CHUNK_SIZE=100           # Smaller chunks
   ```

### Firewall Configuration

```bash
# Required outbound connections
# TTS/STT API endpoints (HTTPS)
# LLM webhooks (HTTP/HTTPS)
# NTP server (UDP 123)

# Inbound
# 8080 - AudioSocket
# 8081 - HTTP API
# 8082 - WebSocket Audio
```

---

## Scaling Strategies

### Single Server Limits

| Resource | Recommended Max |
|----------|-----------------|
| Concurrent calls | 20-50 |
| Memory | 4-8 GB |
| CPU cores | 4-8 |
| Network | 100 Mbps |

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (HAProxy)     │
                    └────────┬────────┘
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Instance 1  │ │  Instance 2  │ │  Instance 3  │
    │  Port 8080   │ │  Port 8080   │ │  Port 8080   │
    └──────────────┘ └──────────────┘ └──────────────┘
           │                │                │
           └────────────────┼────────────────┘
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │  (Sessions)  │
                    └──────────────┘
```

### Redis for Scaling

```bash
# Enable Redis for session sharing
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### HAProxy Configuration

```haproxy
frontend audiosocket
    bind *:8080
    default_backend ai_servers

backend ai_servers
    balance roundrobin
    server server1 10.0.0.1:8080 check
    server server2 10.0.0.2:8080 check
    server server3 10.0.0.3:8080 check
```

---

## Provider Selection for Performance

### STT Provider Performance

| Provider | Latency | Accuracy | Best For |
|----------|---------|----------|----------|
| Sarvam | 300-800ms | 90% | Indian languages |
| Deepgram | 300-500ms | 92% | English, speed |
| Groq | 1-3s | 95% | Accuracy |
| OpenAI | 2-5s | 97% | Quality |

**Speed priority:**
```bash
STT_PROVIDER=deepgram
```

**Quality priority:**
```bash
STT_PROVIDER=groq
GROQ_MODEL=whisper-large-v3
```

### TTS Provider Performance

| Provider | Latency | Quality | Cost |
|----------|---------|---------|------|
| Deepgram | <200ms | Good | Low |
| Google | 200-400ms | Excellent | Medium |
| Azure | 200-400ms | Excellent | Medium |
| ElevenLabs | 300-800ms | Premium | High |

**Speed priority:**
```bash
TTS_PROVIDER=deepgram
TTS_CACHE_ENABLED=true
```

**Quality priority:**
```bash
TTS_PROVIDER=elevenlabs
```

### LLM Provider Performance

| Mode | Latency | Customization |
|------|---------|---------------|
| Gateway | 200-900ms | Low |
| n8n | 1-3s | High |
| Flowise | 1-3s | High |

**Speed priority:**
```bash
GATEWAY_MODE=true
```

**Flexibility priority:**
```bash
LLM_PROVIDER=n8n
```

---

## Monitoring & Metrics

### Key Performance Indicators

1. **Response Time**
   - First audio latency
   - Total turn-around time

2. **Throughput**
   - Concurrent calls
   - Calls per hour

3. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Network bandwidth

4. **Cache Performance**
   - Hit rate
   - Cost savings

### Enable Logging

```bash
# Detailed performance logging
DEBUG=true
TTS_CACHE_STATS_LOGGING=true
GATEWAY_LOG_TRANSCRIPTS=true
```

### PM2 Monitoring

```bash
# View real-time metrics
pm2 monit

# View logs
pm2 logs assist

# Memory/CPU usage
pm2 describe assist
```

---

## Production Checklist

### Performance

- [ ] TTS caching enabled
- [ ] Appropriate STT provider selected
- [ ] VAD tuned for use case
- [ ] Buffer limits configured
- [ ] Connection pooling active

### Reliability

- [ ] Circuit breaker configured
- [ ] Timeout messages enabled
- [ ] Error handling verified
- [ ] Fallback providers set

### Scaling

- [ ] Redis configured (multi-instance)
- [ ] Load balancer setup
- [ ] Session TTL appropriate
- [ ] Concurrent call limits set

### Monitoring

- [ ] PM2 process manager
- [ ] Log rotation configured
- [ ] Metrics collection enabled
- [ ] Alerting setup

---

## Recommended Configurations

### High-Speed (Low Latency)

```bash
# Gateway mode for fastest response
GATEWAY_MODE=true
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
SAMPLE_RATE=24000
```

### High-Quality (Best Experience)

```bash
# Standard mode with best providers
GATEWAY_MODE=false
STT_PROVIDER=groq
TTS_PROVIDER=elevenlabs
LLM_PROVIDER=n8n
TTS_CACHE_ENABLED=true
```

### Cost-Effective (Budget)

```bash
# Optimize for cost
GATEWAY_MODE=false
STT_PROVIDER=gemini           # Cost-effective
TTS_PROVIDER=deepgram         # Low cost
TTS_CACHE_ENABLED=true        # 95% savings on TTS
LLM_PROVIDER=n8n              # Use free/cheap LLM
```

### High-Volume (Scale)

```bash
# Scale for many concurrent calls
REDIS_HOST=redis.internal
TTS_CACHE_ENABLED=true
TTS_CACHE_MAX_SIZE_MB=10000
MAX_CONCURRENT_CALLS=100
SESSION_TTL=1800
MAX_AUDIO_BUFFER_SIZE=50
```

