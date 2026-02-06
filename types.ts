
export interface ScanResult {
  id: string;
  time: string;
  sn: string | null;
  sku: string | null;
  mac: string | null;
  other_codes: Array<{ label: string; value: string }>;
  confidence: number;
  duplicate: boolean;
  duplicate_fields: string[];
}

export interface GeminiResponse {
  sn: string | null;
  sku: string | null;
  mac: string | null;
  other_codes: Array<{ label: string; value: string }>;
  confidence: number;
}
