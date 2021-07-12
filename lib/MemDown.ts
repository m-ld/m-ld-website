import type { MemDown as MemDownType, MemDownConstructor } from 'memdown';
// Default import has gone away: https://github.com/Level/community/issues/87
export const MemDown: MemDownConstructor = require('memdown');
export type MemDown<K, V> = MemDownType<K, V>;
