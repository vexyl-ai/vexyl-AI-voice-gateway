# Text-to-Speech (TTS) Providers

VEXYL AI Voice Gateway supports multiple TTS providers to convert AI responses to natural-sounding speech.

## Provider Comparison

| Provider | Latency | Quality | Cost | Best For |
|----------|---------|---------|------|----------|
| **Deepgram** | <200ms | Good | Low | Speed, cost |
| **Google Cloud** | 200-400ms | Excellent | Medium | Reliability, quality |
| **Azure** | 200-400ms | Excellent | Medium | Neural voices, styles |
| **ElevenLabs** | 300-800ms | Premium | High | Natural, emotional |
| **Sarvam** | 500-1000ms | Good | Low | Indian languages |
| **Gemini** | 3-90s | Variable | Low | Testing only |

## Provider Selection

```bash
# Options: sarvam, google, azure, deepgram, elevenlabs, gemini
TTS_PROVIDER=deepgram
```

---

## Deepgram TTS

### Overview

Deepgram offers low-latency, cost-effective TTS with a variety of natural-sounding voices. It's ideal for production deployments requiring fast response times.

### Configuration

```bash
DEEPGRAM_API_KEY=your_api_key
TTS_PROVIDER=deepgram

DEEPGRAM_API_URL=https://api.deepgram.com
DEEPGRAM_MODEL=aura-asteria-en
DEEPGRAM_TIMEOUT=30000
```

### Available Voices

#### Aura 2 Series (Latest - Recommended)

| Voice | Description |
|-------|-------------|
| aura-2-harmonia-en | Balanced female voice |
| aura-2-theia-en | Warm female voice |
| aura-2-andromeda-en | Clear female voice |
| aura-2-helena-en | Professional female voice |

#### Aura 1 Series (Stable)

| Voice | Gender | Style |
|-------|--------|-------|
| aura-asteria-en | Female | Balanced (default) |
| aura-luna-en | Female | Warm |
| aura-stella-en | Female | Clear |
| aura-athena-en | Female | Professional |
| aura-hera-en | Female | Expressive |
| aura-orion-en | Male | Natural |
| aura-arcas-en | Male | Deep |
| aura-perseus-en | Male | Friendly |
| aura-angus-en | Male | Authoritative |
| aura-orpheus-en | Male | Smooth |
| aura-helios-en | Male | Energetic |
| aura-zeus-en | Male | Strong |

### Per-Language Voice Overrides

```bash
DEEPGRAM_VOICE_EN_US=aura-asteria-en
DEEPGRAM_VOICE_EN_IN=aura-athena-en
DEEPGRAM_VOICE_ES_ES=aura-orpheus-en
```

### Pricing

- $0.015 per 1,000 characters (Aura 1)
- $0.030 per 1,000 characters (Aura 2)
- <200ms latency
- 2,000 character limit per request

### When to Use

✅ Low latency requirements
✅ Cost-sensitive applications
✅ English-focused applications
✅ High-volume deployments

---

## Google Cloud TTS

### Overview

Google Cloud TTS provides high-quality voices including WaveNet and Neural2 options with excellent reliability.

### Configuration

```bash
# Service account credentials
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

TTS_PROVIDER=google
```

### Voice Configuration

Voices are automatically selected based on language. You can override the default voice:

```bash
GOOGLE_TTS_VOICE_NAME=en-IN-Chirp-HD-F
```

### Voice Types

| Type | Quality | Latency | Cost |
|------|---------|---------|------|
| Standard | Good | 100-200ms | $4/1M chars |
| WaveNet | Excellent | 200-300ms | $16/1M chars |
| Neural2 | Premium | 200-400ms | $16/1M chars |
| Chirp HD | Premium | 200-400ms | Varies |

### When to Use

✅ Production reliability required
✅ Multiple language support
✅ WaveNet quality needed
✅ Google Cloud ecosystem

---

## Azure TTS

### Overview

Azure provides Neural TTS with emotional styles and fine-grained control over speech characteristics.

### Configuration

```bash
AZURE_TTS_API_KEY=your_api_key
AZURE_TTS_REGION=centralindia

TTS_PROVIDER=azure

# Default voice
AZURE_TTS_VOICE_NAME=en-US-JennyNeural

# Per-language voices
AZURE_TTS_VOICE_ML_IN=ml-IN-SobhanaNeural
AZURE_TTS_VOICE_HI_IN=hi-IN-SwaraNeural

# Voice style (for supported voices)
AZURE_TTS_VOICE_STYLE=excited

# Speech rate (1.0 = normal)
AZURE_TTS_RATE_ML_IN=1.1

AZURE_TTS_TIMEOUT=30000
```

### Available Styles

Not all voices support all styles:

| Style | Description |
|-------|-------------|
| cheerful | Happy, upbeat |
| excited | Enthusiastic |
| friendly | Warm, approachable |
| calm | Relaxed, soothing |
| serious | Formal, professional |
| sad | Subdued, melancholic |
| angry | Intense, forceful |
| gentle | Soft, caring |
| hopeful | Optimistic |

### Speech Rate

```bash
AZURE_TTS_RATE_ML_IN=1.2  # 20% faster for Malayalam
AZURE_TTS_RATE_EN_IN=1.0  # Normal speed for English
```

### When to Use

✅ Emotional expression needed
✅ Fine-grained voice control
✅ Microsoft ecosystem
✅ Indian language support

---

## ElevenLabs TTS

### Overview

ElevenLabs provides premium, natural-sounding voices with WebSocket streaming support.

### Configuration

```bash
ELEVENLABS_API_KEY=sk_your_api_key
TTS_PROVIDER=elevenlabs

ELEVENLABS_WSS_URL=wss://api.elevenlabs.io
ELEVENLABS_API_URL=https://api.elevenlabs.io
ELEVENLABS_MODEL=eleven_multilingual_v2

# Default voice (Rachel)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Voice settings
ELEVENLABS_STABILITY=0.5         # 0.0-1.0 (higher = more consistent)
ELEVENLABS_SIMILARITY_BOOST=0.75 # 0.0-1.0 (higher = clearer)
ELEVENLABS_STYLE=0.0             # 0.0-1.0 (style exaggeration)
ELEVENLABS_USE_SPEAKER_BOOST=true

# Audio format
ELEVENLABS_OUTPUT_FORMAT=pcm_16000

ELEVENLABS_TIMEOUT=30000
```

### Popular Voices

| Voice ID | Name | Description |
|----------|------|-------------|
| 21m00Tcm4TlvDq8ikWAM | Rachel | Natural American female |
| pNInz6obpgDQGcFmaJgB | Adam | British male, multilingual |
| N2lVS1w4EtoT3dr4eOWO | Callum | Indian English male |
| EXAVITQu4vr4xnSDxMaL | Bella | Expressive American female |
| TxGEqnHWrfWFTfGW9XjX | Josh | Deep American male |

### Per-Language Overrides

```bash
ELEVENLABS_VOICE_EN_US=21m00Tcm4TlvDq8ikWAM  # Rachel
ELEVENLABS_VOICE_EN_GB=pNInz6obpgDQGcFmaJgB  # Adam
ELEVENLABS_VOICE_EN_IN=N2lVS1w4EtoT3dr4eOWO  # Callum
```

### When to Use

✅ Premium voice quality needed
✅ Emotional, expressive speech
✅ Customer-facing applications
✅ Voice cloning requirements

---

## Sarvam TTS

### Overview

Sarvam provides TTS optimized for Indian languages with natural pronunciation.

### Configuration

```bash
SARVAM_API_KEY=your_api_key
TTS_PROVIDER=sarvam
```

### Supported Languages

| Code | Language |
|------|----------|
| en-IN | English (India) |
| hi-IN | Hindi |
| ml-IN | Malayalam |
| ta-IN | Tamil |
| te-IN | Telugu |
| kn-IN | Kannada |
| bn-IN | Bengali |
| mr-IN | Marathi |
| gu-IN | Gujarati |
| or-IN | Odia |
| pa-IN | Punjabi |

### When to Use

✅ Indian language applications
✅ Native accent pronunciation
✅ Regional language support
✅ Cost-effective Indian TTS

---

## Gemini TTS

### Overview

Gemini TTS uses Google's generative AI for text-to-speech. **Not recommended for production** due to high latency.

### Configuration

```bash
GEMINI_API_KEY=your_api_key
TTS_PROVIDER=gemini

GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE_NAME=Zephyr
GEMINI_TTS_TEMPERATURE=1.0
```

### Limitations

- **High Latency**: 3-90 seconds per request
- **Experimental**: API may change
- **Variable Quality**: Inconsistent output

### When to Use

✅ Testing and experimentation only
❌ Not for production use

---

## TTS Caching

TTS caching dramatically reduces latency and costs for repetitive content.

### Configuration

```bash
TTS_CACHE_ENABLED=true
TTS_CACHE_DIR=/opt/assist/cache/tts
TTS_CACHE_MAX_SIZE_MB=5000      # 5 GB
TTS_CACHE_MAX_AGE_DAYS=90       # 90 days
TTS_CACHE_CLEANUP_STRATEGY=lru  # lru, size, ttl, none
TTS_CACHE_STATS_LOGGING=true
```

### How It Works

1. **First Request**: Text is sent to TTS provider, response cached
2. **Subsequent Requests**: Same text returns from cache (<50ms)
3. **Cache Key**: SHA-256 of text + language + provider + voice settings

### Performance Impact

| Metric | Without Cache | With Cache (95% hit) |
|--------|---------------|----------------------|
| Latency | 500-1000ms | 10-50ms |
| API Cost | $3/day | $0.15/day |
| Monthly | $90 | $4.50 |

### Best Use Cases

- Survey bots (same questions repeated)
- IVR menus (static options)
- FAQ bots (common answers)
- Appointment reminders (templates)

### Cache Management

Cache management is handled automatically based on the cleanup strategy configured. You can also use the HTTP API to check cache statistics:

```bash
curl http://localhost:8081/cache/stats
```

---

## Response Splitting

Long responses are split for faster initial audio delivery:

```bash
ENABLE_TTS_SPLITTING=true
TTS_CHUNK_SIZE=100              # Max characters per chunk
TTS_MAX_PARALLEL=2              # Parallel TTS requests
TTS_SPLIT_DELIMITERS=.!?।       # Sentence boundaries
TTS_PHRASE_DELIMITERS=,;:       # Secondary boundaries
```

### How It Works

```
LLM Response: "Hello! How are you today? I hope you're doing well."
        ↓
Split into chunks:
  Chunk 1: "Hello!"
  Chunk 2: "How are you today?"
  Chunk 3: "I hope you're doing well."
        ↓
Parallel TTS processing
        ↓
Sequential audio playback
```

---

## Provider Fallback

TTS providers fail gracefully:

| Primary | Fallback |
|---------|----------|
| ElevenLabs | Google |
| Deepgram | Google |
| Google | Sarvam |
| Sarvam | Google |
| Azure | None (returns error) |
| Gemini | None (returns error) |

---

## Audio Format

All providers output audio that's converted to 8kHz PCM for Asterisk:

```
TTS Output → Resample to 8kHz → Asterisk AudioSocket
```

### Provider Native Formats

| Provider | Native Rate | Conversion |
|----------|-------------|------------|
| Deepgram | 8kHz | None needed |
| Google | 16/24kHz | FFmpeg downsample |
| Azure | 16/24kHz | FFmpeg downsample |
| ElevenLabs | 16/22/44kHz | FFmpeg downsample |
| Sarvam | 8kHz | None needed |

---

## Provider Selection Guide

```
What's your priority?

Speed (lowest latency):
└── Deepgram (<200ms)

Quality (best voices):
├── ElevenLabs (premium)
├── Azure (neural + styles)
└── Google (WaveNet)

Cost (lowest price):
├── Deepgram ($0.015/1K chars)
├── Sarvam (competitive)
└── Google Standard ($4/1M chars)

Indian Languages:
├── Sarvam (optimized)
├── Azure (neural options)
└── Google (WaveNet)

Emotional Expression:
├── ElevenLabs (natural)
└── Azure (style options)
```

---

## Testing Providers

Enable startup testing to verify provider connectivity:

```bash
TEST_TTS_ON_START=true
```

### Health Check

```bash
curl http://localhost:8081/health
```

Performance metrics are available in the server logs with latency tracking enabled:

```bash
LOG_LATENCY=true
```
