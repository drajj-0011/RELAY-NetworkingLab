export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error) {
  return error instanceof ApiError || (error && typeof error.status === "number" && typeof error.message === "string");
}
