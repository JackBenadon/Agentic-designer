import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  exaApiKey: required("EXA_API_KEY"),
  groqApiKey: required("GROQ_API_KEY"),
  model: process.env.MODEL_NAME?.trim() || "openai/gpt-oss-120b",
  teracApiKey: process.env.TERAC_API_KEY?.trim() || null,
  teracMcpUrl: process.env.TERAC_MCP_URL?.trim() || "https://terac.com/api/mcp",
};
