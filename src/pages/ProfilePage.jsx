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
  AlertTriangle,
  RefreshCw,
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
    padding="none"
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
    deleteAccount,
    sendDeleteOtp,
    verifyDeleteOtp,
    generateCaptcha,
    verifyCaptcha,
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [phoneOtpActive, setPhoneOtpActive] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(createEmptyOtp(6));
  const [phoneOtpLength, setPhoneOtpLength] = useState(6);
  const [phoneOtpChannel, setPhoneOtpChannel] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState("");
  const [phoneChangeError, setPhoneChangeError] = useState("");

  const [deletePhone, setDeletePhone] = useState("");
  const [deletePhoneError, setDeletePhoneError] = useState("");
  const [deleteOtpDigits, setDeleteOtpDigits] = useState(createEmptyOtp(4));
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteToken, setDeleteToken] = useState("");
  const [deleteOtpError, setDeleteOtpError] = useState("");
  const [deleteOtpCountdown, setDeleteOtpCountdown] = useState(0);
  const [captchaData, setCaptchaData] = useState({ id: "", image: "" });
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [isGeneratingCaptcha, setIsGeneratingCaptcha] = useState(false);
  const [showFinalDeleteConfirm, setShowFinalDeleteConfirm] = useState(false);

  useEffect(() => {
    let interval;
    if (deleteOtpCountdown > 0) {
      interval = setInterval(() => setDeleteOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [deleteOtpCountdown]);

  const loadCaptcha = async () => {
    setIsGeneratingCaptcha(true);
    setCaptchaError("");
    setCaptchaInput("");
    const res = await generateCaptcha();
    if (res.success) {
      setCaptchaData({ id: res.captchaId, image: res.image });
    } else {
      setCaptchaError(res.message || "Failed to load CAPTCHA");
    }
    setIsGeneratingCaptcha(false);
  };

  useEffect(() => {
    if (showDeleteModal) {
      setDeletePhone("");
      setDeletePhoneError("");
      setDeleteOtpDigits(createEmptyOtp(4));
      setDeleteOtpSent(false);
      setDeleteToken("");
      setDeleteOtpError("");
      setDeleteOtpCountdown(0);
      setShowFinalDeleteConfirm(false);
      loadCaptcha();
    }
  }, [showDeleteModal]);

  const handleSendDeleteOtp = async () => {
    if (!deletePhone) {
      setDeletePhoneError("Please enter your registered phone number");
      return;
    }
    
    const justDigits = String(deletePhone).replace(/\D/g, "");
    if (justDigits.length < 10) {
      setDeletePhoneError("Please enter a valid 10-digit mobile number");
      return;
    }
    
    const userDigits = String(user.phone || "").replace(/\D/g, "");
    if (justDigits !== userDigits && userDigits.length === 10) {
      setDeletePhoneError("This phone number is not linked to your account.");
      return;
    }

    setDeletePhoneError("");
    const res = await sendDeleteOtp(deletePhone);
    if (res.success) {
      setDeleteOtpSent(true);
      setDeleteOtpCountdown(60);
      showToast(res.message, "success");
    } else {
      setDeletePhoneError(res.message);
    }
  };

  const handleVerifyDeleteOtp = async (otpString) => {
    if (otpString.length !== 4) return;
    setDeleteOtpError("");
    const res = await verifyDeleteOtp(deletePhone, otpString);
    if (res.success) {
      setDeleteToken(res.deleteToken);
      showToast("OTP Verified successfully", "success");
    } else {
      setDeleteOtpError(res.message);
    }
  };

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
        age: user.age !== undefined && user.age !== null ? user.age : "",
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
      age: formData.age !== "" && formData.age != null ? Number(formData.age) : null,
      gender: formData.gender || "Other",
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
        age: user.age !== undefined && user.age !== null ? user.age : "",
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

  const handleVerifyAndNext = async () => {
    if (!deleteToken || !captchaInput) return;
    
    setIsDeletingAccount(true);
    const res = await verifyCaptcha(captchaData.id, captchaInput);
    setIsDeletingAccount(false);
    
    if (res.success) {
      setShowFinalDeleteConfirm(true);
    } else {
      setCaptchaError(res.message);
      setTimeout(() => {
        loadCaptcha();
      }, 1500);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const { success, message } = await deleteAccount({ 
      deleteToken, 
      captchaId: captchaData.id, 
      captchaText: captchaInput 
    });
    setIsDeletingAccount(false);
    
    if (success) {
      showToast("Account deleted successfully.", "success");
      navigate("/");
    } else {
      showToast(message || "Failed to delete account.", "error");
      setShowDeleteModal(false);
      setShowFinalDeleteConfirm(false);
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
              <div className="relative mx-auto sm:mx-0">
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

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-4 text-center sm:text-left">
                <h1 className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-4xl font-bold tracking-tight text-slate-950">
                  <span className="break-words text-center sm:text-left">{user.name}</span>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#235BFF] text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
                    <BadgeCheck size={18} />
                  </span>
                </h1>

                <StatusPill tone="green">Profile Active</StatusPill>

                <div className="space-y-3 text-[1.02rem] text-slate-600">
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <Mail size={18} className="text-slate-500" />
                    <span>{user.email || "No email added"}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <Phone size={18} className="text-slate-500" />
                    <span>{displayPhone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 lg:self-start">
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
            <SectionShell icon={BadgeCheck} title="Account Overview">
              <div className="divide-y divide-slate-100">
                <OverviewRow icon={CalendarDays} label="Member Since" value={memberSince} valueTone="zinc" />
                <OverviewRow icon={Mail} label="Email Address" value={user.email ? "Added" : "Add email"} valueTone={user.email ? "green" : "amber"} />
                <OverviewRow icon={Phone} label="Phone Number" value={displayPhoneDigits ? "Added" : "Add phone"} valueTone={displayPhoneDigits ? "green" : "amber"} />
                <OverviewRow icon={Shield} label="Account Status" value="Active" valueTone="green" />
              </div>
            </SectionShell>

            {authControls.passwordEnabled && (
            <SectionShell icon={Shield} title="Security">
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

            <SectionShell icon={AlertTriangle} title="Account Deletion" className="border-red-100 bg-red-50/30">
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Permanently delete your account and all associated profile data.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 w-full sm:w-auto"
                >
                  Delete Account
                </Button>
              </div>
            </SectionShell>

          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="p-6 sm:p-8">
              {!showFinalDeleteConfirm ? (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-bold text-slate-900">Verify Your Identity</h3>
                  <p className="text-center text-sm text-slate-600 mb-6">
                    For your security, please verify your identity before permanently deleting your account.
                  </p>

                  <div className="space-y-5 text-left">
                    {/* 1. Registered Phone Number */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">1. Registered Phone Number</label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={deletePhone}
                          onChange={(e) => {
                            setDeletePhone(e.target.value);
                            setDeletePhoneError("");
                          }}
                          placeholder="Enter your registered phone number"
                          disabled={deleteOtpSent || Boolean(deleteToken)}
                          className="flex-1 rounded-xl"
                        />
                        <Button 
                          onClick={handleSendDeleteOtp}
                          disabled={(deleteOtpSent && deleteOtpCountdown > 0) || Boolean(deleteToken) || isLoading}
                          loading={isLoading && !isDeletingAccount && !deleteOtpSent}
                          className="rounded-xl px-4 shrink-0"
                        >
                          {deleteOtpCountdown > 0 ? `Resend (${deleteOtpCountdown}s)` : (deleteOtpSent ? "Resend OTP" : "Send OTP")}
                        </Button>
                      </div>
                      {deletePhoneError && <p className="text-sm text-red-500">{deletePhoneError}</p>}
                      {deleteOtpSent && !deletePhoneError && <p className="text-sm text-emerald-600">OTP sent successfully.</p>}
                    </div>

                    {/* 2. OTP Verification */}
                    {deleteOtpSent && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                        <label className="text-sm font-semibold text-slate-900 flex justify-between items-center">
                          2. OTP Verification
                          {deleteToken && <BadgeCheck size={18} className="text-emerald-500" />}
                        </label>
                        <OtpInput
                          length={4}
                          value={deleteOtpDigits}
                          onChange={(newDigits) => {
                            setDeleteOtpDigits(newDigits);
                            const otpString = newDigits.join("");
                            if (otpString.length === 4) {
                              handleVerifyDeleteOtp(otpString);
                            }
                          }}
                          disabled={Boolean(deleteToken)}
                        />
                        {deleteOtpError && <p className="text-sm text-red-500 text-center">{deleteOtpError}</p>}
                      </div>
                    )}

                    {/* 3. CAPTCHA Verification */}
                    <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                      <label className="text-sm font-semibold text-slate-900">3. CAPTCHA Verification</label>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 h-14 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                          {isGeneratingCaptcha ? (
                            <Loader2 className="animate-spin text-slate-400" size={20} />
                          ) : captchaData.image ? (
                            <div dangerouslySetInnerHTML={{ __html: captchaData.image }} className="w-full h-full flex justify-center items-center [&>svg]:w-full [&>svg]:h-full" />
                          ) : null}
                        </div>
                        <button 
                          onClick={loadCaptcha}
                          className="p-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                          title="Refresh CAPTCHA"
                          disabled={isGeneratingCaptcha}
                        >
                          <RefreshCw size={20} className={isGeneratingCaptcha ? "animate-spin" : ""} />
                        </button>
                      </div>
                      <Input
                        value={captchaInput}
                        onChange={(e) => {
                          setCaptchaInput(e.target.value);
                          setCaptchaError("");
                        }}
                        placeholder="Enter CAPTCHA text"
                        error={captchaError}
                        className={`rounded-xl transition-all ${captchaError ? 'border-2 border-red-500 bg-red-50' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row mt-8">
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isDeletingAccount}
                      className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      loading={isDeletingAccount}
                      onClick={handleVerifyAndNext}
                      disabled={!deleteToken || !captchaInput}
                      className="rounded-2xl bg-[#235BFF] text-white hover:bg-[#1a4acc] disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-bold text-slate-900">Are you sure?</h3>
                  <p className="text-center text-sm text-slate-600 mb-6">
                    This action cannot be undone. All your profile data, applications, and history will be permanently deleted.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row mt-8">
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isDeletingAccount}
                      className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      loading={isDeletingAccount}
                      onClick={handleDeleteAccount}
                      className="rounded-2xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete Account
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
