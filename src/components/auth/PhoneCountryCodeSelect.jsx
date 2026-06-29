import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
} from "../../utils/phoneCountryCodes";

const PhoneCountryCodeSelect = () => {
  return (
    <div className="relative w-full">
      <div
        className="flex h-[52px] w-full items-center rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-text-primary cursor-default select-none"
      >
        +91
      </div>
    </div>
  );
};

export default PhoneCountryCodeSelect;
