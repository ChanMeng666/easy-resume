import { describe, it, expect } from 'vitest';
import { createSemaphore } from './concurrency';

/** A manually-resolvable task that records its start. */
function makeTask(started: string[], name: string) {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const fn = async () => {
    started.push(name);
    await gate;
    return name;
  };
  return { fn, release };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('createSemaphore', () => {
  it('never runs more than the limit concurrently and dequeues FIFO', async () => {
    const sem = createSemaphore(2);
    const started: string[] = [];
    const a = makeTask(started, 'a');
    const b = makeTask(started, 'b');
    const c = makeTask(started, 'c');
    const d = makeTask(started, 'd');

    const pa = sem.run(a.fn);
    const pb = sem.run(b.fn);
    const pc = sem.run(c.fn);
    const pd = sem.run(d.fn);
    await tick();

    // Only the first two started; the rest wait.
    expect(started).toEqual(['a', 'b']);
    expect(sem.inFlight()).toBe(2);
    expect(sem.queued()).toBe(2);

    // Releasing one slot starts exactly the NEXT queued task (FIFO: c before d).
    a.release();
    await tick();
    expect(started).toEqual(['a', 'b', 'c']);

    b.release();
    await tick();
    expect(started).toEqual(['a', 'b', 'c', 'd']);

    c.release();
    d.release();
    await expect(Promise.all([pa, pb, pc, pd])).resolves.toEqual(['a', 'b', 'c', 'd']);
    expect(sem.inFlight()).toBe(0);
    expect(sem.queued()).toBe(0);
  });

  it('releases the slot when a task throws (no slot leak) and propagates the error', async () => {
    const sem = createSemaphore(1);
    await expect(sem.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    // The slot must be free again: a follow-up task runs to completion.
    await expect(sem.run(async () => 'ok')).resolves.toBe('ok');
    expect(sem.inFlight()).toBe(0);
  });

  it('supports synchronous tasks and clamps a nonsensical limit to 1', async () => {
    const sem = createSemaphore(0);
    const started: string[] = [];
    const a = makeTask(started, 'a');
    const pa = sem.run(a.fn);
    const pb = sem.run(async () => {
      started.push('b');
      return 'b';
    });
    await tick();
    // Clamped limit 1: b waits until a finishes.
    expect(started).toEqual(['a']);
    a.release();
    await expect(Promise.all([pa, pb])).resolves.toEqual(['a', 'b']);
    expect(started).toEqual(['a', 'b']);
  });
});
