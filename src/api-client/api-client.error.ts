/**
 * Typed error thrown by ApiClientService for anything that isn't a 2xx
 * response — a real HTTP error (status + the API's own error detail, when
 * present) or a network-level failure (connection refused, timeout, DNS),
 * in which case `status` is undefined.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
