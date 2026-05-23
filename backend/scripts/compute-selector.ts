import { keccak256, toHex, encodePacked } from 'viem';

const sig = 'FHEError(uint256)';
const hash = keccak256(Buffer.from(sig));
console.log('Selector for ' + sig + ':', hash.slice(0, 10));

const sig2 = 'UnauthorizedCaller(uint256)';
const hash2 = keccak256(Buffer.from(sig2));
console.log('Selector for ' + sig2 + ':', hash2.slice(0, 10));
