/** Product-form options for medication category (dosage form). */
export const MEDICATION_CATEGORIES = [
  'Herbal',
  'Suspension',
  'Syrup',
  'Tablets',
  'Soluble',
  'Capsules',
  'Ointment',
  'Drops',
  'Inhaler',
  'Gel and cream',
  'Antiseptics',
  'Oil',
  'Contraceptives',
  'Infusion',
  'Injectables',
] as const;

/** Therapeutic classification options. */
export const MEDICATION_CLASSIFICATIONS = [
  'Antibiotics',
  'Antifungals',
  'Antidiabetic',
  'Pain reliever',
  'Antihistamine & allergy',
  'Cardiovascular medications',
  'Antidepressants',
  'Respiratory medications',
  'Sleep aids',
  'Hormonal medications',
  'Gastrointestinal medication',
  'Anticoagulants',
  'Anticonvulsants',
  'Antipsychotics',
] as const;

export type MedicationCategory = (typeof MEDICATION_CATEGORIES)[number];
export type MedicationClassification = (typeof MEDICATION_CLASSIFICATIONS)[number];

const CUSTOM_CATEGORIES_KEY = 'lizzymike.customMedicationCategories';
const CUSTOM_CLASSIFICATIONS_KEY = 'lizzymike.customMedicationClassifications';

function readStoredList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((v) => String(v).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function writeStoredList(key: string, values: string[]) {
  try {
    const unique = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
    localStorage.setItem(key, JSON.stringify(unique));
  } catch {
    // ignore quota / private mode
  }
}

export function getCustomCategories(): string[] {
  return readStoredList(CUSTOM_CATEGORIES_KEY);
}

export function getCustomClassifications(): string[] {
  return readStoredList(CUSTOM_CLASSIFICATIONS_KEY);
}

export function rememberCustomCategory(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if ((MEDICATION_CATEGORIES as readonly string[]).includes(trimmed)) return;
  writeStoredList(CUSTOM_CATEGORIES_KEY, [...getCustomCategories(), trimmed]);
}

export function rememberCustomClassification(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if ((MEDICATION_CLASSIFICATIONS as readonly string[]).includes(trimmed)) return;
  writeStoredList(CUSTOM_CLASSIFICATIONS_KEY, [...getCustomClassifications(), trimmed]);
}

/** Merge defaults + custom + values already used on medications. */
export function buildCategoryOptions(fromMedications: string[] = []): string[] {
  return Array.from(
    new Set([
      ...MEDICATION_CATEGORIES,
      ...getCustomCategories(),
      ...fromMedications.map((v) => v.trim()).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));
}

export function buildClassificationOptions(fromMedications: string[] = []): string[] {
  return Array.from(
    new Set([
      ...MEDICATION_CLASSIFICATIONS,
      ...getCustomClassifications(),
      ...fromMedications.map((v) => v.trim()).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));
}
