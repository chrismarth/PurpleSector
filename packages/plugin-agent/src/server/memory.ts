/**
 * Agent Memory — retrieves relevant past conversations to inject as context.
 */

export async function getMemoryContext(
  prisma: any,
  userId: string,
  currentMessage: string,
): Promise<string | undefined> {
  // Fetch recent conversations with summaries
  const conversations = await prisma.agentConversation.findMany({
    where: { userId, summary: { not: null } },
    select: { id: true, title: true, summary: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  if (conversations.length === 0) return undefined;

  // Simple keyword matching for now — can be upgraded to embeddings later
  const queryWords = currentMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

  const scored = conversations.map((conv: any) => {
    const text = `${conv.title || ''} ${conv.summary || ''}`.toLowerCase();
    const score = queryWords.reduce((s: number, w: string) => s + (text.includes(w) ? 1 : 0), 0);
    return { ...conv, score };
  });

  const relevant = scored
    .filter((c: any) => c.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

  if (relevant.length === 0) return undefined;

  return relevant
    .map((c: any) => `[${c.title || 'Untitled'}]: ${c.summary}`)
    .join('\n');
}

/**
 * Auto-generate a title and summary for a conversation after a few messages.
 */
export async function generateConversationSummary(
  prisma: any,
  conversationId: string,
): Promise<void> {
  const conversation = await prisma.agentConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 6,
        select: { role: true, content: true },
      },
    },
  });

  if (!conversation || conversation.messages.length < 2) return;
  if (conversation.title && conversation.summary) return;

  // Simple heuristic: use first user message as title, concatenate for summary
  const firstUserMsg = conversation.messages.find((m: any) => m.role === 'user');
  const title = firstUserMsg
    ? (firstUserMsg.content as string).slice(0, 100)
    : 'Agent conversation';

  const summary = conversation.messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => `${m.role}: ${(m.content as string).slice(0, 200)}`)
    .join(' | ')
    .slice(0, 500);

  await prisma.agentConversation.update({
    where: { id: conversationId },
    data: { title, summary },
  });
}
