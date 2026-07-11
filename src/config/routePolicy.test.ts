import assert from 'node:assert/strict';
import test from 'node:test';
import { formalRoutes, isFormalRoute, showcaseRoutes } from './routePolicy.ts';

test('formal routes contain only implemented product workflows', () => {
  assert.equal(isFormalRoute('/detect/image'), true);
  assert.equal(isFormalRoute('/detect/video'), false);
  assert.equal(formalRoutes.some((route) => route.includes('showcase')), false);
});

test('showcase routes remain outside formal product scope', () => {
  assert.equal(isFormalRoute('/dev/showcase/video-detection'), false);
  assert.deepEqual(showcaseRoutes, [
    '/dev/showcase/video-detection',
    '/dev/showcase/image-pipeline',
  ]);
});
