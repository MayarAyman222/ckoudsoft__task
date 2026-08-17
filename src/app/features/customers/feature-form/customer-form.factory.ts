import { FormBuilder, Validators } from '@angular/forms';
import { Customer } from '../../../core/models/customer.model';
import { COUNTRY_OPTIONS, REGION_OPTIONS, CITY_OPTIONS } from '../../../core/constants/lookups.constant';
import {
  alphaNumericValidator,
  atLeastOneOf,
  mobilePatternValidator,
  notInFutureValidator,
} from '../../../shared/utils/custom-validators';


export function buildCustomerForm(fb: FormBuilder) {
  return fb.nonNullable.group(
    {
      Id: [0],
      Code: ['', [Validators.required, Validators.maxLength(20)]],
      Company: [''],
      CommercialName: ['', [Validators.required, Validators.maxLength(150)]],
      LegalArabicName: [''],
      LegalEnglishName: [''],
      LegalFrenchName: [''],
      JobTitle: [''],
      BirthDate: [null as string | null, [notInFutureValidator()]],
      Email: ['', [Validators.email]],
      Fax: [''],
      NationalID: ['', [Validators.pattern(/^\d{0,20}$/)]],
      Website: [''],
      PassportNo: [''],
      Address: [''],
      DistrictAR: [''],
      DistrictEN: [''],
      StreetAR: [''],
      StreetEN: [''],
      RegionId: [null as number | null],
      CountryId: [null as number | null, [Validators.required]],
      CityId: [null as number | null],
      MainClientId: [null as number | null],
      Mobile: ['', [mobilePatternValidator()]],
      Phone: [''],
      BuildingNumber: [''],
      PostalCode: [''],
      VATRegistrationNumber: ['', [alphaNumericValidator(3)]],
      GroupVATRegistrationNumber: [''],
      AccountNo: [''],
      SwiftCode: ['', [Validators.pattern(/^[A-Z0-9]{0,11}$/)]],
      PayeeBank: [''],
      CommercialRegistrationNumber: [''],
    },
    {
      validators: [atLeastOneOf(['Mobile', 'Phone', 'Email'])],
    }
  );
}

export type CustomerForm = ReturnType<typeof buildCustomerForm>;

export function toFormValue(customer: Customer) {
  return {
    Id: customer.Id ?? 0,
    Code: customer.Code ?? '',
    Company: customer.Company ?? '',
    CommercialName: customer.CommercialName ?? customer.Name ?? '',
    LegalArabicName: customer.LegalArabicName ?? '',
    LegalEnglishName: customer.LegalEnglishName ?? '',
    LegalFrenchName: customer.LegalFrenchName ?? '',
    JobTitle: customer.JobTitle ?? '',
    BirthDate: customer.BirthDate ?? null,
    Email: customer.Email ?? '',
    Fax: customer.Fax ?? '',
    NationalID: customer.NationalID ?? '',
    Website: customer.Website ?? '',
    PassportNo: customer.PassportNo ?? '',
    Address: customer.Address ?? '',
    DistrictAR: customer.DistrictAR ?? '',
    DistrictEN: customer.DistrictEN ?? '',
    StreetAR: customer.StreetAR ?? '',
    StreetEN: customer.StreetEN ?? '',
    RegionId: customer.RegionId ?? null,
    CountryId: customer.CountryId ?? null,
    CityId: customer.CityId ?? null,
    MainClientId: customer.MainClientId ?? null,
    Mobile: customer.Mobile ?? '',
    Phone: customer.Phone ?? '',
    BuildingNumber: customer.BuildingNumber ?? '',
    PostalCode: customer.PostalCode ?? '',
    VATRegistrationNumber: customer.VATRegistrationNumber ?? '',
    GroupVATRegistrationNumber: customer.GroupVATRegistrationNumber ?? '',
    AccountNo: customer.AccountNo ?? '',
    SwiftCode: customer.SwiftCode ?? '',
    PayeeBank: customer.PayeeBank ?? '',
    CommercialRegistrationNumber: customer.CommercialRegistrationNumber ?? '',
  };
}

export function toApiPayload(formValue: ReturnType<typeof toFormValue>): Customer {
  const country = COUNTRY_OPTIONS.find((option) => option.value === formValue.CountryId)?.label ?? '';
  const region = REGION_OPTIONS.find((option) => option.value === formValue.RegionId)?.label ?? '';
  const city = CITY_OPTIONS.find((option) => option.value === formValue.CityId)?.label ?? '';

  return {
    ...formValue,
    Name: formValue.CommercialName,
    NameAR: formValue.LegalArabicName,
    NameEN: formValue.LegalEnglishName,
    Country: country,
    Region: region,
    City: city,
    xmlContactPersonGrid: [],
    Attachment: [],
    ServerIP: '',
    InCT: '',
  } as unknown as Customer;
}