# Asterisk Integration

This guide covers integrating VEXYL AI Voice Gateway with Asterisk PBX using the AudioSocket protocol.

## Overview

VEXYL connects to Asterisk using AudioSocket, a bidirectional audio streaming protocol that sends 8kHz PCM audio over TCP.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Asterisk PBX                             │
│                                                                  │
│  Incoming Call → Dialplan → AudioSocket() → TCP Connection       │
│                                                   ↓               │
└──────────────────────────────────────────────────│───────────────┘
                                                   │
                                                   │ Port 8080
                                                   ↓
┌──────────────────────────────────────────────────────────────────┐
│                     VEXYL AI Voice Gateway                       │
│                                                                  │
│  AudioSocket Server → STT → LLM → TTS → AudioSocket Client       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. Asterisk 16.x or higher with AudioSocket support
2. VEXYL AI Voice Gateway installed and running
3. Network connectivity between Asterisk and VEXYL

## Asterisk Configuration

### Basic Dialplan

Add to `/etc/asterisk/extensions.conf`:

```ini
[voice-assistant]
; Basic voice assistant extension
exten => 100,1,Answer()
exten => 100,n,Set(SESSION_UUID=${UNIQUEID})
exten => 100,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => 100,n,Hangup()
```

### Enhanced Dialplan with Metadata

For caller information and session tracking:

```ini
[vexyl-enhanced]
; Enhanced dialplan with caller metadata
exten => _X.,1,Answer()
exten => _X.,n,NoOp(Incoming call from ${CALLERID(num)} to ${EXTEN})
exten => _X.,n,Set(SESSION_UUID=${UNIQUEID})
exten => _X.,n,Set(CALLER_ID=${CALLERID(num)})
exten => _X.,n,Set(CALLER_NAME=${CALLERID(name)})

; Store session metadata via HTTP API
exten => _X.,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,callerid=${CALLER_ID}&name=${CALLER_NAME}&channel=${CHANNEL})})

; Connect to VEXYL
exten => _X.,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => _X.,n,Hangup()
```

### Multi-Language Support

Route calls to different languages based on dialed number:

```ini
[language-routing]
; English voice assistant
exten => 100,1,Answer()
exten => 100,n,Set(SESSION_UUID=${UNIQUEID})
exten => 100,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,callerid=${CALLERID(num)}&language_code=en-IN&channel=${CHANNEL})})
exten => 100,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => 100,n,Hangup()

; Hindi voice assistant
exten => 101,1,Answer()
exten => 101,n,Set(SESSION_UUID=${UNIQUEID})
exten => 101,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,callerid=${CALLERID(num)}&language_code=hi-IN&channel=${CHANNEL})})
exten => 101,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => 101,n,Hangup()

; Malayalam voice assistant
exten => 102,1,Answer()
exten => 102,n,Set(SESSION_UUID=${UNIQUEID})
exten => 102,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,callerid=${CALLERID(num)}&language_code=ml-IN&channel=${CHANNEL})})
exten => 102,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => 102,n,Hangup()
```

### IVR Integration

Combine with IVR for language selection:

```ini
[ivr-main]
exten => 200,1,Answer()
exten => 200,n,Set(SESSION_UUID=${UNIQUEID})

; Welcome message
exten => 200,n,Playback(welcome)

; Language selection IVR
exten => 200,n,Background(press-1-english&press-2-hindi)
exten => 200,n,WaitExten(5)

; Default to English
exten => 200,n,Goto(voice-en,${EXTEN},1)

exten => 1,1,Goto(voice-en,${SESSION_UUID},1)
exten => 2,1,Goto(voice-hi,${SESSION_UUID},1)

[voice-en]
exten => _.,1,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,language_code=en-IN&callerid=${CALLERID(num)}&channel=${CHANNEL})})
exten => _.,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => _.,n,Hangup()

[voice-hi]
exten => _.,1,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,language_code=hi-IN&callerid=${CALLERID(num)}&channel=${CHANNEL})})
exten => _.,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => _.,n,Hangup()
```

## VEXYL Configuration

### Server Settings

```bash
# AudioSocket server bind address and port
AUDIOSOCKET_HOST=127.0.0.1
AUDIOSOCKET_PORT=8080

# HTTP API for session metadata
HTTP_HOST=127.0.0.1
HTTP_PORT=8081
```

### Firewall Rules

If Asterisk and VEXYL are on different servers:

```bash
# On VEXYL server
sudo ufw allow from ASTERISK_IP to any port 8080  # AudioSocket
sudo ufw allow from ASTERISK_IP to any port 8081  # HTTP API
```

## Session Metadata

### Storing Metadata

The dialplan can store caller information via HTTP:

```bash
curl -X POST "http://127.0.0.1:8081/session/${UUID}/metadata" \
  -d "callerid=+919876543210&name=John&language_code=en-IN&channel=PJSIP/100-00000001"
```

### Retrieving Metadata

```bash
curl "http://127.0.0.1:8081/session/${UUID}/metadata"
```

### Available Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| callerid | Caller phone number | +919876543210 |
| name | Caller name | John Doe |
| channel | Asterisk channel | PJSIP/100-00000001 |
| language_code | Language selection | en-IN, hi-IN, ml-IN |
| custom_* | Any custom field | custom_campaign=promo2024 |

### Why Channel Metadata Matters

Storing the Asterisk `${CHANNEL}` enables:

1. **HITL Transfer**: LLM can escalate calls to human agents
2. **Graceful Hangup**: LLM can end calls when task is complete
3. **Call Recording**: Associate recordings with sessions
4. **Analytics**: Track call metrics

---

## Call Transfer (HITL)

### Setup

1. **Configure Transfer Endpoint**:

```bash
TRANSFER_ENABLED=true
TRANSFER_ENDPOINT=http://127.0.0.1/transfer.php
TRANSFER_TIMEOUT=5000
```

2. **Create Asterisk Agent Queue**:

Add to `/etc/asterisk/extensions_custom.conf`:

```ini
[agent-queue]
exten => 7000,1,NoOp(Call transferred from AI assistant)
exten => 7000,n,Answer()
exten => 7000,n,Queue(support-queue,t,,,300)
exten => 7000,n,Voicemail(7000@default,u)
exten => 7000,n,Hangup()
```

3. **Create Transfer Webhook** (PHP example):

```php
<?php
// transfer.php
$data = json_decode(file_get_contents('php://input'), true);

$channel = $data['channel'];
$callerid = $data['callerid'];
$uuid = $data['uuid'];

// Execute AMI redirect
$ami = fsockopen('localhost', 5038, $errno, $errstr, 5);
if ($ami) {
    fwrite($ami, "Action: Login\r\nUsername: admin\r\nSecret: password\r\n\r\n");
    fwrite($ami, "Action: Redirect\r\nChannel: $channel\r\nContext: agent-queue\r\nExten: 7000\r\nPriority: 1\r\n\r\n");
    fwrite($ami, "Action: Logoff\r\n\r\n");
    fclose($ami);
    http_response_code(200);
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'AMI connection failed']);
}
?>
```

4. **Configure AMI** in `/etc/asterisk/manager.conf`:

```ini
[admin]
secret=password
read=call,reporting
write=call,originate
```

---

## Outbound Calls

### Configuration

```bash
OUTBOUND_ENABLED=true
OUTBOUND_ORIGINATE_ENDPOINT=http://127.0.0.1/originate.php
OUTBOUND_TIMEOUT=10000
OUTBOUND_GREETING_MODE=static  # static, dynamic, hybrid, wait
```

### Dialplan for Outbound

Add to `/etc/asterisk/extensions.conf`:

```ini
[ai-outbound]
exten => s,1,NoOp(AI Outbound Call: ${SESSION_UUID})
exten => s,n,Answer()
exten => s,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,channel=${CHANNEL})})
exten => s,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => s,n,Hangup()
```

### Create Originate Webhook (PHP example):

```php
<?php
// originate.php
$data = json_decode(file_get_contents('php://input'), true);

$sessionUuid = $data['sessionUuid'];
$phoneNumber = $data['phoneNumber'];
$language = $data['language'] ?? 'en-IN';

// Execute AMI originate
$ami = fsockopen('localhost', 5038, $errno, $errstr, 5);
if ($ami) {
    fwrite($ami, "Action: Login\r\nUsername: admin\r\nSecret: password\r\n\r\n");
    fwrite($ami, "Action: Originate\r\n");
    fwrite($ami, "Channel: PJSIP/$phoneNumber@trunk\r\n");
    fwrite($ami, "Context: ai-outbound\r\n");
    fwrite($ami, "Exten: s\r\n");
    fwrite($ami, "Priority: 1\r\n");
    fwrite($ami, "Async: true\r\n");
    fwrite($ami, "Variable: SESSION_UUID=$sessionUuid\r\n");
    fwrite($ami, "\r\n");
    fwrite($ami, "Action: Logoff\r\n\r\n");
    fclose($ami);

    http_response_code(200);
    echo json_encode(['success' => true, 'sessionUuid' => $sessionUuid]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'AMI connection failed']);
}
?>
```

### Triggering Outbound Calls

```bash
curl -X POST "http://127.0.0.1:8081/outbound/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "language": "en-IN",
    "metadata": {
      "botId": "sales-bot",
      "campaign_id": "promo-2024",
      "customer_name": "John Doe"
    }
  }'
```

---

## Audio Codec Configuration

### Asterisk Codec Settings

AudioSocket uses raw PCM, but calls may use different codecs:

```ini
; /etc/asterisk/pjsip.conf
[endpoint-template](!)
type=endpoint
transport=transport-udp
context=default
disallow=all
allow=ulaw
allow=alaw
```

### Audio Format Notes

| Stage | Format | Sample Rate |
|-------|--------|-------------|
| Asterisk Internal | G.711 (ulaw/alaw) | 8kHz |
| AudioSocket | Raw PCM | 8kHz |
| AI Voice Gateway | PCM | 8kHz → 16kHz (STT) |
| TTS Output | PCM | 8kHz |

---

## Troubleshooting

### Check Asterisk AudioSocket Support

```bash
asterisk -rx "module show like app_audiosocket"
```

Expected output:
```
Module                         Description                              Use Count  Status
app_audiosocket.so             AudioSocket Application                  0          Running
```

### Monitor Active Channels

```bash
asterisk -rx "core show channels"
```

### Check AudioSocket Connection

```bash
# Watch for AudioSocket connections
tail -f /var/log/asterisk/messages | grep AudioSocket
```

### Test TCP Connection

```bash
# From Asterisk server
telnet AI_VOICE_GATEWAY_IP 8080
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "AudioSocket connection failed" | Port blocked | Check firewall rules |
| "Channel not found" | Wrong channel format | Verify ${CHANNEL} variable |
| "Session not found" | UUID mismatch | Check CURL metadata call |
| No audio | Codec mismatch | Ensure PCM format |
| One-way audio | NAT issues | Check RTP ports |

### Debug Logging

Enable verbose logging in Asterisk:

```bash
# In Asterisk CLI
core set debug 5
core set verbose 5
```

In AI Voice Gateway:

```bash
# Add to .env
DEBUG=true
```

---

## Best Practices

### 1. Use Session UUIDs

Always use `${UNIQUEID}` for session tracking:

```ini
exten => 100,n,Set(SESSION_UUID=${UNIQUEID})
```

### 2. Store Channel Information

Always capture `${CHANNEL}` for transfers:

```ini
exten => 100,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/metadata,channel=${CHANNEL})})
```

### 3. Handle Hangups Gracefully

Add hangup handler:

```ini
exten => h,1,NoOp(Call ${SESSION_UUID} ended)
exten => h,n,Set(CURL_RESULT=${CURL(http://127.0.0.1:8081/session/${SESSION_UUID}/hangup)})
```

### 4. Monitor Call Quality

Use Asterisk CDR for call analytics:

```bash
asterisk -rx "cdr show status"
```

### 5. Failover Configuration

Add fallback when AI Voice Gateway is unavailable:

```ini
exten => 100,1,Answer()
exten => 100,n,Set(SESSION_UUID=${UNIQUEID})
exten => 100,n,TryExec(AudioSocket(${SESSION_UUID},127.0.0.1:8080))
exten => 100,n,GotoIf($[${DIALSTATUS}=FAILED]?fallback,1)
exten => 100,n,Hangup()

exten => fallback,1,Playback(sorry-unavailable)
exten => fallback,n,Queue(support-queue)
exten => fallback,n,Hangup()
```
