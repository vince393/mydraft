import OpenAI from "openai";
import { Readable } from "stream";

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

export async function* voiceChatStream(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  userAudioBuffer?: Buffer
): AsyncGenerator<{ type: "text" | "audio"; data: string }> {
  const chatMessages: any[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  if (userAudioBuffer) {
    const base64Audio = userAudioBuffer.toString("base64");
    chatMessages.push({
      role: "user",
      content: [
        {
          type: "input_audio",
          input_audio: {
            data: base64Audio,
            format: "wav",
          },
        },
      ],
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-audio-mini",
    modalities: ["text", "audio"],
    audio: {
      voice: "nova",
      format: "wav",
    },
    messages: chatMessages,
    stream: true,
  });

  let fullText = "";
  let audioChunks: string[] = [];

  for await (const chunk of response) {
    const delta = chunk.choices[0]?.delta as any;
    
    if (delta?.content) {
      fullText += delta.content;
      yield { type: "text", data: delta.content };
    }
    
    if (delta?.audio?.data) {
      audioChunks.push(delta.audio.data);
      yield { type: "audio", data: delta.audio.data };
    }
    
    if (delta?.audio?.transcript) {
      yield { type: "text", data: delta.audio.transcript };
    }
  }
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
      voice: "nova",
      format: "wav",
    },
    messages: chatMessages,
  });

  const message = response.choices[0]?.message as any;
  const text = message?.audio?.transcript || message?.content || "";
  const audio = message?.audio?.data || "";

  return { text, audio };
}

export async function textToSpeech(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-audio-mini",
    modalities: ["text", "audio"],
    audio: {
      voice: "nova",
      format: "wav",
    },
    messages: [
      {
        role: "user",
        content: `Please repeat the following text exactly, with natural speech: "${text}"`,
      },
    ],
  });

  const message = response.choices[0]?.message as any;
  return message?.audio?.data || "";
}

export { openai };
