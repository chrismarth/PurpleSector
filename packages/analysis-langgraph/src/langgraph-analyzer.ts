/**
 * LangGraph-based Agentic Lap Analyzer
 * 
 * This analyzer uses LangGraph to create a true agentic workflow with:
 * 1. State management via StateGraph
 * 2. Conditional edges for dynamic flow
 * 3. Node-based architecture for composability
 * 4. Built-in observability and tracing
 * 
 * The workflow:
 * 1. Fetches lap telemetry data from database
 * 2. Conditionally fetches reference lap for comparison
 * 3. Compares laps if reference exists
 * 4. Analyzes with LLM reasoning
 * 5. Parses and returns structured suggestions
 * 
 * This serves as a reference implementation for more complex agentic workflows.
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LapSuggestion } from '@/types/telemetry';
import { prisma } from '@purplesector/db-prisma';
import { analyzeTelemetryData } from '@purplesector/analysis-base';

/**
 * Define the state structure for our workflow using LangGraph Annotation
 * This creates a typed state that can be passed between nodes
 */
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

type AnalysisState = typeof AnalysisStateAnnotation.State;

export class LangGraphAnalyzer {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.LANGGRAPH_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  /**
   * Fetch lap telemetry data
   */
  private async fetchLapData(lapId: string): Promise<any> {
    const lap = await prisma.lap.findUnique({
      where: { id: lapId },
      include: {
        session: {
          select: { id: true, name: true },
        },
      },
    });

    if (!lap) {
      throw new Error(`Lap not found: ${lapId}`);
    }

    const telemetryFrames = JSON.parse(lap.telemetryData);
    const summary = analyzeTelemetryData(telemetryFrames);

    return {
      lapId: lap.id,
      lapNumber: lap.lapNumber,
      lapTime: lap.lapTime,
      sessionName: lap.session.name,
      summary,
    };
  }

  /**
   * Fetch reference lap
   */
  private async fetchReferenceLap(sessionId: string, excludeLapId: string): Promise<any | null> {
    const fastestLap = await prisma.lap.findFirst({
      where: {
        sessionId,
        lapTime: { not: null },
        id: { not: excludeLapId },
      },
      orderBy: {
        lapTime: 'asc',
      },
      include: {
        session: {
          select: { name: true },
        },
      },
    });

    if (!fastestLap) {
      return null;
    }

    const telemetryFrames = JSON.parse(fastestLap.telemetryData);
    const summary = analyzeTelemetryData(telemetryFrames);

    return {
      lapId: fastestLap.id,
      lapNumber: fastestLap.lapNumber,
      lapTime: fastestLap.lapTime,
      sessionName: fastestLap.session.name,
      summary,
    };
  }

  /**
   * Compare two laps
   */
  private compareLaps(lapData: any, referenceData: any): any {
    const summary1 = lapData.summary;
    const summary2 = referenceData.summary;

    return {
      lap1: {
        id: lapData.lapId,
        lapNumber: lapData.lapNumber,
        lapTime: lapData.lapTime,
      },
      lap2: {
        id: referenceData.lapId,
        lapNumber: referenceData.lapNumber,
        lapTime: referenceData.lapTime,
      },
      differences: {
        lapTimeDiff: ((summary1.lapTime - summary2.lapTime) * 1000).toFixed(0) + 'ms',
        avgSpeedDiff: (summary1.avgSpeed - summary2.avgSpeed).toFixed(1) + ' km/h',
        maxSpeedDiff: (summary1.maxSpeed - summary2.maxSpeed).toFixed(1) + ' km/h',
        throttleSmoothnessDiff: ((summary1.throttleApplication.smoothness - summary2.throttleApplication.smoothness) * 100).toFixed(1) + '%',
        fullThrottleDiff: ((summary1.throttleApplication.fullThrottlePercent - summary2.throttleApplication.fullThrottlePercent)).toFixed(1) + '%',
        steeringSmoothnessDiff: ((summary1.steeringSmooth - summary2.steeringSmooth) * 100).toFixed(1) + '%',
      },
    };
  }

  /**
   * Build the LangGraph workflow
   * This creates a state graph with nodes and edges that define the analysis flow
   */
  private buildWorkflow() {
    // Create the state graph with our annotation
    const workflow = new StateGraph(AnalysisStateAnnotation);

    // Node 1: Fetch lap telemetry data
    workflow.addNode('fetch_lap_data', async (state: AnalysisState) => {
      console.log('🔍 Node: fetch_lap_data');
      try {
        const lapData = await this.fetchLapData(state.lapId);
        return { lapData };
      } catch (error) {
        return { error: `Failed to fetch lap data: ${error}` };
      }
    });

    // Node 2: Fetch reference lap (if needed)
    workflow.addNode('fetch_reference_lap', async (state: AnalysisState) => {
      console.log('🔍 Node: fetch_reference_lap');
      try {
        if (state.referenceLapId) {
          // Use specific reference lap
          const referenceData = await this.fetchLapData(state.referenceLapId);
          return { referenceData };
        } else {
          // Get fastest lap from session
          const lap = await prisma.lap.findUnique({
            where: { id: state.lapId },
            select: { sessionId: true },
          });
          if (lap) {
            const referenceData = await this.fetchReferenceLap(lap.sessionId, state.lapId);
            return { referenceData };
          }
        }
      } catch (error) {
        console.log('⚠️  No reference lap found, continuing without comparison');
      }
      return {};
    });

    // Node 3: Compare laps
    workflow.addNode('compare_laps', async (state: AnalysisState) => {
      console.log('📊 Node: compare_laps');
      if (state.referenceData && state.lapData) {
        const comparisonData = this.compareLaps(state.lapData, state.referenceData);
        return { comparisonData };
      }
      return {};
    });

    // Node 4: Analyze with LLM
    workflow.addNode('analyze_with_llm', async (state: AnalysisState) => {
      console.log('🤖 Node: analyze_with_llm');
      const result = await this.analyzeWithLLM(state);
      return { analysis: result.analysis, error: result.error };
    });

    // Node 5: Parse suggestions
    workflow.addNode('parse_suggestions', async (state: AnalysisState) => {
      console.log('📝 Node: parse_suggestions');
      const result = this.parseSuggestions(state);
      return { suggestions: result.suggestions };
    });

    // Define the flow: START -> fetch_lap_data
    workflow.addEdge(START as any, 'fetch_lap_data' as any);

    // fetch_lap_data -> fetch_reference_lap
    workflow.addEdge('fetch_lap_data' as any, 'fetch_reference_lap' as any);

    // Conditional edge: decide if we need to compare
    // If we have reference data, go to compare_laps, otherwise skip to analyze_with_llm
    workflow.addConditionalEdges(
      'fetch_reference_lap' as any,
      (state: AnalysisState) => {
        // Agent decision: do we have reference data to compare?
        return state.referenceData ? 'compare' : 'analyze';
      },
      {
        compare: 'compare_laps' as any,
        analyze: 'analyze_with_llm' as any,
      }
    );

    // compare_laps -> analyze_with_llm
    workflow.addEdge('compare_laps' as any, 'analyze_with_llm' as any);

    // analyze_with_llm -> parse_suggestions
    workflow.addEdge('analyze_with_llm' as any, 'parse_suggestions' as any);

    // parse_suggestions -> END
    workflow.addEdge('parse_suggestions' as any, END as any);

    // Compile the graph
    return workflow.compile();
  }

  /**
   * Analyze with LLM
   */
  private async analyzeWithLLM(state: AnalysisState): Promise<AnalysisState> {
    if (!state.lapData) {
      state.error = 'No lap data available for analysis';
      return state;
    }

    // Build context for LLM
    let context = `You are an expert racing coach analyzing telemetry data.

Current Lap:
${JSON.stringify(state.lapData.summary, null, 2)}
`;

    if (state.referenceData) {
      context += `\nReference Lap (Fastest in Session):
${JSON.stringify(state.referenceData.summary, null, 2)}
`;
    }

    if (state.comparisonData) {
      context += `\nComparison:
${JSON.stringify(state.comparisonData.differences, null, 2)}
`;
    }

    const messages = [
      new SystemMessage('You are an expert racing coach providing telemetry analysis. Always respond with valid JSON only.'),
      new HumanMessage(`${context}

Based on this data, provide 3-5 specific, actionable suggestions to improve lap time. Focus on:
1. Braking points and technique
2. Throttle application timing and smoothness
3. Steering inputs and corner technique
4. Overall driving style improvements

Format your response as a JSON object with a "suggestions" array. Each suggestion should have:
- type: "braking" | "throttle" | "steering" | "general"
- corner: optional corner identifier (e.g., "Turn 1", "Turn 4")
- message: clear, actionable advice (1-2 sentences)
- severity: "info" | "warning" | "critical"

Example:
{
  "suggestions": [
    {
      "type": "braking",
      "corner": "Turn 1",
      "message": "Brake 10-15 meters later before Turn 1. Your current braking point is conservative and you're losing time on entry.",
      "severity": "warning"
    }
  ]
}`),
    ];

    try {
      const response = await this.llm.invoke(messages);
      state.analysis = response.content as string;
    } catch (error) {
      state.error = `LLM analysis failed: ${error}`;
    }

    return state;
  }

  /**
   * Parse suggestions from LLM response
   */
  private parseSuggestions(state: AnalysisState): AnalysisState {
    if (!state.analysis) {
      state.suggestions = [
        {
          id: 'fallback-1',
          type: 'general',
          message: 'AI analysis temporarily unavailable. Please try again later.',
          severity: 'info',
        },
      ];
      return state;
    }

    try {
      // Try to parse JSON from the response
      const parsed = JSON.parse(state.analysis);
      const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];

      // Add IDs to suggestions
      state.suggestions = suggestions.map((s: any, i: number) => ({
        id: `suggestion-${i}`,
        type: s.type || 'general',
        corner: s.corner,
        message: s.message,
        severity: s.severity || 'info',
      }));
    } catch (error) {
      console.error('Failed to parse suggestions:', error);
      state.suggestions = [
        {
          id: 'fallback-1',
          type: 'general',
          message: 'AI analysis temporarily unavailable. Please try again later.',
          severity: 'info',
        },
      ];
    }

    return state;
  }

  /**
   * Analyze a lap using the LangGraph agentic workflow
   * 
   * This method:
   * 1. Builds the workflow graph
   * 2. Invokes it with initial state
   * 3. Returns the suggestions from the final state
   */
  async analyze(
    lapId: string,
    referenceLapId?: string
  ): Promise<LapSuggestion[]> {
    console.log('🚀 Starting LangGraph analysis...');
    console.log(`   Lap ID: ${lapId}`);
    if (referenceLapId) {
      console.log(`   Reference Lap ID: ${referenceLapId}`);
    }

    try {
      // Build the workflow graph
      const workflow = this.buildWorkflow();

      // Initial state - only required fields
      const initialState = {
        lapId,
        referenceLapId,
        suggestions: [] as LapSuggestion[],
      };

      // Invoke the workflow
      console.log('📊 Invoking LangGraph workflow...');
      const result = await workflow.invoke(initialState);

      console.log('✅ Analysis complete!');
      console.log(`   Generated ${result.suggestions?.length || 0} suggestions`);
      
      return result.suggestions || [];
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return [
        {
          id: 'fallback-1',
          type: 'general',
          message: 'AI analysis temporarily unavailable. Please try again later.',
          severity: 'info',
        },
      ];
    }
  }
}
