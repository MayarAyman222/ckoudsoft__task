export interface LookupOption {
  label: string;
  value: string | number;
}

export const CLIENT_TYPE_OPTIONS: LookupOption[] = [
  { label: 'Client', value: 'Client' },
  { label: 'Lead', value: 'Lead' },
  { label: 'Vendor', value: 'Vendor' },
];

export const COUNTRY_OPTIONS: LookupOption[] = [
  { label: 'Egypt', value: 1 },
  { label: 'Saudi Arabia', value: 2 },
  { label: 'United Arab Emirates', value: 3 },
];

export const COUNTRY_NAME_OPTIONS: LookupOption[] = [
  { label: 'Egypt', value: 'Egypt' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia' },
  { label: 'UAE', value: 'UAE' },
];


export const REGION_OPTIONS: LookupOption[] = [
  { label: 'Cairo', value: 1 },
  { label: 'Giza', value: 2 },
  { label: 'Alexandria', value: 3 },
  { label: 'Riyadh', value: 4 },
  { label: 'Dubai', value: 5 },
];

export const CITY_OPTIONS: LookupOption[] = [
  { label: 'Cairo', value: 1 },
  { label: 'Nasr City', value: 2 },
  { label: 'Giza', value: 3 },
  { label: 'Alexandria', value: 4 },
  { label: 'Riyadh', value: 5 },
  { label: 'Jeddah', value: 6 },
  { label: 'Dubai', value: 7 },
];

export const COMPANY_OPTIONS: LookupOption[] = [
  { label: 'ERP Plus', value: 'ERP Plus' },
  { label: 'ERP Plus Cloud', value: 'ERP Plus Cloud' },
];

export const MAIN_ACCOUNT_OPTIONS: LookupOption[] = [
  { label: 'Anas', value: 3708 },
  { label: 'AnasUAEon', value: 3706 },
  { label: 'AnasJAfar', value: 3705 },
];