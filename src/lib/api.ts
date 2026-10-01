import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType, type ZodTypeDef } from 'zod';
import { AppError, ValidationError, toErrorBody } from './errors';

/** Uniform JSON response helpers for route handlers. */
export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(err: unknown) {
  const { status, body } = toErrorBody(err);
  return NextResponse.json(body, { status });
}

/** Parse + validate a JSON body with zod; throws ValidationError with details. */
export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError('Invalid JSON body.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first
      ? `${first.path.join('.') || 'request'}: ${first.message}`
      : 'Invalid input.';
    throw new ValidationError(message);
  }
  return result.data;
}

/** Parse search params through zod. */
export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodType<T, ZodTypeDef, unknown>): T {
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ValidationError(first ? `${first.path.join('.') || 'query'}: ${first.message}` : 'Invalid query.');
  }
  return result.data;
}

/** Wrap a route handler with uniform error handling. */
export function handler<Args extends unknown[]>(
  fn: (req: NextRequest, ...args: Args) => Promise<Response>,
) {
  return async (req: NextRequest, ...args: Args): Promise<Response> => {
    try {
      return await fn(req, ...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return jsonError(new ValidationError(err.issues[0]?.message ?? 'Invalid input.'));
      }
      if (err instanceof AppError) return jsonError(err);
      return jsonError(err);
    }
  };
}

/** Serialize a mongoose document/POJO to a plain JSON-safe object. */
export function serialize<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}
