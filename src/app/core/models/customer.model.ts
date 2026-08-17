/**
 * Customer as returned by ReadAllCRMClients.
 * The staging API is loosely typed (many optional/nullable fields), so almost
 * everything is optional here; the UI defensively falls back with the
 * `?? '-'` pattern rather than assuming a field is always present.
 */
export interface Customer {
  Id?: number;
  Code?: string;
  CommercialName?: string;
  Name?: string;
  NameAR?: string;
  NameEN?: string;
  Email?: string;
  Mobile?: string;
  Phone?: string;
  Phone2?: string;
  Fax?: string;
  Website?: string;
  ClientType?: string;
  AccountTypeId?: number;
  AccountManager?: string;
  AccountManagerId?: number;
  City?: string;
  CityId?: number | null;
  Country?: string;
  CountryId?: number | null;
  Region?: string;
  RegionId?: number | null;
  Address?: string;
  Status?: number | string;
  JobTitle?: string;
  BirthDate?: string | null;
  NationalID?: string;
  PassportNo?: string;
  DistrictAR?: string;
  DistrictEN?: string;
  StreetAR?: string;
  StreetEN?: string;
  MainClientId?: number | null;
  BuildingNumber?: string;
  PostalCode?: string;
  VATRegistrationNumber?: string;
  GroupVATRegistrationNumber?: string;
  AccountNo?: string;
  SwiftCode?: string;
  PayeeBank?: string;
  CommercialRegistrationNumber?: string;
  ClassificationId?: number;
  BusinessFieldId?: number;
  Company?: string;
  LegalArabicName?: string;
  LegalEnglishName?: string;
  LegalFrenchName?: string;
  ContNameAR?: string;
  ContNameEN?: string;
  ContAddress?: string;
  ContMobile?: string;
  ContEmail?: string;
  ContPhone?: string;
  [key: string]: unknown;
}

/** Flat shape the Reactive Form binds to (kept close to the API's own field names). */
export interface CustomerFormValue {
  Id: number;
  Code: string;
  Company: string | null;
  CommercialName: string;
  LegalArabicName: string;
  LegalEnglishName: string;
  LegalFrenchName: string;
  JobTitle: string;
  BirthDate: string | null;
  Email: string;
  Fax: string;
  NationalID: string;
  Website: string;
  PassportNo: string;
  Address: string;
  DistrictAR: string;
  DistrictEN: string;
  StreetAR: string;
  StreetEN: string;
  RegionId: number | null;
  CountryId: number | null;
  CityId: number | null;
  MainClientId: number | null;
  Mobile: string;
  Phone: string;
  BuildingNumber: string;
  PostalCode: string;
  VATRegistrationNumber: string;
  GroupVATRegistrationNumber: string;
  AccountNo: string;
  SwiftCode: string;
  PayeeBank: string;
  CommercialRegistrationNumber: string;
}
