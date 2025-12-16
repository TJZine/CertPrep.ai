import { db } from "@/db";
import { hashAnswer } from "@/lib/utils";
import { logger } from "@/lib/logger";

/** Maximum number of entries before eviction is triggered. */
const MAX_CACHE_ENTRIES = 10_000;
/** Number of entries to keep after eviction (buffer to reduce frequency). */
const EVICTION_TARGET = 8_000;

/**
 * Evict old cache entries if the cache exceeds MAX_CACHE_ENTRIES.
 * Uses FIFO approximation (oldest entries by insertion order).
 * Fire-and-forget — errors are logged but don't interrupt caller.
 */
async function maybeEvictCache(): Promise<void> {
    try {
        const count = await db.hashCache.count();
        if (count > MAX_CACHE_ENTRIES) {
            const toDelete = count - EVICTION_TARGET;
            const keys = await db.hashCache.limit(toDelete).primaryKeys();
            await db.hashCache.bulkDelete(keys);
            logger.debug("Hash cache evicted entries", { deleted: keys.length, remaining: EVICTION_TARGET });
        }
    } catch (err) {
        logger.warn("Hash cache eviction failed", err);
    }
}

/**
 * Gets a hash for an answer, using the persistent IndexedDB cache when possible.
 * Falls back to computing the hash if not cached.
 *
 * @param answer - The raw answer text to hash.
 * @returns The SHA-256 hash of the answer.
 */
export async function getCachedHash(answer: string): Promise<string> {
    try {
        // Check cache first
        const cached = await db.hashCache.get(answer);
        if (cached) {
            return cached.hash;
        }

        // Compute hash
        const hash = await hashAnswer(answer);

        // Store in cache (fire and forget - don't block on write)
        db.hashCache.put({ answer, hash }).catch((err) => {
            logger.warn("Failed to cache hash", err);
        });

        return hash;
    } catch (error) {
        // If DB access fails, fall back to computing hash directly
        logger.warn("Hash cache access failed, computing directly", error);
        return hashAnswer(answer);
    }
}

/**
 * Batch get cached hashes for multiple answers.
 * More efficient than individual lookups for large sets.
 *
 * @param answers - Array of answer texts to hash.
 * @returns Map of answer text to hash.
 */
export async function getCachedHashBatch(
    answers: string[],
): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const uncached: string[] = [];

    try {
        // Batch lookup
        const cached = await db.hashCache.bulkGet(answers);

        for (let i = 0; i < answers.length; i++) {
            const entry = cached[i];
            if (entry) {
                results.set(answers[i]!, entry.hash);
            } else {
                uncached.push(answers[i]!);
            }
        }

        // Compute missing hashes
        if (uncached.length > 0) {
            const newEntries: Array<{ answer: string; hash: string }> = [];

            const hashPromises = uncached.map(async (answer) => {
                const hash = await hashAnswer(answer);
                return { answer, hash };
            });
            const computed = await Promise.all(hashPromises);
            for (const { answer, hash } of computed) {
                results.set(answer, hash);
                newEntries.push({ answer, hash });
            }

            // Batch store new entries (fire and forget)
            db.hashCache.bulkPut(newEntries).then(() => {
                // Evict old entries if cache is too large (fire and forget)
                maybeEvictCache();
            }).catch((err) => {
                logger.warn("Failed to bulk cache hashes", err);
            });
        }
    } catch (error) {
        // Fallback to computing all hashes directly
        logger.warn("Batch hash cache failed, computing directly", error);
        for (const answer of answers) {
            const hash = await hashAnswer(answer);
            results.set(answer, hash);
        }
    }

    return results;
}

