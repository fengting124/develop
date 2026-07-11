import { productCapabilities } from './capabilities.ts';

export const formalRoutes = productCapabilities
  .filter((capability) => capability.status === 'implemented' && 'formalRoute' in capability)
  .map((capability) => capability.formalRoute);

export const showcaseRoutes = productCapabilities
  .filter((capability) => capability.status === 'showcase' && 'showcaseRoute' in capability)
  .map((capability) => capability.showcaseRoute);

export function isFormalRoute(path: string) {
  return formalRoutes.some((route) => path === route || path.startsWith(`${route}/`));
}
