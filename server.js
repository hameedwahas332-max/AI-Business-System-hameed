// Unified server entrypoint delegating directly to ./server.ts
import { register } from 'tsx/esm/api';

register();
await import('./server.ts');
