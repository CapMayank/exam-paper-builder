# Gemini API keys and rate limits

The app can use several Google AI Studio keys at once. Put them in `.env`:

```ini
GEMINI_API_KEY="first-key"                 # still read, for older setups
GEMINI_API_KEYS="second-key,third-key"     # comma, space or newline separated
GEMINI_MODEL="gemini-flash-lite-latest"
```

After editing `.env` on the server: `pm2 restart exam-paper-builder --update-env`.

## What the app does

- Spreads calls over every key, least recently used first.
- Counts requests per key and per model over the last minute and holds a key back before it hits the per-minute
  limit. Defaults sit just under the usual free-tier figures: pro 4, flash 8, flash-lite 12 requests a minute.
  Change them with `GEMINI_RPM_PRO`, `GEMINI_RPM_FLASH`, `GEMINI_RPM_LITE` if your project's limits differ.
- On a 429 it reads Google's retry delay and rests that key for that model. A daily-quota reply rests the key
  until midnight Pacific time, when Google resets the daily count.
- A key Google refuses (invalid, revoked) is skipped for ten minutes.
- If every key is spent, the request fails with a clear message (HTTP 429: wait N seconds, or the daily quota is
  used up) and nothing is added to the paper. Without any key the offline curriculum generator is used.
- Keys are sent in the `x-goog-api-key` header, never in the URL, and only their last four characters are ever
  shown (`GET /api/ai/settings`, administrators only).

## Things to know

- Google counts quota **per project**, not per key. Two keys created in the same Google Cloud project share one
  quota; use keys from separate projects to add capacity.
- Free-tier limits differ by model and change over time. The exact numbers for your project are on the Rate limits
  page of Google AI Studio.
- One full paper uses about one request per section (8 to 16) plus retries, so a free key supports only a few
  papers a day.
