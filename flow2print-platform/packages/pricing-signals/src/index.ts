export interface PricingSignals {
  "signal.surface_count": number;
  "signal.page_count": number;
  "signal.zone_count": number;
  "signal.total_print_area_mm2": number;
  "signal.image_count": number;
  "signal.text_count": number;
  "signal.asset_upload_count": number;
  "signal.requires_manual_review": 0 | 1;
  "signal.proof_mode": "none" | "digital";
  "signal.template_type": "free" | "locked" | "brand";
  "signal.customization_complexity": "low" | "medium" | "high";
  "signal.packaging_face_count": number;
  "signal.apparel_zone_count": number;
}

export const defaultPricingSignals = (): PricingSignals => ({
  "signal.surface_count": 1,
  "signal.page_count": 1,
  "signal.zone_count": 1,
  "signal.total_print_area_mm2": 0,
  "signal.image_count": 0,
  "signal.text_count": 0,
  "signal.asset_upload_count": 0,
  "signal.requires_manual_review": 0,
  "signal.proof_mode": "none",
  "signal.template_type": "free",
  "signal.customization_complexity": "low",
  "signal.packaging_face_count": 0,
  "signal.apparel_zone_count": 0
});
