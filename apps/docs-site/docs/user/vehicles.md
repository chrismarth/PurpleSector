# Vehicles

Purple Sector lets you manage your racing vehicles along with their **configurations** (parts lists) and **setups** (tuning parameters). This page explains how to create and work with vehicle data.

## Vehicle Tree

Switch to the **Vehicles** tab in the nav pane to see your vehicle tree. Each vehicle can contain:

- **Configurations** — Named parts lists (e.g., "Monza Low-Downforce", "Spa Wet").
- **Setups** — Named parameter sets with key/value/units (e.g., "Qualifying Setup", "Race Setup").

<!-- Screenshot placeholder: ![Vehicle tree in nav pane](./img/vehicle-tree.png)
**Capture this:** The nav pane with the Vehicles tab selected, showing 1-2 vehicles expanded to reveal configurations and setups underneath. -->

## Creating a Vehicle

1. In the nav pane, select the **Vehicles** tab.
2. Click the **+** (New Vehicle) button.
3. Enter a name and optional description.
4. Click **Create**.

The vehicle appears in the tree. Click it to open its detail tab.

<!-- Screenshot placeholder: ![Create vehicle dialog](./img/create-vehicle-dialog.png)
**Capture this:** The "New Vehicle" dialog with name and description fields. -->

## Vehicle Detail View

The vehicle detail tab shows:

- Vehicle name and description (editable).
- A list of **configurations** with options to add or delete.
- A list of **setups** with options to add or delete.

<!-- Screenshot placeholder: ![Vehicle detail view](./img/vehicle-detail.png)
**Capture this:** A vehicle detail tab showing the vehicle name/description at the top, then a configurations section and a setups section below, each with a few items listed. -->

## Configurations

A **configuration** represents a set of parts or hardware choices for a vehicle — for example, which wing, springs, or brake pads are installed.

### Configuration Detail View

Click a configuration in the nav tree to open its detail tab:

- **Name** and **description** (editable).
- **Parts list** — A table of key/value pairs (e.g., "Front Wing" → "Level 3", "Brake Pads" → "Aggressive").
- Add, edit, or remove individual parts.

<!-- Screenshot placeholder: ![Configuration detail view](./img/configuration-detail.png)
**Capture this:** A configuration detail tab showing the name/description at the top and a parts table below with 4-5 key/value rows and Add/Save/Cancel buttons. -->

## Setups

A **setup** represents tuning parameters for a vehicle — for example, tire pressures, suspension settings, or gear ratios.

### Setup Detail View

Click a setup in the nav tree to open its detail tab:

- **Name** and **description** (editable).
- **Linked configuration** (optional) — Associate this setup with a specific configuration.
- **Parameters table** — Key/value/units triples (e.g., "Front Ride Height" → "54" → "mm").
- Add, edit, or remove individual parameters.

<!-- Screenshot placeholder: ![Setup detail view](./img/setup-detail.png)
**Capture this:** A setup detail tab showing the name/description, a configuration dropdown, and a parameters table with key/value/units columns and 5-6 rows of data. -->

### CSV Import / Export

Setups support CSV import and export for easy sharing and backup:

- **Export** — Click the **Export CSV** button to download the current parameters as a CSV file.
- **Import** — Click the **Import CSV** button and select a CSV file. The file should have columns for key, value, and units. Imported parameters replace the current set.

This makes it easy to share setups between team members or back them up outside the application.

<!-- Screenshot placeholder: ![Setup CSV import/export buttons](./img/setup-csv-buttons.png)
**Capture this:** Close-up of the setup detail toolbar showing the Import CSV and Export CSV buttons. -->

## Tips

- The AI agent can also create vehicles, configurations, and setups for you — just ask it in the chat.
- Deleting a vehicle also deletes all its configurations and setups.
- Configurations and setups are independent — you can have setups that aren't linked to any configuration.
