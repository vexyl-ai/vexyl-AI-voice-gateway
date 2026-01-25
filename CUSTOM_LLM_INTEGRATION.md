# Custom LLM Integration Guide

This guide explains how to implement a custom chat endpoint that integrates with the VEXYL AI Voice Gateway using `LLM_PROVIDER=custom`.

## Overview

The custom LLM provider allows you to connect any HTTP-based chat API to the voice gateway. Your endpoint receives user transcripts and returns AI responses that are converted to speech.

## Configuration

Set these environment variables in your `.env` file:

```bash
# Required
LLM_PROVIDER=custom
CUSTOM_LLM_URL=http://yourip:9000/chat

# Optional
CUSTOM_LLM_TIMEOUT=30000          # Request timeout in ms (default: 30000)
CUSTOM_LLM_AUTH_TYPE=none         # none | bearer | header
CUSTOM_LLM_AUTH_TOKEN=            # Your auth token
CUSTOM_LLM_AUTH_HEADER=X-Api-Key  # Custom header name (for auth_type=header)

# Advanced: Custom field mapping (if your API uses non-standard field names)
CUSTOM_LLM_RESPONSE_FIELD=data.output.message  # Dot-notation path to response text
CUSTOM_LLM_SESSION_FIELD=data.sessionId        # Dot-notation path to session ID
```

## API Specification

### Request Format

Your endpoint will receive POST requests with this JSON body:

```json
{
  "message": "Hello, I need help with my order",
  "sessionId": "custom-session-1706234567890-abc123xyz",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help you today?" }
  ],
  "context": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "callerName": "John Doe",
    "callerPhone": "+919876543210",
    "language": "en-IN",
    "timestamp": "2024-01-25T10:30:00.000Z",
    "custom_field_1": "value1",
    "custom_field_2": "value2"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Current user message (speech transcript) |
| `sessionId` | string | Session identifier for conversation continuity |
| `history` | array | Previous conversation messages (optional) |
| `context.userId` | string | Unique call/session UUID |
| `context.callerName` | string | Caller's name (from metadata) |
| `context.callerPhone` | string | Caller's phone number |
| `context.language` | string | Language code (e.g., "en-IN", "hi-IN") |
| `context.timestamp` | string | ISO 8601 timestamp |
| `context.*` | any | Additional custom metadata fields |

### Response Format

Your endpoint should return JSON. The gateway supports multiple response formats:

#### Simple Response (Recommended)

```json
{
  "response": "I'd be happy to help you with your order. Can you please provide your order number?",
  "sessionId": "your-session-id-123",
  "shouldEscalate": false,
  "shouldHangup": false
}
```

#### Alternative Field Names

The gateway automatically detects these field names for the response text:

```json
// Any of these work:
{ "response": "..." }
{ "text": "..." }
{ "message": "..." }
{ "output": "..." }
{ "result": "..." }
{ "answer": "..." }
{ "reply": "..." }
{ "content": "..." }

// Nested formats also work:
{ "data": { "response": "..." } }
{ "data": { "text": "..." } }
{ "data": { "message": "..." } }
```

#### Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `response` | string | Yes | The AI response text to speak |
| `sessionId` | string | No | Session ID for conversation continuity |
| `shouldEscalate` | boolean | No | Set `true` to transfer call to human agent |
| `shouldHangup` | boolean | No | Set `true` to end the call gracefully |
| `metadata` | object | No | Additional data (logged but not spoken) |

#### Escalation Response

To transfer the call to a human agent:

```json
{
  "response": "I'll connect you with a customer service representative right away.",
  "shouldEscalate": true
}
```

#### End Call Response

To gracefully end the call:

```json
{
  "response": "Thank you for calling! Have a great day. Goodbye!",
  "shouldHangup": true
}
```

## Example Implementations

### Node.js (Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// In-memory session storage (use Redis in production)
const sessions = new Map();

app.post('/chat', (req, res) => {
    const { message, sessionId, context } = req.body;

    console.log(`[${sessionId}] User: ${message}`);
    console.log(`Context:`, context);

    // Get or create session
    let session = sessions.get(sessionId) || {
        history: [],
        createdAt: new Date()
    };

    // Add user message to history
    session.history.push({ role: 'user', content: message });

    // Your LLM logic here
    // This is a simple example - replace with your actual LLM call
    let response = generateResponse(message, session.history, context);

    // Add assistant response to history
    session.history.push({ role: 'assistant', content: response.text });

    // Save session
    sessions.set(sessionId, session);

    console.log(`[${sessionId}] Assistant: ${response.text}`);

    res.json({
        response: response.text,
        sessionId: sessionId,
        shouldEscalate: response.escalate || false,
        shouldHangup: response.hangup || false
    });
});

function generateResponse(message, history, context) {
    const lowerMessage = message.toLowerCase();

    // Example: Detect escalation intent
    if (lowerMessage.includes('speak to human') ||
        lowerMessage.includes('talk to agent') ||
        lowerMessage.includes('real person')) {
        return {
            text: "I'll connect you with a customer service representative right away. Please hold.",
            escalate: true
        };
    }

    // Example: Detect goodbye intent
    if (lowerMessage.includes('bye') ||
        lowerMessage.includes('thank you') ||
        lowerMessage.includes('that\'s all')) {
        return {
            text: "Thank you for calling! If you have any more questions, feel free to call back. Goodbye!",
            hangup: true
        };
    }

    // Example: Greeting
    if (lowerMessage.includes('hi') ||
        lowerMessage.includes('hello') ||
        history.length <= 1) {
        const name = context.callerName ? `, ${context.callerName}` : '';
        return {
            text: `Hello${name}! Welcome to our service. How can I help you today?`
        };
    }

    // Default response - replace with your actual LLM
    return {
        text: "I understand. Let me help you with that. Could you please provide more details?"
    };
}

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`Custom LLM endpoint running on port ${PORT}`);
});
```

### Python (FastAPI)

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

app = FastAPI()

# In-memory session storage
sessions: Dict[str, dict] = {}

class HistoryMessage(BaseModel):
    role: str
    content: str

class Context(BaseModel):
    userId: Optional[str] = None
    callerName: Optional[str] = None
    callerPhone: Optional[str] = None
    language: Optional[str] = "en-IN"
    timestamp: Optional[str] = None

    class Config:
        extra = "allow"  # Allow additional fields

class ChatRequest(BaseModel):
    message: str
    sessionId: str
    history: Optional[List[HistoryMessage]] = []
    context: Optional[Context] = None

class ChatResponse(BaseModel):
    response: str
    sessionId: str
    shouldEscalate: bool = False
    shouldHangup: bool = False
    metadata: Optional[dict] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"[{request.sessionId}] User: {request.message}")

    # Get or create session
    session = sessions.get(request.sessionId, {"history": [], "created": datetime.now()})

    # Add user message
    session["history"].append({"role": "user", "content": request.message})

    # Generate response (replace with your LLM)
    result = generate_response(
        request.message,
        session["history"],
        request.context
    )

    # Add assistant response
    session["history"].append({"role": "assistant", "content": result["text"]})
    sessions[request.sessionId] = session

    print(f"[{request.sessionId}] Assistant: {result['text']}")

    return ChatResponse(
        response=result["text"],
        sessionId=request.sessionId,
        shouldEscalate=result.get("escalate", False),
        shouldHangup=result.get("hangup", False)
    )

def generate_response(message: str, history: list, context: Context) -> dict:
    lower_message = message.lower()

    # Escalation detection
    if any(phrase in lower_message for phrase in ["speak to human", "talk to agent", "real person"]):
        return {
            "text": "I'll connect you with a customer service representative right away.",
            "escalate": True
        }

    # Goodbye detection
    if any(phrase in lower_message for phrase in ["bye", "thank you", "that's all"]):
        return {
            "text": "Thank you for calling! Have a great day. Goodbye!",
            "hangup": True
        }

    # Greeting
    if any(phrase in lower_message for phrase in ["hi", "hello"]) or len(history) <= 1:
        name = f", {context.callerName}" if context and context.callerName else ""
        return {"text": f"Hello{name}! How can I help you today?"}

    # Default
    return {"text": "I understand. Could you please provide more details?"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
```

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)
sessions = {}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    session_id = data.get('sessionId', '')
    context = data.get('context', {})

    print(f"[{session_id}] User: {message}")

    # Your LLM logic here
    response_text = "I understand. How can I help you further?"
    should_escalate = False
    should_hangup = False

    # Example logic
    if 'agent' in message.lower() or 'human' in message.lower():
        response_text = "Connecting you to an agent now."
        should_escalate = True
    elif 'bye' in message.lower():
        response_text = "Goodbye! Thank you for calling."
        should_hangup = True

    print(f"[{session_id}] Assistant: {response_text}")

    return jsonify({
        'response': response_text,
        'sessionId': session_id,
        'shouldEscalate': should_escalate,
        'shouldHangup': should_hangup
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000)
```

### Integration with OpenAI

```javascript
const express = require('express');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sessions = new Map();

const SYSTEM_PROMPT = `You are a helpful customer service assistant for a company.
- Be concise and friendly
- If the user wants to speak to a human, respond with exactly: [ESCALATE]
- If the conversation is complete, respond with exactly: [HANGUP]
- Keep responses under 100 words for voice conversations`;

app.post('/chat', async (req, res) => {
    const { message, sessionId, context } = req.body;

    // Get or create session
    let session = sessions.get(sessionId) || {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }]
    };

    // Add context on first message
    if (session.messages.length === 1 && context.callerName) {
        session.messages.push({
            role: 'system',
            content: `The caller's name is ${context.callerName}. Phone: ${context.callerPhone || 'unknown'}`
        });
    }

    // Add user message
    session.messages.push({ role: 'user', content: message });

    try {
        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: session.messages,
            max_tokens: 150,
            temperature: 0.7
        });

        let responseText = completion.choices[0].message.content;
        let shouldEscalate = false;
        let shouldHangup = false;

        // Check for special flags
        if (responseText.includes('[ESCALATE]')) {
            shouldEscalate = true;
            responseText = responseText.replace('[ESCALATE]', '').trim();
        }
        if (responseText.includes('[HANGUP]')) {
            shouldHangup = true;
            responseText = responseText.replace('[HANGUP]', '').trim();
        }

        // Add assistant response to history
        session.messages.push({ role: 'assistant', content: responseText });
        sessions.set(sessionId, session);

        res.json({
            response: responseText,
            sessionId: sessionId,
            shouldEscalate,
            shouldHangup
        });
    } catch (error) {
        console.error('OpenAI error:', error);
        res.json({
            response: "I'm sorry, I'm having trouble processing your request. Please try again.",
            sessionId: sessionId
        });
    }
});

app.listen(9000, () => console.log('OpenAI chat endpoint on port 9000'));
```

## Authentication

### No Authentication (Default)

```bash
CUSTOM_LLM_AUTH_TYPE=none
```

### Bearer Token

```bash
CUSTOM_LLM_AUTH_TYPE=bearer
CUSTOM_LLM_AUTH_TOKEN=your-secret-token
```

Request header: `Authorization: Bearer your-secret-token`

### Custom Header

```bash
CUSTOM_LLM_AUTH_TYPE=header
CUSTOM_LLM_AUTH_HEADER=X-Api-Key
CUSTOM_LLM_AUTH_TOKEN=your-api-key
```

Request header: `X-Api-Key: your-api-key`

## Testing Your Endpoint

### 1. Test with curl

```bash
curl -X POST http://yourip:9000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help",
    "sessionId": "test-session-123",
    "context": {
      "userId": "test-user",
      "callerName": "Test User",
      "language": "en-IN"
    }
  }'
```

Expected response:
```json
{
  "response": "Hello, Test User! How can I help you today?",
  "sessionId": "test-session-123",
  "shouldEscalate": false,
  "shouldHangup": false
}
```

### 2. Test Escalation

```bash
curl -X POST http://yourip:9000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to speak to a human agent",
    "sessionId": "test-session-123",
    "context": {}
  }'
```

Expected response:
```json
{
  "response": "I'll connect you with a representative right away.",
  "shouldEscalate": true
}
```

### 3. Test with Voice Gateway

```bash
# Start the voice gateway
export LLM_PROVIDER=custom
export CUSTOM_LLM_URL=http://yourip:9000/chat
node server.js

# Check logs for:
# INFO: Using LLM Provider: custom
# INFO: Custom LLM API initialized - URL: http://yourip:9000/chat
# Testing Custom LLM connection...
# ✅ Custom LLM connection successful!
```

### 4. Make a Test Call

Call into the system and verify:
- Logs show `DEBUG: Sending message to Custom LLM`
- Logs show `PERF: Custom LLM API call took XXXms`
- No `Starting Sarvam chat API call` messages appear

## Error Handling

Your endpoint should handle errors gracefully:

```javascript
app.post('/chat', async (req, res) => {
    try {
        // Your logic here
        res.json({ response: "Success response" });
    } catch (error) {
        console.error('Error:', error);

        // Return a user-friendly error message
        res.status(200).json({  // Use 200 to prevent gateway retry
            response: "I'm sorry, I encountered an error. Please try again.",
            sessionId: req.body.sessionId
        });
    }
});
```

## Best Practices

1. **Keep responses concise** - Voice conversations work best with responses under 100 words

2. **Use natural language** - Avoid technical jargon, abbreviations, and special characters

3. **Handle silence/noise** - The STT may send empty or noisy transcripts
   ```javascript
   if (!message || message.trim().length < 2) {
       return { response: "I didn't catch that. Could you please repeat?" };
   }
   ```

4. **Implement session cleanup** - Remove old sessions to prevent memory leaks
   ```javascript
   // Clean sessions older than 1 hour
   setInterval(() => {
       const oneHourAgo = Date.now() - 3600000;
       for (const [id, session] of sessions) {
           if (session.createdAt < oneHourAgo) {
               sessions.delete(id);
           }
       }
   }, 300000); // Every 5 minutes
   ```

5. **Log for debugging** - Log requests and responses for troubleshooting

6. **Handle timeouts** - The gateway has a 30-second default timeout; ensure your LLM responds faster

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Custom LLM: URL not configured" | Set `CUSTOM_LLM_URL` in `.env` |
| Connection refused | Ensure your endpoint is running and accessible |
| 401/403 errors | Check authentication configuration |
| Timeout errors | Increase `CUSTOM_LLM_TIMEOUT` or optimize your endpoint |
| Empty responses | Check your response field names match expected format |
| Sarvam being used instead | Ensure `LLM_PROVIDER=custom` is set correctly |

## Support

For issues with the custom LLM integration, check the gateway logs:

```bash
# Look for these log patterns:
DEBUG: Sending message to Custom LLM
DEBUG: Custom LLM request body: {...}
PERF: Custom LLM API call took XXXms
DEBUG: Received Custom LLM response: "..."
```

If you see `Starting Sarvam chat API call` instead, the custom provider is not being used - verify your `LLM_PROVIDER` setting.
