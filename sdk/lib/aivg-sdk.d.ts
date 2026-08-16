/**
 * AI Voice Gateway Browser SDK - TypeScript Definitions
 * @version 1.0.11
 */

export type TTSProvider =
    | 'sarvam'
    | 'google'
    | 'gemini'
    | 'elevenlabs'
    | 'deepgram'
    | 'azure'
    | 'murf'
    | 'vexyl'
    | 'smallest';

export interface AIVoiceGatewayOptions {
    /** WebSocket server URL (required) - e.g., 'wss://voice.example.com:8082' */
    serverUrl: string;

    /** Language code - e.g., 'en-IN', 'hi-IN', 'ml-IN' */
    language?: string;

    /** API key for authentication */
    apiKey?: string;

    /** Custom metadata to send with session (e.g., botId, callerName) */
    metadata?: Record<string, any>;

    /** TTS provider override for this session (server default is used if omitted) */
    ttsProvider?: TTSProvider;

    /** Auto-send greeting to LLM on connect (AI speaks first) */
    autoGreet?: boolean;

    /** Message to send for auto-greeting */
    greetingMessage?: string;

    /** Enable automatic reconnection on disconnect */
    autoReconnect?: boolean;

    /** Maximum number of reconnection attempts */
    maxReconnectAttempts?: number;

    /** Delay between reconnection attempts (ms) */
    reconnectDelay?: number;

    /**
     * Keep-alive ping interval in ms (default 30000, 0 disables). Keeps
     * proxies/tunnels from dropping quiet sockets; the server does not treat
     * pings as session activity, so its idle timeout still applies.
     */
    keepAliveMs?: number;

    /** Called when connected to server */
    onConnect?: (data: { uuid: string }) => void;

    /** Called when disconnected from server */
    onDisconnect?: (data: { code: number; reason: string }) => void;

    /** Called with user speech transcript */
    onTranscript?: (text: string, data: { isFinal: boolean }) => void;

    /** Called with AI response text */
    onResponse?: (text: string) => void;

    /**
     * Called with each streamed text fragment while the model is still
     * writing (server LITEBOT_STREAMING, LiteBot provider). `accumulated` is
     * the turn's text so far. onResponse still fires once with the full text.
     */
    onResponseDelta?: (delta: string, accumulated: string) => void;

    /**
     * Called when the assistant asks for a human agent (LLM shouldEscalate /
     * transfer tool). The browser path has no phone leg to bridge, so the
     * widget decides the hand-off (open chat, show a number, ...). The
     * session stays open. onStatus also receives 'transfer'.
     */
    onTransfer?: (data: { reason: string; timestamp?: string }) => void;

    /** Called with audio data to play */
    onAudio?: (data: ArrayBuffer) => void;

    /** Called with status updates */
    onStatus?: (status: string) => void;

    /** Called on errors */
    onError?: (error: { code: string; message: string }) => void;

    /** Called when AI ends the call */
    onHangup?: (data: { reason: string }) => void;
}

export interface AIVoiceGatewayStatus {
    /** Whether connected to server */
    isConnected: boolean;

    /** Whether actively listening for speech */
    isListening: boolean;

    /** Whether microphone is muted */
    isMuted: boolean;

    /** Session UUID */
    uuid: string | null;

    /** Current language code */
    language: string;
}

/**
 * AI Voice Gateway Client
 *
 * @example
 * ```typescript
 * const voice = new AIVoiceGateway({
 *     serverUrl: 'wss://voice.example.com:8082',
 *     language: 'en-IN',
 *     metadata: { botId: 'sales-bot' },
 *     onTranscript: (text) => console.log('User said:', text),
 *     onResponse: (text) => console.log('AI said:', text)
 * });
 *
 * await voice.connect();
 * await voice.startListening();
 * ```
 */
declare class AIVoiceGateway {
    /** WebSocket server URL */
    readonly serverUrl: string;

    /** Current language code */
    language: string;

    /** Session metadata */
    metadata: Record<string, any>;

    /** Whether connected to server */
    readonly isConnected: boolean;

    /** Whether actively listening */
    readonly isListening: boolean;

    /** Whether microphone is muted */
    readonly isMuted: boolean;

    /** Session UUID (available after connect) */
    readonly uuid: string | null;

    /**
     * Create a new AIVoiceGateway instance
     * @param options - Configuration options
     */
    constructor(options: AIVoiceGatewayOptions);

    /**
     * Connect to the WebSocket server
     * @returns Promise that resolves when connected
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the server
     */
    disconnect(): void;

    /**
     * Start listening for user speech
     * Requests microphone permission if not already granted
     * @returns Promise that resolves when listening starts
     */
    startListening(): Promise<void>;

    /**
     * Stop listening for user speech
     */
    stopListening(): void;

    /**
     * Mute the microphone (stop sending audio)
     */
    mute(): void;

    /**
     * Unmute the microphone (resume sending audio)
     */
    unmute(): void;

    /**
     * Set the language for speech recognition
     * @param language - Language code (e.g., 'en-IN', 'hi-IN')
     */
    setLanguage(language: string): void;

    /**
     * Set the TTS provider for this session
     * @param provider - TTS provider name
     */
    setTTSProvider(provider: TTSProvider): void;

    /**
     * Update session metadata
     * @param metadata - Metadata to add/update
     */
    updateMetadata(metadata: Record<string, any>): void;

    /**
     * Get current status
     * @returns Status object
     */
    getStatus(): AIVoiceGatewayStatus;

    /**
     * Get the Web Audio API AnalyserNode for visualization
     * @returns AnalyserNode or null if not available
     */
    getAnalyser(): AnalyserNode | null;

    /**
     * Get frequency data for audio visualization
     * @returns Uint8Array of frequency data or null
     */
    getFrequencyData(): Uint8Array | null;

    /**
     * Check if audio is currently playing
     * @returns true if audio is playing
     */
    isAudioPlaying(): boolean;

    /**
     * Send a ping to keep the connection alive
     */
    ping(): void;
}

export { AIVoiceGateway };
export default AIVoiceGateway;
