# Troubleshooting Guide

This guide covers common issues, diagnostic procedures, and solutions for VEXYL AI Voice Gateway.

## Quick Diagnostics

### Health Check

```bash
# Check server health
curl http://localhost:8081/health

# Expected response
{
  "status": "ok",
  "mode": "standard",
  "timestamp": "2025-11-28T10:00:00.000Z"
}
```

### View Logs

```bash
# PM2 logs
pm2 logs assist

# Real-time error monitoring
pm2 logs assist | grep -E "ERROR|WARN"

# Specific component logs
pm2 logs assist | grep "VAD"
pm2 logs assist | grep "STT"
pm2 logs assist | grep "TTS"
pm2 logs assist | grep "LLM"
```

### Check Processes

```bash
# PM2 status
pm2 status

# Port usage
netstat -tlnp | grep -E "8080|8081|8082"

# Memory usage
pm2 describe assist | grep memory
```

---

## Server Issues

### Server Won't Start

**Symptom:** Server crashes immediately or won't start.

**Check 1: Environment file**
```bash
cat .env | head -20
# Verify required variables are set
```

**Check 2: Port conflicts**
```bash
netstat -tlnp | grep 8080
# If another process is using the port, stop that process first
```

**Check 3: Docker container status**
```bash
docker logs vexyl-gateway
```

**Check 4: License key**
```bash
curl http://localhost:8081/license
```

### High Memory Usage

**Symptom:** Server using excessive memory.

**Solution 1: Reduce buffer sizes**
```bash
MAX_AUDIO_BUFFER_SIZE=50
MAX_PLAYBACK_QUEUE_SIZE=25
```

**Solution 2: Reduce TTS cache**
```bash
TTS_CACHE_MAX_SIZE_MB=1000
```

**Solution 3: Restart server**
```bash
docker restart vexyl-gateway
# or
pm2 restart vexyl-gateway
```

### Server Crashes

**Symptom:** Server exits unexpectedly.

**Check error logs:**
```bash
docker logs vexyl-gateway --tail 100
# or
pm2 logs vexyl-gateway --err --lines 100
```

**Common causes:**
- Invalid API keys
- Network connectivity issues
- Memory exhaustion
- License issues

**Enable debug mode:**
Add `DEBUG=true` to your environment and restart the container.

---

## AudioSocket Issues

### No Connection from Asterisk

**Symptom:** Asterisk calls don't connect to AI Voice Gateway.

**Check 1: Asterisk AudioSocket module**
```bash
asterisk -rx "module show like app_audiosocket"
# Expected: app_audiosocket.so    Running
```

**Check 2: Port listening**
```bash
netstat -tlnp | grep 8080
# Expected: tcp 0 0 127.0.0.1:8080 0.0.0.0:* LISTEN
```

**Check 3: Firewall**
```bash
# If Asterisk on different server
sudo ufw allow from ASTERISK_IP to any port 8080
```

**Check 4: Dialplan**
```bash
# In /etc/asterisk/extensions.conf
exten => 100,n,AudioSocket(${SESSION_UUID},127.0.0.1:8080)
```

**Test connection:**
```bash
telnet 127.0.0.1 8080
```

### Call Connects But No Audio

**Symptom:** Call connects but no speech is heard.

**Check 1: Audio format**
```bash
# Asterisk should use ulaw/alaw
asterisk -rx "core show channels"
```

**Check 2: Codec settings**
```ini
; /etc/asterisk/pjsip.conf
disallow=all
allow=ulaw
allow=alaw
```

**Check 3: Server receiving audio**
```bash
pm2 logs assist | grep "audio chunk"
```

### One-Way Audio

**Symptom:** User can hear AI but AI doesn't hear user (or vice versa).

**Check 1: NAT/firewall**
```bash
# RTP ports should be open
sudo ufw allow 10000:20000/udp
```

**Check 2: Check both directions in logs**
```bash
pm2 logs assist | grep -E "Received|Sending"
```

---

## STT Issues

### No Transcription

**Symptom:** User speaks but no transcript appears.

**Check 1: API key**
```bash
# Verify key is set
echo $SARVAM_API_KEY
echo $GROQ_API_KEY
echo $GEMINI_API_KEY
```

**Check 2: Provider selection**
```bash
STT_PROVIDER=auto  # Should auto-select
# Or explicitly:
STT_PROVIDER=groq
```

**Check 3: VAD initialization**
```bash
pm2 logs assist | grep "VAD: Initialized"
# Expected: VAD: Initialized (threshold: 0.5/0.35, redemption: 8 frames)
```

**Check 4: Audio reaching STT**
```bash
pm2 logs assist | grep "Speech started"
```

### Speech Cut Off Mid-Sentence

**Symptom:** User says "What is your role?" but system hears "What is your"

**Solution: Increase redemption frames**
```bash
VAD_REDEMPTION_FRAMES=10  # Was 8, now 960ms tolerance
```

**For slow speakers:**
```bash
VAD_REDEMPTION_FRAMES=12  # 1152ms tolerance
```

### Transcription Too Slow

**Symptom:** Long delay before transcription completes.

**Solution 1: Use streaming provider**
```bash
STT_PROVIDER=sarvam   # For Indian languages
STT_PROVIDER=deepgram # For English
```

**Solution 2: Reduce buffer duration**
```bash
MAX_BUFFER_DURATION=3000  # 3 seconds
```

**Solution 3: Tune VAD for faster response**
```bash
VAD_REDEMPTION_FRAMES=6  # Faster, but may cut speech
```

### Wrong Language Detected

**Symptom:** English speech transcribed as Hindi or vice versa.

**Check language configuration:**
```bash
# In dialplan
exten => _X.,n,Set(CURL_RESULT=${CURL(...,language_code=en-IN)})
```

**Or in session metadata:**
```bash
curl -X POST "http://127.0.0.1:8081/session/${UUID}/metadata" \
  -d "language_code=en-IN"
```

---

## TTS Issues

### No Audio Response

**Symptom:** AI responds but no audio is heard.

**Check 1: API key**
```bash
echo $DEEPGRAM_API_KEY
echo $GOOGLE_APPLICATION_CREDENTIALS
```

**Check 2: Provider logs**
```bash
pm2 logs assist | grep "TTS"
```

**Check 3: Audio format**
```bash
pm2 logs assist | grep "resampling"
```

### Audio Quality Issues

**Symptom:** Robotic, choppy, or distorted audio.

**Cause:** 8kHz AudioSocket limitation.

**Mitigation 1: Use fastest TTS**
```bash
TTS_PROVIDER=deepgram
```

**Mitigation 2: Adjust speech rate**
```bash
AZURE_TTS_RATE=1.1  # Slightly faster
```

### TTS Too Slow

**Symptom:** Long delay before response audio plays.

**Solution 1: Enable caching**
```bash
TTS_CACHE_ENABLED=true
```

**Solution 2: Use faster provider**
```bash
TTS_PROVIDER=deepgram  # <200ms
```

**Solution 3: Enable splitting**
```bash
ENABLE_TTS_SPLITTING=true
TTS_CHUNK_SIZE=100
```

---

## LLM Issues

### No Response from LLM

**Symptom:** STT works but no LLM response.

**Check 1: Provider configuration**
```bash
echo $LLM_PROVIDER
echo $N8N_WEBHOOK_URL
```

**Check 2: Webhook reachability**
```bash
curl -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","sessionId":"test"}'
```

**Check 3: LLM logs**
```bash
pm2 logs assist | grep "LLM"
```

### LLM Response Timeout

**Symptom:** Timeout message plays instead of AI response.

**Solution 1: Increase timeout**
```bash
N8N_TIMEOUT=60000  # 60 seconds
```

**Solution 2: Enable timeout messages**
```bash
TIMEOUT_MESSAGE_ENABLED=true
LLM_TIMEOUT_MESSAGE=Processing your request...
```

**Solution 3: Use faster LLM**
```bash
# Consider Gateway Mode
GATEWAY_MODE=true
```

### Circuit Breaker Opens

**Symptom:** Error message "Circuit breaker OPEN"

**Check error logs:**
```bash
pm2 logs assist | grep "Circuit breaker"
```

**Common causes:**
- Invalid API key
- Rate limiting
- Provider outage
- Network issues

**Solution: Wait 30 seconds for auto-recovery**

**Or reset manually by restarting your container/process.**

---

## Gateway Mode Issues

### WebSocket Connection Fails

**Symptom:** "LLM WebSocket connection timeout"

**Check 1: URL format**
```bash
# OpenAI
LLM_WEBSOCKET_URL=wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01

# ElevenLabs
LLM_WEBSOCKET_URL=wss://api.elevenlabs.io/v1/convai/conversation?agent_id=YOUR_AGENT_ID
```

**Check 2: API key**
```bash
echo $LLM_API_KEY
```

**Check 3: Network/firewall**
```bash
wscat -c "wss://api.openai.com/v1/realtime" -H "Authorization: Bearer YOUR_KEY"
```

### Audio Quality in Gateway Mode

**Symptom:** Robotic or distorted audio.

**Cause:** 8kHz AudioSocket + 3x resampling.

**This is a known limitation.** Gateway mode audio quality is limited by AudioSocket bandwidth.

### Queue Overflow

**Symptom:** "queue full, dropping oldest chunk"

**Solution: Reduce queue sizes**
```bash
MAX_AUDIO_BUFFER_SIZE=50
MAX_PLAYBACK_QUEUE_SIZE=25
```

---

## WebSocket Browser Issues

### Connection Refused

**Symptom:** Browser can't connect to WebSocket server.

**Check 1: Server enabled**
```bash
WEBSOCKET_AUDIO_ENABLED=true
```

**Check 2: Port listening**
```bash
netstat -tlnp | grep 8082
```

**Check 3: Firewall**
```bash
sudo ufw allow 8082
```

### Origin Rejected

**Symptom:** "Forbidden: Invalid origin"

**Solution: Add origin to allowed list**
```bash
WEBSOCKET_AUDIO_ALLOWED_ORIGINS=https://yourdomain.com
```

### Invalid API Key

**Symptom:** "Invalid or missing API key"

**Check client code:**
```javascript
new AIVoiceGateway({
    serverUrl: 'wss://server:8082',
    apiKey: 'correct_key_here'
});
```

### Microphone Not Working

**Symptom:** "MIC_ERROR: Permission denied"

**Solution:** User must allow microphone in browser.

**For HTTPS only:** Microphone access requires HTTPS in production.

---

## Call Transfer Issues

### Transfer Not Triggered

**Symptom:** LLM says "transferring" but nothing happens.

**Check 1: Feature enabled**
```bash
TRANSFER_ENABLED=true
TRANSFER_ENDPOINT=http://your-server/transfer.php
```

**Check 2: LLM response format**
```json
{
  "response": "Transferring you...",
  "shouldEscalate": true
}
```

**Check 3: Channel metadata stored**
```bash
# In dialplan
exten => _X.,n,Set(CURL_RESULT=${CURL(...,channel=${CHANNEL})})
```

### Webhook Not Responding

**Symptom:** Transfer audio plays but call doesn't transfer.

**Check webhook endpoint:**
```bash
curl -X POST "http://your-server/transfer.php" \
  -H "Content-Type: application/json" \
  -d '{"channel":"test","callerid":"1234","uuid":"test"}'
```

**Check AMI connectivity in your webhook script.**

---

## Outbound Call Issues

### Outbound Calls Disabled

**Symptom:** 403 Forbidden on /outbound/initiate

**Solution:**
```bash
OUTBOUND_ENABLED=true
OUTBOUND_ORIGINATE_ENDPOINT=http://your-server/originate.php
```

### No Audio Greeting

**Symptom:** Call connects but no greeting plays.

**Check 1: Audio files exist**
```bash
ls -la /opt/assist/audio/outbound-*.wav
```

**Check 2: File format**
```bash
# Must be 8kHz, 16-bit, mono, PCM
ffprobe /opt/assist/audio/outbound-en.wav
```

**Check 3: Greeting mode**
```bash
OUTBOUND_GREETING_MODE=static
OUTBOUND_STATIC_AUDIO_EN=/opt/assist/audio/outbound-en.wav
```

---

## Performance Issues

### High Latency

**Symptom:** Long delay between speech and response.

**Diagnosis:**
```bash
pm2 logs assist | grep -E "ms|latency"
```

**Solutions:**
1. Use streaming STT (Sarvam, Deepgram)
2. Enable TTS caching
3. Use Gateway Mode
4. Tune VAD for faster response

### Memory Growing

**Symptom:** Memory usage increases over time.

**Solution 1: Cleanup sessions**
```bash
SESSION_TTL=1800
SESSION_CLEANUP_INTERVAL=120
```

**Solution 2: Limit cache**
```bash
TTS_CACHE_MAX_SIZE_MB=1000
```

**Solution 3: Reduce buffers**
```bash
MAX_AUDIO_BUFFER_SIZE=50
```

**Solution 4: Restart periodically**
Configure scheduled restarts via cron or container orchestration.

---

## Common Error Messages

### "Invalid API key"

**Cause:** API key missing or incorrect.

**Solution:** Check and update API key in .env

### "Rate limit exceeded"

**Cause:** Too many API requests.

**Solution:** Reduce concurrent calls or upgrade API plan.

### "Session not found"

**Cause:** Session expired or UUID mismatch.

**Solution:** Check dialplan CURL call stores UUID correctly.

### "AudioSocket connection failed"

**Cause:** Port blocked or server not running.

**Solution:** Check firewall and server status.

### "Circuit breaker OPENED"

**Cause:** Too many consecutive errors.

**Solution:** Check provider status, wait 30s for auto-recovery.

### "TTS failed, using fallback"

**Cause:** Primary TTS provider failed.

**Solution:** Check API key and provider status.

### "VAD: Error processing audio frame"

**Cause:** Audio format issue.

**Solution:** Check audio is 8kHz PCM.

---

## Diagnostic Commands

### Check All Services

```bash
# Server status
pm2 status

# Port usage
netstat -tlnp | grep -E "8080|8081|8082"

# Memory
free -h

# Disk (cache)
du -sh /opt/assist/cache/tts

# Redis (if used)
redis-cli ping
```

### View Error Logs

```bash
# Last 100 errors
pm2 logs assist --err --lines 100

# Specific errors
pm2 logs assist | grep "ERROR"
pm2 logs assist | grep "WARN"
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:8081/health

# Session metadata
curl http://localhost:8081/session/test-uuid/metadata
```

### Test Providers

Enable startup tests in your environment:

```bash
# STT test (startup)
TEST_STT_ON_START=true

# TTS test (startup)
TEST_TTS_ON_START=true
```

Then restart your deployment to see the test results in logs.

---

## Getting Help

### Information to Collect

When reporting issues, include:

1. **Error logs**
   ```bash
   pm2 logs assist --err --lines 100 > error.log
   ```

2. **Configuration (redact API keys)**
   ```bash
   cat .env | grep -v "KEY\|TOKEN\|SECRET" > config.txt
   ```

3. **System info**
   ```bash
   docker version
   uname -a
   free -h
   ```

4. **Reproduction steps**
   - What action triggered the issue
   - Expected vs actual behavior

### Resources

- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Use `/help` command in Claude Code for assistance

