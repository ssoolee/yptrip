import { LlmProvider, LlmRequest } from "@/lib/llm/types";

// Google Gemini API (AI Studio 무료 등급) — REST generateContent 호출.
// 서버 전용: GEMINI_API_KEY에 NEXT_PUBLIC_ 접두사를 붙이지 않는다.
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// "-latest" 별칭은 최신 모델을 가리켜 구 모델 지원 종료 시에도 계속 동작한다
// (예: gemini-2.5-flash는 이미 신규 사용자에게 404). Flash-Lite는 무료 등급에서
// 과부하(503)가 적고 1~2초대로 빨라 제목/요약 같은 짧은 생성에 충분하다.
// 더 높은 품질이 필요하면 GEMINI_MODEL=gemini-flash-latest 등으로 지정한다.
const DEFAULT_MODEL = "gemini-flash-lite-latest";

// 무료 등급은 응답이 느려질 때가 있어, 추천 전체 응답 시간(15초 KPI)을
// 지키도록 호출 1건당 상한을 둔다.
const TIMEOUT_MS = 8000;

// 과부하(503)·한도 초과(429)는 모델별로 걸리므로 기본 모델로 한 번 더 시도한다.
const RETRYABLE_STATUS = new Set([429, 500, 503]);

async function callGemini(
  model: string,
  apiKey: string,
  { system, prompt, json, maxTokens = 2048 }: LlmRequest,
): Promise<{ text: string | null; retryable: boolean }> {
  try {
    const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          ...(json && { responseMimeType: "application/json" }),
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { text: null, retryable: RETRYABLE_STATUS.has(res.status) };
    const data = await res.json();
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    return { text: text || null, retryable: false };
  } catch {
    // 타임아웃은 재시도하지 않는다 — 이미 시간 예산을 다 썼다.
    return { text: null, retryable: false };
  }
}

export const geminiProvider: LlmProvider = {
  name: "gemini",
  async generateText(req: LlmRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    const first = await callGemini(model, apiKey, req);
    if (first.text || !first.retryable || model === DEFAULT_MODEL) return first.text;
    return (await callGemini(DEFAULT_MODEL, apiKey, req)).text;
  },
};
