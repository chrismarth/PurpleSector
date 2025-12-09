# Purple Sector - Racing Telemetry Analysis

Purple Sector is an AI-powered telemetry analysis tool for Assetto Corsa and Assetto Corsa Competizione. It helps drivers improve their lap times through real-time data visualization and intelligent coaching suggestions.

> Full user and developer documentation is hosted at: **https://chrismarth.github.io/PurpleSector/**

## Dev Quickstart

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Basic Dev Environment

Create `.env.local` in the repo root with at least:

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL="file:./dev.db"
WS_PORT=8080
TELEMETRY_UDP_PORT=9996
```

Initialize the database schema:

```bash
npm run db:push
```

### 3. Start the Full Dev Environment

Use the one-command startup to run Kafka, services, demo collector, and frontend:

```bash
npm run dev:start
```

Then open:

```text
http://localhost:3000
```

For more details (including manual startup, operations, and architecture), see the **Getting Started** and **Developer Guide** sections in the docs site.

## License

Purple Sector is dual-licensed:

### Open Source License (AGPL-3.0)

For **non-commercial use** (personal projects, education, open-source development), this software is available under the GNU Affero General Public License v3.0 (AGPL-3.0).

**Key Requirements:**

- You can freely use, modify, and distribute this software.
- If you modify and run it as a network service (web app, API, SaaS), you **must** share your modified source code.
- Derivative works must also be licensed under AGPL-3.0.

This ensures that improvements to the software benefit the entire community.

### Commercial License

For **commercial use** (businesses, professional racing teams, commercial products), a separate commercial license is required. This includes:

- Use by for-profit organizations.
- Integration into commercial products or services.
- Use in professional racing teams or motorsport organizations.
- Any use that generates revenue or commercial advantage.
- Use as a network service without sharing source code modifications.

**To obtain a commercial license**, please contact Christopher Marth.

See the [LICENSE](LICENSE) file for complete details.
