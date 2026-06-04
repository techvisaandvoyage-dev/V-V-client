  import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Camera,
  Shield,
  KeyRound,
  Save,
  X,
  Edit3,
  ArrowLeft,
  Loader2,
  Phone,
  Search,
  ChevronDown,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import Navbar from "../components/layout/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input, { Select } from "../components/ui/Input";
import OtpInput from "../components/ui/OtpInput";
import { useNavigate } from "react-router-dom";
import { formatOrdinalDate } from "../utils/dateUtils";
import { useAuthControls } from "../hooks/useAuthControls";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  filterPhoneCountryOptions,
  findPhoneCountryOption,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
  parsePhoneWithCountryCode,
} from "../utils/phoneCountryCodes";

const formatMemberSince = (value) => {
  if (!value) return "Recently joined";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently joined";
  return formatOrdinalDate(parsed);
};

const createEmptyOtp = (length = 6) => Array.from({ length: length === 4 ? 4 : 6 }, () => "");

const StatusPill = ({ children, tone = "green" }) => {
  const tones = {
    green: "bg-emerald-500/12 text-emerald-700 border border-emerald-200/70",
    blue: "bg-blue-500/12 text-blue-700 border border-blue-200/70",
    amber: "bg-amber-500/12 text-amber-700 border border-amber-200/70",
    zinc: "bg-slate-500/12 text-slate-700 border border-slate-200/80",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const OverviewRow = ({ icon: Icon, label, value, valueTone = "green" }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon size={16} />
      </span>
      <span>{label}</span>
    </div>
    {typeof value === "string" && ["green", "blue", "amber", "zinc"].includes(valueTone) ? (
      <StatusPill tone={valueTone}>{value}</StatusPill>
    ) : (
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    )}
  </div>
);

const SectionShell = ({ icon: Icon, title, children, className = "" }) => (
  <Card
    className={`overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl ${className}`}
  >
    <div className="flex items-center gap-3 border-b border-slate-100 px-7 py-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#EEF4FF_0%,#F5F9FF_100%)] text-[#235BFF] shadow-[0_10px_28px_rgba(37,99,235,0.12)]">
        <Icon size={19} />
      </span>
      <h2 className="text-[1.35rem] font-bold tracking-tight text-slate-900">{title}</h2>
    </div>
    <div className="px-7 py-7">{children}</div>
  </Card>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const {
    user,
    updateProfile,
    requestProfilePhoneOtp,
    verifyProfilePhoneOtp,
    uploadProfileImage,
    changeUserPassword,
    isLoading,
  } = useAuthStore();
  const { showToast } = useUIStore();
  const { authControls } = useAuthControls();

  const fileInputRef = useRef(null);
  const countryCodeDropdownRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const [phoneCountryOptions, setPhoneCountryOptions] = useState(() => getPhoneCountryOptions());
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [phoneOtpActive, setPhoneOtpActive] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(createEmptyOtp(6));
  const [phoneOtpLength, setPhoneOtpLength] = useState(6);
  const [phoneOtpChannel, setPhoneOtpChannel] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState("");
  const [phoneChangeError, setPhoneChangeError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isCreatingPassword = !user?.hasPassword;

  const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!isCreatingPassword && !currentPassword.trim()) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one uppercase letter.";
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one lowercase letter.";
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one digit.";
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one special character.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  };

  useEffect(() => {
    let mounted = true;
    loadPhoneCountryOptions().then((options) => {
      if (mounted && Array.isArray(options) && options.length) {
        setPhoneCountryOptions(options);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
      setFormData({
        name: user.name || "",
        age: user.age || "",
        gender: user.gender || "Other",
        email: user.email || "",
        phone: parsedPhone.phone,
        phoneCountryCode: parsedPhone.countryCode,
      });
    }
  }, [phoneCountryOptions, user]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!countryCodeDropdownRef.current?.contains(event.target)) {
        setCountryCodeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const updates = {
      name: formData.name,
      age: formData.age ? Number(formData.age) : undefined,
      gender: formData.gender,
    };

    const { success } = await updateProfile(updates);
    if (success) {
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } else {
      showToast("Failed to update profile", "error");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
      setFormData({
        name: user.name || "",
        age: user.age || "",
        gender: user.gender || "Other",
        email: user.email || "",
        phone: parsedPhone.phone,
        phoneCountryCode: parsedPhone.countryCode,
      });
    }
    setPhoneOtpActive(false);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(6));
    setPhoneOtpLength(6);
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
    setPhoneChangeError("");
  };

  const handleStartPhoneChange = () => {
    const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
    setFormData((prev) => ({
      ...prev,
      phone: parsedPhone.phone,
      phoneCountryCode: parsedPhone.countryCode,
    }));
    setPhoneOtpActive(true);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(6));
    setPhoneOtpLength(6);
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
    setPhoneChangeError("");
  };

  const handleCancelPhoneChange = () => {
    const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
    setFormData((prev) => ({
      ...prev,
      phone: parsedPhone.phone,
      phoneCountryCode: parsedPhone.countryCode,
    }));
    setPhoneOtpActive(false);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(6));
    setPhoneOtpLength(6);
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
    setPhoneChangeError("");
  };

  const getEnteredFullPhone = () => {
    const digits = String(formData.phone || "").replace(/\D/g, "");
    return `${formData.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
  };

  const handleSendPhoneOtp = async () => {
    const digits = String(formData.phone || "").replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneChangeError("Enter a valid 10-digit mobile number.");
      showToast("Enter a valid 10-digit mobile number.", "error");
      return;
    }

    const currentDigits = String(user.phone || "").replace(/\D/g, "").slice(-10);
    if (currentDigits && currentDigits === digits) {
      setPhoneChangeError("Enter a different mobile number.");
      showToast("Enter a different mobile number.", "error");
      return;
    }

    const fullPhone = getEnteredFullPhone();
    const { success, message, devOtp, channel, otpLength } = await requestProfilePhoneOtp(fullPhone);
    if (!success) {
      setPhoneChangeError(message || "Could not send OTP.");
      showToast(message || "Could not send OTP.", "error");
      return;
    }

    const nextLength = otpLength === 4 ? 4 : 6;
    const nextDevOtp = devOtp != null ? String(devOtp).slice(0, nextLength) : "";
    setPhoneOtpSent(true);
    setPhoneOtpLength(nextLength);
    setPhoneOtpDigits(nextDevOtp ? nextDevOtp.padEnd(nextLength, "").split("").slice(0, nextLength) : createEmptyOtp(nextLength));
    setPhoneOtpChannel(channel || "");
    setPhoneDevOtp(nextDevOtp);
    setPhoneChangeError("");
    showToast(nextDevOtp ? "Testing OTP filled automatically." : "OTP sent to your mobile number.", "success");
  };

  const handleVerifyPhoneOtp = async () => {
    const otp = phoneOtpDigits.join("");
    if (otp.length !== phoneOtpLength) {
      showToast(`Please enter the ${phoneOtpLength}-digit OTP.`, "error");
      return;
    }

    const fullPhone = getEnteredFullPhone();
    const { success, message } = await verifyProfilePhoneOtp(fullPhone, otp);
    if (!success) {
      showToast(message || "Invalid OTP.", "error");
      return;
    }

    const parsedPhone = parsePhoneWithCountryCode(fullPhone, phoneCountryOptions);
    setFormData((prev) => ({
      ...prev,
      phone: parsedPhone.phone,
      phoneCountryCode: parsedPhone.countryCode,
    }));
    setPhoneOtpActive(false);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(phoneOtpLength));
    setPhoneDevOtp("");
    setPhoneChangeError("");
    showToast("Mobile number updated successfully.", "success");
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      showToast("Only JPG and PNG images are allowed", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be less than 2MB", "error");
      return;
    }

    setIsUploading(true);
    const { success } = await uploadProfileImage(file);
    setIsUploading(false);

    if (success) {
      showToast("Profile image updated!");
    } else {
      showToast("Failed to upload image", "error");
    }
  };

  const handleChangePassword = async () => {
    const errors = validatePasswordChange(passwordForm);
    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      setPasswordErrors(errors);
      const firstError = errors.currentPassword || errors.newPassword || errors.confirmPassword;
      showToast(firstError, "error");
      return;
    }

    setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setIsChangingPassword(true);
    const currentPasswordValue = isCreatingPassword ? "" : passwordForm.currentPassword;
    const { success, message } = await changeUserPassword(currentPasswordValue, passwordForm.newPassword);
    setIsChangingPassword(false);

    if (success) {
      showToast(isCreatingPassword ? "Password created successfully!" : "Password updated successfully!", "success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowSecurityForm(false);
    } else {
      showToast(message || "Failed to update password", "error");
    }
  };

  if (!user) return null;

  const displayPhoneDigits = String(user.phone || formData.phone || "").replace(/\D/g, "");
  const displayPhoneCountryCode = formData.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE;
  const displayPhone =
    displayPhoneDigits.length === 10
      ? `${displayPhoneCountryCode} ${displayPhoneDigits.slice(0, 5)} ${displayPhoneDigits.slice(5)}`
      : (user.phone || formData.phone || "Not added");

  const filteredCountryOptions = filterPhoneCountryOptions(countryCodeSearch, phoneCountryOptions);
  const selectedCountryOption = findPhoneCountryOption(formData.phoneCountryCode, phoneCountryOptions);
  const phoneInputLocked = !phoneOtpActive || phoneOtpSent;
  const phoneActionLabel = displayPhoneDigits ? "Change mobile no." : "Add mobile no.";

  const memberSince = formatMemberSince(user.createdAt);

  return (
    <div className="min-h-screen bg-white pb-16">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#235BFF] transition-colors hover:text-[#1746D8]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>

        <Card className="relative overflow-hidden rounded-[2.4rem] border border-white/70 bg-white/85 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="absolute inset-y-0 right-0 w-[48%] bg-[radial-gradient(circle_at_top_right,rgba(83,125,255,0.18),transparent_40%),linear-gradient(140deg,rgba(244,247,255,0)_0%,rgba(224,234,255,0.52)_45%,rgba(213,226,255,0.8)_100%)]" />
          <div className="absolute -right-12 top-0 h-[110%] w-[42%] rounded-l-[8rem] bg-white/25 blur-[1px]" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-white/35" />

          <div className="relative z-10 flex flex-col gap-8 px-8 py-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleImageClick}
                  className="group relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-[7px] border-white bg-slate-100 shadow-[0_22px_50px_rgba(15,23,42,0.14)]"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin text-[#235BFF]" size={34} />
                  ) : user.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User size={62} className="text-slate-400" />
                  )}
                  <span className="absolute inset-0 bg-slate-900/0 transition-colors group-hover:bg-slate-900/20" />
                </button>

                <button
                  type="button"
                  onClick={handleImageClick}
                  className="absolute bottom-3 right-1 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-white text-[#235BFF] shadow-[0_16px_40px_rgba(15,23,42,0.12)] transition-transform hover:scale-105"
                >
                  <Camera size={22} />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-4 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-950">{user.name}</h1>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#235BFF] text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
                    <BadgeCheck size={18} />
                  </span>
                </div>

                <StatusPill tone="green">Profile Active</StatusPill>

                <div className="space-y-3 text-[1.02rem] text-slate-600">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-slate-500" />
                    <span>{user.email || "No email added"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-slate-500" />
                    <span>{displayPhone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:self-start">
              {!isEditing ? (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Edit3 size={18} />}
                  onClick={() => setIsEditing(true)}
                  className="rounded-2xl bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)] px-7 py-4 text-white shadow-[0_20px_45px_rgba(37,99,235,0.26)] hover:bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)]"
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="lg"
                    leftIcon={<X size={18} />}
                    onClick={handleCancel}
                    className="rounded-2xl border border-slate-200 bg-white/85 px-6 py-4 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<Save size={18} />}
                    onClick={handleSave}
                    loading={isLoading}
                    className="rounded-2xl bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)] px-7 py-4 text-white shadow-[0_20px_45px_rgba(37,99,235,0.26)] hover:bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)]"
                  >
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1.85fr)_360px]">
          <SectionShell icon={User} title="Personal Information">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isEditing}
                className={`rounded-2xl border-slate-200 bg-white px-5 py-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ${!isEditing ? "cursor-default bg-slate-50 text-slate-700 opacity-80" : ""}`}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                helper="Email cannot be changed"
                className="rounded-2xl border-slate-200 bg-slate-100 px-5 py-4 text-base opacity-80"
              />

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Mobile Number</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[230px_minmax(0,1fr)]">
                  <div ref={countryCodeDropdownRef} className="relative">
                    <button
                      type="button"
                      disabled={phoneInputLocked}
                      onClick={() => {
                        if (phoneInputLocked) return;
                        setCountryCodeOpen((prev) => !prev);
                        setCountryCodeSearch("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 shadow-sm transition-all ${
                        phoneInputLocked ? "cursor-default bg-slate-50 opacity-80" : "hover:border-[#235BFF]/40 focus:outline-none focus:ring-2 focus:ring-[#235BFF]/20"
                      }`}
                    >
                      <span className="truncate text-left flex items-center gap-2">
                        {selectedCountryOption?.flagUrl ? (
                          <img src={selectedCountryOption.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-[2px]" />
                        ) : selectedCountryOption?.flag ? (
                          <span className="text-lg leading-none">{selectedCountryOption.flag}</span>
                        ) : null}
                        <span>{selectedCountryOption?.value || "+91"}</span>
                      </span>
                      <ChevronDown size={18} className={`shrink-0 transition-transform ${countryCodeOpen ? "rotate-180" : ""}`} />
                    </button>

                    {countryCodeOpen && !phoneInputLocked && (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                        <div className="relative border-b border-slate-100 p-3">
                          <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={countryCodeSearch}
                            onChange={(e) => setCountryCodeSearch(e.target.value)}
                            placeholder="Search country"
                            autoFocus
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#235BFF] focus:outline-none focus:ring-2 focus:ring-[#235BFF]/15"
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto py-2">
                          {filteredCountryOptions.length ? (
                            filteredCountryOptions.map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, phoneCountryCode: option.value }));
                                  setCountryCodeOpen(false);
                                  setCountryCodeSearch("");
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                  formData.phoneCountryCode === option.value
                                    ? "bg-[#235BFF]/8 text-[#235BFF]"
                                    : "text-slate-800 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {option.flagUrl ? (
                                    <img src={option.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-[2px]" />
                                  ) : option.flag ? (
                                    <span className="text-lg leading-none">{option.flag}</span>
                                  ) : null}
                                  <span>{option.label}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-3 text-sm text-slate-500">No countries found.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
                    }}
                    disabled={phoneInputLocked}
                    className={`rounded-2xl border-slate-200 bg-white px-5 py-4 text-base ${phoneInputLocked ? "cursor-default bg-slate-50 opacity-80" : ""}`}
                  />
                </div>
                {phoneChangeError ? (
                  <p className="mt-1 text-xs text-red-500">{phoneChangeError}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {phoneOtpActive
                      ? phoneOtpSent
                        ? "Enter the OTP sent to this mobile number."
                        : "Choose a country code and enter a 10-digit mobile number."
                      : "Use OTP verification to add or change your mobile number."}
                  </p>
                )}

                {!phoneOtpActive ? (
                  <button
                    type="button"
                    onClick={handleStartPhoneChange}
                    className="mt-1 inline-flex w-fit items-center justify-center self-start rounded-xl border border-[#235BFF]/20 bg-[#235BFF]/5 px-3 py-1.5 text-xs font-semibold text-[#235BFF] transition-colors hover:bg-[#235BFF]/10"
                  >
                    {phoneActionLabel}
                  </button>
                ) : (
                  <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    {!phoneOtpSent ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600">Send an OTP to confirm this mobile number.</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancelPhoneChange}
                            className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            loading={isLoading}
                            onClick={handleSendPhoneOtp}
                            className="rounded-2xl bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)] text-white hover:bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)]"
                          >
                            Send OTP
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-slate-700">
                            OTP sent{phoneOtpChannel ? ` via ${phoneOtpChannel}` : ""}.
                          </p>
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            className="w-fit text-sm font-semibold text-[#235BFF] hover:text-[#1746D8]"
                          >
                            Resend OTP
                          </button>
                        </div>
                        {phoneDevOtp && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            Test OTP:{" "}
                            <button
                              type="button"
                              className="font-bold underline"
                              onClick={() => setPhoneOtpDigits(phoneDevOtp.split("").slice(0, phoneOtpLength))}
                            >
                              {phoneDevOtp}
                            </button>
                          </div>
                        )}
                        <OtpInput value={phoneOtpDigits} onChange={setPhoneOtpDigits} disabled={isLoading} length={phoneOtpLength} />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={handleCancelPhoneChange}
                            className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            fullWidth
                            loading={isLoading}
                            disabled={phoneOtpDigits.join("").length !== phoneOtpLength}
                            onClick={handleVerifyPhoneOtp}
                            className="rounded-2xl bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)] text-white hover:bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)]"
                          >
                            Verify & Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Input
                label="Age"
                name="age"
                type="number"
                min="0"
                placeholder="Enter your age"
                value={formData.age}
                onChange={handleChange}
                disabled={!isEditing}
                className={`rounded-2xl border-slate-200 bg-white px-5 py-4 text-base ${!isEditing ? "cursor-default bg-slate-50 opacity-80" : ""}`}
              />

              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={!isEditing}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
                className={`rounded-2xl border-slate-200 bg-white px-5 py-4 text-base ${!isEditing ? "cursor-default bg-slate-50 opacity-80" : ""}`}
              />
            </div>
          </SectionShell>

          <div className="space-y-7">
            <SectionShell icon={BadgeCheck} title="Account Overview" className="px-0 py-0">
              <div className="divide-y divide-slate-100">
                <OverviewRow icon={CalendarDays} label="Member Since" value={memberSince} valueTone="zinc" />
                <OverviewRow icon={Mail} label="Email Address" value={user.email ? "Added" : "Add email"} valueTone={user.email ? "green" : "amber"} />
                <OverviewRow icon={Phone} label="Phone Number" value={displayPhoneDigits ? "Added" : "Add phone"} valueTone={displayPhoneDigits ? "green" : "amber"} />
                <OverviewRow icon={Shield} label="Account Status" value="Active" valueTone="green" />
              </div>
            </SectionShell>

            {authControls.passwordEnabled && (
            <SectionShell icon={Shield} title="Security" className="px-0 py-0">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    {isCreatingPassword
                      ? "Create a password so this account can also sign in with email and password."
                      : "Keep your account secure with a strong password."}
                  </p>
                </div>

                {!showSecurityForm ? (
                  <button
                    type="button"
                    onClick={() => setShowSecurityForm(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#235BFF]/20 bg-[#235BFF]/5 px-5 py-4 text-sm font-semibold text-[#235BFF] transition-colors hover:bg-[#235BFF]/10"
                  >
                    <KeyRound size={16} />
                    {isCreatingPassword ? "Create Password" : "Change Password"}
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {!isCreatingPassword && (
                      <Input
                        label="Current Password"
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="........"
                        error={passwordErrors.currentPassword}
                        className="rounded-2xl border-slate-200 bg-white px-5 py-4"
                      />
                    )}

                    <Input
                      label={isCreatingPassword ? "Create Password" : "New Password"}
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="........"
                      helper="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char"
                      error={passwordErrors.newPassword}
                      className="rounded-2xl border-slate-200 bg-white px-5 py-4"
                    />

                    <Input
                      label={isCreatingPassword ? "Re-enter Password" : "Confirm New Password"}
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="........"
                      error={passwordErrors.confirmPassword}
                      className="rounded-2xl border-slate-200 bg-white px-5 py-4"
                    />

                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => {
                          setShowSecurityForm(false);
                          setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                          setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        }}
                        className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        fullWidth
                        leftIcon={<KeyRound size={16} />}
                        onClick={handleChangePassword}
                        loading={isChangingPassword}
                        className="rounded-2xl bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)] text-white hover:bg-[linear-gradient(135deg,#235BFF_0%,#2F6BFF_100%)]"
                      >
                        {isCreatingPassword ? "Create Password" : "Update Password"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </SectionShell>
            )}


          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
