"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { QuoteDocument, type BusinessSettingsPdf, type QuotePdfData, type QuotePdfLine } from "@/lib/quote-pdf";

// Fake quote data purely for the live preview -- reuses the real
// QuoteDocument/PDF renderer so this step never drifts from what an actual
// generated quote looks like.
const SAMPLE_QUOTE: QuotePdfData = {
  id: "sample",
  quote_number: "QUO-0001",
  status: "Draft",
  expiry_date: null,
  notes: null,
  subtotal: 550,
  gst_amount: 55,
  total: 605,
  gst_applied: true,
  created_at: new Date().toISOString(),
  jobs: {
    properties: {
      address: "12 Sample Street, Perth WA",
      customers: { name: "Sample Customer", email: null, phone: null },
    },
  },
};

const SAMPLE_LINES: QuotePdfLine[] = [
  {
    line_type: "labour",
    description: "Install and test new circuit",
    rate_per_hour: 120,
    hours: 3,
    cost: null,
    markup_percent: null,
    quantity: null,
    sell_price: null,
    line_total: 360,
    labour_rate_types: { name: "Standard" },
  },
  {
    line_type: "material",
    description: "Double GPO",
    rate_per_hour: null,
    hours: null,
    cost: 15,
    markup_percent: 30,
    quantity: 4,
    sell_price: 19.5,
    line_total: 190,
    labour_rate_types: null,
  },
];

export function BrandingLivePreview({ settings }: { settings: BusinessSettingsPdf }) {
  return (
    <PDFViewer style={{ width: "100%", height: 420, border: "none" }} showToolbar={false}>
      <QuoteDocument quote={SAMPLE_QUOTE} lines={SAMPLE_LINES} settings={settings} />
    </PDFViewer>
  );
}
