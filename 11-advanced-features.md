# Advanced Features

This guide covers advanced functionality including barge-in, call transfer, outbound calls, TTS caching, VAD configuration, and session management.

## Voice Activity Detection (VAD)

VEXYL uses Silero VAD v5, an ML-based voice activity detection system that accurately identifies speech boundaries.

### How VAD Works

```
Audio Flow:
Asterisk (8kHz PCM)
    ↓
Resampler (8kHz → 16kHz)
    ↓
Silero VAD v5 (96ms frames)
    ↓
onSpeechStart / onSpeechEnd callbacks
    ↓
Trigger transcription
```

### Configuration

```bash
# Silero VAD v5 Configuration
VAD_MODEL=v5

# Speech detection threshold (0.0-1.0)
# Higher = stricter, Lower = more sensitive
VAD_POSITIVE_THRESHOLD=0.5

# Silence detection threshold (0.0-1.0)
# Must be lower than positive threshold
VAD_NEGATIVE_THRESHOLD=0.35

# Frames of silence before declaring speech end
# 1 frame = 96ms, Default 8 = 768ms pause tolerance
VAD_REDEMPTION_FRAMES=8

# Minimum frames to qualify as speech
# Default 3 = 288ms minimum utterance
VAD_MIN_SPEECH_FRAMES=3

# Frames to capture before speech starts
# Default 1 = 96ms pre-buffer
VAD_PRE_SPEECH_FRAMES=1
```

### Tuning for Scenarios

**Call Center (Noisy):**
```bash
VAD_POSITIVE_THRESHOLD=0.6       # Filter background noise
VAD_NEGATIVE_THRESHOLD=0.4       # Quick speech end detection
VAD_REDEMPTION_FRAMES=6          # 576ms pause tolerance
VAD_MIN_SPEECH_FRAMES=5          # Stricter noise filtering
```

**Elderly Users (Slow Speech):**
```bash
VAD_POSITIVE_THRESHOLD=0.4       # Catch soft speech
VAD_NEGATIVE_THRESHOLD=0.3       # Tolerant of pauses
VAD_REDEMPTION_FRAMES=12         # 1152ms pause tolerance
VAD_MIN_SPEECH_FRAMES=3          # Standard filtering
```

**Fast-Paced Conversation:**
```bash
VAD_POSITIVE_THRESHOLD=0.5       # Balanced
VAD_NEGATIVE_THRESHOLD=0.35      # Balanced
VAD_REDEMPTION_FRAMES=6          # 576ms quick response
VAD_MIN_SPEECH_FRAMES=3          # Standard filtering
```

### Redemption Mechanism

VAD uses a "redemption window" for natural speech pauses:

```
User: "What is... um... your role?"
      ├─ 1s speech ─┤ 0.5s pause ├─ 0.8s speech ─┤

VAD Processing:
- 0-1s:     Speech detected, counter = 0
- 1-1.5s:   Silence (5 frames), counter = 5
- 1.5s:     Speech resumes, counter RESETS to 0
- 2.3s:     Speech stops
- 2.3-3.1s: Silence (8 frames), counter = 8
- 3.1s:     onSpeechEnd fires

Result: Complete sentence captured despite mid-sentence pause
```

---

## Barge-In (Interrupt AI)

Barge-in allows callers to interrupt the AI while it's speaking.

### Configuration

```bash
# Enable barge-in
ENABLE_BARGE_IN=true

# Minimum speech duration to trigger barge-in (ms)
BARGE_IN_THRESHOLD=500

# Use VAD for barge-in detection
BARGE_IN_USE_VAD=true

# VAD probability threshold for barge-in
BARGE_IN_VAD_THRESHOLD=0.5
```

### How It Works

```
1. AI is speaking (TTS audio playing)
2. User starts talking
3. VAD detects speech above threshold
4. Audio playback stops immediately
5. System starts processing user's speech
```

### Tuning

**Quick Interruption:**
```bash
BARGE_IN_THRESHOLD=300           # 300ms minimum
BARGE_IN_VAD_THRESHOLD=0.4       # More sensitive
```

**Prevent False Barge-in:**
```bash
BARGE_IN_THRESHOLD=700           # 700ms minimum
BARGE_IN_VAD_THRESHOLD=0.6       # Less sensitive
```

---

## Call Transfer (HITL)

Human-in-the-Loop (HITL) transfer allows LLM to escalate calls to human agents.

### Configuration

```bash
# Enable call transfer
TRANSFER_ENABLED=true

# Webhook endpoint (your server)
TRANSFER_ENDPOINT=http://your-server/transfer.php

# Timeout for webhook response
TRANSFER_TIMEOUT=5000

# Audio messages
TRANSFER_MESSAGE=/opt/assist/audio/transfer-message.wav
TRANSFER_MESSAGE_EN=/opt/assist/audio/transfer-message-en.wav
TRANSFER_MESSAGE_ML=/opt/assist/audio/transfer-message-ml.wav
TRANSFER_ERROR_MESSAGE=/opt/assist/audio/transfer-failed.wav

# TTS fallback text
TRANSFER_MESSAGE_TEXT_EN=Please hold while I transfer you to a human agent.
TRANSFER_MESSAGE_TEXT_ML=ദയവായി കാത്തിരിക്കൂ, ഞാൻ നിങ്ങളെ ഒരു മനുഷ്യ ഏജന്റിലേക്ക് കൈമാറുന്നു.
TRANSFER_ERROR_TEXT_EN=I'm sorry, I was unable to transfer you.
```

### LLM Response Format

When LLM wants to transfer:

```json
{
  "response": "Let me connect you to a human agent.",
  "shouldEscalate": true
}
```

For n8n:
```json
{
  "response": "Transferring you now.",
  "metadata": { "shouldEscalate": true }
}
```

### Webhook Payload

Your transfer endpoint receives:

```json
{
  "channel": "PJSIP/128-000000db",
  "callerid": "+919876543210",
  "uuid": "1732197652.220",
  "timestamp": "2025-11-21T18:50:32.000Z"
}
```

### Transfer Flow

```
1. LLM returns shouldEscalate: true
2. System plays transfer message (audio or TTS)
3. POST to TRANSFER_ENDPOINT (parallel with audio)
4. Webhook redirects call via AMI
5. Resources released, call continues
```

### Webhook Implementation

**PHP Example:**
```php
<?php
$data = json_decode(file_get_contents('php://input'), true);

$ami = fsockopen('localhost', 5038, $errno, $errstr, 5);
if ($ami) {
    fwrite($ami, "Action: Login\r\nUsername: admin\r\nSecret: password\r\n\r\n");
    fwrite($ami, "Action: Redirect\r\nChannel: {$data['channel']}\r\nContext: agent-queue\r\nExten: 7000\r\nPriority: 1\r\n\r\n");
    fwrite($ami, "Action: Logoff\r\n\r\n");
    fclose($ami);
    http_response_code(200);
    echo json_encode(['success' => true]);
}
?>
```

---

## Graceful Hangup (LLM-Controlled)

LLM can end calls gracefully when tasks are complete.

### Configuration

```bash
# Goodbye messages
GOODBYE_MESSAGE=/opt/assist/audio/goodbye.wav
GOODBYE_MESSAGE_EN=/opt/assist/audio/goodbye-en.wav
GOODBYE_MESSAGE_ML=/opt/assist/audio/goodbye-ml.wav

# TTS fallback
GOODBYE_MESSAGE_TEXT_EN=Thank you for calling. Goodbye!
GOODBYE_MESSAGE_TEXT_ML=കോളിന് നന്ദി. വിട!
```

### LLM Response Format

```json
{
  "response": "Your appointment is confirmed. Have a great day!",
  "shouldHangup": true
}
```

### Hangup Flow

```
1. LLM returns shouldHangup: true
2. System plays response text
3. System plays goodbye message
4. AudioSocket connection closed
5. Call ends gracefully
```

### Use Cases

- Appointment confirmed
- Order placed
- Information provided
- Task completed
- User says goodbye

---

## Outbound Calls

Webhook-based outbound calling with immediate greetings.

### Configuration

```bash
# Enable outbound calls
OUTBOUND_ENABLED=true

# Webhook for originating calls
OUTBOUND_ORIGINATE_ENDPOINT=http://127.0.0.1:8082/originate.php

# Timeout for originate webhook
OUTBOUND_TIMEOUT=10000

# Greeting mode: static, dynamic, hybrid, wait
OUTBOUND_GREETING_MODE=static

# Static mode: Pre-recorded audio (fastest)
OUTBOUND_STATIC_AUDIO_EN=/opt/assist/audio/outbound-en.wav
OUTBOUND_STATIC_AUDIO_ML=/opt/assist/audio/outbound-ml.wav
OUTBOUND_STATIC_AUDIO_HI=/opt/assist/audio/outbound-hi.wav

# Dynamic mode: TTS greetings
OUTBOUND_DEFAULT_GREETING_EN=Hello, this is VEXYL AI calling.
OUTBOUND_DEFAULT_GREETING_ML=നമസ്കാരം, ഇത് VEXYL AI ആണ്.
```

### Greeting Modes

| Mode | Latency | Description |
|------|---------|-------------|
| static | <200ms | Pre-recorded WAV |
| dynamic | 500-1000ms | Text → TTS |
| hybrid | <200ms | Static intro + LLM |
| wait | 2-5 seconds | Silent until user speaks |

### API: Initiate Outbound Call

```http
POST /outbound/initiate
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "greetingMode": "static",
  "language": "en-IN",
  "webhookUrl": "http://your-server/status-callback",
  "metadata": {
    "botId": "sales-bot",
    "campaign_id": "promo-2024",
    "customer_name": "John Doe",
    "llm_context": "Customer inquired about product pricing"
  }
}
```

**Response:**
```json
{
  "sessionUuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initiated",
  "message": "Outbound call webhook triggered successfully"
}
```

### API: Check Call Status

```http
GET /outbound/status/{uuid}
```

### Outbound Call Flow

```
1. POST /outbound/initiate
2. App creates session, stores metadata
3. POST to originate webhook
4. Your script triggers AMI originate
5. Asterisk dials user, connects to AudioSocket
6. App plays greeting immediately
7. Normal conversation begins
```

### Asterisk Dialplan for Outbound

```ini
[ai-outbound]
exten => s,1,NoOp(AI Outbound Call: ${SESSION_UUID})
exten => s,n,Answer()
exten => s,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,channel=${CHANNEL})})
exten => s,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => s,n,Hangup()
```

---

## TTS Caching

Hash-based disk caching for TTS responses reduces latency and API costs.

### Configuration

```bash
# Enable caching
TTS_CACHE_ENABLED=true

# Cache location
TTS_CACHE_DIR=/opt/assist/cache/tts

# Size and age limits
TTS_CACHE_MAX_SIZE_MB=5000        # 5 GB max
TTS_CACHE_MAX_AGE_DAYS=90         # Delete after 90 days

# Cleanup strategy: lru, size, ttl, none
TTS_CACHE_CLEANUP_STRATEGY=lru

# Statistics logging
TTS_CACHE_STATS_LOGGING=true
```

### Performance Impact

| Metric | Without Cache | With Cache (95% hit) |
|--------|---------------|----------------------|
| Latency | 800ms | 10-50ms |
| API Cost | $3.00/day | $0.15/day |
| Monthly | $90 | $4.50 |

### How It Works

**Cache Key:** SHA-256 hash of `text + language + provider + voice settings`

1. First request: API call, response cached
2. Same request: Cache hit, instant response
3. Different settings: New cache entry

### Best Use Cases

**Perfect for:**
- Survey bots (same questions repeated)
- IVR menus (static options)
- FAQ bots (common answers)
- Appointment reminders (templates)

**Not ideal for:**
- Personalized responses (unique every time)
- Dynamic data (timestamps, names)
- Real-time info (weather, stocks)

### Cache Management

Cache cleanup is handled automatically based on the configured strategy. The cleanup runs periodically based on the max size and age limits.

| Strategy | Description |
|----------|-------------|
| `lru` | Delete least recently used entries first |
| `size` | Delete largest entries first |
| `ttl` | Delete entries older than max age |
| `none` | Manual cleanup only |

### Statistics Output

```
TTS Cache Statistics

Status:          Enabled
Cache Location:  /opt/assist/cache/tts

Entries:         1,245
Total Size:      234.5 MB
Max Size:        5000 MB

Cache Hits:      12,450
Cache Misses:    655
Hit Rate:        95.0%

API Calls Saved: 12,450
Cost Savings:    $37.35
```

---

## Session Metadata

Session metadata enables personalization and call control features.

### Storing Metadata

From Asterisk dialplan:
```ini
exten => _X.,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,callerid=${CALLERID(num)}&channel=${CHANNEL}&language_code=en-IN)})
```

Via HTTP:
```bash
curl -X POST "http://127.0.0.1:8081/session/${UUID}/metadata" \
  -d "callerid=+919876543210&name=John&language_code=en-IN"
```

### Retrieving Metadata

```bash
curl "http://127.0.0.1:8081/session/${UUID}/metadata"
```

### Available Fields

| Field | Description | Example |
|-------|-------------|---------|
| callerid | Phone number | +919876543210 |
| name | Caller name | John Doe |
| channel | Asterisk channel | PJSIP/100-00000001 |
| language_code | Language | en-IN, hi-IN, ml-IN |
| botId | LLM bot selection | customer-service |
| custom_* | Any custom field | custom_campaign=promo2024 |

### Why Channel Matters

Storing `${CHANNEL}` enables:
- HITL Transfer (AMI Redirect)
- LLM-controlled hangup
- Call recording association
- Analytics

---

## Response Splitting

Long TTS responses are split for faster initial audio.

### Configuration

```bash
# Enable splitting
ENABLE_TTS_SPLITTING=true

# Max characters per chunk
TTS_CHUNK_SIZE=100

# Parallel TTS requests
TTS_MAX_PARALLEL=2

# Sentence boundaries
TTS_SPLIT_DELIMITERS=.!?

# Secondary boundaries
TTS_PHRASE_DELIMITERS=,;:
```

### How It Works

```
LLM Response: "Hello! How are you today? I hope you're doing well."
        ↓
Split:
  Chunk 1: "Hello!"
  Chunk 2: "How are you today?"
  Chunk 3: "I hope you're doing well."
        ↓
Parallel TTS
        ↓
Sequential playback
```

**Benefit:** First chunk plays while others are still processing.

---

## Utterance Window

Long speech that exceeds buffer duration is combined:

### Configuration

```bash
# Max utterances to buffer
UTTERANCE_WINDOW_SIZE=4

# Wait after last transcript before combining
REDEMPTION_MS=1400

# Combine transcripts within this window
UTTERANCE_COMBINATION_WINDOW=10000
```

### How It Works

```
User speaks for 8 seconds
        ↓
Buffer #1 (0-5s) → "I need a hospital booking"
Buffer #2 (5-8s) → "for tomorrow at 3 PM"
        ↓
Wait 1.4s (no more speech)
        ↓
Combined: "I need a hospital booking for tomorrow at 3 PM"
        ↓
Sent to LLM
```

---

## Timeout Messages

Keep users informed during long LLM processing:

### Configuration

```bash
TIMEOUT_MESSAGE_ENABLED=true

# After 15 seconds
LLM_TIMEOUT_MESSAGE=Processing your request. Please hold.

# After 25 seconds
LLM_TIMEOUT_RETRY_MESSAGE=Still working. Taking longer than usual.

# On final timeout
LLM_FINAL_TIMEOUT_MESSAGE=Unable to process. Please try again.

# Language-specific
LLM_TIMEOUT_MESSAGE_ML=നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നു.
```

### Timeout Flow

```
User speaks → LLM called
        │
        ├── 15s: Play TIMEOUT_MESSAGE
        │
        ├── 25s: Play TIMEOUT_RETRY_MESSAGE
        │
        ├── 30s: Play FINAL_TIMEOUT_MESSAGE
        │
        └── Response received: Play AI response
```

---

## Creating Audio Files

All audio files must be: **8kHz, 16-bit, mono, PCM WAV**

### Using FFmpeg

```bash
ffmpeg -i input.mp3 -ar 8000 -ac 1 -sample_fmt s16 output.wav
```

### Using Azure TTS (Direct 8kHz)

```bash
curl -X POST "https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  -H "Content-Type: application/ssml+xml" \
  -d '<speak version="1.0" xml:lang="en-US">
        <voice name="en-IN-NeerjaNeural">
          <prosody rate="1.2">Thank you for calling. Goodbye!</prosody>
        </voice>
      </speak>' \
  --output goodbye-en.wav
```

---

## Redis Session Storage

For production with multiple instances:

### Configuration

```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
SESSION_TTL=3600           # 1 hour
SESSION_CLEANUP_INTERVAL=300  # 5 minutes
```

### Benefits

- Session persistence across restarts
- Multiple server instances
- Automatic cleanup of expired sessions
- Faster than file-based storage

---

## License System

The application includes a license verification system.

### Configuration

```bash
# License key
ASSIST_LICENSE_KEY=your-license-key

# NTP server for time verification
NTP_SERVER=pool.ntp.org

# Local time tolerance (seconds)
LOCAL_TIME_TOLERANCE=300

# Maximum concurrent calls
MAX_CONCURRENT_CALLS=10
```

### License Check Flow

```
1. Verify license key format
2. Check NTP time (prevent clock manipulation)
3. Validate expiration date
4. Enforce concurrent call limit
```

---

## Circuit Breaker

Error recovery pattern for LLM providers:

### How It Works

```
States:
CLOSED     - Normal operation
OPEN       - Too many errors, rejecting requests
HALF_OPEN  - Testing recovery

Flow:
Error → Count++ → If count >= threshold → OPEN
OPEN → Wait 30s → HALF_OPEN → Test
Success → CLOSED | Failure → OPEN
```

### Benefits

- Prevents cascade failures
- Automatic recovery
- Graceful degradation
- Resource protection

---

## HTTP API Security

### IP Whitelisting

Restrict HTTP API access to specific IP addresses or ranges.

### Configuration

```bash
# Comma-separated list of allowed IPs
HTTP_ALLOWED_IPS=127.0.0.1,192.168.1.0/24,10.0.0.5

# Trust X-Forwarded-For header (enable if behind reverse proxy)
HTTP_TRUST_PROXY=false
```

### Supported Formats

| Format | Example | Description |
|--------|---------|-------------|
| Exact IP | `192.168.1.100` | Single IP address |
| CIDR notation | `192.168.1.0/24` | IP range (256 addresses) |
| Localhost | `127.0.0.1` | Local machine only |

### CIDR Quick Reference

| CIDR | Range Size | Example |
|------|------------|---------|
| /32 | 1 IP | `10.0.0.5/32` - Single host |
| /24 | 256 IPs | `192.168.1.0/24` - Class C subnet |
| /16 | 65,536 IPs | `10.0.0.0/16` - Class B subnet |
| /8 | 16M IPs | `10.0.0.0/8` - Class A subnet |

### Behind Reverse Proxy (Nginx/Apache)

When VEXYL is behind a reverse proxy, enable proxy trust:

```bash
HTTP_TRUST_PROXY=true
HTTP_ALLOWED_IPS=your-actual-client-ips
```

**Nginx configuration:**
```nginx
location / {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Security Behavior

- **Whitelist not configured**: All IPs allowed (backward compatible)
- **Whitelist configured**: Only matching IPs can access HTTP endpoints
- **Blocked request**: Returns 403 Forbidden with JSON error

**Blocked Response:**
```json
{
  "error": "Forbidden",
  "message": "IP address not allowed"
}
```

**Log Output:**
```
🚫 AUTH: Blocked request from 203.0.113.50 for POST /outbound/initiate
```

### Production Recommendations

**Internal Network Only:**
```bash
HTTP_ALLOWED_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

**Specific Servers:**
```bash
HTTP_ALLOWED_IPS=10.0.1.5,10.0.1.6,10.0.1.7
```

**Behind Load Balancer:**
```bash
HTTP_TRUST_PROXY=true
HTTP_ALLOWED_IPS=your-office-ip,your-datacenter-range/24
```

---

## WebSocket Rate Limiting

Limit concurrent WebSocket audio connections per IP address.

### Configuration

```bash
# Max audio WebSocket connections per IP (0 = unlimited)
WEBSOCKET_AUDIO_MAX_PER_IP=10
```

### Behavior

- Prevents single IP from overwhelming the server
- Browser SDK connections are rate-limited
- AudioSocket connections (Asterisk) are not affected
- Returns error message when limit exceeded

---

## Audio Processing

### Audio Format Requirements

All audio in the system follows this specification:

| Parameter | Value |
|-----------|-------|
| Sample Rate | 8000 Hz (Asterisk) ↔ 16000 Hz (STT/TTS) |
| Channels | Mono (1 channel) |
| Bit Depth | 16-bit signed PCM |
| Format | Raw PCM or WAV |

### Automatic Resampling

```
Asterisk (8kHz) → Resampler → STT Provider (16kHz)
TTS Provider (16kHz) → Resampler → Asterisk (8kHz)
```

### Buffer Management

```bash
# Maximum audio buffer duration before forced flush
MAX_BUFFER_DURATION=3000

# Process audio immediately when buffer is ready
ENABLE_IMMEDIATE_PROCESSING=true
```

---

## Latency Tracking

Built-in latency measurement for performance monitoring.

### Metrics Tracked

| Metric | Description |
|--------|-------------|
| STT Latency | Time from audio received to transcript |
| LLM Latency | Time from transcript to AI response |
| TTS Latency | Time from text to audio generation |
| Total Latency | End-to-end response time |

### Log Output Example

```
📊 LATENCY: STT=450ms LLM=380ms TTS=220ms Total=1050ms
```

### Optimization Tips

- Use Groq STT for faster transcription
- Use Deepgram TTS for lowest TTS latency
- Enable TTS caching for repeated phrases
- Use `static` greeting mode for outbound calls

---

## Provider Failover

Automatic failover when primary provider fails.

### Configuration

```bash
# Fallback STT provider
STT_FALLBACK_PROVIDER=groq

# Fallback TTS provider
TTS_FALLBACK_PROVIDER=google
```

### Failover Flow

```
Primary Provider → Error
        ↓
Circuit Breaker Opens
        ↓
Switch to Fallback Provider
        ↓
Continue Processing
        ↓
Retry Primary After Cooldown
```

---

## Debug Mode

Enable verbose logging for troubleshooting.

### Configuration

```bash
# Enable debug logging
DEBUG=true

# Log audio processing details
DEBUG_AUDIO=true

# Log VAD decisions
DEBUG_VAD=true

# Log API requests/responses
DEBUG_API=true
```

### Debug Output Includes

- Audio buffer sizes and timing
- VAD speech detection events
- Provider API calls and responses
- Session lifecycle events
- Error stack traces

---

## Health Monitoring

### Health Check Endpoint

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "activeSessions": 5,
  "version": "1.0.0"
}
```

### Monitoring Integration

Use with monitoring systems:

```bash
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 8081
  initialDelaySeconds: 10
  periodSeconds: 30

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8081/health || exit 1
```

