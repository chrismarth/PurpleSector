# Events & Sessions

Purple Sector organizes your driving data into a hierarchy: **Events → Sessions → Laps**. This page explains how to create and manage them.

## Events

An **event** is a top-level container — think of it as a track day, a race weekend, or a practice block.

### Creating an Event

1. In the **nav pane**, make sure the **Events** tab is selected.
2. Click the **+** (New Event) button at the top of the tree.
3. Fill in the event details:
   - **Name** (required) — e.g., "Monza Practice — June 15"
   - **Description** (optional)
   - **Location** (optional)
   - **Start / End Date** (optional)
4. Click **Create**.

The new event appears in the nav tree. Click it to open its detail tab in the content pane.

<!-- Screenshot placeholder: ![Create event dialog](./img/create-event-dialog.png)
**Capture this:** The "New Event" dialog with the name, description, location, and date fields visible. -->

### Event Detail View

The event detail tab shows:

- Event name, description, location, and dates.
- A list of sessions belonging to this event.
- Options to edit or delete the event.

<!-- Screenshot placeholder: ![Event detail view](./img/event-detail.png)
**Capture this:** An event detail tab in the content pane showing the event metadata and a list of 2-3 sessions. -->

## Sessions

A **session** represents a single driving stint — one continuous period of telemetry recording.

### Creating a Session

Sessions are typically created automatically when a telemetry collector starts streaming data. You can also create them manually:

1. Open an event's detail tab.
2. Click **New Session**.
3. Enter a session name and select a source (Live or Demo).

### Session Detail View

Click a session in the nav tree to open its detail tab. You will see:

- Session metadata (name, source, status, tags, creation time).
- A list of laps recorded during the session, with lap numbers and times.
- Options to start/stop telemetry streaming (for live sessions).

<!-- Screenshot placeholder: ![Session detail view](./img/session-detail.png)
**Capture this:** A session detail tab showing session metadata at the top and a lap list below, with lap numbers and times. -->

### Live Telemetry

When a session is actively receiving telemetry (status: **recording**), the session detail view shows real-time data. Laps are automatically detected and added to the list as you cross the start/finish line.

## Laps

Each lap is automatically saved with its telemetry data. Click a lap in the nav tree (or in a session's lap list) to open the **Lap Analysis** view.

For details on analyzing laps, see **Lap Analysis**.

## Tips

- **Deleting** an event also deletes all its sessions and laps.
- **Deleting** a session deletes all its laps and telemetry data.
- Avoid deleting sessions or events while telemetry is actively streaming.
- The AI agent can also create events and sessions for you — just ask it in the chat panel.
