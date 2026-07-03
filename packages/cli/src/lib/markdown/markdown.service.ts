/**
 * MarkdownService — regex-based markdown image URL manipulation.
 *
 * Uses pure regex instead of mdast (ESM-only, incompatible with CJS tsconfig).
 * Handles standard markdown image syntax: ![alt](url) and ![alt](url "title").
 */

/** Regex matching blob API paths/URLs — copied from packages/web/src/lib/content/attachment-body-url.ts */
const BLOB_PATH_RE =
  /^(?:(?:https?:\/\/[^/]+)?)(\/api\/content\/([^/?#]+)\/blobs\/([^/?#]+))(?:[?#].*)?$/;

/** Parse a blob URL/path and return the content + blob IDs, or null. */
export function parseBlobUrl(src: string): { contentId: string; blobId: string } | null {
  const trimmed = src.trim();
  const match = BLOB_PATH_RE.exec(trimmed);
  if (!match?.[2] || !match?.[3]) return null;
  return { contentId: match[2], blobId: match[3] };
}

/** Regex matching markdown image syntax: ![alt](url) with optional title. */
const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export interface ValidationIssue {
  type: 'orphan_blob' | 'structural';
  message: string;
  line?: number;
}

export interface MarkdownService {
  /**
   * Walk markdown, find all image nodes, apply `fn` to each URL,
   * and return the rebuilt markdown string.
   */
  transformImageUrls(markdown: string, fn: (url: string) => string): string;

  /**
   * Find all image URLs that match the blob path pattern and
   * return their contentId + blobId pairs (deduplicated).
   */
  findBlobUrls(markdown: string): Array<{ contentId: string; blobId: string }>;

  /**
   * Validate markdown structure and blob references.
   * - structural: obviously unbalanced image syntax
   * - orphan_blob: blob URLs whose blobId is not in `knownBlobIds` (when provided)
   */
  validate(markdown: string, knownBlobIds?: Set<string>): ValidationIssue[];

  /**
   * Find all local blob references (blobs/{blobId}) in markdown image URLs.
   * Returns deduplicated blobIds.
   */
  findLocalBlobRefs(markdown: string): string[];
}

export function createMarkdownService(): MarkdownService {
  return {
    transformImageUrls(markdown, fn) {
      return markdown.replace(IMAGE_RE, (_match, alt, url, title) => {
        const newUrl = fn(url);
        if (title) {
          return `![${alt}](${newUrl} "${title}")`;
        }
        return `![${alt}](${newUrl})`;
      });
    },

    findBlobUrls(markdown) {
      const results: Array<{ contentId: string; blobId: string }> = [];
      const seen = new Set<string>();
      let match: RegExpExecArray | null;
      // Reset lastIndex since IMAGE_RE is global
      IMAGE_RE.lastIndex = 0;
      while ((match = IMAGE_RE.exec(markdown)) !== null) {
        const url = match[2];
        const blobMatch = BLOB_PATH_RE.exec(url);
        if (blobMatch?.[2] && blobMatch?.[3]) {
          const key = `${blobMatch[2]}:${blobMatch[3]}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ contentId: blobMatch[2], blobId: blobMatch[3] });
          }
        }
      }
      return results;
    },

    findLocalBlobRefs(markdown) {
      const seen = new Set<string>();
      const results: string[] = [];
      let match: RegExpExecArray | null;
      IMAGE_RE.lastIndex = 0;
      while ((match = IMAGE_RE.exec(markdown)) !== null) {
        const url = match[2];
        if (url.startsWith('blobs/')) {
          const blobId = url.slice(6);
          if (!seen.has(blobId)) {
            seen.add(blobId);
            results.push(blobId);
          }
        }
      }
      return results;
    },
    validate(markdown, knownBlobIds) {
      const issues: ValidationIssue[] = [];

      // Structural: check for obviously unbalanced image syntax
      const openCount = (markdown.match(/!\[/g) || []).length;
      const closeCount = (markdown.match(/\]\(/g) || []).length;
      if (openCount !== closeCount) {
        issues.push({
          type: 'structural',
          message: `Unbalanced image syntax: ${openCount} "![" openers vs ${closeCount} "](" closers`,
        });
      }

      // Orphan blob references
      if (knownBlobIds && knownBlobIds.size > 0) {
        const blobUrls = this.findBlobUrls(markdown);
        for (const { blobId } of blobUrls) {
          if (!knownBlobIds.has(blobId)) {
            issues.push({
              type: 'orphan_blob',
              message: `Blob "${blobId}" referenced in markdown but not found in known blob IDs`,
            });
          }
        }
      }

      return issues;
    },
  };
}
