import { z } from 'zod';

// Recursive JSON value type
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

// Zod schema for JSON values
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

export const JsonValueSchema = jsonValueSchema;

// JSONPath result type from jsonpath-plus
export interface JSONPathResult {
  value: JsonValue;
  parent: JsonValue | null;
  parentProperty: string | number | undefined;
}
