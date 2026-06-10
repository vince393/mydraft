import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// The audio modality returns WAV data with a streaming header where the RIFF
// and "data" chunk sizes are left as 0xFFFFFFFF (unknown length). Strict audio
// decoders (notably iOS Safari and some Chrome builds) refuse to play such a
// file, which breaks voice assistant playback on every platform. Rewrite the
// size fields to the real byte lengths so the WAV is a valid, fully-specified file.
function normalizeWavHeader(buf: Buffer): Buffer {
  if (buf.length < 44) return buf;
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WAVE") {
    return buf;
  }
  const out = Buffer.from(buf);
  out.writeUInt32LE(out.length - 8, 4);

  let offset = 12;
  while (offset + 8 <= out.length) {
    const id = out.toString("latin1", offset, offset + 4);
    const size = out.readUInt32LE(offset + 4) >>> 0;
    if (id === "data") {
      const remaining = out.length - (offset + 8);
      if (size === 0xffffffff || size === 0 || size > remaining) {
        out.writeUInt32LE(remaining, offset + 4);
      }
      break;
    }
    if (size === 0xffffffff || offset + 8 + size > out.length) break;
    offset += 8 + size + (size % 2);
  }
  return out;
}

export async function speechToText(audioBuffer: Buffer, mimeType: string = "audio/webm"): Promise<string> {
  const audioFile = new File([audioBuffer], "audio.webm", { type: mimeType });
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "gpt-4o-mini-transcribe",
    response_format: "json",
  });

  return (transcription as { text?: string }).text?.trim() || "";
}

export async function voiceChat(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  userText: string
): Promise<{ text: string; audio: string }> {
  const chatMessages = [
    ...messages,
    { role: "user" as const, content: userText },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-audio-mini",
    modalities: ["text", "audio"],
    audio: {
      voice: "onyx",
      format: "wav",
    },
    messages: chatMessages,
  } as Parameters<typeof openai.chat.completions.create>[0]);

  const choice = response.choices[0];
  const audioData = (choice?.message as { audio?: { transcript?: string; data?: string } })?.audio;
  const text = audioData?.transcript || choice?.message?.content || "";
  let audio = audioData?.data || "";

  if (text && !audio) {
    try {
      audio = await textToSpeech(text);
    } catch {
      console.warn("Fallback TTS failed, returning text-only response");
    }
  }

  return { text, audio };
}

async function textToSpeech(text: string, voice: string = "nova"): Promise<string> {
  try {
    console.log(`[TTS] Starting text-to-speech: voice=${voice}, textLength=${text.length}`);
    const response = await openai.chat.completions.create({
      model: "gpt-audio-mini",
      modalities: ["text", "audio"],
      audio: {
        voice: voice as "alloy" | "ash" | "ballad" | "coral" | "echo" | "fable" | "onyx" | "nova" | "sage" | "shimmer",
        format: "wav",
      },
      messages: [
        {
          role: "system",
          content: "Read the following text aloud exactly as written. Do not add commentary, introductions, or modifications. Just read it naturally.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    } as Parameters<typeof openai.chat.completions.create>[0]);

    const choice = response.choices[0];
    const audioData = (choice?.message as { audio?: { data?: string } })?.audio;
    const base64Audio = audioData?.data || "";
    if (!base64Audio) {
      console.log(`[TTS] Result: audioDataLength=0, hasAudio=false`);
      return "";
    }
    const fixed = normalizeWavHeader(Buffer.from(base64Audio, "base64")).toString("base64");
    console.log(`[TTS] Result: audioDataLength=${fixed.length}, hasAudio=true`);
    return fixed;
  } catch (error: any) {
    console.error("[TTS] Error:", error?.message || error);
    return "";
  }
}

export { openai };
