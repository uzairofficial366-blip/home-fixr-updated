import { env } from "../config/env.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const CANDIDATE_MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter((m): m is string => Boolean(m && m.trim().length > 0));

type Msg = { role: "system" | "user" | "assistant"; content: string };

function parseJsonSafe<T>(content: string): T {
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }
  return JSON.parse(cleaned) as T;
}

export async function groqChat(
  messages: Msg[],
  opts: { json?: boolean; temperature?: number; model?: string } = {}
) {
  const key = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");

  const modelsToTry = opts.model
    ? [opts.model, ...CANDIDATE_MODELS.filter((m) => m !== opts.model)]
    : CANDIDATE_MODELS;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
      };
      if (opts.json) body.response_format = { type: "json_object" };

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.text();
        if (
          res.status === 404 ||
          t.includes("model_not_found") ||
          t.includes("does not exist") ||
          t.includes("do not have access")
        ) {
          lastError = new Error(`Groq ${res.status} for ${model}: ${t.slice(0, 150)}`);
          continue;
        }
        throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
      }

      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content ?? "";
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error("Failed to communicate with Groq AI service");
}

export async function groqJson<T = unknown>(system: string, user: string): Promise<T> {
  const content = await groqChat(
    [
      { role: "system", content: system + "\nRespond with ONLY valid JSON, no prose." },
      { role: "user", content: user },
    ],
    { json: true }
  );
  return parseJsonSafe<T>(content);
}
