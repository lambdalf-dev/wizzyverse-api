/**
 * Error response from whitelist API
 */

export interface ApiErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Timestamp of the error */
  timestamp: string;
}
