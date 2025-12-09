# LangGraph Analyzer

This page documents the LangGraph-based analyzer implementation used for lap analysis in Purple Sector.

## Overview

The `LangGraphAnalyzer` is built with LangGraph's `StateGraph` to orchestrate a multi-step analysis workflow:

- Fetch lap data.
- Optionally fetch a reference lap.
- Compare laps when a reference is present.
- Call an LLM (GPT-based) for analysis.
- Parse structured suggestions for the UI.

It serves as a reference for building more complex agentic workflows around telemetry and lap data.

## State and Workflow

The analyzer defines a state shape that flows between nodes, including:

- `lapId`, `referenceLapId`.
- `lapData`, `referenceData`, `comparisonData`.
- `analysis` (raw LLM output) and `suggestions` (parsed suggestions).
- `error` when things go wrong.

The graph roughly looks like:

```text
START
  ↓
fetch_lap_data
  ↓
fetch_reference_lap
  ↓
 ├─ has reference? → compare_laps → analyze_with_llm → parse_suggestions → END
 └─ no reference? ────────────────→ analyze_with_llm → parse_suggestions → END
```

Each node:

1. Receives the current state.
2. Performs a logical operation (fetch, compare, analyze, parse).
3. Returns partial updates that are merged into the state.

## Conditional Edges

LangGraph conditional edges provide the agentic behavior:

- After `fetch_reference_lap`, a decision function inspects `referenceData`.
  - If present → route to `compare_laps`.
  - If absent → skip directly to `analyze_with_llm`.

Additional conditional edges can be used to implement retries, deep analysis passes, or iterative refinement loops.

## Usage

Conceptually, the analyzer is invoked like:

```ts
const analyzer = new LangGraphAnalyzer();
const suggestions = await analyzer.analyze(lapId, referenceLapId);
```

Internally, the workflow:

1. Loads telemetry for `lapId` (and optional reference).
2. Performs any local comparison logic.
3. Calls the LLM with the collected context.
4. Parses the LLM response into structured `LapSuggestion` objects.

## Extensibility

This graph-based approach makes it straightforward to add:

- New nodes (e.g., additional pre-processing or ML prediction steps).
- Conditional branches based on confidence scores or error states.
- Loops for iterative refinement of suggestions.
- Integration with external tools (e.g., MCP tools) as extra nodes.

For full code-level details and examples of adding nodes/edges, see the original `docs/LANGGRAPH_ANALYZER.md`; this page captures the architectural intent and high-level design.
