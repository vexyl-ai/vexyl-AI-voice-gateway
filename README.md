# VEXYL AI Voice Gateway - User Manual

Comprehensive documentation for deploying, configuring, operating, and optimizing VEXYL AI Voice Gateway.

## Table of Contents

### Getting Started
1. [Introduction](01-introduction.md) - Overview, features, architecture, system requirements
2. [Installation](02-installation.md) - Deployment guide for Docker, Kubernetes, and standalone binary

### Provider Configuration
3. [STT Providers](05-stt-providers.md) - Sarvam, Deepgram, Groq, Gemini, OpenAI
4. [TTS Providers](06-tts-providers.md) - Deepgram, Google, Azure, ElevenLabs, Sarvam, Murf
5. [LLM Providers](07-llm-providers.md) - n8n, Flowise, Litebot, Custom, Sarvam

### Integration Guides
6. [Asterisk Integration](08-asterisk-integration.md) - AudioSocket, dialplan, AMI configuration
7. [WebSocket Browser](09-websocket-browser.md) - Browser SDK, demo pages, security

### Operation Modes
8. [Gateway Mode](10-gateway-mode.md) - OpenAI Realtime and ElevenLabs integration

### Advanced Topics
9. [Advanced Features](11-advanced-features.md) - VAD, barge-in, call transfer, outbound calls, caching, IP whitelisting
10. [Optimization](12-optimization.md) - Performance tuning, scaling, cost optimization
11. [Troubleshooting](13-troubleshooting.md) - Diagnostics, common issues, solutions

## Quick Start

### Deploy with Docker

```bash
docker run -d \
  --name vexyl-gateway \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8082:8082 \
  -v /opt/vexyl/cache:/app/cache \
  -e SARVAM_API_KEY=your_api_key \
  -e LLM_PROVIDER=sarvam \
  -e TTS_PROVIDER=sarvam \
  -e STT_PROVIDER=auto \
  vexyl/voice-gateway:latest
```

### Verify Deployment

```bash
curl http://localhost:8081/health
```

### Configure Asterisk

```ini
; /etc/asterisk/extensions.conf
[voice-assistant]
exten => 100,1,Answer()
exten => 100,n,Set(SESSION_UUID=${UNIQUEID})
exten => 100,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
exten => 100,n,Hangup()
```

## Documentation Overview

| Document | Purpose | When to Read |
|----------|---------|--------------|
| Introduction | Understand capabilities | First time setup |
| Installation | Deploy the system | Initial deployment |
| STT/TTS/LLM Providers | Configure providers | Provider selection |
| Asterisk Integration | Telephone integration | PBX setup |
| WebSocket Browser | Web widget setup | Browser integration |
| Gateway Mode | OpenAI/ElevenLabs direct | Low-latency needs |
| Advanced Features | Additional capabilities | Feature expansion |
| Optimization | Performance tuning | Production scaling |
| Troubleshooting | Fix issues | Problem resolution |

## Key Features

- **Multi-Provider Architecture**: 7 TTS, 5 STT, 5 LLM providers
- **Sub-200ms Latency**: With optimized provider selection
- **Natural Barge-in**: Interrupt AI mid-speech with Silero VAD
- **10+ Indian Languages**: Native support via Sarvam
- **TTS Caching**: Up to 95% cost savings
- **Browser SDK**: Embed voice AI in web applications
- **HITL Transfer**: Seamless handoff to human agents
- **Outbound Calls**: Automated outbound campaigns

## Deployment Options

| Method | Best For |
|--------|----------|
| Docker | Most deployments |
| Docker Compose | Single server with Redis |
| Kubernetes | High availability, auto-scaling |
| Standalone Binary | Minimal footprint |

## Support

For issues and questions, contact your VEXYL support representative.

## Version

This documentation covers VEXYL AI Voice Gateway - December 2025.
