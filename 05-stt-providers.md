# Speech-to-Text (STT) Providers

VEXYL AI Voice Gateway supports multiple STT providers to convert speech to text. Each provider has different strengths for specific use cases.

## Provider Comparison

| Provider | Mode | Latency | Languages | Best For |
|----------|------|---------|-----------|----------|
| **Sarvam** | Streaming | 300-800ms | 11 Indian | Indian languages |
| **Deepgram** | Streaming | 300-500ms | 36+ | Real-time, English |
| **Groq Whisper** | Batch | 1-3s | 99 | Accuracy, international |
| **Gemini** | Batch | 1-3s | 100+ | Cost-effective |
| **OpenAI Whisper** | Batch | 2-5s | 99 | Highest accuracy |

## Provider Selection

### Automatic Selection (Recommended)

```bash
STT_PROVIDER=auto
```

Auto-selection logic:
- **Indian languages** (ml-IN, hi-IN, ta-IN, etc.) → Sarvam (streaming)
- **International languages** → Groq Whisper (best accuracy)

### Manual Selection

```bash
STT_PROVIDER=sarvam   # or groq, gemini, deepgram, openai
```

---

## Sarvam STT

### Overview

Sarvam provides real-time streaming STT optimized for Indian languages. It's the recommended choice for Hindi, Tamil, Telugu, Malayalam, and other Indian languages.

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

### Configuration

```bash
SARVAM_API_KEY=your_api_key_here
STT_PROVIDER=sarvam  # or auto for Indian languages
```

### Features

- **Streaming**: Real-time transcription (no buffering wait)
- **Low Latency**: 300-800ms typical
- **Code-switching**: Handles mixed Hindi-English speech
- **Accent Support**: Optimized for Indian accents

### When to Use

✅ Indian language applications
✅ Real-time transcription needs
✅ Mixed language conversations
✅ Low latency requirements

❌ Non-Indian languages
❌ High accuracy requirements for complex speech

---

## Deepgram Nova STT

### Overview

Deepgram Nova provides streaming STT with built-in endpointing (VAD). It's excellent for English and offers the lowest latency option with native 8kHz support.

### Configuration

```bash
DEEPGRAM_API_KEY=your_api_key
STT_PROVIDER=deepgram

# Model selection
DEEPGRAM_STT_MODEL=nova-2          # Stable, recommended
# DEEPGRAM_STT_MODEL=nova-3        # Latest, experimental

# Endpointing (silence detection)
DEEPGRAM_STT_ENDPOINTING=1000      # 1000ms silence = utterance end

# Features
DEEPGRAM_STT_INTERIM_RESULTS=true  # Real-time partial transcripts
DEEPGRAM_STT_PUNCTUATE=true        # Add punctuation
DEEPGRAM_STT_SMART_FORMAT=true     # Format numbers, dates
```

### Supported Languages

- English (US, UK, AU, IN)
- Spanish, French, German
- Portuguese, Italian, Dutch
- Japanese, Korean, Chinese
- Hindi, Indonesian, and more

### Features

- **Streaming**: Real-time transcription
- **Native 8kHz**: No upsampling needed
- **Built-in VAD**: No separate silence detection
- **Smart Formatting**: Automatic punctuation and formatting

### When to Use

✅ Lowest latency requirements
✅ English-focused applications
✅ Real-time transcription
✅ Built-in endpointing needed

❌ Complex Indian language accents
❌ Budget-constrained (costs more than batch)

---

## Groq Whisper STT

### Overview

Groq provides fast Whisper inference via REST API. It offers excellent accuracy across 99 languages with 1-3 second latency.

### Configuration

```bash
GROQ_API_KEY=gsk_your_api_key
STT_PROVIDER=groq

# Model selection
GROQ_MODEL=whisper-large-v3-turbo  # Fast, good accuracy
# GROQ_MODEL=whisper-large-v3      # Slower, best accuracy
```

### Supported Languages

Groq Whisper supports 99 languages including:
- All European languages
- Asian languages (Chinese, Japanese, Korean)
- Middle Eastern languages (Arabic, Hebrew, Persian)
- African languages
- And many more

### Features

- **Batch Processing**: Buffers audio, then transcribes
- **High Accuracy**: Whisper large model
- **Fast Inference**: Groq's optimized hardware

### Processing Flow

```
Audio → Buffer (until silence) → Upsample → Groq API → Transcript
        ↑                                              ↓
        └─────────── VAD (Silero) detects silence ─────┘
```

### VAD Configuration

Groq uses Silero VAD for speech detection:

```bash
VAD_POSITIVE_THRESHOLD=0.5    # Speech start threshold
VAD_NEGATIVE_THRESHOLD=0.35   # Speech end threshold
VAD_REDEMPTION_FRAMES=8       # Pause tolerance (768ms)
```

### When to Use

✅ Multi-language applications
✅ High accuracy requirements
✅ International customer base
✅ Cost-effective (fast inference)

❌ Sub-second latency needs
❌ Real-time streaming required

---

## Gemini STT

### Overview

Gemini provides batch STT using Google's generative AI models. It's the most cost-effective option for high-volume applications.

### Configuration

```bash
GEMINI_API_KEY=your_api_key
STT_PROVIDER=gemini

GEMINI_STT_MODEL=gemini-2.0-flash-exp
GEMINI_STT_PROMPT=  # Optional: Custom transcription instructions
```

### Supported Languages

Gemini supports 100+ languages through the Generative AI API.

### Features

- **Batch Processing**: Like Groq, buffers audio
- **Cost-Effective**: Lower per-minute cost
- **Flexible**: Can include custom prompts

### Custom Prompts

You can guide transcription with custom prompts:

```bash
GEMINI_STT_PROMPT=Transcribe this audio. The speaker may use technical terms related to healthcare.
```

### When to Use

✅ High-volume applications
✅ Cost optimization priority
✅ Custom transcription guidance needed
✅ Google Cloud ecosystem

❌ Sub-second latency needs
❌ Real-time streaming required

---

## OpenAI Whisper STT

### Overview

OpenAI Whisper provides the highest accuracy transcription through the OpenAI API.

### Configuration

```bash
OPENAI_API_KEY=sk-your_api_key
STT_PROVIDER=openai

OPENAI_STT_MODEL=whisper-1
# OPENAI_STT_MODEL=gpt-4o-transcribe      # If available
# OPENAI_STT_MODEL=gpt-4o-mini-transcribe # If available

# Optional temperature (0-1, lower = more deterministic)
# OPENAI_STT_TEMPERATURE=0
```

### Features

- **Highest Accuracy**: Original Whisper implementation
- **99 Languages**: Comprehensive language support
- **Batch Processing**: Audio buffered before transcription

### When to Use

✅ Highest accuracy requirements
✅ Complex audio (accents, background noise)
✅ Existing OpenAI integration
✅ Quality over speed

❌ Latency-sensitive applications
❌ Cost-constrained projects

---

## Audio Processing Configuration

All batch STT providers (Groq, Gemini, OpenAI) share these settings:

### Buffer Settings

```bash
MIN_SPEECH_DURATION=500    # Minimum speech before processing (ms)
MAX_SILENCE_DURATION=1500  # Silence before processing (ms)
MAX_BUFFER_DURATION=5000   # Maximum buffer before forcing (ms)
```

### VAD Settings (Silero VAD v5)

```bash
VAD_MODEL=v5                    # Silero model version
VAD_POSITIVE_THRESHOLD=0.5      # Speech start (0.0-1.0)
VAD_NEGATIVE_THRESHOLD=0.35     # Speech end (0.0-1.0)
VAD_REDEMPTION_FRAMES=8         # Pause tolerance (8 frames = 768ms)
VAD_MIN_SPEECH_FRAMES=3         # Minimum speech (3 frames = 288ms)
VAD_PRE_SPEECH_FRAMES=1         # Pre-buffer (1 frame = 96ms)
```

### Tuning for Different Scenarios

**Fast-paced conversation (English):**
```bash
VAD_REDEMPTION_FRAMES=6          # 576ms pause tolerance
MAX_SILENCE_DURATION=1000        # 1s silence before processing
```

**Slow speakers (elderly users):**
```bash
VAD_REDEMPTION_FRAMES=12         # 1152ms pause tolerance
MAX_SILENCE_DURATION=2000        # 2s silence before processing
VAD_POSITIVE_THRESHOLD=0.4       # More sensitive to quiet speech
```

**Noisy environment:**
```bash
VAD_POSITIVE_THRESHOLD=0.6       # Less sensitive to noise
VAD_MIN_SPEECH_FRAMES=5          # Stricter noise filtering
```

---

## Utterance Window

For long speech that exceeds `MAX_BUFFER_DURATION`, multiple transcripts are combined:

```bash
UTTERANCE_WINDOW_SIZE=4              # Max utterances to buffer
REDEMPTION_MS=1400                   # Wait after last transcript
UTTERANCE_COMBINATION_WINDOW=10000   # Combine within 10 seconds
```

### How It Works

```
User speaks for 8 seconds
        ↓
Buffer #1 (0-5s) → Transcript: "I need a hospital booking"
        ↓
Buffer #2 (5-8s) → Transcript: "for tomorrow at 3 PM"
        ↓
Wait 1.4s (no more speech)
        ↓
Combined: "I need a hospital booking for tomorrow at 3 PM"
        ↓
Sent to LLM
```

---

## Provider Fallback

Providers fail gracefully with automatic fallback:

| Primary | Fallback |
|---------|----------|
| Sarvam | Groq |
| Deepgram | Groq |
| OpenAI | Groq |
| Groq | Gemini |
| Gemini | Error response |

---

## Testing Providers

Enable startup testing to verify provider connectivity:

```bash
TEST_STT_ON_START=true
```

### Health Check

```bash
curl http://localhost:8081/health
```

---

## Provider Selection Flowchart

```
What's the primary language?
├── Indian language (hi-IN, ml-IN, ta-IN, etc.)
│   └── Use: Sarvam (streaming, optimized)
│
├── English (primary)
│   ├── Need real-time streaming?
│   │   ├── Yes: Use Deepgram Nova
│   │   └── No: Use Groq Whisper
│   │
│   └── Need highest accuracy?
│       └── Use: OpenAI Whisper
│
└── Other international language
    ├── Cost-sensitive?
    │   ├── Yes: Use Gemini
    │   └── No: Use Groq Whisper
    │
    └── Need highest accuracy?
        └── Use: OpenAI Whisper
```
