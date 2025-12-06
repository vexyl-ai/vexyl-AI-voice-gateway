# LLM Providers

VEXYL AI Voice Gateway supports multiple LLM providers to power your voice assistant's intelligence.

## Provider Comparison

| Provider | Type | Customization | Integration | Best For |
|----------|------|---------------|-------------|----------|
| **n8n** | Workflow | Unlimited | Webhook | Custom workflows |
| **Flowise** | No-code | High | REST API | Visual AI builders |
| **Litebot** | Multi-bot | High | REST API | Multi-bot systems |
| **Custom** | Webhook | High | REST API | Custom integrations |
| **Sarvam** | Direct | Low | REST API | Indian language AI |

## Provider Selection

```bash
# Options: sarvam, flowise, litebot, custom, n8n
LLM_PROVIDER=n8n
```

---

## n8n Workflows (Recommended)

### Overview

n8n is an open-source workflow automation platform with 400+ integrations. It's the most flexible option for creating custom AI assistants.

### Configuration

```bash
LLM_PROVIDER=n8n

# Webhook URL (your n8n workflow)
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/voice-assistant

# Timeout (milliseconds)
N8N_TIMEOUT=30000

# Optional: Authentication header
N8N_AUTH_HEADER=Bearer your_token

# Optional: Custom response field mapping
N8N_RESPONSE_FIELD=data.output.message
N8N_SESSION_FIELD=session.id
```

### Creating an n8n Workflow

1. **Add Webhook Node**
   - HTTP Method: POST
   - Path: `/voice-assistant`
   - Response Mode: `Last Node`

2. **Add AI Node** (OpenAI, Anthropic, etc.)
   - Connect to your preferred LLM
   - Configure system prompts

3. **Add Response Node**
   - Format response as JSON
   - Include required fields

### Request Format

n8n receives:

```json
{
  "message": "User's spoken message",
  "sessionId": "session-123",
  "context": {
    "userId": "user-456",
    "callerName": "John Doe",
    "callerPhone": "+919876543210",
    "language": "en-IN",
    "timestamp": "2025-11-28T10:00:00.000Z"
  },
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

### Response Format

n8n should return:

```json
{
  "response": "AI's response text",
  "sessionId": "session-123",
  "metadata": {
    "shouldEscalate": false,
    "shouldHangup": false,
    "intent": "booking",
    "confidence": 0.95
  }
}
```

### Supported Response Fields

The system automatically detects these field names:
- `response`, `text`, `message`, `output`, `result`, `answer`, `reply`
- Nested: `data.response`, `data.text`, `data.message`

### Special Flags

| Flag | Effect |
|------|--------|
| `shouldEscalate: true` | Triggers HITL transfer |
| `shouldHangup: true` | Gracefully ends call |

### Example Workflow

```
[Webhook] → [OpenAI Chat] → [Format Response] → [Respond to Webhook]
```

The Format Response node should structure the output as:

```json
{
  "response": "AI's response text",
  "sessionId": "session-123",
  "metadata": {
    "shouldEscalate": false,
    "shouldHangup": false
  }
}
```

### When to Use

✅ Need custom AI workflows
✅ Multiple LLM provider options
✅ Complex business logic
✅ Integration with external systems
✅ Visual workflow design

---

## Flowise

### Overview

Flowise is a no-code/low-code platform for building LLM applications with a visual drag-and-drop interface.

### Configuration

```bash
LLM_PROVIDER=flowise

FLOWISE_API_URL=http://localhost:3000
FLOWISE_FLOW_ID=your_flow_id
```

### Request Format

```json
{
  "question": "User's message",
  "history": [
    { "role": "userMessage", "content": "Previous user message" },
    { "role": "apiMessage", "content": "Previous AI response" }
  ],
  "sessionId": "session-123",
  "chatId": "session-123"
}
```

### Response Format

```json
{
  "text": "AI's response",
  "sessionId": "updated-session-id"
}
```

### Setting Up Flowise

1. Deploy Flowise (see Flowise documentation)
2. Access the Flowise web interface
3. Create a new Chatflow
4. Add LLM, Memory, and Chain nodes
5. Save and copy the Flow ID

### When to Use

✅ Visual flow design preferred
✅ Rapid prototyping
✅ Non-developers building AI
✅ LangChain-based workflows

---

## Litebot

### Overview

Litebot is a multi-bot framework that allows running different bots for different purposes.

### Configuration

```bash
LLM_PROVIDER=litebot

LITEBOT_API_URL=http://localhost:3345
LITEBOT_BOT_ID=customer-service
LITEBOT_TIMEOUT=30000
```

### Request Format

```json
{
  "message": "User's message",
  "sessionId": "session-123",
  "botId": "customer-service",
  "userId": "user-456",
  "context": {
    "language": "en-IN",
    "callerName": "John Doe",
    "callerPhone": "+919876543210",
    "timestamp": "2025-11-28T10:00:00.000Z"
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "response": "AI's response",
    "sessionId": "session-123",
    "botId": "customer-service",
    "shouldEscalate": false,
    "usage": {
      "promptTokens": 150,
      "completionTokens": 50
    },
    "metrics": {
      "responseTime": 1200,
      "llmLatency": 800,
      "provider": "openai",
      "model": "gpt-4"
    },
    "toolResults": []
  }
}
```

### Dynamic Bot Selection

Pass `botId` in metadata to select different bots per call:

```json
{
  "phoneNumber": "+919876543210",
  "metadata": {
    "botId": "sales-bot"
  }
}
```

### When to Use

✅ Multiple bot personalities needed
✅ Department-specific assistants
✅ Tool-calling capabilities
✅ Usage tracking required

---

## Custom Webhook

### Overview

Custom webhook integration allows you to connect any LLM or chatbot backend via a REST API.

### Configuration

```bash
LLM_PROVIDER=custom

CUSTOM_LLM_URL=https://your-server.com/chat
CUSTOM_LLM_API_KEY=your_api_key
CUSTOM_LLM_TIMEOUT=30000
```

### Request Format

Your endpoint receives:

```json
{
  "message": "User's message",
  "sessionId": "session-123",
  "context": {
    "callerName": "John Doe",
    "callerPhone": "+919876543210",
    "language": "en-IN"
  },
  "history": []
}
```

### Response Format

Your endpoint should return:

```json
{
  "response": "AI's response",
  "sessionId": "session-123",
  "shouldEscalate": false,
  "shouldHangup": false
}
```

### When to Use

✅ Custom AI/chatbot backends
✅ Existing internal systems
✅ Full control over LLM processing

---

## Sarvam LLM

### Overview

Sarvam provides a direct LLM API optimized for Indian languages.

### Configuration

```bash
LLM_PROVIDER=sarvam
SARVAM_API_KEY=your_api_key
```

### When to Use

✅ Indian language conversations
✅ Simple direct API access
✅ Sarvam ecosystem integration

---

## Timeout Messages

When LLM processing takes too long, timeout messages keep users informed:

```bash
TIMEOUT_MESSAGE_ENABLED=true

# Message after 15 seconds
LLM_TIMEOUT_MESSAGE=Processing your request. Please hold.

# Message after 25 seconds
LLM_TIMEOUT_RETRY_MESSAGE=Still working. Taking longer than usual.

# Message on timeout failure
LLM_FINAL_TIMEOUT_MESSAGE=Unable to process. Please try again.

# Language-specific (Malayalam example)
LLM_TIMEOUT_MESSAGE_ML=നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നു.
```

### Timeout Flow

```
User speaks → LLM called
        │
        ├── 15 seconds: Play TIMEOUT_MESSAGE
        │
        ├── 25 seconds: Play TIMEOUT_RETRY_MESSAGE
        │
        ├── 30 seconds (timeout): Play FINAL_TIMEOUT_MESSAGE
        │
        └── Response received: Play AI response
```

---

## Call Transfer (HITL)

LLM can trigger transfer to human agents:

### Configuration

```bash
TRANSFER_ENABLED=true
TRANSFER_ENDPOINT=http://your-server/transfer.php
TRANSFER_TIMEOUT=5000

# Audio messages
TRANSFER_MESSAGE_TEXT_EN=Please hold while I transfer you.
TRANSFER_ERROR_TEXT_EN=Unable to transfer. Please try again.
```

### LLM Response for Transfer

```json
{
  "response": "Let me connect you to a human agent.",
  "shouldEscalate": true
}
```

### Webhook Payload

```json
{
  "channel": "PJSIP/128-000000db",
  "callerid": "+919876543210",
  "uuid": "session-uuid",
  "timestamp": "2025-11-28T10:00:00.000Z"
}
```

---

## Graceful Hangup

LLM can end calls gracefully:

### Configuration

```bash
GOODBYE_MESSAGE_TEXT_EN=Thank you for calling. Goodbye!
GOODBYE_MESSAGE_TEXT_ML=കോളിന് നന്ദി. വിട!
```

### LLM Response for Hangup

```json
{
  "response": "Thank you for calling. Have a great day!",
  "shouldHangup": true
}
```

### Hangup Flow

```
LLM returns shouldHangup: true
        ↓
Play goodbye message (or LLM response)
        ↓
Close AudioSocket connection
        ↓
Call ends
```

---

## Circuit Breaker

All LLM providers have automatic error recovery:

```
Normal operation → Error occurs → Error count++
        │                              │
        │                              ├── Count < threshold: Retry
        │                              │
        │                              └── Count >= threshold: Circuit OPEN
        │                                              │
        │                                              └── Wait 30s → HALF_OPEN → Test
        │                                                                    │
        │                                                    ├── Success → CLOSED
        │                                                    └── Failure → OPEN
        │
        └────────────────────────────────────────────────────┘
```

---

## Provider Selection Guide

```
What's your use case?

Custom AI Workflows:
└── n8n (most flexible, any LLM)

Visual Flow Building:
└── Flowise (no-code, LangChain)

Multiple Bot Personalities:
└── Litebot (multi-bot framework)

Custom Backend:
└── Custom (any webhook endpoint)

Indian Language Focus:
└── Sarvam (optimized for India)

Existing Integration:
└── Use whichever you already have
```

---

## Best Practices

### 1. Session Management

Always use session IDs to maintain conversation context:

```json
{
  "sessionId": "consistent-session-id"
}
```

### 2. Context Enrichment

Pass caller information for personalization:

```json
{
  "context": {
    "callerName": "John Doe",
    "callerPhone": "+919876543210",
    "language": "en-IN"
  }
}
```

### 3. Error Handling

Implement fallback responses in your LLM:

```
If API fails → Return generic apology
If intent unclear → Ask for clarification
If timeout → Acknowledge and retry
```

### 4. Response Length

Keep responses concise for voice:

```
❌ Long paragraphs
❌ Lists with many items
❌ Technical jargon

✅ Short sentences
✅ Direct answers
✅ Conversational tone
```

### 5. Testing

Test LLM responses with audio:

```bash
# Test connection
curl -X POST your-n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test"}'
```
