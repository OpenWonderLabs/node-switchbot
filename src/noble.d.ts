// This can be removed after https://github.com/abandonware/noble/pull/333 is merged

export * from '@abandonware/noble';

declare module '@abandonware/noble' {
  const _state: 'unknown' | 'resetting' | 'unsupported' | 'unauthorized' | 'poweredOff' | 'poweredOn';
}
