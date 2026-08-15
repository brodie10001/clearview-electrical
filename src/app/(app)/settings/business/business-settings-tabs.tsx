"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Palette, Clock, Package, CalendarRange, ShieldCheck, Truck, BookOpen, Users } from "lucide-react";
import { BrandingForm } from "./branding-form";
import { NumberingSection } from "./numbering-section";
import { LabourRatesSection } from "./labour-rates-section";
import { MaterialsCatalogueSection } from "./materials-catalogue-section";
import { PaymentScheduleTemplatesSection } from "./payment-schedule-templates-section";
import { TestTypesSection } from "./test-types-section";
import { ComplianceDocumentTemplatesSection } from "./compliance-document-templates-section";
import { SuppliersSection } from "./suppliers-section";
import { PriceBookSection } from "./price-book-section";
import { TeamSection } from "./team-section";
import type {
  BusinessSettings,
  LabourRateType,
  GenericMaterialData,
  CatalogueProductData,
  PaymentScheduleTemplateData,
  PaymentScheduleStageData,
  TestTypeSettingsData,
  ComplianceDocumentTemplateSettingsData,
  SupplierData,
  SupplierProductPriceData,
  PriceBookItemData,
  PriceBookItemMaterialData,
  TeamMemberData,
} from "./page";

const TABS = [
  { key: "branding", label: "Branding & Details", icon: Palette },
  { key: "team", label: "Team", icon: Users },
  { key: "rates", label: "Labour Rates", icon: Clock },
  { key: "materials", label: "Materials Catalogue", icon: Package },
  { key: "priceBook", label: "Price Book", icon: BookOpen },
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "schedules", label: "Payment Schedules", icon: CalendarRange },
  { key: "compliance", label: "Testing & Compliance", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function BusinessSettingsTabs({
  settings,
  rateTypes,
  materials,
  products,
  paymentScheduleTemplates,
  paymentScheduleStages,
  testTypes,
  complianceDocumentTemplates,
  suppliers,
  supplierPrices,
  priceBookItems,
  priceBookItemMaterials,
  teamMembers,
  currentUserId,
  canEdit,
}: {
  settings: BusinessSettings;
  rateTypes: LabourRateType[];
  materials: GenericMaterialData[];
  products: CatalogueProductData[];
  paymentScheduleTemplates: PaymentScheduleTemplateData[];
  paymentScheduleStages: PaymentScheduleStageData[];
  testTypes: TestTypeSettingsData[];
  complianceDocumentTemplates: ComplianceDocumentTemplateSettingsData[];
  suppliers: SupplierData[];
  supplierPrices: SupplierProductPriceData[];
  priceBookItems: PriceBookItemData[];
  priceBookItemMaterials: PriceBookItemMaterialData[];
  teamMembers: TeamMemberData[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("branding");

  return (
    <div className="flex flex-col gap-4">
      {!canEdit ? (
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800">
          Only owners and admins can edit business settings. You can view them here.
        </p>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        {tab === "branding" ? (
          <div className="flex flex-col gap-8">
            <BrandingForm settings={settings} canEdit={canEdit} />
            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <NumberingSection settings={settings} canEdit={canEdit} />
            </div>
          </div>
        ) : null}
        {tab === "team" ? (
          <TeamSection teamMembers={teamMembers} currentUserId={currentUserId} canEdit={canEdit} />
        ) : null}
        {tab === "rates" ? (
          <LabourRatesSection rateTypes={rateTypes} canEdit={canEdit} />
        ) : null}
        {tab === "materials" ? (
          <MaterialsCatalogueSection
            materials={materials}
            products={products}
            suppliers={suppliers}
            supplierPrices={supplierPrices}
            defaultMarkupPercent={settings.default_material_markup_percent}
            canEdit={canEdit}
          />
        ) : null}
        {tab === "priceBook" ? (
          <PriceBookSection
            items={priceBookItems}
            itemMaterials={priceBookItemMaterials}
            rateTypes={rateTypes}
            products={products}
            canEdit={canEdit}
          />
        ) : null}
        {tab === "suppliers" ? (
          <SuppliersSection suppliers={suppliers} canEdit={canEdit} />
        ) : null}
        {tab === "schedules" ? (
          <PaymentScheduleTemplatesSection
            templates={paymentScheduleTemplates}
            stages={paymentScheduleStages}
            canEdit={canEdit}
          />
        ) : null}
        {tab === "compliance" ? (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Document templates
              </h3>
              <ComplianceDocumentTemplatesSection templates={complianceDocumentTemplates} canEdit={canEdit} />
            </div>
            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Test types</h3>
              <TestTypesSection testTypes={testTypes} canEdit={canEdit} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
