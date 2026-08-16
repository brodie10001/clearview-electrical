-- Expands the starter materials catalogue every new signup gets
-- (seed_new_business(), added in 20260814092000_multi_tenancy.sql). The
-- original 9 generic materials / 24 products covered only the bare
-- minimum; new users were landing on a near-empty catalogue on day one.
-- This adds more common residential items within the same four existing
-- categories (Power Points, Lighting, Switchboard/Protection, Cable) --
-- no new categories, matching the "expand current categories" scope.
--
-- This only changes what NEW businesses get seeded with going forward.
-- It does not touch any already-seeded business's existing data (this
-- function only ever runs once, at signup, via handle_new_user()).
create or replace function public.seed_new_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_settings (business_id) values (p_business_id);

  insert into public.labour_rate_types (business_id, name, rate_per_hour, sort_order) values
    (p_business_id, 'Standard', 0, 1),
    (p_business_id, 'Apprentice', 0, 2),
    (p_business_id, 'Call-out', 0, 3),
    (p_business_id, 'After-hours', 0, 4),
    (p_business_id, 'Emergency', 0, 5);

  insert into public.generic_materials (business_id, name, category)
  select p_business_id, name, category from (values
    ('Single GPO', 'Power Points'),
    ('Double GPO', 'Power Points'),
    ('Weatherproof GPO', 'Power Points'),
    ('USB GPO', 'Power Points'),
    ('Light Point', 'Lighting'),
    ('LED Downlight', 'Lighting'),
    ('Single Switch', 'Lighting'),
    ('Double Switch', 'Lighting'),
    ('Dimmer Switch', 'Lighting'),
    ('Exhaust Fan', 'Lighting'),
    ('Ceiling Fan', 'Lighting'),
    ('Circuit Breaker', 'Switchboard/Protection'),
    ('Safety Switch/RCD', 'Switchboard/Protection'),
    ('RCBO', 'Switchboard/Protection'),
    ('Switchboard Enclosure', 'Switchboard/Protection'),
    ('1.5mm TPS Cable', 'Cable'),
    ('2.5mm TPS Cable', 'Cable'),
    ('4mm TPS Cable', 'Cable'),
    ('6mm TPS Cable', 'Cable'),
    ('Cat6 Data Cable', 'Cable')
  ) as seed(name, category);

  insert into public.catalogue_products (business_id, generic_material_id, brand, product_name)
  select p_business_id, gm.id, seed.brand, seed.product_name
  from public.generic_materials gm
  join (values
    ('Single GPO', 'Clipsal', 'Iconic'),
    ('Single GPO', 'Clipsal', 'Classic'),
    ('Single GPO', 'HPM', 'Excel'),
    ('Double GPO', 'Clipsal', 'Iconic'),
    ('Double GPO', 'Clipsal', 'Classic'),
    ('Double GPO', 'HPM', 'Excel'),
    ('Weatherproof GPO', 'Clipsal', 'Weatherproof'),
    ('Weatherproof GPO', 'HPM', 'Weatherproof'),
    ('USB GPO', 'Clipsal', 'Iconic USB'),
    ('USB GPO', 'HPM', 'USB GPO'),
    ('Light Point', 'Clipsal', 'Ceiling Rose'),
    ('Light Point', 'HPM', 'Batten Holder'),
    ('LED Downlight', 'Brilliant', 'LED Downlight'),
    ('LED Downlight', 'Atom', 'LED Downlight'),
    ('LED Downlight', 'HPM', 'LED Downlight'),
    ('Single Switch', 'Clipsal', 'Iconic'),
    ('Single Switch', 'Clipsal', 'Classic'),
    ('Single Switch', 'HPM', 'Excel'),
    ('Double Switch', 'Clipsal', 'Iconic'),
    ('Double Switch', 'Clipsal', 'Classic'),
    ('Double Switch', 'HPM', 'Excel'),
    ('Dimmer Switch', 'Clipsal', 'Saturn Dimmer'),
    ('Dimmer Switch', 'HPM', 'Dimmer'),
    ('Exhaust Fan', 'Ventair', 'Streamline'),
    ('Exhaust Fan', 'Martec', 'Premium Airflow'),
    ('Ceiling Fan', 'Mercator', 'Ceiling Fan'),
    ('Ceiling Fan', 'Hunter Pacific', 'Ceiling Fan'),
    ('Circuit Breaker', 'Clipsal', 'MCB'),
    ('Circuit Breaker', 'Hager', 'MCB'),
    ('Circuit Breaker', 'Schneider Electric', 'MCB'),
    ('Safety Switch/RCD', 'Clipsal', 'RCD'),
    ('Safety Switch/RCD', 'Hager', 'RCD'),
    ('Safety Switch/RCD', 'Schneider Electric', 'RCD'),
    ('RCBO', 'Clipsal', 'RCBO'),
    ('RCBO', 'Hager', 'RCBO'),
    ('RCBO', 'Schneider Electric', 'RCBO'),
    ('Switchboard Enclosure', 'Clipsal', 'Switchboard Enclosure'),
    ('Switchboard Enclosure', 'Hager', 'Switchboard Enclosure'),
    ('1.5mm TPS Cable', 'Olex', '1.5mm TPS'),
    ('1.5mm TPS Cable', 'Prysmian', '1.5mm TPS'),
    ('2.5mm TPS Cable', 'Olex', '2.5mm TPS'),
    ('2.5mm TPS Cable', 'Prysmian', '2.5mm TPS'),
    ('4mm TPS Cable', 'Olex', '4mm TPS'),
    ('4mm TPS Cable', 'Prysmian', '4mm TPS'),
    ('6mm TPS Cable', 'Olex', '6mm TPS'),
    ('6mm TPS Cable', 'Prysmian', '6mm TPS'),
    ('Cat6 Data Cable', 'Excel', 'Cat6'),
    ('Cat6 Data Cable', 'Belden', 'Cat6')
  ) as seed(material_name, brand, product_name)
    on seed.material_name = gm.name and gm.business_id = p_business_id;

  insert into public.compliance_document_templates (business_id, name, category, field_schema) values
  (
    p_business_id,
    'Electrical Safety Certificate',
    'Electrical Safety Certificate',
    '[
      {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
      {"key": "installation_type", "label": "Installation type", "type": "select", "required": true, "options": ["New Installation", "Alteration", "Repair", "Testing Only"]},
      {"key": "compliant", "label": "Installation complies with AS/NZS 3000", "type": "checkbox", "required": true},
      {"key": "defects_noted", "label": "Defects noted", "type": "textarea", "required": false},
      {"key": "electrician_license_number", "label": "Electrician licence number", "type": "text", "required": true},
      {"key": "date_of_inspection", "label": "Date of inspection", "type": "date", "required": true}
    ]'::jsonb
  ),
  (
    p_business_id,
    'Notice of Completion',
    'Notice of Completion',
    '[
      {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
      {"key": "date_completed", "label": "Date completed", "type": "date", "required": true},
      {"key": "contractor_license_number", "label": "Contractor licence number", "type": "text", "required": true},
      {"key": "notes", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb
  ),
  (
    p_business_id,
    'Preliminary Notice',
    'Preliminary Notice',
    '[
      {"key": "work_description", "label": "Description of work", "type": "textarea", "required": true},
      {"key": "estimated_start_date", "label": "Estimated start date", "type": "date", "required": true},
      {"key": "estimated_completion_date", "label": "Estimated completion date", "type": "date", "required": false},
      {"key": "notes", "label": "Notes", "type": "textarea", "required": false}
    ]'::jsonb
  );

  insert into public.test_types (business_id, name, default_unit, is_custom) values
    (p_business_id, 'Earth Continuity', 'Ω', false),
    (p_business_id, 'Insulation Resistance', 'MΩ', false),
    (p_business_id, 'Polarity', null, false),
    (p_business_id, 'RCD/RCBO Testing', 'ms', false),
    (p_business_id, 'Fault Loop/Earth Fault Loop', 'Ω', false),
    (p_business_id, 'Voltage', 'V', false),
    (p_business_id, 'Phase Sequence', null, false),
    (p_business_id, 'Other/Custom', null, true);
end;
$$;
