export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

function appendClassNames(value: ClassValue, result: string[]): void {
  if (!value && value !== 0) return;

  if (typeof value === "string" || typeof value === "number") {
    result.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendClassNames(item, result));
    return;
  }

  Object.entries(value).forEach(([className, enabled]) => {
    if (enabled) result.push(className);
  });
}

/** Joins conditional class values without requiring a runtime dependency. */
export function cn(...values: ClassValue[]): string {
  const classNames: string[] = [];
  values.forEach((value) => appendClassNames(value, classNames));
  return classNames.join(" ");
}

