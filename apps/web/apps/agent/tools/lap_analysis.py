"""Agent tools for lap analysis."""

from __future__ import annotations

from apps.telemetry.models import Lap
from apps.events.models import Session

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="analyzeLap",
        description=(
            "Run AI-powered analysis on a lap to generate driving improvement suggestions. "
            "Uses the configured analyzer (simple or langgraph). Optionally compares against a reference lap."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "lapId": {"type": "string", "description": "The lap ID to analyze"},
                "referenceLapId": {
                    "type": "string",
                    "description": "Optional reference lap ID to compare against. If omitted, the fastest lap in the same session is used.",
                },
                "analyzer": {
                    "type": "string",
                    "description": 'Analyzer type: "simple" (fast, 1 API call) or "langgraph" (comprehensive agentic workflow). Defaults to env ANALYZER_TYPE or "simple".',
                },
            },
            "required": ["lapId"],
        },
        category="lapAnalysis",
    ),
    ToolDefinition(
        name="getLapTelemetrySummary",
        description=(
            "Get a computed telemetry summary for a lap (avg/max speed, braking events, throttle metrics, "
            "steering smoothness) without running the full AI analysis."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "lapId": {"type": "string", "description": "The lap ID"},
            },
            "required": ["lapId"],
        },
        category="lapAnalysis",
    ),
    ToolDefinition(
        name="listAnalyzers",
        description="List available lap analysis engines and their characteristics (speed, cost, description).",
        input_schema={"type": "object", "properties": {}},
        category="lapAnalysis",
    ),
]


async def analyze_lap(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        lap = Lap.objects.select_related("session").get(id=args["lapId"])
    except Lap.DoesNotExist:
        return ToolResult(success=False, message="Lap not found.")
    if not Session.objects.filter(id=lap.session_id, user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Lap not found.")
    return ToolResult(
        success=False,
        message=(
            "Lap analysis via agent tools is not supported yet. "
            "Telemetry frames are stored in Iceberg and must be queried via Trino by (sessionId, lapNumber)."
        ),
    )


async def get_lap_telemetry_summary(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        lap = Lap.objects.select_related("session").get(id=args["lapId"])
    except Lap.DoesNotExist:
        return ToolResult(success=False, message="Lap not found.")
    if not Session.objects.filter(id=lap.session_id, user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Lap not found.")
    return ToolResult(
        success=False,
        message=(
            "Lap telemetry summary via agent tools is not supported yet. "
            "Telemetry frames are stored in Iceberg and must be queried via Trino by (sessionId, lapNumber)."
        ),
    )


async def list_analyzers(args: dict, ctx: ToolContext) -> ToolResult:
    analyzers = [
        {"type": "simple", "name": "Simple Analyzer", "description": "Fast single-call OpenAI analysis", "speed": "fast", "cost": "low"},
        {"type": "langgraph", "name": "LangGraph Analyzer", "description": "Comprehensive agentic DAG pipeline", "speed": "slow", "cost": "medium"},
    ]
    return ToolResult(
        success=True,
        data=analyzers,
        message=f"Available analyzers: {', '.join(a['name'] + ' (' + a['type'] + ')' for a in analyzers)}",
    )


handlers = {
    "analyzeLap": analyze_lap,
    "getLapTelemetrySummary": get_lap_telemetry_summary,
    "listAnalyzers": list_analyzers,
}

register_tools(definitions, handlers)
