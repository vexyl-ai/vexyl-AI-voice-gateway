# @vexyl.ai/aivg-sdk

AI Voice Gateway Browser SDK - WebSocket-based voice assistant for browsers.

[![GitHub](https://img.shields.io/badge/GitHub-vexyl--AI--voice--gateway-blue?logo=github)](https://github.com/vexyl-ai/vexyl-AI-voice-gateway)
[![Docker Hub](https://img.shields.io/badge/Docker-vexyl--voice--gateway-2496ED?logo=docker)](https://hub.docker.com/r/vexyl/vexyl-voice-gateway)
[![Twitter](https://img.shields.io/badge/Twitter-@VexylAi-1DA1F2?logo=x)](https://x.com/VexylAi)
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/TcZYmtPM)
[![Website](https://img.shields.io/badge/Website-vexyl.ai-green)](https://vexyl.ai/)


[![Demo](https://img.shields.io/badge/demo-try%20it%20now-brightgreen?style=for-the-badge)](https://ai.vexyl.info/demo.html)

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

Connect your web applications to AI-powered voice assistants with real-time speech-to-text, LLM processing, and text-to-speech.

## Installation

```bash
npm install @vexyl.ai/aivg-sdk
```

Or via CDN:

```html
<script src="https://unpkg.com/@vexyl.ai/aivg-sdk"></script>
```

## Quick Start

```javascript
import AIVoiceGateway from '@vexyl.ai/aivg-sdk';

const voice = new AIVoiceGateway({
    serverUrl: 'wss://your-server.com:8082',
    language: 'en-IN',
    onTranscript: (text, { isFinal }) => {
        console.log('User said:', text, isFinal ? '(final)' : '(partial)');
    },
    onResponse: (text) => {
        console.log('AI said:', text);
    },
    onError: (error) => {
        console.error('Error:', error.message);
    }
});

// Connect and start listening
await voice.connect();
await voice.startListening();
```

## Usage

### ES Modules

```javascript
import AIVoiceGateway from '@vexyl.ai/aivg-sdk';
```

### CommonJS

```javascript
const AIVoiceGateway = require('@vexyl.ai/aivg-sdk');
```

### Browser (CDN)

```html
<script src="https://unpkg.com/@vexyl.ai/aivg-sdk"></script>
<script>
    const voice = new AIVoiceGateway({ serverUrl: 'wss://...' });
</script>
```

## Configuration Options

```javascript
const voice = new AIVoiceGateway({
    // Required
    serverUrl: 'wss://your-server.com:8082',

    // Optional
    language: 'en-IN',              // Language code (default: 'en-IN')
    apiKey: 'your-api-key',         // API key for authentication
    metadata: {                      // Custom session metadata
        botId: 'sales-bot',
        callerName: 'John Doe',
        department: 'sales'
    },
    ttsProvider: 'smallest',        // TTS override: sarvam | google | gemini | elevenlabs
                                    // | deepgram | azure | murf | vexyl | smallest
                                    // (omit to use the server default)
    autoGreet: false,               // AI speaks first on connect
    greetingMessage: 'hi',          // Message for auto-greeting
    autoReconnect: true,            // Auto-reconnect on disconnect
    maxReconnectAttempts: 5,        // Max reconnection attempts
    reconnectDelay: 1000,           // Delay between attempts (ms)
    keepAliveMs: 30000,             // Ping interval; keeps proxies/tunnels from dropping quiet sockets (0 = off)

    // Callbacks
    onConnect: ({ uuid }) => {},
    onDisconnect: ({ code, reason }) => {},
    onTranscript: (text, { isFinal }) => {},
    onResponse: (text) => {},               // full reply, once per turn
    onResponseDelta: (delta, soFar) => {},  // streamed fragments (LiteBot + LITEBOT_STREAMING) — render word-by-word
    onAudio: (arrayBuffer) => {},           // one PCM frame per sentence while streaming; playback is gapless
    onStatus: (status) => {},
    onError: ({ code, message }) => {},
    onHangup: ({ reason }) => {},
    onTransfer: ({ reason }) => {}          // AI asked for a human; widget decides the hand-off
});
```

## API Methods

### Connection

```javascript
// Connect to server
await voice.connect();

// Disconnect
voice.disconnect();
```

### Audio Control

```javascript
// Start listening (requests microphone permission)
await voice.startListening();

// Stop listening
voice.stopListening();

// Mute/unmute microphone
voice.mute();
voice.unmute();

// Stop the assistant's audio immediately (the SDK does this itself on a
// server barge-in; call it for a UI "stop" button)
voice.stopPlayback();

// Keep-alive ping (automatic every keepAliveMs; manual call is harmless)
voice.ping();
```

### Configuration

```javascript
// Change language
voice.setLanguage('hi-IN');

// Update metadata (e.g., change bot mid-session). Reserved identity keys
// (userId, sessionId, uuid, apiKey) are ignored by the server — see Security.
voice.updateMetadata({ botId: 'support-bot' });

// Switch TTS provider mid-session (validated against the gateway's list)
voice.setTTSProvider('google');
```

### Status

```javascript
// Get current status
const status = voice.getStatus();
// { isConnected, isListening, isMuted, uuid, language, ttsProvider }

// Check if audio is playing — stays true across a whole streamed reply,
// including the gaps between sentence frames
if (voice.isAudioPlaying()) {
    console.log('AI is speaking');
}
```

`onStatus(status)` values, in the order a turn usually produces them:

| status | meaning |
|---|---|
| `ready` | session initialised on the gateway |
| `listening` | mic audio is being transcribed |
| `speaking` | (server VAD) the caller is talking |
| `processing` | transcript sent to the LLM |
| `speaking` | assistant audio is being sent / played |
| `transfer` | assistant asked for a human (`onTransfer` fires too) |
| `closing` | the server is about to close the socket (idle timeout, max session, shutdown) |
| `ended` | assistant hung up (`onHangup` fires too) |

### Audio Visualization

```javascript
// Get Web Audio API analyser for visualization
const analyser = voice.getAnalyser();

// Get frequency data
const frequencyData = voice.getFrequencyData();
if (frequencyData) {
    // Use for visualization (e.g., waveform, spectrum)
}
```

## Examples

### Basic Voice Chat

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082',
    onTranscript: (text, { isFinal }) => {
        document.getElementById('transcript').textContent = text;
    },
    onResponse: (text) => {
        document.getElementById('response').textContent = text;
    }
});

document.getElementById('start-btn').onclick = async () => {
    await voice.connect();
    await voice.startListening();
};

document.getElementById('stop-btn').onclick = () => {
    voice.disconnect();
};
```

### With Dynamic Bot Selection

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082',
    metadata: {
        botId: 'sales-bot',      // Select which bot to use
        callerName: 'John',
        department: 'sales'
    }
});
```

`botId` is honoured by the LiteBot, ZAssist, n8n and custom LLM providers, which
receive the whole metadata object as request context. Constructor metadata is
pushed to the server as soon as the connection is acknowledged, so it also
applies to the `autoGreet` turn.

### AI Speaks First (Auto-Greeting)

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082',
    autoGreet: true,
    greetingMessage: 'Hello, how can I help you today?'
});
```

### Audio Visualization

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082'
});

await voice.connect();
await voice.startListening();

// Visualize audio
function visualize() {
    const data = voice.getFrequencyData();
    if (data) {
        // Draw waveform or spectrum
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        console.log('Audio level:', avg);
    }
    requestAnimationFrame(visualize);
}
visualize();
```

## Supported Languages

The SDK supports any language configured on your AI Voice Gateway server:

- **Indian Languages** (via Sarvam): Hindi, Malayalam, Tamil, Telugu, Kannada, Bengali, etc.
- **International Languages** (via Groq/Gemini): 90+ languages

Common language codes:
- `en-IN` - English (India)
- `hi-IN` - Hindi
- `ml-IN` - Malayalam
- `ta-IN` - Tamil
- `te-IN` - Telugu
- `en-US` - English (US)

## Error Handling

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com:8082',
    onError: (error) => {
        switch (error.code) {
            case 'WS_ERROR':
                console.error('WebSocket error');
                break;
            case 'MIC_ERROR':
                console.error('Microphone access denied');
                break;
            case 'RECORDER_ERROR':
                console.error('Recording error');
                break;
            case 'PLAYBACK_ERROR':
                console.error('Could not play an audio frame');   // bad frame from server; playback continues
                break;
            case 'INVALID_API_KEY':
            case 'LIMIT_REACHED':
                console.error('Rejected by gateway:', error.message);   // socket closes with 4001 / 4003
                break;
            case 'IDLE_TIMEOUT':
            case 'MAX_SESSION':
                console.error('Session closed by gateway:', error.message);   // close codes 4008 / 4009
                break;
            default:
                console.error('Error:', error.message);
        }
    }
});
```

## Streaming Replies

With the gateway's LiteBot streaming (default), text and audio arrive while the model is still writing:

```javascript
const voice = new AIVoiceGateway({
    serverUrl: 'wss://voice.example.com',
    onResponseDelta: (delta, soFar) => caption.textContent = soFar,   // word-by-word
    onResponse: (text) => caption.textContent = text,                  // full reply, once per turn
    onTransfer: ({ reason }) => showHumanHandoff(),                    // AI asked for a human
});
```

Audio arrives as one or many PCM frames per reply (per sentence, and in ~200 ms chunks when the
gateway's TTS provider streams); the SDK schedules them gaplessly on the Web Audio clock, and reports
playback complete to the server only after the whole reply has played. `voice.isAudioPlaying()` / `getFrequencyData()`
stay truthful across the whole reply.

## Security

The SDK runs in the browser, so treat everything it holds as public:

- **`apiKey` is not a secret.** Anyone who can load your page can read it. It is an anti-casual gate
  only; the gateway's origin allowlist (`WEBSOCKET_AUDIO_ALLOWED_ORIGINS`) is the real control. For
  per-user access, mint a short-lived token on your backend and pass that as `apiKey`.
- **Always use `wss://`.** The key travels on the connect query string; the SDK warns if you use
  `ws://` to a non-local host or from an `https:` page (mixed content is blocked by browsers anyway).
- **Render transcripts and replies with `textContent`, never `innerHTML`.** `onTranscript`,
  `onResponseDelta`, `onResponse` and close reasons carry text produced by speech recognition and an
  LLM — treat it as untrusted.
- **`metadata` cannot set identity.** `userId`, `sessionId`, `uuid`, `apiKey` (and `__proto__`,
  `constructor`, `prototype`) are stripped by the gateway; the SDK warns if you pass them. `userId`
  goes on the constructor/query string and is a *client-chosen* continuity key — use unguessable
  values (UUIDs), never emails or sequential ids.
- **Server-side limits you will hit if you misbehave:** one `greeting` per connection (capped
  length), 1 MB max frame, idle timeout (close code `4008`), max session duration (`4009`), per-IP
  connection cap. The SDK does not auto-reconnect on `4001` (bad key), `4003` (capacity), `4008`,
  `4009` or a normal `1000` close.
- The SDK never uses `eval`, `innerHTML`, storage or cookies, and loads no third-party code.

### Close codes

| Code | Meaning | Auto-reconnect |
|---|---|---|
| 1000 | normal close (you called `disconnect()` / assistant hangup) | no |
| 4001 | invalid API key | no |
| 4003 | gateway at capacity | no |
| 4008 | idle timeout (no audio/control traffic; pings don't count) | no |
| 4009 | maximum session duration reached | no |
| other | transient (network, gateway restart) | yes, up to `maxReconnectAttempts` |

## Browser Support

- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+

Requires:
- WebSocket API
- MediaRecorder API
- Web Audio API
- getUserMedia API

## License

MIT

## Links

- [GitHub Repository](https://github.com/vexyl-ai/vexyl-AI-voice-gateway)
- [Documentation](https://github.com/vexyl-ai/vexyl-AI-voice-gateway/blob/main/README.md)
- [Issues](https://github.com/vexyl-ai/vexyl-AI-voice-gateway/issues)
