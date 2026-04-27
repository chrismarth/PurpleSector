"""
LangGraph agent runtime — Python port of packages/plugin-agent/src/server/runtime.ts.

Builds a StateGraph that:
  1. Calls the LLM with bound tools
  2. If the LLM requests mutating tools → returns a plan for user approval
  3. If read-only tools → executes them automatically and loops back to the LLM
  4. Otherwise returns the final text response
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool as langchain_tool, StructuredTool
from langchain_core.messages import (
    BaseMessage,
    HumanMessage,
    AIMessage,
    SystemMessage,
    ToolMessage,
)
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing import Annotated, TypedDict

from .tools import (
    ToolDefinition,
    ToolContext,
    ToolResult,
    ToolHandler,
    get_all_definitions,
    get_all_handlers,
    get_mutating_tool_names,
)

logger = logging.getLogger(__name__)


# ── Types ────────────────────────────────────────────────────────────────


@dataclass
class AgentPlanStep:
    id: str
    tool_name: str
    args: dict[str, Any]
    description: str
    status: str = "pending"  # pending | running | done | failed
    result: Any = None


@dataclass
class AgentPlan:
    id: str
    steps: list[AgentPlanStep]
    status: str = "draft"  # draft | approved | executing | completed | failed


@dataclass
class AgentResponse:
    content: str
    plan: AgentPlan | None = None
    tool_results: list[dict[str, Any]] | None = None


# ── LangGraph State ─────────────────────────────────────────────────────


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# ── Build LangChain tools from definitions + handlers ────────────────────


def _build_langchain_tools(
    definitions: list[ToolDefinition],
    handlers: dict[str, ToolHandler],
    tool_context: ToolContext,
) -> list[StructuredTool]:
    tools: list[StructuredTool] = []
    for defn in definitions:
        handler = handlers.get(defn.name)
        if not handler:
            continue

        # Capture handler in closure
        _handler = handler
        _name = defn.name

        async def _invoke(
            _h=_handler,
            _ctx=tool_context,
            **kwargs: Any,
        ) -> str:
            result = await _h(kwargs, _ctx)
            return json.dumps({"success": result.success, "message": result.message, "data": result.data})

        t = langchain_tool(
            _invoke,
            name=defn.name,
            description=defn.description,
        )
        tools.append(t)
    return tools


# ── System prompt ────────────────────────────────────────────────────────


def _build_system_prompt(
    definitions: list[ToolDefinition],
    memory_context: str | None = None,
) -> str:
    mutating = [d.name for d in definitions if d.mutating]
    prompt = (
        "You are the Purple Sector AI Agent — an embedded assistant for a racing telemetry analysis application.\n\n"
        "You can help users manage events, sessions, laps, vehicles, vehicle configurations, vehicle setups, "
        "run plans, and analysis layouts. Anything else outside of these domains is outside of your expertise, "
        "and you should politely decline to assist.\n\n"
        "IMPORTANT RULES:\n"
        "1. When the user asks a question that only requires reading data, use the appropriate tools and respond directly.\n"
        "2. When the user asks you to CREATE, UPDATE, or DELETE something, you MUST formulate a plan first. "
        "Output your plan as a structured list of steps, then wait for the user to approve before executing.\n"
        f"3. The following tools are MUTATING and require plan mode: {', '.join(mutating)}\n"
        "4. When presenting a plan, describe each step in plain language so the user can verify it.\n"
        "5. After the user approves a plan, execute each step in order and report results.\n"
        "6. Be concise and helpful. Use racing terminology where appropriate.\n"
        "7. If you're unsure about something, ask the user for clarification."
    )
    if memory_context:
        prompt += f"\n\nRELEVANT CONTEXT FROM PAST CONVERSATIONS:\n{memory_context}"
    return prompt


# ── Describe a tool call for the plan view ───────────────────────────────


def _describe_tool_call(
    name: str,
    args: dict[str, Any],
    definitions: list[ToolDefinition],
) -> str:
    defn = next((d for d in definitions if d.name == name), None)
    label = defn.description if defn else name
    key_args = ", ".join(
        f'{k}: "{v}"' for k, v in args.items() if v is not None and v != ""
    )
    return f"{label} ({key_args})" if key_args else label


# ── Public API ───────────────────────────────────────────────────────────


async def invoke_agent(
    messages: list[dict[str, str]],
    tool_context: ToolContext,
    model: str | None = None,
    memory_context: str | None = None,
) -> AgentResponse:
    """Run the agent graph and return the response."""

    definitions = get_all_definitions()
    handlers = get_all_handlers()
    mutating_names = set(get_mutating_tool_names())

    llm = ChatOpenAI(model=model or "gpt-4", temperature=0)
    lc_tools = _build_langchain_tools(definitions, handlers, tool_context)
    llm_with_tools = llm.bind_tools(lc_tools)

    system_prompt = _build_system_prompt(definitions, memory_context)

    # Convert input messages
    lc_messages: list[BaseMessage] = [SystemMessage(content=system_prompt)]
    for msg in messages:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    # Build graph
    tool_node = ToolNode(lc_tools)

    async def call_model(state: AgentState) -> dict:
        response = await llm_with_tools.ainvoke(state["messages"])
        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if isinstance(last, AIMessage) and last.tool_calls:
            has_mutating = any(tc["name"] in mutating_names for tc in last.tool_calls)
            if has_mutating:
                return "plan"
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", should_continue, {
        "tools": "tools",
        "plan": END,
        END: END,
    })
    graph.add_edge("tools", "agent")
    compiled = graph.compile()

    result = await compiled.ainvoke({"messages": lc_messages})

    # Extract response
    all_messages: list[BaseMessage] = result["messages"]
    last_message = all_messages[-1]

    # Collect tool results
    tool_results = []
    for msg in all_messages:
        if isinstance(msg, ToolMessage):
            try:
                tool_results.append({"toolName": msg.name or "unknown", "result": json.loads(msg.content)})
            except (json.JSONDecodeError, TypeError):
                tool_results.append({"toolName": msg.name or "unknown", "result": msg.content})

    # Check if we stopped in plan mode
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        has_mutating = any(tc["name"] in mutating_names for tc in last_message.tool_calls)
        if has_mutating:
            import time

            plan = AgentPlan(
                id=f"plan_{int(time.time() * 1000)}",
                steps=[
                    AgentPlanStep(
                        id=f"step_{i}",
                        tool_name=tc["name"],
                        args=tc["args"],
                        description=_describe_tool_call(tc["name"], tc["args"], definitions),
                    )
                    for i, tc in enumerate(last_message.tool_calls)
                ],
            )
            return AgentResponse(
                content=str(last_message.content) or "I've prepared a plan for you to review:",
                plan=plan,
                tool_results=tool_results or None,
            )

    return AgentResponse(
        content=str(last_message.content),
        tool_results=tool_results or None,
    )


async def execute_plan(
    plan: AgentPlan,
    tool_context: ToolContext,
) -> AgentPlan:
    """Execute an approved plan step-by-step."""

    handlers = get_all_handlers()
    plan.status = "executing"

    for step in plan.steps:
        step.status = "running"
        handler = handlers.get(step.tool_name)
        if not handler:
            step.status = "failed"
            step.result = {"success": False, "message": f"Unknown tool: {step.tool_name}"}
            plan.status = "failed"
            return plan

        try:
            result = await handler(step.args, tool_context)
            step.result = {"success": result.success, "message": result.message, "data": result.data}
            step.status = "done" if result.success else "failed"
            if not result.success:
                plan.status = "failed"
                return plan
        except Exception as exc:
            step.status = "failed"
            step.result = {"success": False, "message": str(exc)}
            plan.status = "failed"
            return plan

    plan.status = "completed"
    return plan
