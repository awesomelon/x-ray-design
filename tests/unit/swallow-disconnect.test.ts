import { describe, it, expect, vi } from 'vitest';
import { swallowDisconnect } from '../../src/shared/messages';

describe('swallowDisconnect', () => {
  it('silently swallows "Receiving end does not exist" error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    swallowDisconnect(new Error('Receiving end does not exist'));
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('silently swallows "Could not establish connection" error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    swallowDisconnect(new Error('Could not establish connection. Receiving end does not exist.'));
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns on real errors', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const realError = new Error('Permission denied');
    swallowDisconnect(realError);
    expect(warnSpy).toHaveBeenCalledWith('[Snap]', realError);
    warnSpy.mockRestore();
  });

  it('warns on non-Error values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    swallowDisconnect('some string error');
    expect(warnSpy).toHaveBeenCalledWith('[Snap]', 'some string error');
    warnSpy.mockRestore();
  });

  it('warns on undefined', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    swallowDisconnect(undefined);
    expect(warnSpy).toHaveBeenCalledWith('[Snap]', undefined);
    warnSpy.mockRestore();
  });
});
