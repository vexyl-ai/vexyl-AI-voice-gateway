# Outbound Calls

Webhook-based outbound calling system that triggers calls via external AMI scripts. Uses the same webhook pattern as HITL transfer to keep AMI configuration external to the application.

## Architecture Overview

**Design Philosophy**:
- Webhook-based (AMI/Asterisk dialing logic in user's script, not in application)
- Cold start solution (immediate greeting, no LLM delay)
- Dynamic bot IDs (already supported via session metadata)
- LLM pre-warming with full context injection
- Reuses 100% of inbound audio pipeline

**Call Flow**:
```
External System → POST /outbound/initiate → App creates session →
POST originate webhook → User's AMI script dials →
Asterisk connects to AudioSocket → App plays greeting + LLM pre-warm →
LLM greeting plays → Normal conversation (identical to inbound)
```

## Configuration

```bash
# Enable outbound calls
OUTBOUND_ENABLED=true
OUTBOUND_ORIGINATE_ENDPOINT=http://127.0.0.1:8082/originate.php
OUTBOUND_TIMEOUT=10000

# Greeting mode (static/dynamic/hybrid/wait)
OUTBOUND_GREETING_MODE=dynamic

# Static mode: Pre-recorded WAV files (8kHz, 16-bit, mono, PCM)
OUTBOUND_STATIC_AUDIO_EN=/opt/assist/audio/outbound-en.wav
OUTBOUND_STATIC_AUDIO_ML=/opt/assist/audio/outbound-ml.wav
OUTBOUND_STATIC_AUDIO_HI=/opt/assist/audio/outbound-hi.wav

# Dynamic mode: Text-to-speech greetings (initial greeting before LLM)
OUTBOUND_DEFAULT_GREETING_EN=Hello, this is VEXYL AI calling.
OUTBOUND_DEFAULT_GREETING_ML=നമസ്കാരം, ഇത് VEXYL AI ആണ്.
OUTBOUND_DEFAULT_GREETING_HI=नमस्ते, यह VEXYL AI है।
```

See `.env.outbound-example` for complete configuration.

## Greeting Modes (Solving Cold Start Problem)

**Problem**: LLM initialization takes 2-5 seconds, creating awkward silence when call is answered.

**Solution**: Play immediate greeting while LLM is called in parallel, then play LLM's context-aware response.

| Mode | Initial Latency | LLM Used | Description | Use Case |
|------|-----------------|----------|-------------|----------|
| **static** | <200ms | No | Pre-recorded WAV plays immediately | Simple announcements |
| **dynamic** | 500-1000ms | Yes (parallel) | Initial TTS + LLM context-aware greeting | **Recommended** - personalized outbound |
| **hybrid** | <200ms | Yes | Static intro + LLM context | Best UX with fast start |
| **wait** | 2-5 seconds | No | Silent until user speaks | Testing only |

### Dynamic Mode (Recommended)

The `dynamic` mode provides the best balance of speed and personalization:

1. **Immediate Response**: Plays initial greeting via TTS instantly
2. **Parallel LLM Call**: While greeting plays, calls LLM with full customer context
3. **Context-Aware Follow-up**: Plays LLM's personalized greeting after initial message
4. **Session Persistence**: LLM session ID is preserved for entire conversation

**Timeline**:
```
T=0ms:      Call answered
T=0ms:      Start "Hello Sir" (TTS) + Start LLM pre-warm (PARALLEL)
T=800ms:    Initial greeting finishes playing
T=1500ms:   LLM responds with context-aware greeting
T=1500ms:   Play LLM greeting ("നമസ്കാരം, survey...")
T=~5000ms:  User responds "ഓക്കേ"
T=~6200ms:  LLM responds with next question (same session, has full context)
```

## HTTP API

### `POST /outbound/initiate`

Trigger new outbound call with full customization.

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | string | Yes | Destination phone number |
| `language` | string | No | Language code (default: `ml-IN`) |
| `greetingMode` | string | No | `static`, `dynamic`, `hybrid`, `wait` |
| `initialGreeting` | string | No | Custom initial greeting text |
| `audioFile` | string | No | Path to pre-recorded WAV file |
| `webhookUrl` | string | No | URL for status callbacks |
| `metadata` | object | No | Custom metadata (see below) |

**Metadata Fields**:

| Field | Description | Used By |
|-------|-------------|---------|
| `botId` | LLM bot ID for routing | Litebot, n8n |
| `caller_name` | Customer name | LLM greeting, context |
| `llm_context` | Background context for LLM | All LLM providers |
| `language_code` | Language override | TTS, STT |
| Any custom field | Passed to LLM in pre-warm | All LLM providers |

**Full Request Example**:
```json
{
  "phoneNumber": "+919876543210",
  "language": "ml-IN",
  "greetingMode": "dynamic",
  "initialGreeting": "Hello, this is AI calling.",
  "webhookUrl": "http://your-server/status-callback",
  "metadata": {
    "botId": "kerala-election-survey",
    "caller_name": "John Doe",
    "llm_context": "Election survey call. Customer is a registered voter in Trivandrum constituency.",
    "account_id": "ACC123456",
    "pending_amount": 5000,
    "due_date": "2024-12-05",
    "campaign_id": "survey-2024",
    "priority": "high"
  }
}
```

**Response**:
```json
{
  "sessionUuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initiated",
  "message": "Outbound call webhook triggered successfully"
}
```

### `GET /outbound/status/{uuid}`

Query call status.

**Response**:
```json
{
  "sessionUuid": "550e8400-...",
  "status": "answered",
  "phoneNumber": "+919876543210",
  "language": "ml-IN",
  "initiatedAt": "2025-11-23T12:00:00.000Z",
  "answeredAt": "2025-11-23T12:00:15.000Z",
  "completedAt": null
}
```

### `POST /outbound/cancel/{uuid}`

Cancel pending/ringing call (requires AMI implementation in webhook).

## LLM Pre-warming

When using `dynamic` or `hybrid` mode, the system pre-warms the LLM with full customer context. This enables personalized, context-aware conversations from the first response.

### What the LLM Receives

```
[OUTBOUND CALL INITIATED]

Customer Information:
- Name: John Doe
- Phone: +919876543210
- Language: ml-IN

Call Context:
Election survey call. Customer is a registered voter in Trivandrum constituency.

Additional Data:
- account_id: ACC123456
- pending_amount: 5000
- due_date: 2024-12-05
- campaign_id: survey-2024
- priority: high

Greet the customer appropriately based on above context and start the conversation.
```

### Benefits

1. **Personalized Greeting**: LLM knows customer name, context, and purpose
2. **Faster Subsequent Responses**: Session is already established
3. **Full Context Available**: All metadata is injected into conversation
4. **No Repeated Greetings**: LLM knows it already greeted the customer

## Dynamic Bot IDs

Route calls to different bots based on campaign or purpose.

**Example - Survey Bot**:
```json
{
  "phoneNumber": "+919876543210",
  "metadata": {
    "botId": "kerala-election-survey",
    "llm_context": "Conduct election preference survey"
  }
}
```

**Example - Payment Reminder Bot**:
```json
{
  "phoneNumber": "+919876543210",
  "metadata": {
    "botId": "payment-reminder",
    "llm_context": "Customer has pending payment of ₹5000",
    "pending_amount": 5000,
    "due_date": "2024-12-05"
  }
}
```

**Example - Customer Support Bot**:
```json
{
  "phoneNumber": "+919876543210",
  "metadata": {
    "botId": "customer-support",
    "caller_name": "John Doe",
    "llm_context": "Customer called earlier about order #12345"
  }
}
```

## Webhook Implementation

See [WEBHOOK_EXAMPLES.md](./WEBHOOK_EXAMPLES.md) for PHP, Node.js, and Python examples.

### Originate Webhook (Required)

Application calls this webhook to trigger call. User implements AMI logic.

**Request payload**:
```json
{
  "sessionUuid": "550e8400-...",
  "phoneNumber": "+919876543210",
  "language": "ml-IN"
}
```

### Status Callback Webhook (Optional)

Application fires webhooks to user's URL on call lifecycle events.

**Events**:
- `initiated` - Call creation triggered
- `answered` - User picked up, greeting played
- `completed` - Call ended normally
- `failed` - Call failed (no answer, busy, etc.)

## Asterisk Dialplan

Add outbound context to `/etc/asterisk/extensions.conf`:

```
[ai-outbound]
exten => s,1,NoOp(AI Outbound Call: ${SESSION_UUID})
exten => s,n,Answer()
exten => s,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,channel=${CHANNEL})})
exten => s,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => s,n,Hangup()
```

**IMPORTANT**: The `CURL` line captures the Asterisk channel ID into session metadata. This enables:
- **HITL transfer** - LLM can escalate calls to human agents (requires channel ID)
- **LLM-controlled hangup** - LLM can end calls gracefully
- **Call tracking** - Channel info stored for debugging/analytics

## Asterisk AMI Configuration

Add AMI user in `/etc/asterisk/manager.conf`:

```
[outbound_ai]
secret=your_password
read=call,reporting,dialplan
write=call,originate
```

## Creating Audio Greeting Files

Pre-recorded WAV files must be **8kHz, 16-bit, mono, PCM**.

**Using FFmpeg**:
```bash
ffmpeg -i input.mp3 -ar 8000 -ac 1 -sample_fmt s16 outbound-ml.wav
```

See `audio/OUTBOUND_GREETINGS.md` for complete guide.

## LLM Context Injection (Legacy)

On first user message in outbound calls, app also injects `llm_context` from metadata:

```javascript
// API Request
{
  "phoneNumber": "+919876543210",
  "metadata": {
    "llm_context": "Customer ordered product #12345, shipment delayed"
  }
}

// LLM receives on first user speech:
// [SYSTEM NOTE: This is an outbound call. Background context:
//  Customer ordered product #12345, shipment delayed]
// User: "Hello?"
```

**Note**: With `dynamic` mode, context is already injected during pre-warm, so this is redundant but harmless.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 403 Forbidden | Set `OUTBOUND_ENABLED=true` |
| No webhook configured | Set `OUTBOUND_ORIGINATE_ENDPOINT` |
| Webhook timeout | Increase `OUTBOUND_TIMEOUT`, check AMI connectivity |
| No audio greeting | Create WAV files or set dynamic greeting text |
| Wrong bot used | Pass `botId` in metadata |
| Long delay on answer | Use `dynamic` mode (parallel greeting + LLM) |
| Transfer not working | Add `CURL` line to dialplan to capture channel ID |
| LLM greeting not playing | Check `greetingMode=dynamic` is set |
| LLM repeating greeting | Session ID preserved - check logs for mismatch |

## Performance Benchmarks

| Greeting Mode | Time to First Audio | Time to LLM Greeting | Flexibility | Cost |
|---------------|---------------------|----------------------|-------------|------|
| **Static** | <200ms | N/A | Low | None (one-time recording) |
| **Dynamic** | 500-1000ms | 1500-2500ms | High | TTS + LLM per call |
| **Hybrid** | <200ms | 1500-2500ms | High | TTS + LLM per call |
| **Wait** | 2-5 seconds | N/A | High | None |

**Industry Comparison**:
- Vapi: 500ms average
- Bland: <500ms
- Retell: 500ms target
- **This system**: <200ms (static), 500-1000ms (dynamic initial), 1500-2500ms (full LLM greeting)

## Best Practices

1. **Use `dynamic` mode** for personalized outbound campaigns
2. **Always pass `botId`** to route to correct LLM bot
3. **Include `llm_context`** with relevant customer information
4. **Use `caller_name`** for personalized greetings
5. **Add custom metadata** for business logic (account_id, pending_amount, etc.)
6. **Set up status webhooks** for call tracking and analytics
7. **Test with `wait` mode** during development to debug LLM responses