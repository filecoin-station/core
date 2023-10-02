import type * as undici from "undici";

declare global {
  // Re-export undici fetch function and various classes to global scope.
  // These are classes and functions expected to be at global scope according to
  // Node.js v18 API documentation.
  // See: https://nodejs.org/dist/latest-v18.x/docs/api/globals.html
  export const { 
    FormData,
    Headers,
    Request,
    Response,
    fetch,
  }: typeof undici;
}
