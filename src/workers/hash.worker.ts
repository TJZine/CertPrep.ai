// src/workers/hash.worker.ts

interface HashRequest {
  type: "hash_bulk";
  payload: {
    id: string;
    options: Record<string, string>;
  };
}

self.onmessage = async (event: MessageEvent<HashRequest>): Promise<void> => {
  const { type, payload } = event.data;

  if (type === "hash_bulk") {
    const { id, options } = payload;
    const results: Record<string, string> = {};

    try {
      const encoder = new TextEncoder();
      const keys = Object.keys(options);

      // Process sequentially to avoid queuing too many microtasks if there are huge number of options
      // but for quiz options (usually 4-5), this is lightning fast in a worker.
      for (const key of keys) {
        const msgBuffer = encoder.encode(key);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        results[key] = hashHex;
      }

      self.postMessage({
        type: "hash_bulk_result",
        payload: {
          id,
          hashes: results,
        },
      });
    } catch (error) {
      console.error("Worker hashing failed", error);
      self.postMessage({
        type: "hash_bulk_error",
        payload: {
          id,
          error:
            error instanceof Error ? error.message : "Unknown worker error",
        },
      });
    }
  }
};
