import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formalCapabilityIds,
  productCapabilities,
  showcaseCapabilityIds,
} from './capabilities.ts';

function byId(id: string) {
  const capability = productCapabilities.find((item) => item.id === id);
  assert.ok(capability, `Missing capability: ${id}`);
  return capability;
}

test('formal capabilities expose only implemented product workflows', () => {
  assert.deepEqual(formalCapabilityIds, [
    'image-detection',
    'evaluation',
    'model-registry',
    'review-queue',
  ]);
  assert.equal(formalCapabilityIds.every((id) => byId(id).status === 'implemented'), true);
});

test('unsupported visual concepts remain explicit showcases', () => {
  assert.equal(byId('video-detection').status, 'showcase');
  assert.equal(byId('expert-lora').status, 'showcase');
  assert.deepEqual(showcaseCapabilityIds, ['video-detection', 'expert-lora']);
});

test('server and non-goal boundaries remain explicit', () => {
  assert.equal(byId('real-model-runtime').status, 'server-pending');
  assert.equal(byId('audio-detection').status, 'non-goal');
  assert.equal(byId('model-training').status, 'non-goal');
});

test('every implemented capability links to evidence', () => {
  assert.equal(
    productCapabilities.some((item) => item.status === 'implemented' && item.evidence.length === 0),
    false,
  );
});
