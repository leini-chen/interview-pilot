# InterviewPilot — live voice interview

## Start locally

Requires Node.js 22 or newer. No npm dependencies are needed.

1. Copy `.env.example` to `.env` if `.env` does not exist.
2. Put your own OpenAI API key after `OPENAI_API_KEY=` in `.env`. Never put it in frontend JavaScript or send it in chat.
3. Run `node server.mjs` (or `npm start`) and open http://127.0.0.1:5173/.
4. Complete interview setup, open the studio, click **Check connection**, then **Join interview** and allow microphone access. Camera preview is optional.

The server rereads `.env` on API requests. Saving a key does not require a restart. “Configured” means a key is present; actual model access, credentials, and quota are checked when joining the call. A failed call shows the service error without silently switching to a scripted demo.

Default models are `gpt-realtime-2.1` for speech and `gpt-4.1-mini` for the final report. Both can be changed with the server environment variables shown in `.env.example`. Use a model your API project can access. API usage is billed to the key’s project.

## Interaction

- English-only, audio-first live conversation over WebRTC with semantic turn detection and interruption support. No answer submission is required.
- Company, exact role, JD, interview stage, track, custom format, resume highlights, and supplied public interviewer background are passed as interview context.
- 14 tracks plus a custom track; preset and custom interview formats.
- 5–60 minute practice timer. Pause disables the microphone and stops the practice timer. A live connection has a separate one-hour wall-clock limit including pauses; the app wraps up shortly before that limit.
- AI/candidate captions are recorded in page memory. Silent coaching observations remain hidden until report generation.
- Coding includes an original two-sum-style task, JavaScript tests, and a Python edit-only option. **Share code with Alex** sends the current code snapshot; the model cannot see unshared edits.
- End the call to generate evidence-based feedback from the transcript and any code snapshot. Reports can be retried or exported with the transcript.

## Data and boundaries

The camera is only a local preview. No video is transmitted or analyzed, and the AI participant is a voice visualization rather than a human video avatar. Audio and supplied interview context are sent to OpenAI during the call. Transcripts and coaching notes live in page memory; they are sent to the report endpoint at the end. The report request uses `store: false`; provider data policies still apply. No local audio/video recordings or transcript database are created. Reloading loses an unexported session.

The server binds to loopback only. It checks Host and Origin, limits request bodies, and serves only explicitly allowed public files. `.env` is excluded from Git and cannot be fetched from the server. This is a local development app: add authentication, per-user limits, session authorization, and a production hosting adapter before public deployment. The old Sites static manifest does not deploy this Node backend.

Validation: `npm test`. Tests mock the external AI service; a real end-to-end voice call still requires your API key and a browser with microphone permission.

Official references:
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://developers.openai.com/api/docs/guides/realtime-vad
- https://developers.openai.com/api/docs/guides/realtime-conversations
