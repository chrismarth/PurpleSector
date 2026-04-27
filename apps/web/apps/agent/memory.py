"""
Agent memory — retrieves relevant past conversations for context injection.

Port of packages/plugin-agent/src/server/memory.ts
"""

from __future__ import annotations

from .models import AgentConversation, AgentMessage


def get_memory_context(user_id: str, current_message: str) -> str | None:
    """Return a short text block with relevant past conversation summaries."""

    conversations = (
        AgentConversation.objects.filter(user_id=user_id)
        .exclude(summary__isnull=True)
        .exclude(summary="")
        .order_by("-updated_at")[:10]
    )

    if not conversations:
        return None

    # Simple keyword matching (upgradeable to embeddings later)
    query_words = [w.lower() for w in current_message.split() if len(w) > 3]
    if not query_words:
        return None

    scored = []
    for conv in conversations:
        text = f"{conv.title or ''} {conv.summary or ''}".lower()
        score = sum(1 for w in query_words if w in text)
        if score > 0:
            scored.append((score, conv))

    scored.sort(key=lambda x: x[0], reverse=True)
    relevant = scored[:3]

    if not relevant:
        return None

    return "\n".join(
        f"[{conv.title or 'Untitled'}]: {conv.summary}"
        for _, conv in relevant
    )


def generate_conversation_summary(conversation_id: str) -> None:
    """Auto-generate a title and summary for a conversation after a few messages."""

    try:
        conv = AgentConversation.objects.get(id=conversation_id)
    except AgentConversation.DoesNotExist:
        return

    msgs = list(
        conv.messages.order_by("created_at")[:6].values_list("role", "content")
    )
    if len(msgs) < 2:
        return
    if conv.title and conv.summary:
        return

    # Simple heuristic: first user message as title
    first_user = next((content for role, content in msgs if role == "user"), None)
    title = (first_user[:100] if first_user else "Agent conversation")

    summary = " | ".join(
        f"{role}: {content[:200]}"
        for role, content in msgs
        if role in ("user", "assistant")
    )[:500]

    AgentConversation.objects.filter(id=conversation_id).update(title=title, summary=summary)
