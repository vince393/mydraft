---
name: TTS / Read Aloud playback
description: Why AI TTS audio fails to play in browsers and the two fixes that make it cross-platform
---

# Read Aloud (AI TTS) cross-platform playback

The AI audio modality (`gpt-audio-mini` chat completions with `audio.format: "wav"`)
returns a **streaming WAV header**: the RIFF chunk size and the `data` subchunk size
are both `0xFFFFFFFF` (unknown length) even though real audio bytes follow.

**Rule:** Always rewrite those size fields to the true byte lengths before sending WAV
audio to a browser.
**Why:** Strict decoders (iOS Safari, some Chrome builds) refuse to play a WAV with
unknown/sentinel chunk sizes, so playback silently fails on every platform — not just
mobile. The server produced valid PCM; only the header was wrong.
**How to apply:** Normalize the header in the shared TTS client so every audio route
benefits (this is where `textToSpeech` lives). The model output is "data"-last PCM,
so patching RIFF size = totalLen-8 and data size = bytes-after-data-header is sufficient.

**Mobile gesture rule:** Browser audio must be unlocked inside the user gesture. If
`audio.play()` is only called after an `await fetch(...)`, mobile browsers block it.
**How to apply:** In the click handler, synchronously create the `Audio` element and
call `play()` on a tiny silent WAV data URI to unlock it, then reuse that same element
(don't create a new one) once the fetched audio arrives.

This feature had many prior failed "fix read aloud" attempts — both issues had to be
fixed together for it to work on desktop and mobile.
