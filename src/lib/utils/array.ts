/**
 * Fisher-Yates shuffle algorithm.
 * Pure function - does not mutate input array.
 *
 * @param array - Array to shuffle
 * @returns New array with elements in random order
 */
export function shuffle<T>(array: readonly T[]|T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j] as T;
        result[j] = temp as T;
    }
    return result;
}
