import { createClient } from "@/lib/supabase";

export async function startConversation(
  currentUserId: string,
  otherUserId: string,
  initialMessage?: string,
  context?: { type: string; title: string; id: string }
): Promise<string | null> {
  const supabase = createClient();

  // Check if conversation already exists (either direction)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      "and(participant_1.eq." + currentUserId + ",participant_2.eq." + otherUserId + ")," +
      "and(participant_1.eq." + otherUserId + ",participant_2.eq." + currentUserId + ")"
    )
    .single();

  if (existing) return existing.id;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      participant_1: currentUserId,
      participant_2: otherUserId,
      initiated_by: currentUserId,
      status: "pending",
      last_message: initialMessage || null,
      last_message_at: new Date().toISOString(),
      context_type: context?.type || null,
      context_title: context?.title || null,
      context_id: context?.id || null,
    })
    .select("id")
    .single();

  if (error || !newConv) return null;

  // Send initial message if provided
  if (initialMessage) {
    await supabase.from("messages").insert({
      conversation_id: newConv.id,
      sender_id: currentUserId,
      content: initialMessage,
      is_seen: false,
    });
  }

  return newConv.id;
}
