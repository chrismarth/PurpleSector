# AI Agent

Purple Sector includes an AI-powered coaching agent that can chat with you about your driving, analyze laps, query your data, and even create or modify events, sessions, and vehicles on your behalf.

> **Prerequisite:** An `OPENAI_API_KEY` must be set in your `.env.local` for the agent to function.

## Opening the Agent Panel

Click the **Agent** icon in the toolbar (left edge of the app). A slide-over chat panel opens on the right side of the screen.

<!-- Screenshot placeholder: ![Agent panel open](./img/agent-panel-open.png)
**Capture this:** The app shell with the agent slide-over panel open on the right, showing the chat input at the bottom and a conversation above it. -->

## Chatting with the Agent

Type a message in the chat input and press Enter (or click Send). The agent can:

- **Answer questions** about your telemetry data, lap times, and driving technique.
- **Analyze laps** — Ask it to analyze a specific lap and it will generate corner-by-corner coaching suggestions.
- **Query your data** — "What was my fastest lap at Monza?", "Show me all sessions from last week."
- **Create items** — "Create a new event called Spa Practice", "Add a vehicle named GT3 RS."
- **Modify items** — "Rename my last session to Qualifying Run 2."

### Example Prompts

- "Analyze my fastest lap in the Monza Practice event."
- "Would trail-braking help in Turn 3?"
- "Am I losing more time on corner entry or exit?"
- "Create a new event called Silverstone Test Day."
- "What vehicles do I have?"

<!-- Screenshot placeholder: ![Agent conversation example](./img/agent-conversation.png)
**Capture this:** A conversation in the agent panel showing a user asking for lap analysis and the agent responding with coaching suggestions (e.g., "Brake later entering Turn 2", "Apply throttle more progressively out of Turn 5"). -->

## Run Plans

When the agent needs to perform actions that modify your data (creating events, deleting sessions, etc.), it generates a **run plan** for your approval before executing anything.

1. The agent proposes a plan with a list of steps.
2. You review the plan and click **Approve** or **Reject**.
3. If approved, the agent executes each step and reports the results.

This ensures the agent never makes destructive changes without your explicit consent.

<!-- Screenshot placeholder: ![Agent run plan approval](./img/agent-run-plan.png)
**Capture this:** The agent panel showing a proposed run plan with 2-3 action items (e.g., "Create event: Spa Practice", "Create session: Free Practice 1") and Approve/Reject buttons. -->

## Conversations

The agent maintains conversation history. You can:

- **Continue** a previous conversation by selecting it from the conversation list.
- **Start a new conversation** by clicking the "New Chat" button.
- Each conversation retains its full context, so the agent remembers what you discussed earlier.

<!-- Screenshot placeholder: ![Agent conversation list](./img/agent-conversations-list.png)
**Capture this:** The agent panel showing the conversation list view with 2-3 previous conversations listed by title/date. -->

## Agent Settings

Open **Settings** (gear icon in the toolbar) and navigate to the **Agent** tab to configure:

- Agent behavior preferences.
- Model selection (if multiple are available).

<!-- Screenshot placeholder: ![Agent settings tab](./img/agent-settings.png)
**Capture this:** The settings panel with the Agent tab selected, showing any available configuration options. -->

## Lap Analysis via Agent

One of the agent's most powerful features is automated lap analysis:

1. Ask the agent to analyze a lap (e.g., "Analyze lap 5 from my last session").
2. The agent fetches the telemetry data, optionally compares it to a reference lap, and sends it to the AI model.
3. You receive structured coaching suggestions such as:
   - "Brake 15m later entering Turn 2."
   - "Apply throttle more progressively out of Turn 5."
   - "Carry 5 km/h more speed through the apex of Turn 8."

These suggestions are also persisted on the lap record so you can review them later.

## Tips

- The agent works best when you are specific — mention lap numbers, event names, or corner numbers.
- You can ask follow-up questions in the same conversation for deeper analysis.
- The agent has access to ~28 tools across events, sessions, laps, vehicles, analysis layouts, and more.
- If the agent proposes something you don't want, simply reject the run plan.
