import { createClient } from "@/lib/supabase";

export interface AppError {
  module: string;
  action: string;
  error: unknown;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

const QUEUE_KEY = "klasmeyt_error_queue";

function serializeError(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack || "" };
  }
  if (typeof error === "object" && error !== null) {
    return { message: JSON.stringify(error), stack: "" };
  }
  return { message: String(error), stack: "" };
}

function saveToQueue(entry: object) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(entry);
    // Keep max 50 entries in queue
    if (queue.length > 50) queue.splice(0, queue.length - 50);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

export async function flushErrorQueue(userId?: string | null) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!queue || queue.length === 0) return;

    const supabase = createClient();
    const { error } = await supabase.from("error_logs").insert(
      queue.map((entry: object) => ({ ...entry, user_id: userId || null }))
    );

    if (!error) {
      localStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // Flush failed — queue stays for next attempt
  }
}

export async function logError({ module, action, error, userId, metadata }: AppError) {
  const { message, stack } = serializeError(error);
  const timestamp = new Date().toISOString();

  // Layer 1: Always log to console (captured by Vercel logs)
  console.error(`[${timestamp}] [${module}/${action}]`, {
    message,
    stack,
    userId,
    metadata,
  });

  const entry = {
    created_at: timestamp,
    user_id: userId || null,
    module,
    action,
    error_message: message,
    error_stack: stack,
    metadata: metadata || {},
  };

  // Layer 2: Try Supabase
  try {
    const supabase = createClient();
    const { error: dbError } = await supabase.from("error_logs").insert(entry);
    if (dbError) {
      // Layer 3: Fallback to localStorage queue
      saveToQueue(entry);
    }
  } catch {
    // Layer 3: Fallback to localStorage queue
    saveToQueue(entry);
  }
}
