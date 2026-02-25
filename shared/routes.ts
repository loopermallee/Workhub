import { z } from "zod";
import { appDataSchema } from "./schema";

export const api = {
  data: {
    get: {
      method: 'GET' as const,
      path: '/api/data' as const,
      responses: {
        200: appDataSchema
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
