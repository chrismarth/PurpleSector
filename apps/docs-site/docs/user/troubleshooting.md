# Troubleshooting

Common issues and quick fixes when running Purple Sector.

## App Won't Load / Spinner Hangs

If the app shows a loading spinner that never resolves:

1. **Wait a moment** — On first load in dev mode, the Next.js server compiles pages on demand. This can take 10–30 seconds.
2. **Reload the page** — If the spinner persists for more than 30 seconds, try a hard reload (Ctrl+Shift+R).
3. **Check the dev server** — Verify the Next.js server is running:

   ```bash
   npx pm2 status
   ```

4. **Check for port conflicts** — Ensure port 3000 is not in use by another process.
5. **Clear the Next.js cache** — Sometimes a stale cache causes issues:

   ```bash
   rm -rf .next/
   ./scripts/start-dev.sh
   ```

## Login Issues

- The dev environment uses stub authentication. Valid usernames are `admin` and `user` (no password).
- If you are redirected to `/login` repeatedly, check that cookies are enabled in your browser.
- Clear cookies for `localhost` if you encounter stale auth state.

## No Telemetry Data Received

### Assetto Corsa

1. Verify Assetto Corsa is running and you are on track (not in the menu).
2. Check `telemetry.ini` configuration in `Documents/Assetto Corsa/cfg/`:

   ```ini
   [TELEMETRY]
   ENABLED=1
   UDP_PORT=9996
   UDP_ADDRESS=127.0.0.1
   ```

3. Ensure UDP port `9996` is not blocked by a firewall.
4. Verify a telemetry source is running:

   ```bash
   npx pm2 status
   ```

### Assetto Corsa Competizione (ACC)

1. Verify ACC is running and you are in a session (not just at the main menu).
2. Check `broadcasting.json` in `Documents/Assetto Corsa Competizione/Config/`:

   ```json
   {
     "updListenerPort": 9000,
     "connectionPassword": "",
     "commandPassword": ""
   }
   ```

3. Ensure UDP port `9000` is not blocked by a firewall.
4. Check that the collector successfully registered with ACC (look for a "Successfully registered" message in the collector logs).

### Demo Replay

If using demo replay and no data appears:

1. Verify the collector is running:

   ```bash
   npx pm2 status
   npx pm2 logs demo-replay
   ```

2. Verify the Docker infrastructure is running:

   ```bash
   docker ps
   ```

3. Verify the Next.js app is running and that RisingWave is receiving data:

   ```bash
   npx pm2 logs nextjs-dev
   docker logs ps-risingwave --tail 100
   ```

## Pipeline Issues

### Services Keep Crashing

Check PM2 logs for the specific service:

```bash
npx pm2 logs nextjs-dev
npx pm2 logs demo-replay
```

Common causes:
- Docker infrastructure not running or not ready yet (wait 30 seconds after starting Docker).
- RisingWave, Trino, or Redis unavailable.
- Port conflicts.

## AI Agent Not Working

1. Confirm `OPENAI_API_KEY` is set in `.env.local`.
2. Check your OpenAI API quota and billing.
3. Review the Next.js server logs for API errors:

   ```bash
   npx pm2 logs nextjs-dev
   ```

4. If the agent panel shows an error, try starting a new conversation.

## Events Tree Shows "Loading Events..." Forever

This can happen if:

1. The Next.js API server is still compiling routes on first load — wait a few seconds and it should resolve.
2. The database is empty or inaccessible — check `DATABASE_URL` in `.env.local`.
3. The auth cookie is missing or invalid — log out and log back in.

## Plots Not Rendering

If telemetry plots show as blank boxes:

1. Verify the lap has telemetry data (check the session detail view for lap times).
2. Try toggling fullscreen on the panel and back.
3. Check the browser console for JavaScript errors.
4. Clear the Next.js cache and reload.

## General Tips

- **Check PM2 status** — `npx pm2 status` shows all running services and their state.
- **Check PM2 logs** — `npx pm2 logs` shows combined logs from all services.
- **Reset everything** — For a clean start:

  ```bash
  ./scripts/stop-dev.sh
  rm -rf .next/
  npm run db:reset
  ./scripts/start-dev.sh
  ```

- **Browser console** — Open DevTools (F12) and check the Console tab for client-side errors.

If issues persist, file an issue on GitHub with logs and steps to reproduce.
