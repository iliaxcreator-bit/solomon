import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, ThinkingLevel, Modality, LiveServerMessage } from "@google/genai";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "25mb" }));

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

export const SOLOMON_SYSTEM_INSTRUCTION = `You are "მეფე სოლომონი" (King Solomon) — a wise, serene, and deeply reflective mentor. Your guidance is directly grounded in the biblical Wisdom Literature (Proverbs, Ecclesiastes) and the sober lessons of your own life's rise and fall.

CORE PHILOSOPHICAL PILLARS:
1. Fear of the Lord & Humility: "უფლის შიში ცოდნის სათავეა." True wisdom begins with reverence for God and the recognition of human limitation, not self-exaltation or ego.
2. Guarding the Heart: "შეინახე გული ყოველ შესანახავზე მეტად, რადგან მასშია სიცოცხლის წყარო." Protect the mind and soul from distraction, vanity, and deceptive desires.
3. Restraint of Speech: "საკუთარი პირისა და ენის დამცველი თავს გაჭირვებისგან იცავს." Encourage soft, well-considered answers over hasty, emotional reactions.
4. Internal Discipline: Expose procrastination and absurd excuses ("გარეთ ლომია!"). Teach self-governance like the ant, who needs no overseer to work faithfully.
5. Action Over Mere Knowledge: Emphasize that knowing wisdom is worthless if it is not lived out daily. Be mindful of your own solemn warning — that despite having unmatched wisdom, going after worldly temptations led to spiritual tragedy.

RESPONSE BEHAVIOR:
- Speak in warm, calm, noble, and deeply respectful Georgian (ქართული ენა).
- Never structure responses into rigid technical checklists (like "7 rules" or "10 steps"). Speak in a natural, conversational, and poetic wisdom style.
- Avoid superficial productivity tips or vanity metrics. Focus on the state of the user's heart, motives, and character.
- Response Structure (keep it concise, 3-5 sentences):
  1. Acknowledge the user's situation with deep discernment.
  2. Ground your thought in a timeless proverb principle.
  3. Offer 1 quiet, self-reflective question or small practical step for today.`;

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Chat Endpoint (Multi-turn)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, mode = "general" } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGemini();

    // Map conversation history into Gemini format
    // Contents structure: array of { role: 'user' | 'model', parts: [{ text }] }
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Choose model according to mode
    // "deep" -> gemini-3.1-pro-preview with high thinking (with fallback to gemini-3.8-flash)
    // "fast" -> gemini-3.1-flash-lite
    // "general" -> gemini-3.5-flash
    let modelName = "gemini-3.5-flash";
    let config: any = {
      systemInstruction: SOLOMON_SYSTEM_INSTRUCTION,
      temperature: 0.75,
    };

    if (mode === "deep") {
      modelName = "gemini-3.1-pro-preview";
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (mode === "fast") {
      modelName = "gemini-3.1-flash-lite";
    }

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      return res.json({
        text: response.text || "",
        modelUsed: modelName,
      });
    } catch (innerErr: any) {
      // If pro model fails (e.g. key permissions), fallback gracefully to gemini-3.8-flash
      if (mode === "deep") {
        console.warn("Pro model fallback to gemini-3.8-flash:", innerErr?.message);
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents,
          config: {
            systemInstruction: SOLOMON_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            temperature: 0.75,
          },
        });
        return res.json({
          text: fallbackResponse.text || "",
          modelUsed: "gemini-3.8-flash",
          note: "Grounded with High Thinking",
        });
      }
      throw innerErr;
    }
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to generate Solomon's counsel." });
  }
});

// SSE Streaming Chat Endpoint
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { messages, mode = "general" } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGemini();
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    let modelName = "gemini-3.5-flash";
    let config: any = {
      systemInstruction: SOLOMON_SYSTEM_INSTRUCTION,
      temperature: 0.75,
    };

    if (mode === "deep") {
      modelName = "gemini-3.1-pro-preview";
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (mode === "fast") {
      modelName = "gemini-3.1-flash-lite";
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (streamErr: any) {
      // Fallback for deep mode
      if (mode === "deep") {
        console.warn("Fallback to gemini-3.8-flash for streaming:", streamErr?.message);
        const fallbackStream = await ai.models.generateContentStream({
          model: "gemini-3.8-flash",
          contents,
          config: {
            systemInstruction: SOLOMON_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            temperature: 0.75,
          },
        });
        for await (const chunk of fallbackStream) {
          const text = chunk.text || "";
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      throw streamErr;
    }
  } catch (error: any) {
    console.error("Error in /api/chat/stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Streaming failed." });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Audio Transcription (gemini-3.5-transcribe)
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "audioBase64 is required." });
    }

    const ai = getGemini();
    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          audioPart,
          {
            text: "Transcribe the spoken words verbatim. Maintain the exact spoken language (especially Georgian/ქართული). Return only the transcription text without commentary.",
          },
        ],
      },
    });

    res.json({ text: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/transcribe:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio." });
  }
});

// Text-to-Speech (gemini-3.1-flash-tts-preview)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Fenrir" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }

    const ai = getGemini();
    // Prompt styled for King Solomon's spoken contemplation
    const prompt = `Speak this wise counsel in a serene, noble, and deeply reflective tone: ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Fenrir" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "No audio generated from TTS model." });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: "audio/pcm;rate=24000",
      sampleRate: 24000,
    });
  } catch (error: any) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: error.message || "Failed to synthesize speech." });
  }
});

// Daily Contemplation / Parable Generator
app.post("/api/wisdom/parable", async (req, res) => {
  try {
    const { topic } = req.body;
    const ai = getGemini();

    const prompt = topic
      ? `გთხოვ, გამიზიარე მეფე სოლომონის სიბრძნე და იგავი თემაზე: "${topic}". დაიცავი შენი ხასიათი (იგავნი, ეკლესიასტე, გულის შენახვა, ენის თავშეკავება, შრომა და თავმდაბლობა). ფორმატი: 3-4 წინადადება, უსაზღვროდ ღრმა და მშვიდი.`
      : `გთხოვ, მომეცი დღევანდელი დღის სიბრძნის დარიგება მეფე სოლომონისგან. შეეხე გულის განწმენდას, ენის დამორჩილებას, ან დროის წარმავლობას. ფორმატი: 3-4 წინადადება.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SOLOMON_SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Error in /api/wisdom/parable:", error);
    res.status(500).json({ error: error.message || "Failed to generate wisdom reflection." });
  }
});

async function startServer() {
  const server = http.createServer(app);

  // Set up WebSocket server for Gemini Live Voice API (gemini-3.8-live)
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    let session: any = null;
    try {
      const ai = getGemini();
      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } },
          },
          systemInstruction: SOLOMON_SYSTEM_INSTRUCTION + " You are in a real-time live voice dialogue. Speak concisely in serene Georgian.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Live client message error:", e);
        }
      });

      clientWs.on("close", () => {
        try {
          if (session && typeof session.close === "function") {
            session.close();
          }
        } catch (e) {
          // ignore
        }
      });
    } catch (err: any) {
      console.error("Error setting up Gemini Live session:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: err.message || "Failed to connect to Live API" }));
      }
    }
  });

  // Setup Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`მეფე სოლომონის სერვერი ჩაირთო პორტზე http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
