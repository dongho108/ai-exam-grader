/// <reference lib="deno.ns" />
import { GeminiProvider } from './gemini.ts';
export function getProviderType() {
  return 'gemini';
}
export function createProvider(type) {
  const providerType = type || getProviderType();
  switch(providerType){
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
