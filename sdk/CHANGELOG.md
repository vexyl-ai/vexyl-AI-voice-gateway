# Changelog

## 1.0.11 — 2026-08-16
- Docs only: README API Methods (`stopPlayback()`, `ping()`, `setTTSProvider()`), status-value table, error codes; provider-neutral wording for streamed TTS audio.

## 1.0.10 — 2026-08-16
- ESM build fixed (duplicate `AUDIO_MAGIC` declaration made `lib/aivg-sdk.esm.js` unparsable); added `lib/aivg-sdk.mjs` for Node ESM via the exports map.
- Warn when `serverUrl` is `ws://` on an https page (mixed content) or carries an `apiKey` in plaintext to a non-local host.
- `package.json`: `exports` map, `sideEffects: false`, `publishConfig.access: public`.
- README: Streaming Replies, Security, status-value and close-code tables; API Methods now cover `stopPlayback()`, `ping()`, `setTTSProvider()`; error codes `PLAYBACK_ERROR`, `INVALID_API_KEY`, `LIMIT_REACHED`, `IDLE_TIMEOUT`, `MAX_SESSION` documented.

## 1.0.9 — 2026-08-16
- `onTransfer({ reason })` + `onStatus('transfer')`: the assistant asked for a human agent.
- Per-frame console logging throttled (progressive audio sends many small frames).

## 1.0.8 — 2026-08-16
- Playback-complete is reported to the server only after its `audio_complete` and everything has played; `isSpeakingSession` stays true across a multi-frame reply.

## 1.0.7 — 2026-08-16
- `onResponseDelta(delta, accumulated)` for streamed replies; `onResponse` still fires once with the full text.
- Gapless playback: frames are scheduled back-to-back on the AudioContext clock; `stopPlayback()` stops every scheduled source.

## 1.0.6 — 2026-08-16
- Binary frame guards (short/truncated frames, implausible sample rate, odd byte); playback errors routed to `onError` (`PLAYBACK_ERROR`).
- `keepAliveMs` (default 30 s) pings; no reconnect on close codes 4008/4009; `onStatus('closing')` on server-initiated close.
- Warns when reserved metadata keys (`userId`, `sessionId`, ...) are passed.
- Shared TTS provider list with the gateway (`vexyl`, `smallest` accepted); session config sent before auto-greeting.

## 1.0.5
- `ttsProvider` / `setTTSProvider()`, `botId` via metadata, TypeScript definitions.

## 1.0.4
- Last version published before this changelog.
