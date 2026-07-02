import { computeBodyHash, computeCardHash } from '../../src/lib/state/hashing';
import { LocalCard } from '../../src/lib/state/sync-state';

function makeCard(overrides: Partial<LocalCard> = {}): LocalCard {
  return {
    id: null,
    front: '',
    back: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeBodyHash
// ---------------------------------------------------------------------------
describe('computeBodyHash', () => {
  it('same content produces same hash', () => {
    const a = computeBodyHash('hello world');
    const b = computeBodyHash('hello world');
    expect(a).toBe(b);
  });

  it('different content produces different hash', () => {
    const a = computeBodyHash('hello world');
    const b = computeBodyHash('goodbye world');
    expect(a).not.toBe(b);
  });

  it('CRLF → LF normalization: \\r\\n produces same hash as \\n', () => {
    const crlf = computeBodyHash('line1\r\nline2\r\nline3');
    const lf = computeBodyHash('line1\nline2\nline3');
    expect(crlf).toBe(lf);
  });

  it('bare CR → LF: \\r produces same hash as \\n', () => {
    const cr = computeBodyHash('line1\rline2\rline3');
    const lf = computeBodyHash('line1\nline2\nline3');
    expect(cr).toBe(lf);
  });

  it('BOM-stripped: \\uFEFF prefix produces same hash as without', () => {
    const withBom = computeBodyHash('\uFEFF# Hello');
    const withoutBom = computeBodyHash('# Hello');
    expect(withBom).toBe(withoutBom);
  });

  it('trailing whitespace IS preserved: two spaces vs none differ', () => {
    const withSpaces = computeBodyHash('hello  ');
    const withoutSpaces = computeBodyHash('hello');
    expect(withSpaces).not.toBe(withoutSpaces);
  });

  it('empty string produces consistent hash', () => {
    const a = computeBodyHash('');
    const b = computeBodyHash('');
    expect(a).toBe(b);
  });

  it('empty string hash is not the same as whitespace-only hash', () => {
    const empty = computeBodyHash('');
    const space = computeBodyHash(' ');
    expect(empty).not.toBe(space);
  });

  it('Buffer input works same as equivalent string input', () => {
    const fromString = computeBodyHash('hello\nworld');
    const fromBuffer = computeBodyHash(Buffer.from('hello\nworld', 'utf-8'));
    expect(fromString).toBe(fromBuffer);
  });

  it('Buffer with CRLF normalizes same as string with LF', () => {
    const fromBufferCrlf = computeBodyHash(Buffer.from('hello\r\nworld', 'utf-8'));
    const fromStringLf = computeBodyHash('hello\nworld');
    expect(fromBufferCrlf).toBe(fromStringLf);
  });

  it('Buffer with BOM normalizes same as string without BOM', () => {
    const withBom = computeBodyHash(Buffer.from('\uFEFF# markdown', 'utf-8'));
    const withoutBom = computeBodyHash('# markdown');
    expect(withBom).toBe(withoutBom);
  });

  it('mixed line endings all normalize to LF', () => {
    const mixed = computeBodyHash('a\r\nb\rc\nd');
    const lfOnly = computeBodyHash('a\nb\nc\nd');
    expect(mixed).toBe(lfOnly);
  });
});

// ---------------------------------------------------------------------------
// computeCardHash
// ---------------------------------------------------------------------------
describe('computeCardHash', () => {
  it('same cards produce same hash', () => {
    const cards: LocalCard[] = [
      makeCard({ id: '1', front: 'Q1', back: 'A1' }),
      makeCard({ id: '2', front: 'Q2', back: 'A2' }),
    ];
    const a = computeCardHash(cards);
    const b = computeCardHash(cards);
    expect(a).toBe(b);
  });

  it('cards in different order produce same hash (sorted by id)', () => {
    const ordered: LocalCard[] = [
      makeCard({ id: '1', front: 'Q1', back: 'A1' }),
      makeCard({ id: '2', front: 'Q2', back: 'A2' }),
    ];
    const reversed: LocalCard[] = [
      makeCard({ id: '2', front: 'Q2', back: 'A2' }),
      makeCard({ id: '1', front: 'Q1', back: 'A1' }),
    ];
    expect(computeCardHash(ordered)).toBe(computeCardHash(reversed));
  });

  it('null ids sort last', () => {
    const cards: LocalCard[] = [
      makeCard({ id: null, front: 'B', back: 'b' }),
      makeCard({ id: 'a', front: 'A', back: 'a' }),
    ];
    // With stable sort, null-id cards should appear after non-null
    const hash = computeCardHash(cards);
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
  });

  it('null vs null sorted by front then back', () => {
    // Two null-id cards: sorted by front, then back
    const cards: LocalCard[] = [
      makeCard({ id: null, front: 'banana', back: 'two' }),
      makeCard({ id: null, front: 'apple', back: 'one' }),
    ];
    const a = computeCardHash(cards);
    const b = computeCardHash([...cards].reverse());
    expect(a).toBe(b);
  });

  it('different front produces different hash', () => {
    const cards1: LocalCard[] = [makeCard({ id: '1', front: 'Q1', back: 'A1' })];
    const cards2: LocalCard[] = [makeCard({ id: '1', front: 'Q2', back: 'A1' })];
    expect(computeCardHash(cards1)).not.toBe(computeCardHash(cards2));
  });

  it('different back produces different hash', () => {
    const cards1: LocalCard[] = [makeCard({ id: '1', front: 'Q1', back: 'A1' })];
    const cards2: LocalCard[] = [makeCard({ id: '1', front: 'Q1', back: 'A2' })];
    expect(computeCardHash(cards1)).not.toBe(computeCardHash(cards2));
  });

  it('empty array produces consistent hash', () => {
    const a = computeCardHash([]);
    const b = computeCardHash([]);
    expect(a).toBe(b);
    // sha256 of empty string
    expect(a).toHaveLength(64);
  });

  it('round-trip: parse JSON → serialize → parse → same hash (reformat-proof)', () => {
    const original: LocalCard[] = [
      makeCard({ id: 'c1', front: 'What is 2+2?', back: '4' }),
      makeCard({ id: 'c2', front: 'What is H2O?', back: 'Water' }),
    ];

    const hash1 = computeCardHash(original);

    // Simulate JSON round-trip: serialize, then parse back
    const serialized = JSON.stringify(original);
    const reparsed: LocalCard[] = JSON.parse(serialized);

    const hash2 = computeCardHash(reparsed);
    expect(hash1).toBe(hash2);
  });

  it('hash ignores study metadata (dueDate, interval, repetitions, etc.)', () => {
    const withoutMeta: LocalCard[] = [makeCard({ id: '1', front: 'Q', back: 'A' })];
    const withMeta: LocalCard[] = [
      makeCard({
        id: '1',
        front: 'Q',
        back: 'A',
        dueDate: '2026-01-01T00:00:00Z',
        interval: 7,
        repetitions: 3,
        lastResult: 'know',
        lastStudied: '2026-01-01T00:00:00Z',
        correctCount: 5,
        incorrectCount: 1,
      }),
    ];
    expect(computeCardHash(withoutMeta)).toBe(computeCardHash(withMeta));
  });

  it('hash differs when id differs', () => {
    const cards1: LocalCard[] = [makeCard({ id: 'a', front: 'Q', back: 'A' })];
    const cards2: LocalCard[] = [makeCard({ id: 'b', front: 'Q', back: 'A' })];
    expect(computeCardHash(cards1)).not.toBe(computeCardHash(cards2));
  });

  it('hash differs when card count differs', () => {
    const one: LocalCard[] = [makeCard({ id: '1', front: 'Q1', back: 'A1' })];
    const two: LocalCard[] = [
      makeCard({ id: '1', front: 'Q1', back: 'A1' }),
      makeCard({ id: '2', front: 'Q2', back: 'A2' }),
    ];
    expect(computeCardHash(one)).not.toBe(computeCardHash(two));
  });

  it('null id is treated as empty string in hash input', () => {
    const singleNull = computeCardHash([makeCard({ id: null, front: 'Q', back: 'A' })]);
    const singleEmpty = computeCardHash([makeCard({ id: '', front: 'Q', back: 'A' })]);
    expect(singleNull).toBe(singleEmpty);
  });
});
