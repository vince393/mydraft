import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

export async function textToSpeech(text: string, voice: string = "nova"): Promise<string> {
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
    console.log(`[TTS] Result: audioDataLength=${base64Audio.length}, hasAudio=${!!base64Audio}`);
    return base64Audio;
  } catch (error: any) {
    console.error("[TTS] Error:", error?.message || error);
    return "";
  }
}

export async function textToSpeechStream(text: string, voice: string = "nova"): Promise<Buffer | null> {
  try {
    const audio = await textToSpeech(text, voice);
    if (!audio) return null;
    return Buffer.from(audio, "base64");
  } catch (error) {
    console.error("TTS stream error:", error);
    return null;
  }
}

export { openai };
