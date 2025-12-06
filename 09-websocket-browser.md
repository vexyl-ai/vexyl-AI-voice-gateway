# WebSocket Browser Integration

This guide covers using VEXYL AI Voice Gateway through web browsers via the WebSocket audio interface.

## Overview

The WebSocket audio server enables browser-based voice assistants using the same STT/LLM/TTS pipeline as Asterisk connections.

### Architecture

```
┌────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│      Browser       │     │  WebSocket Audio    │     │ Standard Pipeline│
│  (WebM/Opus audio) │────▶│      Server         │────▶│  (STT/LLM/TTS)   │
│  + AIVG SDK        │     │    (Port 8082)      │     │                  │
└────────────────────┘     └─────────────────────┘     └──────────────────┘
         ▲                          │                          │
         │                          │                          │
         └──────────────────────────┴──────────────────────────┘
                         PCM Audio Response
```

## Server Configuration

### Enable WebSocket Server

```bash
# Enable WebSocket audio server
WEBSOCKET_AUDIO_ENABLED=true

# Server address
WEBSOCKET_AUDIO_HOST=0.0.0.0
WEBSOCKET_AUDIO_PORT=8082
```

### Security Settings

```bash
# Allowed origins (comma-separated)
# Empty = accept all origins (development only)
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://app.example.com,https://demo.example.com

# Wildcard subdomain support
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=*.example.com,https://internal.company.com

# API key authentication (optional)
WEBSOCKET_AUDIO_API_KEY=your_secret_api_key

# Rate limiting per IP address
WEBSOCKET_AUDIO_MAX_PER_IP=5
```

### Complete Example

```bash
WEBSOCKET_AUDIO_ENABLED=true
WEBSOCKET_AUDIO_HOST=0.0.0.0
WEBSOCKET_AUDIO_PORT=8082
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
WEBSOCKET_AUDIO_API_KEY=secure_random_key_here
WEBSOCKET_AUDIO_MAX_PER_IP=3
```

---

## Browser SDK

### Installation

Include the SDK in your HTML from the VEXYL server:

```html
<script src="http://your-vexyl-server:8081/aivg-sdk.js"></script>
```

Or download the SDK file from the VEXYL server and host it on your own server.

### Basic Usage

```javascript
// Create client instance
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082',
    language: 'en-IN',
    autoGreet: true,              // AI speaks first (optional)
    greetingMessage: 'hi',        // Message to trigger AI greeting

    onConnect: ({ uuid }) => {
        console.log('Connected! Session:', uuid);
    },

    onTranscript: (text, { isFinal }) => {
        console.log('User said:', text, isFinal ? '(final)' : '(interim)');
    },

    onResponse: (text) => {
        console.log('AI response:', text);
    },

    onStatus: (status) => {
        console.log('Status:', status);
    },

    onError: ({ code, message }) => {
        console.error('Error:', code, message);
    }
});

// Connect and start
await voice.connect();
await voice.startListening();
```

### Complete Options

```javascript
const voice = new AIVoiceGateway({
    // Required
    serverUrl: 'wss://voice.example.com:8082',

    // Language
    language: 'en-IN',           // Default language

    // Authentication
    apiKey: 'your_api_key',      // If server requires auth

    // Auto-Greeting (AI speaks first)
    autoGreet: true,             // Enable auto-greeting (default: false)
    greetingMessage: 'hi',       // Message sent to LLM (default: 'hi')

    // Custom metadata
    metadata: {
        userId: 'user-123',
        source: 'mobile-app',
        campaign: 'support'
    },

    // Auto-reconnection
    autoReconnect: true,         // Enable auto-reconnect (default: true)
    maxReconnectAttempts: 5,     // Max attempts (default: 5)
    reconnectDelay: 1000,        // Base delay in ms (default: 1000)

    // Callbacks
    onConnect: ({ uuid }) => {},
    onDisconnect: ({ code, reason }) => {},
    onTranscript: (text, { isFinal }) => {},
    onResponse: (text) => {},
    onAudio: (audioData) => {},
    onStatus: (status) => {},
    onError: ({ code, message }) => {},
    onHangup: ({ reason }) => {}
});
```

---

## Auto-Greeting (AI Speaks First)

Enable `autoGreet` to have the AI speak first when a user connects. This solves the "cold start" problem where users don't know what to do after connecting.

### Configuration

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082',
    language: 'en-IN',
    autoGreet: true,              // Enable auto-greeting
    greetingMessage: 'hello',     // Custom greeting text (default: 'hi')
    // ... callbacks
});

await voice.connect();
// AI will automatically respond with a greeting
```

### How It Works

```
1. Browser connects → receives UUID
2. SDK automatically sends { type: 'greeting', text: 'hi' }
3. Server processes greeting (bypasses STT, sends directly to LLM)
4. LLM responds with greeting
5. TTS plays greeting audio
6. User hears AI and knows they can speak
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoGreet` | boolean | `false` | Enable auto-greeting on connect |
| `greetingMessage` | string | `'hi'` | Message sent to LLM for greeting |

### Customizing the Greeting

The AI's response depends on your LLM configuration. To customize:

1. **In your LLM system prompt**, define how to respond to greetings
2. **Change `greetingMessage`** to trigger different responses:
   ```javascript
   greetingMessage: 'start survey'  // For survey bots
   greetingMessage: 'hello'         // For general greeting
   greetingMessage: 'help'          // For support bots
   ```

### Demo Page Toggle

The `demo.html` page includes a checkbox to enable/disable auto-greeting:
- Checked: AI speaks first when you connect
- Unchecked: Traditional mode - user speaks first

---

## SDK Methods

### Connection

```javascript
// Connect to server
await voice.connect();

// Disconnect
voice.disconnect();

// Check connection status
if (voice.isConnected) {
    console.log('Connected');
}
```

### Audio Control

```javascript
// Start listening (requests microphone permission)
await voice.startListening();

// Stop listening
voice.stopListening();

// Mute microphone (stops sending audio)
voice.mute();

// Unmute microphone
voice.unmute();
```

### Configuration

```javascript
// Change language mid-session
voice.setLanguage('hi-IN');

// Update metadata
voice.updateMetadata({
    currentPage: '/checkout',
    cartValue: 99.99
});

// Get current status
const status = voice.getStatus();
// { isConnected, isListening, isMuted, uuid, language }
```

### Audio Visualization

```javascript
// Get analyser for visualization
const analyser = voice.getAnalyser();

// Get frequency data (for waveforms, etc.)
const frequencyData = voice.getFrequencyData();
if (frequencyData) {
    // Use in canvas visualization
    drawWaveform(frequencyData);
}

// Check if audio is playing
if (voice.isAudioPlaying()) {
    console.log('AI is speaking');
}
```

### Keep-Alive

```javascript
// Send ping to keep connection alive
setInterval(() => {
    voice.ping();
}, 30000);
```

---

## Callbacks Reference

### onConnect

Called when successfully connected to the server.

```javascript
onConnect: ({ uuid }) => {
    console.log('Session UUID:', uuid);
    document.getElementById('status').textContent = 'Connected';
}
```

### onDisconnect

Called when disconnected from the server.

```javascript
onDisconnect: ({ code, reason }) => {
    console.log(`Disconnected: ${code} - ${reason}`);
    // code 1000 = normal closure
    // code 4001 = invalid API key
    // code 4003 = call limit reached
}
```

### onTranscript

Called with speech-to-text results.

```javascript
onTranscript: (text, { isFinal }) => {
    if (isFinal) {
        addToConversation('user', text);
    } else {
        updateInterimText(text);
    }
}
```

### onResponse

Called with AI response text.

```javascript
onResponse: (text) => {
    addToConversation('ai', text);
}
```

### onAudio

Called when audio data is received (audio plays automatically).

```javascript
onAudio: (audioData) => {
    // audioData is ArrayBuffer of PCM audio
    // Already played by SDK, this is for additional processing
    console.log('Audio received:', audioData.byteLength, 'bytes');
}
```

### onStatus

Called with status updates.

```javascript
onStatus: (status) => {
    // status values: 'ready', 'listening', 'processing', 'speaking', 'ended'
    updateStatusUI(status);
}
```

### onError

Called when an error occurs.

```javascript
onError: ({ code, message }) => {
    // Error codes:
    // WS_ERROR - WebSocket error
    // MIC_ERROR - Microphone access error
    // RECORDER_ERROR - Recording error
    // INVALID_API_KEY - Invalid API key
    // LIMIT_REACHED - Call limit reached
    showError(message);
}
```

### onHangup

Called when the AI assistant ends the call.

```javascript
onHangup: ({ reason }) => {
    console.log('Call ended:', reason);
    showEndScreen(reason);
}
```

---

## Status States

| Status | Description |
|--------|-------------|
| `ready` | Connected and ready to listen |
| `listening` | Actively listening for speech |
| `processing` | Processing speech / waiting for LLM |
| `speaking` | AI is speaking (TTS playing) |
| `ended` | Call ended by AI (shouldHangup) |

---

## WebSocket Protocol

### Connection URL

```
ws://server:8082?language=en-IN&apiKey=optional_key
```

### Client Messages (JSON)

```javascript
// Start listening
{ "type": "start", "language": "en-IN", "metadata": {} }

// Stop listening
{ "type": "stop" }

// Mute/unmute
{ "type": "mute" }
{ "type": "unmute" }

// Update configuration
{ "type": "config", "language": "hi-IN", "metadata": {} }

// Auto-greeting (AI speaks first - bypasses STT, sends directly to LLM)
{ "type": "greeting", "text": "hi" }

// Ping (keep-alive)
{ "type": "ping" }

// Audio playback complete
{ "type": "audio_playback_complete" }
```

### Client Messages (Binary)

Binary data is interpreted as audio (WebM/Opus encoded).

### Server Messages (JSON)

```javascript
// Connection established
{ "type": "connected", "uuid": "session-uuid", "timestamp": "ISO-8601" }

// Speech transcript
{ "type": "transcript", "text": "Hello", "isFinal": true }

// AI response text
{ "type": "response", "text": "Hi, how can I help?" }

// Status update
{ "type": "status", "status": "speaking" }

// Error
{ "type": "error", "code": "LIMIT_REACHED", "message": "..." }

// Ping response
{ "type": "pong", "timestamp": 1234567890 }

// Call ended by AI
{ "type": "hangup", "reason": "Task completed" }

// Connection closing
{ "type": "closed", "reason": "Server shutdown" }
```

### Server Messages (Binary)

Audio data with magic header:

```
Bytes 0-6:  'AIVGPCM' (magic bytes)
Byte 7:     Version (0x01 or 0x02)
Version 1:  Bytes 8+: PCM audio (24kHz assumed)
Version 2:  Bytes 8-11: Sample rate (uint32 LE)
            Bytes 12+: PCM audio
```

---

## Demo Pages

The installation includes ready-to-use demo pages:

### SDK Test Page (demo.html)

Full-featured test interface with:
- Server URL configuration
- Language selection
- API key input
- Connect/disconnect controls
- Start/stop listening
- Conversation log
- Status indicator

Access: `http://your-server:8081/demo.html`

### Waveform Visualizer (index.html)

Modern interface with:
- Animated waveform visualization
- Status indicators
- Clean UI

Access: `http://your-server:8081/`

### 3D Visualization (3d.html)

Interactive 3D sphere with:
- Audio-reactive animation
- Particle effects
- Modern design

Access: `http://your-server:8081/3d.html`

---

## Integration Examples

### React Component

```jsx
import { useEffect, useRef, useState } from 'react';

function VoiceAssistant() {
    const voiceRef = useRef(null);
    const [status, setStatus] = useState('disconnected');
    const [messages, setMessages] = useState([]);

    const connect = async () => {
        voiceRef.current = new AIVoiceGateway({
            serverUrl: 'wss://voice.example.com:8082',
            language: 'en-IN',

            onConnect: () => setStatus('connected'),
            onDisconnect: () => setStatus('disconnected'),
            onStatus: setStatus,

            onTranscript: (text, { isFinal }) => {
                if (isFinal) {
                    setMessages(prev => [...prev, { role: 'user', text }]);
                }
            },

            onResponse: (text) => {
                setMessages(prev => [...prev, { role: 'ai', text }]);
            }
        });

        await voiceRef.current.connect();
    };

    const startListening = () => voiceRef.current?.startListening();
    const stopListening = () => voiceRef.current?.stopListening();

    return (
        <div>
            <div>Status: {status}</div>
            <button onClick={connect}>Connect</button>
            <button onClick={startListening}>Start</button>
            <button onClick={stopListening}>Stop</button>
            {messages.map((m, i) => (
                <div key={i}>{m.role}: {m.text}</div>
            ))}
        </div>
    );
}
```

### Vue Component

```vue
<template>
    <div>
        <div>Status: {{ status }}</div>
        <button @click="connect">Connect</button>
        <button @click="startListening" :disabled="!isConnected">Start</button>
        <div v-for="(msg, i) in messages" :key="i">
            {{ msg.role }}: {{ msg.text }}
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            voice: null,
            status: 'disconnected',
            messages: [],
            isConnected: false
        };
    },

    methods: {
        async connect() {
            this.voice = new AIVoiceGateway({
                serverUrl: 'wss://voice.example.com:8082',
                language: 'en-IN',
                onConnect: () => {
                    this.status = 'connected';
                    this.isConnected = true;
                },
                onTranscript: (text, { isFinal }) => {
                    if (isFinal) {
                        this.messages.push({ role: 'user', text });
                    }
                },
                onResponse: (text) => {
                    this.messages.push({ role: 'ai', text });
                },
                onStatus: (s) => this.status = s
            });

            await this.voice.connect();
        },

        startListening() {
            this.voice?.startListening();
        }
    }
};
</script>
```

### Vanilla JavaScript Widget

```html
<div id="voice-widget">
    <button id="voice-btn">Talk to AI</button>
    <div id="voice-status">Click to start</div>
</div>

<script src="aivg-sdk.js"></script>
<script>
let voice = null;
const btn = document.getElementById('voice-btn');
const status = document.getElementById('voice-status');

btn.addEventListener('click', async () => {
    if (!voice) {
        voice = new AIVoiceGateway({
            serverUrl: 'wss://voice.example.com:8082',
            language: 'en-IN',
            onStatus: (s) => status.textContent = s,
            onResponse: (text) => {
                status.textContent = 'AI: ' + text;
            }
        });
        await voice.connect();
    }

    if (voice.isListening) {
        voice.stopListening();
        btn.textContent = 'Talk to AI';
    } else {
        await voice.startListening();
        btn.textContent = 'Stop';
    }
});
</script>
```

---

## Security Considerations

### Origin Validation

Always configure allowed origins in production:

```bash
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://app.example.com
```

### API Key Authentication

For sensitive deployments, require API keys:

```bash
WEBSOCKET_AUDIO_API_KEY=strong_random_key_here
```

### Rate Limiting

Prevent abuse with per-IP limits:

```bash
WEBSOCKET_AUDIO_MAX_PER_IP=3
```

### HTTPS/WSS

Always use HTTPS and WSS in production:

```javascript
// Production
serverUrl: 'wss://voice.example.com:8082'

// Development only
serverUrl: 'ws://localhost:8082'
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Server not running | Start WebSocket server |
| Origin rejected | Origin not allowed | Add to WEBSOCKET_AUDIO_ALLOWED_ORIGINS |
| Invalid API key | Wrong or missing key | Check WEBSOCKET_AUDIO_API_KEY |
| Microphone blocked | Permission denied | Allow microphone in browser |
| No audio output | AudioContext suspended | User interaction required first |

### Browser Console

Check browser developer console for SDK logs:

```
[AIVG] Connected to server
[AIVG] Using audio format: audio/webm;codecs=opus
[AIVG] Started listening
[AIVG] Audio v2: 3200 bytes at 24000Hz
```

### Test Connection

```bash
# Test WebSocket connection
websocat ws://localhost:8082
```

### Check Server Status

```bash
# View server logs
docker logs -f vexyl-gateway
# or
pm2 logs vexyl-gateway

# Check if port is listening
netstat -tlnp | grep 8082
```

---

## Performance Tips

### Reduce Latency

1. Use streaming STT (Sarvam, Deepgram) instead of batch
2. Enable TTS caching for common responses
3. Choose geographically close servers

### Audio Quality

1. Use good microphone (headset recommended)
2. Reduce background noise
3. Speak clearly and at normal pace

### Mobile Optimization

For mobile devices:
- Use a good microphone (headset recommended)
- Reduce background noise
- Speak clearly at normal pace
- Ensure stable network connection
