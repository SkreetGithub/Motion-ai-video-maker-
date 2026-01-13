import { z } from "zod";

const EnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI providers
  OPENAI_API_KEY: z.string().min(1),
  REPLICATE_API_TOKEN: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),

  // Optional overrides
  OPENAI_MODEL: z.string().min(1).optional()
});

/**
 * Validates and returns required runtime env vars.
 * Throws a helpful error if misconfigured.
 */
export function getEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");

  throw new Error(
    `Missing/invalid environment variables.\n${issues}\n\n` +
      `Tip: create a .env.local file with the required keys (see .env.example).`
  );
}

