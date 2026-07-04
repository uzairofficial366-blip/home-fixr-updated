import { env } from "../config/env.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function groqChat(
  messages: Msg[],
  opts: { json?: boolean; temperature?: number } = {}
) {
  const key = env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: MODEL,
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
    throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

export async function groqJson<T = unknown>(system: string, user: string): Promise<T> {
  const content = await groqChat(
    [
      { role: "system", content: system + "\nRespond with ONLY valid JSON, no prose." },
      { role: "user", content: user },
    ],
    { json: true }
  );
  return JSON.parse(content) as T;
}
