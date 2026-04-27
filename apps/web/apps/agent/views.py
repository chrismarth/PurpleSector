import json
import logging
import traceback

from asgiref.sync import async_to_sync
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import AgentConversation, AgentMessage
from .memory import get_memory_context, generate_conversation_summary
from .runtime import invoke_agent, execute_plan, AgentPlan, AgentPlanStep
from .tools import ToolContext

logger = logging.getLogger(__name__)


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _plan_to_dict(plan: AgentPlan) -> dict:
    return {
        "id": plan.id,
        "status": plan.status,
        "steps": [
            {
                "id": s.id,
                "toolName": s.tool_name,
                "args": s.args,
                "description": s.description,
                "status": s.status,
                "result": s.result,
            }
            for s in plan.steps
        ],
    }


def _dict_to_plan(d: dict) -> AgentPlan:
    return AgentPlan(
        id=d["id"],
        status=d.get("status", "draft"),
        steps=[
            AgentPlanStep(
                id=s["id"],
                tool_name=s["toolName"],
                args=s["args"],
                description=s["description"],
                status=s.get("status", "pending"),
                result=s.get("result"),
            )
            for s in d.get("steps", [])
        ],
    )


# ── POST /chat ───────────────────────────────────────────────────────────


@require_http_methods(["POST"])
def chat(request):
    err = _require_auth(request)
    if err:
        return err

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    message = body.get("message", "").strip()
    if not message:
        return JsonResponse({"error": "Message is required"}, status=400)

    conversation_id = body.get("conversationId")
    app_context = body.get("appContext")
    model = body.get("model")
    user_id = str(request.user.id)

    # Get or create conversation
    if conversation_id:
        conv_id = conversation_id
    else:
        conv = AgentConversation.objects.create(
            user_id=user_id,
            context=json.dumps(app_context) if app_context else None,
        )
        conv_id = str(conv.id)

    # Save user message
    AgentMessage.objects.create(
        conversation_id=conv_id,
        role="user",
        content=message,
    )

    # Load conversation history
    db_messages = (
        AgentMessage.objects.filter(conversation_id=conv_id)
        .order_by("created_at")
        .values_list("role", "content")
    )
    chat_messages = [
        {"role": role, "content": content}
        for role, content in db_messages
        if role in ("user", "assistant")
    ]

    # Get memory context
    memory_context = get_memory_context(user_id, message)

    # Invoke agent
    tool_context = ToolContext(user_id=user_id, app_context=app_context)
    try:
        response = async_to_sync(invoke_agent)(
            messages=chat_messages,
            tool_context=tool_context,
            model=model,
            memory_context=memory_context,
        )
    except Exception:
        logger.exception("Agent chat error")
        return JsonResponse(
            {"error": "Agent chat failed", "details": traceback.format_exc()},
            status=500,
        )

    # Save assistant message
    plan_json = json.dumps(_plan_to_dict(response.plan)) if response.plan else None
    results_json = json.dumps(response.tool_results) if response.tool_results else None

    AgentMessage.objects.create(
        conversation_id=conv_id,
        role="assistant",
        content=response.content,
        plan=plan_json,
        tool_results=results_json,
    )

    # Auto-generate summary in background
    try:
        generate_conversation_summary(conv_id)
    except Exception:
        pass

    return JsonResponse({
        "conversationId": conv_id,
        "content": response.content,
        "plan": _plan_to_dict(response.plan) if response.plan else None,
        "toolResults": response.tool_results,
    })


# ── POST /plan/approve ──────────────────────────────────────────────────


@require_http_methods(["POST"])
def plan_approve(request):
    err = _require_auth(request)
    if err:
        return err

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    conversation_id = body.get("conversationId")
    plan_dict = body.get("plan")
    if not conversation_id or not plan_dict:
        return JsonResponse({"error": "conversationId and plan are required"}, status=400)

    user_id = str(request.user.id)
    tool_context = ToolContext(user_id=user_id)

    plan = _dict_to_plan(plan_dict)

    try:
        executed_plan = async_to_sync(execute_plan)(plan, tool_context)
    except Exception:
        logger.exception("Plan execution error")
        return JsonResponse(
            {"error": "Plan execution failed", "details": traceback.format_exc()},
            status=500,
        )

    step_summaries = []
    for s in executed_plan.steps:
        status_icon = "✓" if s.status == "done" else "✗"
        msg = s.result.get("message", "") if isinstance(s.result, dict) else ""
        step_summaries.append(f"{status_icon} {s.description} — {msg}")

    content = (
        f"Plan executed successfully:\n" + "\n".join(step_summaries)
        if executed_plan.status == "completed"
        else f"Plan execution failed:\n" + "\n".join(step_summaries)
    )

    AgentMessage.objects.create(
        conversation_id=conversation_id,
        role="assistant",
        content=content,
        plan=json.dumps(_plan_to_dict(executed_plan)),
    )

    return JsonResponse({
        "conversationId": conversation_id,
        "plan": _plan_to_dict(executed_plan),
        "content": content,
    })


# ── POST /plan/reject ───────────────────────────────────────────────────


@require_http_methods(["POST"])
def plan_reject(request):
    err = _require_auth(request)
    if err:
        return err

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    conversation_id = body.get("conversationId")
    if not conversation_id:
        return JsonResponse({"error": "conversationId is required"}, status=400)

    reason = body.get("reason")
    content = f"Plan rejected: {reason}" if reason else "Plan rejected by user."

    AgentMessage.objects.create(
        conversation_id=conversation_id,
        role="user",
        content=content,
    )

    return JsonResponse({"conversationId": conversation_id, "content": content})


# ── GET /conversations ───────────────────────────────────────────────────


@require_http_methods(["GET"])
def conversation_list(request):
    err = _require_auth(request)
    if err:
        return err

    from django.db.models import Count

    convs = (
        AgentConversation.objects.filter(user=request.user)
        .annotate(message_count=Count("messages"))
        .order_by("-updated_at")
    )
    data = [
        {
            "id": str(c.id),
            "title": c.title,
            "summary": c.summary,
            "createdAt": c.created_at.isoformat(),
            "updatedAt": c.updated_at.isoformat(),
            "_count": {"messages": c.message_count},
        }
        for c in convs
    ]
    return JsonResponse(data, safe=False)


# ── GET /conversations/:id ──────────────────────────────────────────────


@require_http_methods(["GET"])
def conversation_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        conv = AgentConversation.objects.get(pk=pk, user=request.user)
    except AgentConversation.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    messages_qs = conv.messages.order_by("created_at")
    messages = []
    for m in messages_qs:
        msg = {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "createdAt": m.created_at.isoformat(),
            "plan": json.loads(m.plan) if m.plan else None,
            "toolResults": json.loads(m.tool_results) if m.tool_results else None,
        }
        messages.append(msg)

    return JsonResponse({
        "id": str(conv.id),
        "title": conv.title,
        "summary": conv.summary,
        "context": conv.context,
        "messages": messages,
    })
