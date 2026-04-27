export interface Template {
  id: string;
  name: string;
  /** Tailwind classes for the badge pill */
  badgeClass: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "intake",
    name: "Intake",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  {
    id: "followup",
    name: "Follow-up",
    badgeClass: "bg-green-100 text-green-700",
  },
  {
    id: "medication",
    name: "Medication",
    badgeClass: "bg-purple-100 text-purple-700",
  },
  {
    id: "custom",
    name: "Custom",
    badgeClass: "bg-gray-100 text-gray-600",
  },
];

/** Keyed by id for O(1) lookup */
export const TEMPLATES_MAP: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
);

/**
 * Returns the template for a given id.
 * Falls back to a neutral gray badge so unknown ids never crash the UI.
 */
export function getTemplate(id: string): Template {
  return (
    TEMPLATES_MAP[id] ?? {
      id,
      name: id,
      badgeClass: "bg-gray-100 text-gray-600",
    }
  );
}
