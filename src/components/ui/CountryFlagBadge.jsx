import { useState } from "react";
import { getCountryFlagEmoji, getIsoAlpha2FromCountryName } from "../../utils/countrySearch";

const CountryFlagBadge = ({
  country,
  countryName,
  flagEmoji,
  sizeClass = "h-8 w-8",
  className = "",
  decorative = false,
  label,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const name = countryName || country?.name || country?.countryName || "";
  const fallback = flagEmoji || country?.flagEmoji;
  const iso = getIsoAlpha2FromCountryName(name);
  const emoji = getCountryFlagEmoji(name, fallback);
  const accessibleLabel = label || `${name || "Country"} flag`;

  return (
    <span
      className={`country-flag-badge ${sizeClass} ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-hidden={decorative ? true : undefined}
    >
      {iso && !imgFailed ? (
        <img
          src={`https://flagcdn.com/${iso.toLowerCase()}.svg`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="country-flag-badge__emoji" aria-hidden="true">
          {emoji}
        </span>
      )}
    </span>
  );
};

export default CountryFlagBadge;
