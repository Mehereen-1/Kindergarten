import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE;
const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");

const client = twilio(accountSid, authToken);

export async function placeCall(phoneNumber: string, audioUrl: string): Promise<string> {
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER is missing");
  if (!baseUrl) throw new Error("BASE_URL is missing");

  const normalizedAudioUrl = audioUrl.startsWith("http")
    ? audioUrl
    : `${baseUrl}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;

  const twiml = `
<Response>
  <Play>${normalizedAudioUrl}</Play>
  <Record action="${baseUrl}/api/processSpeech" method="POST" playBeep="true" maxLength="30" timeout="4" />
  <Pause length="1" />
  <Say language="bn-BD">দয়া করে আবার বলুন।</Say>
</Response>
  `.trim();

  const call = await client.calls.create({
    to: phoneNumber,
    from: fromNumber,
    twiml,
  });

  return call.sid;
}

export async function placeCallWithSay(phoneNumber: string, text: string): Promise<string> {
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER is missing");
  if (!baseUrl) throw new Error("BASE_URL is missing");

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const twiml = `
<Response>
  <Say>${escaped}</Say>
  <Record action="${baseUrl}/api/processSpeech" method="POST" playBeep="true" maxLength="30" timeout="4" />
</Response>
  `.trim();

  const call = await client.calls.create({
    to: phoneNumber,
    from: fromNumber,
    twiml,
  });

  return call.sid;
}

export default client;
