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

  return (transcription as any).text?.trim() || "";
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
  } as any);

  const choice = response.choices[0] as any;
  const text = choice?.message?.audio?.transcript || choice?.message?.content || "";
  let audio = choice?.message?.audio?.data || "";

  if (text && !audio) {
    try {
      audio = await textToSpeech(text);
    } catch {
      console.warn("Fallback TTS failed, returning text-only response");
    }
  }

  return { text, audio };
}

export async function textToSpeech(text: string, voice: string = "onyx"): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-audio-mini",
      modalities: ["text", "audio"],
      audio: {
        voice,
        format: "wav",
      },
      messages: [
        { role: "system", content: "Repeat the user's message exactly as spoken audio. Do not add anything else." },
        { role: "user", content: text },
      ],
    } as any);

    const choice = response.choices[0] as any;
    return choice?.message?.audio?.data || "";
  } catch (error) {
    console.error("TTS error:", error);
    return "";
  }
}

export { openai };
