import assert from 'node:assert/strict';
import test from 'node:test';

import { formatApiErrorMessage } from './errorMessage.ts';

test('uses backend JSON message when present', () => {
  const message = formatApiErrorMessage(400, '{"message":"Manifest must contain a header row."}');

  assert.equal(message, 'Manifest must contain a header row.');
});

test('uses backend JSON error fallback when message is absent', () => {
  const message = formatApiErrorMessage(404, '{"error":"Evaluation not found."}');

  assert.equal(message, 'Evaluation not found.');
});

test('maps gateway failures to a backend availability hint', () => {
  const message = formatApiErrorMessage(502, 'Bad Gateway');

  assert.equal(message, 'Backend API unavailable. Start the Java backend and try again.');
});

test('preserves non-empty plain text errors for non-gateway statuses', () => {
  const message = formatApiErrorMessage(409, 'Evaluation is already running.');

  assert.equal(message, 'Evaluation is already running.');
});

test('falls back to status text when the response body is empty', () => {
  const message = formatApiErrorMessage(418, '');

  assert.equal(message, 'Request failed with status 418');
});
