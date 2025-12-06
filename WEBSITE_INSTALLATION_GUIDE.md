# VEXYL AI Voice Gateway - Quick Start Guide

## Get Started in Minutes

Deploy VEXYL AI Voice Gateway on your infrastructure and start handling AI-powered voice calls today.

---

## Before You Begin

**You'll need:**
- A Linux server (Ubuntu 20.04+ or CentOS 8+)
- 2 GB RAM minimum (4 GB recommended)
- Your VEXYL license key
- API keys for your chosen AI providers

**Ports required:**
- 8080 - Asterisk connection
- 8081 - HTTP API
- 8082 - Browser SDK

---

## Choose Your Deployment Method

### Docker (Recommended)

The fastest way to get started. Works on any system with Docker installed.

**Step 1: Pull the image**

```
docker pull vexyl/voice-gateway:latest
```

**Step 2: Run the container**

```
docker run -d \
  --name vexyl-gateway \
  -p 8080:8080 \
  -p 8081:8081 \
  -p 8082:8082 \
  -e SARVAM_API_KEY=your_api_key \
  -e LLM_PROVIDER=sarvam \
  -e TTS_PROVIDER=sarvam \
  --restart unless-stopped \
  vexyl/voice-gateway:latest
```

**Step 3: Verify it's running**

```
curl http://localhost:8081/health
```

You should see: `{"status": "ok"}`

**That's it!** Your voice gateway is ready.

---

### Standalone Binary

Perfect for servers without Docker or air-gapped environments.

**Step 1: Download the binary**

Download from your VEXYL license portal or contact support for the download link.

**Step 2: Make it executable**

```
chmod +x vexyl-gateway-linux-x64
```

**Step 3: Create your configuration**

Create a file named `.env` in the same directory:

```
SARVAM_API_KEY=your_api_key
LLM_PROVIDER=sarvam
TTS_PROVIDER=sarvam
STT_PROVIDER=auto
```

**Step 4: Run it**

```
./vexyl-gateway-linux-x64
```

---

### Kubernetes

For high-availability deployments with auto-scaling.

**Step 1: Create namespace and secrets**

```
kubectl create namespace vexyl

kubectl create secret generic vexyl-secrets \
  --namespace vexyl \
  --from-literal=SARVAM_API_KEY=your_key
```

**Step 2: Deploy**

```
kubectl apply -f vexyl-deployment.yaml
```

Full Kubernetes manifests are available in our documentation portal.

---

## Configure Your AI Providers

VEXYL supports multiple AI providers. Add the API keys for the ones you want to use.

### Speech-to-Text (STT)

| Provider | Environment Variable | Best For |
|----------|---------------------|----------|
| Sarvam | `SARVAM_API_KEY` | Indian languages |
| Groq | `GROQ_API_KEY` | High accuracy |
| Deepgram | `DEEPGRAM_API_KEY` | Low latency |
| OpenAI | `OPENAI_API_KEY` | General purpose |

### Text-to-Speech (TTS)

| Provider | Environment Variable | Best For |
|----------|---------------------|----------|
| Deepgram | `DEEPGRAM_API_KEY` | Fastest response |
| Google | `GOOGLE_APPLICATION_CREDENTIALS` | Natural voices |
| Azure | `AZURE_TTS_API_KEY` | Enterprise |
| ElevenLabs | `ELEVENLABS_API_KEY` | Premium quality |
| Sarvam | `SARVAM_API_KEY` | Indian languages |

### Large Language Models (LLM)

| Provider | Environment Variable | Description |
|----------|---------------------|-------------|
| Sarvam | `SARVAM_API_KEY` | Built-in AI assistant |
| Litebot | `LITEBOT_API_URL` | Multi-bot platform |
| n8n | `N8N_WEBHOOK_URL` | Workflow automation |
| Flowise | `FLOWISE_API_URL` | LangChain flows |
| Custom | `CUSTOM_LLM_URL` | Your own endpoint |

---

## Connect to Asterisk

Add this to your Asterisk dialplan to route calls to VEXYL:

```
[vexyl-ai]
exten => _X.,1,Answer()
same => n,Set(UUID=${UNIQUEID})
same => n,AudioSocket(${UUID},your-server-ip:8080)
same => n,Hangup()
```

Replace `your-server-ip` with your VEXYL server address.

---

## Test Your Installation

### Health Check

```
curl http://your-server:8081/health
```

### License Status

```
curl http://your-server:8081/license
```

### Browser Test

Open in your browser:

```
http://your-server:8081/demo.html
```

This opens the voice assistant test page where you can speak to your AI directly from the browser.

---

## Essential Configuration

### Minimum Required

```
SARVAM_API_KEY=your_key
```

### Recommended Setup

```
# AI Providers
SARVAM_API_KEY=your_sarvam_key
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key

# Provider Selection
LLM_PROVIDER=sarvam
TTS_PROVIDER=deepgram
STT_PROVIDER=auto

# Features
ENABLE_BARGE_IN=true
TTS_CACHE_ENABLED=true
```

### Production Setup

```
# AI Providers
SARVAM_API_KEY=your_sarvam_key
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key

# Provider Selection
LLM_PROVIDER=sarvam
TTS_PROVIDER=deepgram
STT_PROVIDER=auto

# Performance
ENABLE_BARGE_IN=true
TTS_CACHE_ENABLED=true
TTS_CACHE_DIR=/app/cache/tts

# Security
HTTP_ALLOWED_IPS=your.asterisk.ip,your.office.ip

# Redis (for multi-server)
REDIS_URL=redis://your-redis:6379
```

---

## Common Issues

### "Connection refused" on port 8080

Your firewall may be blocking the port. Allow it:

```
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 8082/tcp
```

### "License not valid"

Get your machine ID and contact support:

```
curl http://localhost:8081/license
```

### "API key invalid"

Double-check your API key has no extra spaces. Test it directly:

```
curl -H "api-subscription-key: YOUR_KEY" https://api.sarvam.ai/health
```

### Container exits immediately

Check the logs for errors:

```
docker logs vexyl-gateway
```

Common causes:
- Missing required API keys
- Port already in use
- Invalid configuration

---

## Need Help?

**Documentation**: Full technical documentation available in your license portal

**Support**: Contact support@vexyl.ai

**Community**: Join our Discord for tips and discussions

---

## Next Steps

Once your gateway is running:

1. **Configure your Asterisk dialplan** to route calls to VEXYL
2. **Set up outbound calling** for automated campaigns
3. **Customize your AI** with your business context
4. **Enable TTS caching** to reduce costs
5. **Add call transfer** for human escalation

---

## Quick Reference

### Docker Commands

| Action | Command |
|--------|---------|
| Start | `docker start vexyl-gateway` |
| Stop | `docker stop vexyl-gateway` |
| Restart | `docker restart vexyl-gateway` |
| View logs | `docker logs -f vexyl-gateway` |
| Update | `docker pull vexyl/voice-gateway:latest && docker restart vexyl-gateway` |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Check if gateway is running |
| `GET /license` | View license status |
| `GET /calls/stats` | Current call statistics |
| `POST /outbound/initiate` | Start an outbound call |
| `POST /session/{id}/metadata` | Store caller information |

### Environment Variables Quick List

| Variable | Required | Description |
|----------|----------|-------------|
| `SARVAM_API_KEY` | Yes | Primary AI provider key |
| `LLM_PROVIDER` | No | sarvam, litebot, n8n, flowise, custom |
| `TTS_PROVIDER` | No | sarvam, deepgram, google, azure, elevenlabs |
| `STT_PROVIDER` | No | auto, sarvam, groq, gemini, deepgram |
| `HTTP_PORT` | No | API port (default: 8081) |
| `AUDIOSOCKET_PORT` | No | Asterisk port (default: 8080) |
| `ENABLE_BARGE_IN` | No | Allow caller interruption (default: true) |
| `TTS_CACHE_ENABLED` | No | Cache TTS responses (default: true) |
