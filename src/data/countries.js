const DEFAULT_REQUIREMENTS = [
  "Valid passport (6+ months)",
  "Completed visa application form",
  "Passport-size photograph",
  "Travel itinerary",
  "Proof of funds",
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const COUNTRY_NAMES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const FEATURED_OVERRIDES = {
  "united states": { id: "usa", flagEmoji: "🇺🇸", basePrice: 15400, processingDays: "3-5", difficulty: "moderate", visaType: "B1/B2 Tourist", continent: "Americas", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 78 },
  "united kingdom": { id: "uk", flagEmoji: "🇬🇧", basePrice: 9500, processingDays: "3-8", difficulty: "moderate", visaType: "Standard Visitor", continent: "Europe", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 82 },
  canada: { flagEmoji: "🇨🇦", basePrice: 8300, processingDays: "14-28", difficulty: "moderate", visaType: "Temporary Resident", continent: "Americas", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 73 },
  "united arab emirates": { id: "uae", flagEmoji: "🇦🇪", basePrice: 5000, processingDays: "2-4", difficulty: "easy", visaType: "Tourist Visa", continent: "Middle East", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 94 },
  japan: { flagEmoji: "🇯🇵", basePrice: 2100, processingDays: "5-7", difficulty: "easy", visaType: "Temporary Visitor", continent: "Asia", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 91 },
  australia: { flagEmoji: "🇦🇺", basePrice: 12000, processingDays: "10-25", difficulty: "hard", visaType: "Tourist Visa (600)", continent: "Oceania", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 71 },
  singapore: { flagEmoji: "🇸🇬", basePrice: 2500, processingDays: "3-5", difficulty: "easy", visaType: "Social Visit Pass", continent: "Asia", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 96 },
  turkey: { flagEmoji: "🇹🇷", basePrice: 4150, processingDays: "1-3", difficulty: "easy", visaType: "e-Visa", continent: "Europe/Asia", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 97 },
  india: { flagEmoji: "🇮🇳", basePrice: 2100, processingDays: "3-5", difficulty: "easy", visaType: "e-Tourist Visa", continent: "Asia", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 92 },
  france: { flagEmoji: "🇫🇷", basePrice: 7500, processingDays: "5-15", difficulty: "moderate", visaType: "Type C Schengen", continent: "Europe", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 83 },
  thailand: { flagEmoji: "🇹🇭", basePrice: 2900, processingDays: "1-2", difficulty: "easy", visaType: "Tourist Visa", continent: "Asia", imageUrl: "/images/visa-card-fallback.svg", trending: true, successRate: 95 },
  indonesia: { flagEmoji: "🇮🇩", trending: true },
  germany: { flagEmoji: "🇩🇪", trending: true },
  italy: { flagEmoji: "🇮🇹", trending: true },
};

export const COUNTRIES = COUNTRY_NAMES.map((countryName, index) => {
  const key = countryName.toLowerCase();
  const override = FEATURED_OVERRIDES[key] || {};

  return {
    id: override.id || slugify(countryName),
    name: countryName,
    flagEmoji: override.flagEmoji || "🌍",
    basePrice: override.basePrice || (3500 + (index % 10) * 500),
    processingDays: override.processingDays || (index % 3 === 0 ? "2-5" : "4-10"),
    difficulty: override.difficulty || (index % 4 === 0 ? "easy" : "moderate"),
    visaType: override.visaType || "Tourist Visa",
    continent: override.continent || "Global",
    imageUrl: override.imageUrl || "/images/visa-card-fallback.svg",
    description: override.description || `Explore ${countryName} with simplified visa support and travel guidance.`,
    requirements: override.requirements || DEFAULT_REQUIREMENTS,
    requiredDocuments: override.requiredDocuments || ["passport"],
    trending: Boolean(override.trending),
    successRate: override.successRate || 80 + (index % 16),
  };
});

export const TRENDING_COUNTRIES = COUNTRIES.filter((c) => c.trending);

export const getCountryById = (id) => COUNTRIES.find((c) => c.id === id);
