import json
from typing import TypedDict, List
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from langchain_openai import ChatOpenAI
from .models import Lap, ChatMessage
from purplesector.services.trino import get_lap_frames_from_iceberg


# Telemetry analysis types
class BrakingEvent(TypedDict):
    position: float
    intensity: float
    duration: float


class ThrottleMetrics(TypedDict):
    avg_application: float
    smoothness: float
    full_throttle_percent: float


class TelemetrySummary(TypedDict):
    lap_time: float
    avg_speed: float
    max_speed: float
    braking_events: List[BrakingEvent]
    throttle_application: ThrottleMetrics
    steering_smooth: float


def analyze_telemetry_data(frames: List[dict]) -> TelemetrySummary:
    """Analyze telemetry frames and return summary statistics."""
    if not frames:
        raise ValueError("No telemetry frames to analyze")

    speeds = [f.get("speed", 0) for f in frames]
    avg_speed = sum(speeds) / len(speeds)
    max_speed = max(speeds)
    lap_time = frames[-1].get("lapTime", 0) / 1000 if frames else 0

    # Braking events
    braking_events: List[BrakingEvent] = []
    in_braking = False
    braking_start = 0
    braking_intensity = 0

    for i, frame in enumerate(frames):
        brake = frame.get("brake", 0)
        if brake > 0.3 and not in_braking:
            in_braking = True
            braking_start = i
            braking_intensity = brake
        elif brake < 0.1 and in_braking:
            in_braking = False
            duration = (i - braking_start) / 60
            braking_events.append({
                "position": frames[braking_start].get("normalizedPosition", 0),
                "intensity": braking_intensity,
                "duration": duration,
            })
        elif in_braking:
            braking_intensity = max(braking_intensity, brake)

    # Throttle metrics
    throttle_values = [f.get("throttle", 0) for f in frames]
    avg_throttle = sum(throttle_values) / len(throttle_values)
    full_throttle_frames = sum(1 for t in throttle_values if t > 0.95)
    full_throttle_percent = (full_throttle_frames / len(throttle_values)) * 100

    throttle_variance = sum((t - avg_throttle) ** 2 for t in throttle_values) / len(throttle_values)
    throttle_smoothness = 1 - min(throttle_variance, 1)

    # Steering smoothness
    steering_changes = [
        abs(frames[i].get("steering", 0) - frames[i-1].get("steering", 0))
        for i in range(1, len(frames))
    ]
    avg_steering_change = sum(steering_changes) / len(steering_changes) if steering_changes else 0
    steering_smooth = 1 - min(avg_steering_change * 10, 1)

    return {
        "lap_time": lap_time,
        "avg_speed": avg_speed,
        "max_speed": max_speed,
        "braking_events": braking_events,
        "throttle_application": {
            "avg_application": avg_throttle,
            "smoothness": throttle_smoothness,
            "full_throttle_percent": full_throttle_percent,
        },
        "steering_smooth": steering_smooth,
    }


@csrf_exempt
@require_POST
def chat(request):
    """Chat about lap telemetry using AI."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        body = json.loads(request.body)
        lap_id = body.get("lapId")
        message = body.get("message")

        if not lap_id or not message:
            return JsonResponse(
                {"error": "lapId and message are required"},
                status=400
            )

        # Get lap
        try:
            lap = Lap.objects.get(id=lap_id)
        except Lap.DoesNotExist:
            return JsonResponse({"error": "Lap not found"}, status=404)

        # Access control: user must own the session
        if str(lap.session.user_id) != str(request.user.id):
            return JsonResponse({"error": "Forbidden"}, status=403)

        # Save user message
        ChatMessage.objects.create(
            user=request.user,
            lap=lap,
            role="user",
            content=message,
        )

        # Get existing chat history
        chat_messages = list(lap.chat_messages.all().order_by("created_at"))
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in chat_messages
        ]
        conversation_history.append({"role": "user", "content": message})

        # Fetch telemetry from Iceberg
        try:
            telemetry_frames = get_lap_frames_from_iceberg(
                str(request.user.id),
                str(lap.session_id),
                lap.lap_number
            )
        except Exception as e:
            return JsonResponse(
                {"error": f"Failed to fetch telemetry: {str(e)}"},
                status=500
            )

        if not telemetry_frames:
            return JsonResponse(
                {"error": "No telemetry data available for this lap"},
                status=404
            )

        # Analyze telemetry
        telemetry_summary = analyze_telemetry_data(telemetry_frames)
        suggestions = json.loads(lap.suggestions) if lap.suggestions else []

        # Get fastest lap for reference
        fastest_lap = Lap.objects.filter(
            session_id=lap.session_id,
            lap_time__isnull=False,
        ).exclude(id=lap.id).order_by("lap_time").first()

        reference_lap = None
        if fastest_lap:
            try:
                reference_telemetry = get_lap_frames_from_iceberg(
                    str(request.user.id),
                    str(fastest_lap.session_id),
                    fastest_lap.lap_number
                )
                if reference_telemetry:
                    reference_summary = analyze_telemetry_data(reference_telemetry)
                    reference_lap = {
                        "lap_time": fastest_lap.lap_time / 1000 if fastest_lap.lap_time else 0,
                        "summary": reference_summary,
                    }
            except Exception:
                pass  # Skip reference lap if fetch fails

        # Build AI response using langchain-openai
        reference_context = ""
        if reference_lap:
            ref = reference_lap
            time_gap = (telemetry_summary["lap_time"] - ref["lap_time"]) * 1000
            speed_diff = telemetry_summary["avg_speed"] - ref["summary"]["avg_speed"]
            throttle_diff = (
                telemetry_summary["throttle_application"]["full_throttle_percent"] -
                ref["summary"]["throttle_application"]["full_throttle_percent"]
            )
            reference_context = f"""
Reference Lap (Fastest in Session):
- Lap Time: {ref["lap_time"]:.3f}s ({time_gap:.0f}ms gap)
- Average Speed: {ref["summary"]["avg_speed"]:.1f} km/h
- Throttle Smoothness: {ref["summary"]["throttle_application"]["smoothness"] * 100:.1f}%
"""

        system_prompt = f"""You are an expert racing coach helping a driver improve their lap times. You have access to their telemetry data and previous analysis.

Current Lap Summary:
- Lap Time: {telemetry_summary["lap_time"]:.3f}s
- Average Speed: {telemetry_summary["avg_speed"]:.1f} km/h
- Throttle Smoothness: {telemetry_summary["throttle_application"]["smoothness"] * 100:.1f}%
- Steering Smoothness: {telemetry_summary["steering_smooth"] * 100:.1f}%
{reference_context}
Previous Suggestions:
{chr(10).join(f"- {s['message']}" for s in suggestions)}

Provide specific, technical advice based on the data. Be concise and actionable."""

        llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0.7, max_tokens=500)
        messages = [
            ("system", system_prompt),
        ] + [(msg["role"], msg["content"]) for msg in conversation_history]

        response = llm.invoke(messages)
        ai_response = response.content or "I apologize, but I could not generate a response."

        # Save assistant message
        assistant_message = ChatMessage.objects.create(
            user=request.user,
            lap=lap,
            role="assistant",
            content=ai_response,
        )

        return JsonResponse({
            "success": True,
            "message": {
                "id": str(assistant_message.id),
                "role": assistant_message.role,
                "content": assistant_message.content,
                "createdAt": assistant_message.created_at.isoformat(),
            },
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        print(f"Error in chat: {e}")
        return JsonResponse(
            {"error": "Failed to process chat message"},
            status=500
        )
