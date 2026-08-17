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
