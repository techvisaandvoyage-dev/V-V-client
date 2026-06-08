import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
} from "../../utils/phoneCountryCodes";

const PhoneCountryCodeSelect = ({
  value = DEFAULT_PHONE_COUNTRY_CODE,
  onChange,
  disabled = false,
  label = "Country Code",
}) => {
  const [options, setOptions] = useState(() => getPhoneCountryOptions());

  useEffect(() => {
    let active = true;

    loadPhoneCountryOptions()
      .then((loaded) => {
        if (active && Array.isArray(loaded) && loaded.length) {
          setOptions(loaded);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const resolvedValue = useMemo(() => {
    if (options.some((option) => option.value === value)) return value;
    return DEFAULT_PHONE_COUNTRY_CODE;
  }, [options, value]);

  return (
    <div className="space-y-1">
      <label className="px-4 text-[12px] font-medium uppercase tracking-[0.18em] text-text-muted">
        {label}
      </label>
      <select
        value={resolvedValue}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="h-[52px] w-full rounded-full border border-border bg-surface px-5 text-[15px] text-text-primary focus:border-text-primary focus:outline-none focus:ring-1 focus:ring-text-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PhoneCountryCodeSelect;
