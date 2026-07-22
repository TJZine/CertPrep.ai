/**
 * The server deadline must remain shorter than the browser deadline so the API
 * has time to return an explicit timeout response before the client gives up.
 */
export const ACCOUNT_DELETION_SERVER_TIMEOUT_MS = 20_000;
export const ACCOUNT_DELETION_CLIENT_TIMEOUT_MS = 30_000;
