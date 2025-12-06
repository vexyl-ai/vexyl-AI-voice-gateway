# Introduction to VEXYL AI Voice Gateway

## What is VEXYL AI Voice Gateway?

VEXYL AI Voice Gateway is an enterprise-grade voice assistant platform that connects your telephone system (Asterisk PBX) or web applications to AI-powered conversational agents. It provides a complete pipeline for:

- **Speech-to-Text (STT)**: Converting human speech to text using multiple providers
- **Large Language Model (LLM)**: Processing user queries and generating intelligent responses
- **Text-to-Speech (TTS)**: Converting AI responses back to natural-sounding speech

## Key Features

### Multi-Provider Architecture

| Component | Providers Available |
|-----------|---------------------|
| **STT** | Sarvam, Groq Whisper, Gemini, OpenAI Whisper, Deepgram Nova |
| **TTS** | Sarvam, Google Cloud, Azure, Deepgram, ElevenLabs, Gemini, Murf |
| **LLM** | Sarvam, Flowise, Litebot, Custom Webhook, n8n Workflows |

### Three Operation Modes

1. **Standard Mode (STT → LLM → TTS)**: Full pipeline with separate speech recognition, AI processing, and speech synthesis
2. **Gateway Mode**: Direct audio passthrough to OpenAI Realtime API or ElevenLabs Conversational AI
3. **WebSocket Mode**: Browser-based voice assistant widget for web applications

### Connection Methods

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Asterisk PBX   │────▶│                  │────▶│   STT Provider  │
│  AudioSocket    │     │                  │     └─────────────────┘
│  (Port 8080)    │     │                  │              │
└─────────────────┘     │                  │              ▼
                        │  VEXYL AI        │     ┌─────────────────┐
┌─────────────────┐     │  Voice Gateway   │────▶│   LLM Provider  │
│  Web Browser    │────▶│                  │     └─────────────────┘
│  WebSocket      │     │                  │              │
│  (Port 8082)    │     │                  │              ▼
└─────────────────┘     │                  │     ┌─────────────────┐
                        │                  │────▶│   TTS Provider  │
┌─────────────────┐     │                  │     └─────────────────┘
│  HTTP API       │────▶│                  │
│  (Port 8081)    │     │                  │
└─────────────────┘     └──────────────────┘
```

## Language Support

### Indian Languages (via Sarvam)
- English (India) - en-IN
- Hindi - hi-IN
- Malayalam - ml-IN
- Tamil - ta-IN
- Telugu - te-IN
- Kannada - kn-IN
- Bengali - bn-IN
- Marathi - mr-IN
- Gujarati - gu-IN
- Odia - or-IN
- Punjabi - pa-IN

### International Languages (via Groq/Gemini)
- English (US/UK)
- Spanish, French, German
- Chinese, Japanese, Korean
- Arabic, Russian, Portuguese
- And 90+ more languages

## Use Cases

### Inbound Voice Applications
- Customer service hotlines
- Appointment booking systems
- FAQ bots
- Survey and feedback collection
- Interactive Voice Response (IVR)

### Outbound Voice Applications
- Appointment reminders
- Order status updates
- Marketing campaigns
- Customer satisfaction surveys
- Payment reminders

### Web-Based Applications
- Website chat widgets with voice
- Customer support portals
- E-commerce voice assistants
- Kiosk applications

## System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 20.04+, Debian 10+, CentOS 8+)
- **RAM**: 2 GB minimum
- **CPU**: 2 cores
- **Network**: Stable internet connection

### Recommended Requirements
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 4 GB or more
- **CPU**: 4 cores
- **Disk**: SSD for TTS cache
- **Network**: Low-latency internet connection

### External Dependencies
- **Asterisk PBX** (for AudioSocket connections)
- **Redis** (optional, for distributed session storage)

## Quick Start

### 1. Deploy with Docker
```bash
docker run -d \
  --name vexyl-gateway \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8082:8082 \
  -e SARVAM_API_KEY=your_api_key \
  vexyl/voice-gateway:latest
```

### 2. Test Connection
```bash
curl http://localhost:8081/health
```

## Documentation Structure

This user manual is organized into the following sections:

1. **Introduction** (this document)
2. **Installation** - Deployment guide for Docker, Kubernetes, and standalone binary
3. **Configuration** - All environment variables explained
4. **Operation Modes** - Standard, Gateway, and WebSocket modes
5. **STT Providers** - Speech recognition options
6. **TTS Providers** - Speech synthesis options
7. **LLM Providers** - AI backend integrations
8. **Asterisk Integration** - Dialplan and AudioSocket setup
9. **WebSocket Browser** - Browser widget integration
10. **Gateway Mode** - OpenAI/ElevenLabs direct integration
11. **Advanced Features** - VAD, caching, barge-in, etc.
12. **Optimization** - Performance tuning guide
13. **Troubleshooting** - Common issues and solutions

## Support and Resources

- **Web Interface**: Access `http://your-server:8081/demo.html` for testing
- **Health Check**: `http://your-server:8081/health`
- **License Status**: `http://your-server:8081/license`

## Version Information

- **Last Updated**: December 2025
