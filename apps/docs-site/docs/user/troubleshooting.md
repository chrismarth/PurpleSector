# Troubleshooting

Common issues and quick checks when running Purple Sector.

## No Telemetry Data Received

### Assetto Corsa

1. Verify Assetto Corsa is running.
2. Check `telemetry.ini` configuration in `Documents/Assetto Corsa/cfg/`:

   ```ini
   [TELEMETRY]
   ENABLED=1
   UDP_PORT=9996
   UDP_ADDRESS=127.0.0.1
   ```

3. Ensure UDP port `9996` is not blocked by a firewall.
4. Verify the telemetry collector service is running:

   ```bash
   npm run telemetry
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
4. Verify the ACC telemetry collector is running:

   ```bash
   npm run telemetry:acc
   ```

5. Check that the collector successfully registered with ACC (look for a "Successfully registered" message in the collector logs).

## WebSocket Connection Failed

1. Ensure the WebSocket server is running:

   ```bash
   npm run ws-server
   ```

2. Check that port `8080` is available.
3. Open the browser console and verify there are no CORS or connection errors.

## AI Analysis Not Working

1. Confirm `OPENAI_API_KEY` is set in `.env.local`.
2. Check your OpenAI API quota/billing.
3. Review the Next.js API route logs for errors (for example, logs for the analysis endpoint).

If issues persist, check service logs and network connectivity, or file an issue on GitHub with logs and steps to reproduce.
