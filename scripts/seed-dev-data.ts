#!/usr/bin/env -S npx tsx
/**
 * Seed a Sapie workspace with sample study content.
 *
 * Runs against Firebase Emulators by default. Uses the Firebase Auth REST API +
 * Sapie REST API directly — mimics how the web app talks to the backend, NOT
 * the CLI's ApiClient. This ensures the seed tool doesn't mask CLI-specific bugs.
 *
 * Usage:
 *   npx tsx scripts/seed-dev-data.ts [--no-emulator] [--dry-run]
 *
 * --no-emulator  Point at production (default: use emulators)
 * --dry-run      Print the tree without creating anything
 *
 * Migration path: will graduate to qa/ when 3+ dev/QA scripts exist.
 * See docs/dev/dev_tooling_infrastructure.md.
 *
 * Maintenance contract: when a new feature ships that adds a content type, tag,
 * property, or relationship, update the seed tree below. This tree is the single
 * source of truth for manual test data.
 */

// ── Configuration ──────────────────────────────────────────────────────────

const EMULATOR = {
  auth: 'http://127.0.0.1:9100',
  api: 'http://127.0.0.1:3000',
  firebaseApiKey: 'demo-api-key',
};

const PRODUCTION = {
  auth: 'https://identitytoolkit.googleapis.com',
  api: 'https://sapie.app',
  firebaseApiKey: process.env.SAPIE_FIREBASE_API_KEY ?? '',
};

// ── CLI args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const useEmulator = !args.includes('--no-emulator');
const dryRun = args.includes('--dry-run');
const cfg = useEmulator ? EMULATOR : PRODUCTION;

// ── Types ──────────────────────────────────────────────────────────────────

interface SeedFolder {
  type: 'folder';
  name: string;
  tags: string[];
  children: SeedNode[];
}

interface SeedNote {
  type: 'note';
  name: string;
  body: string;
  tags: string[];
  decks?: SeedDeck[];
}

interface SeedDeck {
  name: string;
  cards: { front: string; back: string }[];
}

type SeedNode = SeedFolder | SeedNote;

interface SeedReport {
  folders: number;
  notes: number;
  decks: number;
  cards: number;
}

// ── Seed tree ──────────────────────────────────────────────────────────────

function seedTree(): SeedNode[] {
  return [
    {
      type: 'folder',
      name: 'Computer Science',
      tags: ['knowledge-area'],
      children: [
        {
          type: 'folder',
          name: 'Data Structures',
          tags: ['content-root'],
          children: [
            {
              type: 'note',
              name: 'Arrays',
              tags: ['dsa', 'fundamentals'],
              body: arraysBody(),
              decks: [
                {
                  name: 'Arrays',
                  cards: [
                    {
                      front: 'Time complexity of accessing an array element by index?',
                      back: 'O(1) — constant time random access.',
                    },
                    {
                      front: 'What is the main disadvantage of arrays?',
                      back: 'Fixed size — cannot grow or shrink dynamically without allocating a new array.',
                    },
                    {
                      front: 'How do dynamic arrays handle growth?',
                      back: 'Allocate larger array (typically 2x), copy existing elements, deallocate old. Amortized O(1) append.',
                    },
                  ],
                },
              ],
            },
            {
              type: 'note',
              name: 'Linked Lists',
              tags: ['dsa'],
              body: linkedListsBody(),
            },
          ],
        },
        {
          type: 'folder',
          name: 'Algorithms',
          tags: ['content-root'],
          children: [
            {
              type: 'note',
              name: 'Sorting',
              tags: ['algorithms', 'sorting'],
              body: sortingBody(),
              decks: [
                {
                  name: 'Sorting',
                  cards: [
                    {
                      front: 'Time complexity of Quicksort (average case)?',
                      back: 'O(n log n)',
                    },
                    {
                      front: 'Time complexity of Quicksort (worst case)?',
                      back: 'O(n²) — pivot always smallest/largest element.',
                    },
                    {
                      front: 'What makes Merge Sort stable?',
                      back: 'When merging, equal elements from left half are placed first, preserving relative order.',
                    },
                    {
                      front: 'Time complexity of Bubble Sort?',
                      back: 'O(n²). O(n) best case with early-exit optimization.',
                    },
                  ],
                },
              ],
            },
            {
              type: 'note',
              name: 'Searching',
              tags: ['algorithms', 'search'],
              body: searchingBody(),
            },
          ],
        },
        {
          type: 'folder',
          name: 'System Design',
          tags: ['content-root'],
          children: [
            {
              type: 'note',
              name: 'Scalability',
              tags: ['system-design'],
              body: scalabilityBody(),
            },
          ],
        },
      ],
    },
    {
      type: 'folder',
      name: 'Mathematics',
      tags: ['knowledge-area'],
      children: [
        {
          type: 'folder',
          name: 'Linear Algebra',
          tags: ['content-root'],
          children: [
            {
              type: 'note',
              name: 'Matrices',
              tags: ['math', 'linear-algebra'],
              body: matricesBody(),
            },
          ],
        },
      ],
    },
  ];
}

// ── API helpers (mimic web app patterns, not CLI ApiClient) ─────────────────

async function apiFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${cfg.api}/api${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${init.method ?? 'GET'} ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

async function signIn(): Promise<string> {
  const endpoint = useEmulator
    ? `${cfg.auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.firebaseApiKey}`
    : `${cfg.auth}/v1/accounts:signInWithPassword?key=${cfg.firebaseApiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123456',
      returnSecureToken: true,
    }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    if (err.error?.message === 'EMAIL_NOT_FOUND') {
      // Create the test user
      const signUpEndpoint = useEmulator
        ? `${cfg.auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.firebaseApiKey}`
        : `${cfg.auth}/v1/accounts:signUp?key=${cfg.firebaseApiKey}`;
      const signUpRes = await fetch(signUpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123456',
          returnSecureToken: true,
        }),
      });
      if (!signUpRes.ok) {
        throw new Error(`Failed to create test user: ${await signUpRes.text()}`);
      }
      const signUpData = (await signUpRes.json()) as { idToken: string };
      return signUpData.idToken;
    }
    throw new Error(`Sign-in failed: ${JSON.stringify(err)}`);
  }

  const data = (await res.json()) as { idToken: string };
  return data.idToken;
}

// ── Core seeding logic ─────────────────────────────────────────────────────

async function seedNodes(
  token: string,
  parentId: string,
  nodes: SeedNode[]
): Promise<SeedReport> {
  const report: SeedReport = { folders: 0, notes: 0, decks: 0, cards: 0 };

  // Get existing children for name-based dedup
  const listRes = await apiFetch(`/content/${parentId}/children`, token);
  const existing = (await listRes.json()) as Array<{ id: string; name: string }>;
  const existingNames = new Set(existing.map((c) => c.name));

  for (const node of nodes) {
    if (existingNames.has(node.name)) {
      const existingChild = existing.find((c) => c.name === node.name);
      if (existingChild && node.type === 'folder') {
        const subReport = await seedNodes(token, existingChild.id, node.children);
        report.folders += subReport.folders;
        report.notes += subReport.notes;
        report.decks += subReport.decks;
        report.cards += subReport.cards;
      }
      continue;
    }

    const contentType = node.type === 'folder' ? 'directory' : 'note';

    const createRes = await apiFetch('/content', token, {
      method: 'POST',
      body: JSON.stringify({ name: node.name, parentId, type: contentType }),
    });
    const created = (await createRes.json()) as { id: string };

    if (node.type === 'folder') {
      // Set tags (API only supports tags on folders)
      await apiFetch(`/content/${created.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ tags: node.tags }),
      });
      report.folders++;
      const subReport = await seedNodes(token, created.id, node.children);
      report.folders += subReport.folders;
      report.notes += subReport.notes;
      report.decks += subReport.decks;
      report.cards += subReport.cards;
    } else {
      // Push body (empty expectedRevision = first write)
      const bodyRes = await fetch(
        `${cfg.api}/api/content/${created.id}/body?expectedRevision=`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/markdown',
            Authorization: `Bearer ${token}`,
          },
          body: node.body,
        }
      );
      if (!bodyRes.ok) {
        throw new Error(`PUT body → ${bodyRes.status}: ${await bodyRes.text()}`);
      }
      report.notes++;

      // Create decks
      if (node.decks) {
        for (const deckDef of node.decks) {
          const deckRes = await apiFetch('/content', token, {
            method: 'POST',
            body: JSON.stringify({ name: deckDef.name, parentId: created.id, type: 'deck' }),
          });
          const deck = (await deckRes.json()) as { id: string };
          report.decks++;

          for (const cardDef of deckDef.cards) {
            await apiFetch(`/content/${deck.id}/cards`, token, {
              method: 'POST',
              body: JSON.stringify({ front: cardDef.front, back: cardDef.back }),
            });
            report.cards++;
          }
        }
      }
    }
  }

  return report;
}

// ── Dry-run printer ────────────────────────────────────────────────────────

function printTree(nodes: SeedNode[], indent: string, report: SeedReport): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'folder':
        console.log(`${indent}📁 ${node.name}  [${node.tags.join(', ')}]`);
        report.folders++;
        printTree(node.children, indent + '  ', report);
        break;
      case 'note':
        console.log(`${indent}📝 ${node.name}  [${node.tags.join(', ')}]`);
        report.notes++;
        if (node.decks) {
          for (const deck of node.decks) {
            console.log(`${indent}  🃏 ${deck.name} (${deck.cards.length} cards)`);
            report.decks++;
            report.cards += deck.cards.length;
          }
        }
        break;
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Target: ${useEmulator ? 'local emulators' : cfg.api}`);
  if (dryRun) console.log('[DRY RUN — no API calls]\n');

  const tree = seedTree();

  if (dryRun) {
    const report: SeedReport = { folders: 0, notes: 0, decks: 0, cards: 0 };
    printTree(tree, '', report);
    console.log(
      `\nTotals: ${report.folders} folders, ${report.notes} notes, ${report.decks} decks, ${report.cards} cards`
    );
    return;
  }

  // Auth
  console.log('Authenticating…');
  const token = await signIn();
  console.log('✓ Authenticated\n');

  // Get root
  const rootRes = await apiFetch('/content/root', token);
  const root = (await rootRes.json()) as { id: string };
  console.log(`Root ID: ${root.id}\n`);

  // Seed
  console.log('Seeding…');
  const report = await seedNodes(token, root.id, tree);

  console.log(
    `\n✓ Created ${report.folders} folders, ${report.notes} notes, ${report.decks} decks, ${report.cards} cards`
  );
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
    console.error(`✗ Cannot reach ${cfg.api}`);
    if (useEmulator) {
      console.error('  Is the local dev server running? Try: pnpm dev');
    }
  } else if (msg.includes('Failed to create test user')) {
    console.error(`✗ Cannot reach Firebase Auth at ${cfg.auth}`);
    if (useEmulator) {
      console.error('  Is the Auth emulator running? Try: pnpm dev');
    }
  } else {
    console.error(`✗ ${msg}`);
  }
  process.exit(1);
});

// ── Note body content ──────────────────────────────────────────────────────

function arraysBody(): string {
  return `# Arrays

## Overview

An array is a contiguous block of memory holding elements of the same type. It is the most fundamental data structure — almost every other structure builds on it.

## Key Properties

| Property | Value |
|---|---|
| Access by index | O(1) |
| Search (unsorted) | O(n) |
| Insert at end | O(1) amortized (dynamic array) |
| Insert at front | O(n) — must shift all elements |
| Delete | O(n) — must shift elements |
| Space | O(n) |

## Dynamic Arrays

Languages like Python (list), Java (ArrayList), and Rust (Vec) provide dynamic arrays that grow automatically. When capacity is exceeded, a new larger array is allocated (typically 2x), and all elements are copied. This gives **amortized O(1)** append.

## When to Use

- Random access by index is frequent
- Size is known ahead of time (or grows only at the end)
- Cache locality matters (contiguous memory)

## When NOT to Use

- Frequent insertions/deletions in the middle
- Unknown size with frequent growth (consider linked list or tree)
`;
}

function linkedListsBody(): string {
  return `# Linked Lists

## Overview

A linked list is a linear collection where each node points to the next. Unlike arrays, elements are not stored contiguously in memory.

## Types

- **Singly Linked**: each node has data + next pointer
- **Doubly Linked**: each node has data + next + prev pointers
- **Circular**: last node points back to first

## Complexity

| Operation | Singly | Doubly |
|---|---|---|
| Access by index | O(n) | O(n) |
| Insert at head | O(1) | O(1) |
| Insert at tail | O(n) / O(1) with tail ptr | O(1) |
| Delete at head | O(1) | O(1) |
| Delete at tail | O(n) | O(1) |
| Search | O(n) | O(n) |

## When to Use

- Frequent insertions/deletions at ends
- No random access needed
- Memory allocation is unpredictable (no contiguous block needed)

## When NOT to Use

- Random access by index is needed (use array)
- Cache performance is critical (linked lists have poor locality)
`;
}

function sortingBody(): string {
  return `# Sorting Algorithms

## Comparison Table

| Algorithm | Best | Average | Worst | Space | Stable |
|---|---|---|---|---|---|
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |

## Quick Reference

- **Quicksort**: pivot-based divide-and-conquer. Fastest in practice for average cases.
- **Merge Sort**: divides array in half, sorts recursively, merges. Stable and predictable.
- **Insertion Sort**: efficient for small or nearly-sorted datasets. Used as base case in hybrid sorts.
- **Heap Sort**: builds a max-heap, repeatedly extracts max. Guaranteed O(n log n) but slower constant factors than Quicksort.
`;
}

function searchingBody(): string {
  return `# Searching Algorithms

## Linear Search

- **Time**: O(n) — check each element
- **Space**: O(1)
- Works on unsorted data
- Simple but slow for large datasets

## Binary Search

- **Time**: O(log n) — halve search space each step
- **Space**: O(1) iterative, O(log n) recursive
- **Requirement**: sorted data
- Extremely efficient — finds element in 30 steps for 1B items

## Hash-based Search

- **Time**: O(1) average, O(n) worst (collisions)
- **Space**: O(n)
- Uses hash table / hash map
- No ordering guarantees

## When to Use

- Sorted data + frequent lookups → Binary Search
- Unsorted data + one-time search → Linear Search
- Frequent lookups by key → Hash Table
`;
}

function scalabilityBody(): string {
  return `# Scalability

## Vertical Scaling (Scale Up)

Adding more resources (CPU, RAM, disk) to a single machine.

- **Pros**: Simple, no code changes needed
- **Cons**: Physical limits, single point of failure, expensive at high end

## Horizontal Scaling (Scale Out)

Adding more machines to a distributed system.

- **Pros**: Theoretically unlimited, fault-tolerant, cheaper commodity hardware
- **Cons**: Complexity (networking, consistency, partitioning), harder to debug

## Key Concepts

### Load Balancing
Distributes incoming requests across servers. Common algorithms:
- Round Robin, Least Connections, IP Hash

### Database Sharding
Splitting data across multiple databases:
- **Range-based**: users A-M on shard 1, N-Z on shard 2
- **Hash-based**: hash(user_id) % num_shards
- **Directory-based**: lookup table maps keys to shards

### Caching
Store frequently accessed data in faster storage (Redis, Memcached, CDN).
- Cache-Aside, Read-Through, Write-Through, Write-Behind

### CAP Theorem
In a distributed system, you can only have two of:
- **C**onsistency — all nodes see the same data
- **A**vailability — every request gets a response
- **P**artition tolerance — system works despite network failures

In practice: must choose CP or AP during a partition.
`;
}

function matricesBody(): string {
  return `# Matrices

## Definition

A matrix is a rectangular array of numbers arranged in rows and columns.

## Operations

### Addition
Element-wise: C[i][j] = A[i][j] + B[i][j]
- O(n²) for n×n matrices

### Multiplication
C[i][j] = Σ A[i][k] × B[k][j]
- O(n³) naive, O(n²·⁸¹) Strassen
- Not commutative: AB ≠ BA in general

### Transpose
Aᵀ[i][j] = A[j][i]
- O(n²) — swap rows and columns

### Determinant
A scalar value representing the scaling factor of the linear transformation.
- det(A) = 0 → matrix is singular (non-invertible)

## Applications

- **Computer Graphics**: transformations (scale, rotate, translate)
- **Machine Learning**: weight matrices in neural networks
- **Graph Theory**: adjacency matrices
- **Linear Systems**: solving Ax = b
`;
}
