# LangGraph Analyzer - Reference Implementation

This document explains the LangGraph-based agentic analyzer implementation in Purple Sector.

## Overview

The `LangGraphAnalyzer` is a **true LangGraph implementation** that demonstrates how to build agentic workflows with:
- State management via `StateGraph`
- Node-based architecture
- Conditional edges for dynamic flow
- Built-in observability

## Architecture

### State Definition

```typescript
const AnalysisStateAnnotation = Annotation.Root({
  lapId: Annotation<string>,
  referenceLapId: Annotation<string | undefined>,
  lapData: Annotation<any>,
  referenceData: Annotation<any>,
  comparisonData: Annotation<any>,
  analysis: Annotation<string>,
  suggestions: Annotation<LapSuggestion[]>,
  error: Annotation<string>,
});
```

The state is passed between nodes and accumulates data as it flows through the graph.

### Workflow Graph

```
START
  ↓
fetch_lap_data (Node 1)
  ↓
fetch_reference_lap (Node 2)
  ↓
  ├─ Has reference? ─→ compare_laps (Node 3)
  │                         ↓
  └─ No reference? ─────────┴─→ analyze_with_llm (Node 4)
                                    ↓
                              parse_suggestions (Node 5)
                                    ↓
                                   END
```

### Nodes

Each node is a function that:
1. Receives the current state
2. Performs an operation
3. Returns partial state updates

**Node 1: fetch_lap_data**
- Fetches telemetry data from database
- Returns `{ lapData }`

**Node 2: fetch_reference_lap**
- Conditionally fetches reference lap
- Returns `{ referenceData }` or `{}`

**Node 3: compare_laps**
- Compares current lap with reference
- Returns `{ comparisonData }` or `{}`

**Node 4: analyze_with_llm**
- Sends data to LLM for analysis
- Returns `{ analysis, error }`

**Node 5: parse_suggestions**
- Parses LLM response into structured suggestions
- Returns `{ suggestions }`

### Edges

**Regular Edges** (fixed flow):
```typescript
workflow.addEdge(START, 'fetch_lap_data');
workflow.addEdge('fetch_lap_data', 'fetch_reference_lap');
workflow.addEdge('compare_laps', 'analyze_with_llm');
workflow.addEdge('analyze_with_llm', 'parse_suggestions');
workflow.addEdge('parse_suggestions', END);
```

**Conditional Edge** (agent decision):
```typescript
workflow.addConditionalEdges(
  'fetch_reference_lap',
  (state) => {
    // Agent decides: compare or skip to analysis?
    return state.referenceData ? 'compare' : 'analyze';
  },
  {
    compare: 'compare_laps',
    analyze: 'analyze_with_llm',
  }
);
```

This is where the **agentic behavior** happens - the workflow dynamically chooses the next node based on state.

## Usage

```typescript
const analyzer = new LangGraphAnalyzer();

// Analyze a lap
const suggestions = await analyzer.analyze(lapId, referenceLapId);
```

## Console Output

When running, you'll see the workflow execution:

```
🚀 Starting LangGraph analysis...
   Lap ID: abc123
   Reference Lap ID: def456
📊 Invoking LangGraph workflow...
🔍 Node: fetch_lap_data
🔍 Node: fetch_reference_lap
📊 Node: compare_laps
🤖 Node: analyze_with_llm
📝 Node: parse_suggestions
✅ Analysis complete!
   Generated 4 suggestions
```

## Key Features

### 1. State Management
State flows through nodes and accumulates data:
```typescript
// Initial state
{ lapId: 'abc', suggestions: [] }

// After fetch_lap_data
{ lapId: 'abc', lapData: {...}, suggestions: [] }

// After fetch_reference_lap
{ lapId: 'abc', lapData: {...}, referenceData: {...}, suggestions: [] }

// Final state
{ lapId: 'abc', ..., suggestions: [...] }
```

### 2. Conditional Flow
The graph adapts based on data:
- **With reference lap**: fetch → compare → analyze → parse
- **Without reference lap**: fetch → analyze → parse (skips compare)

### 3. Node Isolation
Each node is independent and testable:
```typescript
// Can test nodes individually
const result = await workflow.nodes.fetch_lap_data({ lapId: 'test' });
```

### 4. Composability
Nodes can be reused in different workflows:
```typescript
// Same node, different graphs
const quickAnalysis = new StateGraph()
  .addNode('fetch_lap_data', fetchLapDataNode)
  .addNode('quick_analyze', quickAnalyzeNode);

const deepAnalysis = new StateGraph()
  .addNode('fetch_lap_data', fetchLapDataNode)  // Reused!
  .addNode('deep_analyze', deepAnalyzeNode);
```

## Extending the Workflow

### Adding a New Node

```typescript
// Add a node for ML prediction
workflow.addNode('ml_prediction', async (state) => {
  console.log('🤖 Node: ml_prediction');
  const prediction = await callMLModel(state.lapData);
  return { mlPrediction: prediction };
});

// Insert into flow
workflow.addEdge('compare_laps', 'ml_prediction');
workflow.addEdge('ml_prediction', 'analyze_with_llm');
```

### Adding Conditional Logic

```typescript
// Add decision point: should we do deep analysis?
workflow.addConditionalEdges(
  'analyze_with_llm',
  (state) => {
    // Agent decides: is confidence low?
    const confidence = calculateConfidence(state.analysis);
    return confidence < 0.7 ? 'deep_dive' : 'parse';
  },
  {
    deep_dive: 'deep_analysis_node',
    parse: 'parse_suggestions',
  }
);
```

### Adding Cycles (Iterative Refinement)

```typescript
// Add a loop for refinement
workflow.addConditionalEdges(
  'parse_suggestions',
  (state) => {
    // Agent decides: are suggestions good enough?
    const quality = evaluateQuality(state.suggestions);
    return quality > 0.8 ? 'done' : 'refine';
  },
  {
    done: END,
    refine: 'analyze_with_llm',  // Loop back!
  }
);
```

## Comparison: Sequential vs LangGraph

| Feature | Sequential | LangGraph |
|---------|-----------|-----------|
| **Structure** | Linear function calls | Graph with nodes/edges |
| **Flow** | Fixed | Dynamic (conditional) |
| **Decisions** | if/else in code | Conditional edges |
| **Observability** | Manual logging | Built-in tracing |
| **Reusability** | Copy/paste | Compose nodes |
| **Testing** | Test whole flow | Test individual nodes |
| **Cycles** | Not possible | Supported |
| **Visualization** | None | Can generate diagrams |

## Future Enhancements

### 1. MCP Integration
Add nodes that call MCP tools:
```typescript
workflow.addNode('fetch_corner_data', async (state) => {
  const data = await mcpClient.callTool('getCornerAnalysis', {
    lapId: state.lapId,
    cornerNum: 3
  });
  return { cornerData: data };
});
```

### 2. Human-in-the-Loop
Pause for user input:
```typescript
workflow.addNode('ask_user', async (state) => {
  // Pause and wait for user confirmation
  const userInput = await promptUser('Continue with deep analysis?');
  return { userApproved: userInput };
});
```

### 3. Parallel Execution
Run nodes in parallel:
```typescript
// Fetch multiple data sources simultaneously
workflow.addNode('parallel_fetch', async (state) => {
  const [lapData, weatherData, trackData] = await Promise.all([
    fetchLapData(state.lapId),
    fetchWeatherData(state.sessionId),
    fetchTrackData(state.trackId),
  ]);
  return { lapData, weatherData, trackData };
});
```

### 4. Error Recovery
Add error handling nodes:
```typescript
workflow.addConditionalEdges(
  'analyze_with_llm',
  (state) => {
    return state.error ? 'retry' : 'parse';
  },
  {
    retry: 'analyze_with_llm',  // Retry on error
    parse: 'parse_suggestions',
  }
);
```

## Configuration

Set the LLM model via environment variable:
```env
LANGGRAPH_MODEL=gpt-4-turbo-preview
# or
LANGGRAPH_MODEL=gpt-3.5-turbo  # Faster, cheaper
# or
LANGGRAPH_MODEL=claude-3-opus  # Different provider
```

## Debugging

Enable verbose logging:
```typescript
const workflow = this.buildWorkflow();

// Log state after each node
workflow.on('node:end', (node, state) => {
  console.log(`Node ${node} completed:`, state);
});

const result = await workflow.invoke(initialState);
```

## Performance

- **Simple analysis**: ~2-3 seconds
- **With comparison**: ~3-4 seconds
- **With ML models**: ~5-10 seconds (future)

Most time is spent in the LLM call (`analyze_with_llm` node).

## Summary

The LangGraph analyzer demonstrates:
- ✅ True graph-based workflow
- ✅ Conditional logic (agent decisions)
- ✅ State management
- ✅ Node composability
- ✅ Extensibility for complex workflows

This serves as a **reference implementation** for building more sophisticated agentic analysis workflows in the future.
