import hf from "@/lib/calling/hfClient";

const LLM_MODEL = "Qwen/Qwen2.5-7B-Instruct";
export const FALLBACK_BN = "দুঃখিত, প্রযুক্তিগত সমস্যার কারণে আবার বলছি।";
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8009/chat";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
		),
	]);
}

async function generateWithLocalLlama(parentText: string): Promise<string> {
	const response = await withTimeout(
		fetch(LOCAL_LLM_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: parentText,
			}),
		}),
		30000,
		"Local llama"
	);

	if (!response.ok) {
		throw new Error(`Local llama HTTP ${response.status}`);
	}

	const result = await response.json();
	return (result?.reply || "").trim();
}

async function generateWithHF(parentText: string): Promise<string> {
	const systemPrompt =
		"You are a polite kindergarten assistant calling a parent. Speak only in Bangla. Keep responses short, friendly, and professional.";

	const out = await withTimeout(
		hf.chatCompletion({
			model: LLM_MODEL,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: parentText },
			],
			max_tokens: 120,
			temperature: 0.5,
		}),
		30000,
		"HF LLM"
	);

	return (out?.choices?.[0]?.message?.content || "").trim();
}

export async function generateReply(parentText: string): Promise<string> {
	if (!parentText?.trim()) return FALLBACK_BN;

	try {
		const local = await generateWithLocalLlama(parentText);
		if (local) return local;
	} catch (error) {
		console.error("[LLM] local llama failed:", error);
	}

	try {
		const hfReply = await generateWithHF(parentText);
		return hfReply || FALLBACK_BN;
	} catch (error) {
		console.error("[LLM] HF fallback failed:", error);
		return FALLBACK_BN;
	}
}

export async function runConversationTest() {
	const input = "আমার সন্তান আজ স্কুলে আসেনি কেন?";
	const output = await generateReply(input);
	return { input, output };
}
