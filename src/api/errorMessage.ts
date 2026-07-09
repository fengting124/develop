const BACKEND_UNAVAILABLE_MESSAGE = 'Backend API unavailable. Start the Java backend and try again.';
const BACKEND_UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

function extractJsonMessage(bodyText: string) {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (!parsed || typeof parsed !== 'object') return null;

    const body = parsed as Record<string, unknown>;
    const candidates = [body.message, body.error, body.detail];
    const message = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
    return typeof message === 'string' ? message.trim() : null;
  } catch {
    return null;
  }
}

export function formatApiErrorMessage(status: number, bodyText: string) {
  if (BACKEND_UNAVAILABLE_STATUSES.has(status)) {
    return BACKEND_UNAVAILABLE_MESSAGE;
  }

  const trimmedBody = bodyText.trim();
  if (!trimmedBody) {
    return `Request failed with status ${status}`;
  }

  return extractJsonMessage(trimmedBody) ?? trimmedBody;
}
