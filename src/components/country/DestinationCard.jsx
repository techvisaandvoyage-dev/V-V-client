import { lazy, memo, Suspense, useEffect, useState } from "react";
import MobileStaticCountryCard from "./MobileStaticCountryCard";

const DesktopAnimatedCountryCard = lazy(() => import("./DesktopAnimatedCountryCard"));
const DESKTOP_QUERY = "(min-width: 768px)";

const getIsDesktop = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
};

const DestinationCard = memo(function DestinationCard(props) {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  if (!isDesktop) {
    return <MobileStaticCountryCard {...props} />;
  }

  return (
    <Suspense fallback={<MobileStaticCountryCard {...props} />}>
      <DesktopAnimatedCountryCard {...props} />
    </Suspense>
  );
});

export default DestinationCard;
