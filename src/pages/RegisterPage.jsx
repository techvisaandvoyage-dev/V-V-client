// ============================================================
//  Register Page
//  - New user signs up → OTP sent → verify OTP → logged in
//  - OTP uses /verify-otp (signup verification, marks isVerified)
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Smartphone,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, api } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import OtpInput from "../components/ui/OtpInput";
import {
  signInWithGooglePopup,
  signInWithFacebookPopup,
  prefetchFirebaseAuth,
} from "../utils/firebaseAuth";
import { parseAuthContactInput } from "../utils/authIdentifier";
import { useAuthControls } from "../hooks/useAuthControls";
import { DEFAULT_PHONE_COUNTRY_CODE } from "../utils/phoneCountryCodes";
import PhoneCountryCodeSelect from "../components/auth/PhoneCountryCodeSelect";

// ── Resend timer ──────────────────────────────────────────────
const useResendTimer = (seconds = 30) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const start = useCallback(() => setTimeLeft(seconds), [seconds]);
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);
  return { timeLeft, start, canResend: timeLeft === 0 };
};

/** Must match server/models/User.js password validator */
const SIGNUP_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ── Animation variants ────────────────────────────────────────
const slideIn = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.985 },
  transition: { duration: 0.22, ease: "easeOut" },
};

const GoogleMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FacebookMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const sanitizeAuthIdentifierInput = (value) => {
  const raw = String(value || "");
  if (/[a-zA-Z@.]/.test(raw)) {
    return raw.trim();
  }
  return raw.replace(/\D/g, "").slice(0, 10);
};

const buildAuthIdentifierValue = (value, countryCode) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  return `${countryCode || DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
};

const splitDisplayName = (value) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const needsProfileCompletion = (user, provider) => {
  if (!user) return false;
  if (user.profileCompleted && user.firstName && user.lastName) return false;
  if (provider === "google" || provider === "facebook" || provider === "emailOtp" || provider === "phoneOtp") {
    return true;
  }
  if (!user.firstName || !user.lastName) return true;
  return false;
};

const ProfileCompletionStep = ({ values, errors, showEmail, onChange, onSubmit, loading }) => (
  <motion.div key="profile-completion" {...slideIn}>
    <div className="mb-8 text-center relative">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border text-text-primary shadow-sm">
        <KeyRound size={22} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-[32px] mb-2">
        Complete your profile
      </h1>
      <p className="text-[15px] text-text-secondary">
        Just a few details to personalize your application.
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input
        label=""
        type="text"
        placeholder="First Name"
        value={values.firstName}
        onChange={(e) => onChange("firstName", e.target.value)}
        error={errors.firstName}
        className="h-[52px] rounded-full border-border bg-surface px-5 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary"
        required
      />
      <Input
        label=""
        type="text"
        placeholder="Last Name"
        value={values.lastName}
        onChange={(e) => onChange("lastName", e.target.value)}
        error={errors.lastName}
        className="h-[52px] rounded-full border-border bg-surface px-5 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary"
        required
      />
      {showEmail && (
        <Input
          label=""
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          error={errors.email}
          className="h-[52px] rounded-full border-border bg-surface px-5 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary"
          required
        />
      )}
      {errors.form && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {errors.form}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={loading}
        className="h-[52px] rounded-full bg-cyan text-white hover:bg-cyan-dim text-[15px] font-medium mt-2 shadow-none border-none"
      >
        Continue
      </Button>
    </form>
  </motion.div>
);

const RegisterPage = ({ embedded = false, onClose, onSwitchToLogin, onAuthenticated }) => {
  const navigate = useNavigate();
  const {
    register,
    verifyOtp,
    completePendingSignup,
    loginWithFirebaseGoogle,
    loginWithFirebaseFacebook,
    isLoading,
    error,
    clearError,
    updateProfile,
  } = useAuthStore();
  const { showToast } = useUIStore();
  const { authControls, loading: controlsLoading } = useAuthControls();

  const [step, setStep]         = useState(1); // 1: Signup form, 2: OTP, 3: Profile completion
  const [name, setName]         = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLength, setOtpLength] = useState(6);
  const [otpChannel, setOtpChannel] = useState("");
  const [strength, setStrength] = useState(0); // 0–4
  const [signupDevOtp, setSignupDevOtp] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [signupMethod, setSignupMethod] = useState("");
  const [signupUsesPassword, setSignupUsesPassword] = useState(false);
  const [completionContext, setCompletionContext] = useState(null);
  const [completionValues, setCompletionValues] = useState({ firstName: "", lastName: "", email: "" });
  const [completionErrors, setCompletionErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingSocialToken, setPendingSocialToken] = useState(null);

  const { timeLeft, start: startTimer, canResend } = useResendTimer(30);

  const signupOtpIsSms = !String(identifier || "").includes("@");
  const otpDestinationLabel = signupOtpIsSms
    ? `******${identifier.slice(-4)}`
    : identifier;

  useEffect(() => {
    prefetchFirebaseAuth();
  }, []);

  const finishRegisterAuth = () => {
    if (embedded) {
      onAuthenticated?.();
      onClose?.();
      return;
    }
    navigate("/", { replace: true });
  };

  // ── Password strength checker ─────────────────────────────
  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setStrength(score);
  }, [password]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-amber-400", "bg-emerald-500"][strength];

  const contactParsedPreview = parseAuthContactInput(
    buildAuthIdentifierValue(identifier, phoneCountryCode)
  );
  const otpPhonePreview = contactParsedPreview?.type === "phone" ? contactParsedPreview : null;
  const otpEmailPreview = contactParsedPreview?.type === "email" ? contactParsedPreview : null;
  const isWhatsappOn = authControls.phoneOtpEnabled !== false;
  const isSmsOn = authControls.smsOtpEnabled === true;
  const otpPhoneEnabled = isWhatsappOn || isSmsOn;
  const otpEmailEnabled = authControls.emailOtpEnabled !== false;
  const otpAuthEnabled = otpPhoneEnabled || otpEmailEnabled;

  const phoneStr = isWhatsappOn && isSmsOn ? "WhatsApp/SMS" : isWhatsappOn ? "WhatsApp" : "SMS";
  const phoneNoStr = isWhatsappOn && isSmsOn ? "Phone No. / WhatsApp no." : isWhatsappOn ? "WhatsApp no." : "Phone no.";

  const otpSignupLabel =
    otpPhoneEnabled && otpEmailEnabled
      ? `Sign up with ${phoneStr}/Email OTP`
      : otpPhoneEnabled
        ? `Sign up with ${phoneStr} OTP`
        : "Sign up with email OTP";
  const openProfileCompletion = ({ provider, user, fallbackName = "", email = "", phone = "" }) => {
    const fromName = splitDisplayName(user?.name || fallbackName);
    const firstName = user?.firstName || fromName.firstName;
    const lastName = user?.lastName || fromName.lastName;
    const resolvedEmail = user?.email || email || "";
    setCompletionContext({
      provider,
      email: resolvedEmail,
      phone: user?.phone || phone || "",
      showEmail: true,
    });
    setCompletionValues({
      firstName,
      lastName,
      email: resolvedEmail,
    });
    setCompletionErrors({});
    setStep(3);
  };

  const continueAfterRegisterAuth = ({ provider, user, isNewUser, fallbackName = "", email = "", phone = "" }) => {
    if (isNewUser || needsProfileCompletion(user, provider)) {
      openProfileCompletion({ provider, user, fallbackName, email, phone });
      return;
    }
    finishRegisterAuth();
  };

  const handleGoogleSignup = async () => {
    if (!authControls.googleEnabled) return;
    clearError();
    try {
      const { idToken, user: firebaseUser } = await signInWithGooglePopup();
      setPendingSocialToken(idToken);
      openProfileCompletion({
        provider: "google",
        user: firebaseUser,
        fallbackName: firebaseUser?.displayName || "",
        email: firebaseUser?.email || "",
        phone: firebaseUser?.phoneNumber || "",
      });
    } catch (err) {
      showToast(err.message || "Google signup failed", "error");
    }
  };

  const handleFacebookSignup = async () => {
    if (!authControls.facebookEnabled) return;
    clearError();
    try {
      const { idToken, user: firebaseUser } = await signInWithFacebookPopup();
      setPendingSocialToken(idToken);
      openProfileCompletion({
        provider: "facebook",
        user: firebaseUser,
        fallbackName: firebaseUser?.displayName || "",
        email: firebaseUser?.email || "",
        phone: firebaseUser?.phoneNumber || "",
      });
    } catch (err) {
      showToast(err.message || "Facebook signup failed", "error");
    }
  };

  const requestSignupOtp = async ({ withPassword }) => {
    clearError();
    setConfirmPasswordError("");
    const nameTrim = withPassword ? name.trim() : "";
    if (withPassword && !nameTrim) {
      showToast("Please enter your name", "error");
      return;
    }
    const parsed = parseAuthContactInput(buildAuthIdentifierValue(identifier, phoneCountryCode));
    const otpAllowed =
      parsed &&
      (withPassword ||
        (parsed.type === "phone" && otpPhoneEnabled) ||
        (parsed.type === "email" && otpEmailEnabled));
    if (!otpAllowed) {
      showToast(
        otpPhoneEnabled && otpEmailEnabled
            ? "Enter a valid email address or 10-digit mobile number."
            : otpPhoneEnabled
              ? "Enter a valid 10-digit mobile number."
              : "Enter a valid email address.",
        "error"
      );
      return;
    }
    const contact = parsed.value;
    setIdentifier(parsed.type === "phone" ? parsed.value.slice(-10) : contact);
    if (withPassword && !SIGNUP_PASSWORD_REGEX.test(password)) {
      showToast(
        "Password needs 8+ characters with uppercase, lowercase, a number, and one of @$!%*?&",
        "error"
      );
      return;
    }
    if (withPassword && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      showToast("Passwords do not match.", "error");
      return;
    }
    setFieldErrors({});
    const otpResult = await register(
      nameTrim,
      contact,
      withPassword ? password : ""
    );
    if (otpResult.success) {
      const nextLength = otpResult.otpLength === 4 ? 4 : 6;
      setOtpLength(nextLength);
      setOtpChannel(otpResult.channel || "");
      setOtpDigits(Array.from({ length: nextLength }, () => ""));
      setSignupDevOtp(otpResult.devOtp && String(otpResult.devOtp).length >= 4 ? String(otpResult.devOtp) : "");
      setSignupUsesPassword(Boolean(withPassword));
      startTimer();
      setStep(2);
      showToast(
        parsed.type === "phone"
          ? "Verification code sent to your mobile. Enter it to continue."
          : "Verification code sent. Check your email to continue.",
        "success"
      );
    } else {
      if (otpResult.field) {
        setFieldErrors({ [otpResult.field]: otpResult.message });
      }
    }
  };

  // ── Signup submit ────────────────────────────────────────
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    await requestSignupOtp({ withPassword: authControls.passwordEnabled });
  };

  const handleOtpSignupSubmit = async (e) => {
    e.preventDefault();
    await requestSignupOtp({ withPassword: false });
  };

  // ── Resend OTP (re-register same user — server resends OTP) ─
  const handleResend = async () => {
    clearError();
    if (!canResend) {
      showToast(`Please wait ${timeLeft}s before requesting a new OTP.`, "error");
      return;
    }
    const nameTrim = signupUsesPassword ? name.trim() : "";
    if (signupUsesPassword && (!nameTrim || !SIGNUP_PASSWORD_REGEX.test(password))) return;
    const parsed = parseAuthContactInput(buildAuthIdentifierValue(identifier, phoneCountryCode));
    if (
      !parsed ||
      (!signupUsesPassword &&
        !((parsed.type === "phone" && otpPhoneEnabled) || (parsed.type === "email" && otpEmailEnabled)))
    ) return;
    const contact = parsed.value;
    const otpResult = await register(
      nameTrim,
      contact,
      signupUsesPassword ? password : ""
    );
    if (otpResult.success) {
      const nextLength = otpResult.otpLength === 4 ? 4 : 6;
      setOtpLength(nextLength);
      setOtpChannel(otpResult.channel || "");
      setOtpDigits(Array.from({ length: nextLength }, () => ""));
      startTimer();
      if (otpResult.devOtp && String(otpResult.devOtp).length >= 4) setSignupDevOtp(String(otpResult.devOtp));
      showToast(
        parsed.type === "phone"
          ? "A new code was sent to your phone."
          : "A new code was sent to " + contact
      );
    } else {
      if (otpResult.field) {
        setFieldErrors({ [otpResult.field]: otpResult.message });
      }
    }
  };

  // ── OTP verification ─────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const otp = otpDigits.join("");
    const { success } = await verifyOtp(identifier, otp);
    if (success) {
      const parsed = parseAuthContactInput(identifier);
      const provider = signupUsesPassword
        ? (parsed?.type === "phone" ? "password" : "password")
        : parsed?.type === "phone"
          ? "phoneOtp"
          : "emailOtp";
      showToast("OTP verified. Complete your profile.");
      openProfileCompletion({
        provider,
        user: null,
        fallbackName: name,
        email: parsed?.type === "email" ? parsed.value : "",
        phone: parsed?.type === "phone" ? parsed.value : "",
      });
      return;
    }
  };

  const handleCompletionChange = (field, value) => {
    setCompletionValues((current) => ({ ...current, [field]: value }));
    setCompletionErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const handleProfileCompletionSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    const firstName = completionValues.firstName.trim();
    const lastName = completionValues.lastName.trim();
    const email = completionValues.email.trim().toLowerCase();

    if (!firstName) nextErrors.firstName = "First name is required";
    if (!lastName) nextErrors.lastName = "Last name is required";
    if (completionContext?.showEmail && !isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (Object.keys(nextErrors).length) {
      setCompletionErrors(nextErrors);
      return;
    }

    if (completionContext?.provider === "google" || completionContext?.provider === "facebook") {
      if (!pendingSocialToken) {
        setCompletionErrors({ form: "Social login session expired. Please try again." });
        return;
      }
      try {
        const res = completionContext.provider === "google" 
          ? await loginWithFirebaseGoogle(pendingSocialToken, { createIfMissing: true })
          : await loginWithFirebaseFacebook(pendingSocialToken, { createIfMissing: true });
        
        if (res.success) {
          // Then update the profile
          const updateRes = await updateProfile({
            firstName,
            lastName,
            email: completionContext?.showEmail ? email : undefined,
          });
          if (updateRes.success) {
            showToast("Account created successfully.");
            finishRegisterAuth();
          } else {
            setCompletionErrors({ form: updateRes.message || "Could not save profile" });
          }
        }
      } catch (err) {
        setCompletionErrors({ form: err.response?.data?.message || err.message || "Could not save profile" });
      }
      return;
    }

    const result = await completePendingSignup({
      identifier,
      otp: otpDigits.join(""),
      firstName,
      lastName,
      email: completionContext?.showEmail ? email : "",
    });
    if (!result.success) {
      if (result.field === "email") {
        setCompletionErrors({ email: result.message });
      } else if (result.field === "phone") {
        setCompletionErrors({ phone: result.message });
      } else {
        setCompletionErrors({ form: result.message || "Could not complete profile" });
      }
      return;
    }
    showToast("Account created.");
    finishRegisterAuth();
  };

  const goBack = () => {
    setStep(1);
    clearError();
    setFieldErrors({});
    setOtpDigits(Array.from({ length: otpLength }, () => ""));
    setSignupDevOtp("");
    setConfirmPasswordError("");
  };

  if (controlsLoading) {
    return (
      <div className={`${embedded ? "min-h-[260px]" : "min-h-screen"} bg-background hero-gradient flex flex-col items-center justify-center px-4 py-8 font-sans relative overflow-hidden`}>
        <Loader2 className="animate-spin text-text-muted" size={32} />
      </div>
    );
  }

  return (
    <div className={`${embedded ? "min-h-0" : "min-h-screen"} bg-background hero-gradient flex flex-col items-center justify-center px-4 ${embedded ? "py-8" : "py-10"} font-sans relative overflow-hidden`}>
      <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #0284c7 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-[400px]">
        <AnimatePresence mode="wait">

          {/* ══ STEP 1: Registration Form ══ */}
          {step === 1 && (
            <motion.div key="reg-step1" {...slideIn}>
              <div className="mb-8 text-center relative">
                {embedded ? (
                  <button
                    type="button"
                    onClick={onSwitchToLogin || onClose}
                    className="absolute -left-2 top-0 p-2 text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Back to login"
                  >
                    <ArrowLeft size={20} />
                  </button>
                ) : (
                  <Link
                    to="/login"
                    replace
                    className="absolute -left-2 top-0 p-2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </Link>
                )}

                <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-[32px] mt-2 mb-2">
                  Create account
                </h1>
              </div>

              <div className="space-y-3">
                {authControls.googleEnabled && (
                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={isLoading}
                    className="w-full rounded-full border border-border bg-surface px-4 py-3.5 text-[15px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-60 flex items-center justify-center gap-3"
                  >
                    <GoogleMark />
                    Continue with Google
                  </button>
                )}
                {authControls.facebookEnabled && (
                  <button
                    type="button"
                    onClick={handleFacebookSignup}
                    disabled={isLoading}
                    className="w-full rounded-full border border-border bg-surface px-4 py-3.5 text-[15px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-60 flex items-center justify-center gap-3"
                  >
                    <FacebookMark />
                    Continue with Facebook
                  </button>
                )}

                {otpAuthEnabled && (
                <div className="rounded-3xl border border-border bg-surface overflow-hidden transition-colors">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod(signupMethod === "otp" ? "" : "otp");
                      clearError();
                    }}
                    className="w-full px-4 py-3.5 text-[15px] font-medium text-text-primary hover:bg-surface-2 flex items-center justify-center gap-3"
                  >
                    <Smartphone size={18} className="text-text-primary" />
                    {otpSignupLabel}
                  </button>
                  <AnimatePresence>
                    {signupMethod === "otp" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-1 border-t border-border/30">
                          <form onSubmit={handleOtpSignupSubmit} className="space-y-3" noValidate>
                            <AnimatePresence>
                              {error && (
                                <motion.div
                                  key="otp-signup-err"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                                >
                                  {error}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="space-y-3">
                              <Input
                                label=""
                                type="text"
                                inputMode={otpEmailEnabled && !otpPhoneEnabled ? "email" : otpPhoneEnabled && !otpEmailEnabled ? "tel" : "text"}
                                autoComplete={otpEmailEnabled && !otpPhoneEnabled ? "email" : otpPhoneEnabled && !otpEmailEnabled ? "tel" : "username"}
                                placeholder={
                                  otpPhoneEnabled && otpEmailEnabled
                                    ? `Enter ${phoneNoStr} or email`
                                    : otpEmailEnabled
                                      ? "Enter email"
                                      : `Enter ${phoneNoStr}`
                                }
                                value={identifier}
                                onChange={(e) => {
                                  setIdentifier(sanitizeAuthIdentifierInput(e.target.value));
                                  setFieldErrors({});
                                  clearError();
                                }}
                                error={fieldErrors.email || fieldErrors.phone || fieldErrors.both}
                                className={`h-[52px] w-full rounded-full border-border bg-surface pr-5 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary ${otpPhoneEnabled ? "pl-14" : "pl-5"}`}
                                leftIcon={otpPhoneEnabled ? <span className="font-medium text-text-primary ml-1.5">{phoneCountryCode}</span> : null}
                                required
                              />
                              {identifier.trim() && (
                                <p
                                  className={`px-4 text-[12px] leading-snug ${
                                    (otpPhonePreview && otpPhoneEnabled) || (otpEmailPreview && otpEmailEnabled)
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {otpPhonePreview && otpPhoneEnabled
                                    ? `We'll send a code via ${phoneStr} ...${otpPhonePreview.value.slice(-4)}`
                                    : otpEmailPreview && otpEmailEnabled
                                      ? "We'll email a code to this address"
                                      : otpPhoneEnabled && otpEmailEnabled
                                        ? `Enter a valid email or 10-digit ${phoneNoStr}`
                                        : otpPhoneEnabled
                                          ? `Enter a valid 10-digit ${phoneNoStr}`
                                          : "Enter a valid email address"}
                                </p>
                              )}
                            </div>

                            <Button
                              type="submit"
                              variant="primary"
                              fullWidth
                              loading={isLoading}
                              className="h-[52px] rounded-full bg-cyan text-white hover:bg-cyan-dim text-[15px] font-medium mt-2 shadow-none border-none"
                            >
                              Send OTP
                            </Button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                )}
              </div>


              {authControls.passwordEnabled && (
              <form onSubmit={handleSignupSubmit} className="space-y-4 mt-6" noValidate>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Input
                  label=""
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors({});
                    clearError();
                  }}
                  className="h-[52px] rounded-full border-border bg-surface px-5 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary"
                  required
                />

                <div className="space-y-3">
                  <Input
                    label=""
                    type="text"
                    autoComplete="username"
                    placeholder={
                      otpPhoneEnabled && otpEmailEnabled
                        ? `Enter ${phoneNoStr} or email`
                        : otpEmailEnabled
                          ? "Enter email"
                           : `Enter ${phoneNoStr}`
                    }
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(sanitizeAuthIdentifierInput(e.target.value));
                      setFieldErrors({});
                      clearError();
                    }}
                    error={fieldErrors.email || fieldErrors.phone || fieldErrors.both}
                    className={`h-[52px] w-full rounded-full border-border bg-surface pr-5 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary ${otpPhoneEnabled ? "pl-14" : "pl-5"}`}
                    leftIcon={otpPhoneEnabled ? <span className="font-medium text-text-primary ml-1.5">{phoneCountryCode}</span> : null}
                    required
                  />
                  {identifier.trim() && (
                    <p
                      className={`px-4 text-[12px] leading-snug ${
                        contactParsedPreview
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {contactParsedPreview
                        ? contactParsedPreview.type === "phone"
                          ? `Mobile signup — we'll text a code to …${contactParsedPreview.value.slice(-4)}`
                          : "Email signup — we'll email a verification code to this address"
                        : identifier.includes("@")
                          ? "Enter a valid email address"
                          : "Enter a valid 10-digit mobile number"}
                    </p>
                  )}
                </div>

                {authControls.passwordEnabled && (
                  <>
                    <div className="space-y-2">
                      <Input
                        label=""
                        type={showPass ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFieldErrors({});
                          clearError();
                        }}
                        autoComplete="new-password"
                        className="h-[52px] rounded-full border-border bg-surface px-5 pr-12 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary"
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPass((v) => !v)}
                            className="hover:text-text-primary text-text-muted transition-colors mr-2 mt-0.5"
                          >
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        }
                        required
                      />

                      {password && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1.5 px-3 pt-1"
                        >
                          <div className="flex gap-1">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                                  i < strength ? strengthColor : "bg-border"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-1 text-[12px]">
                            <span className={`font-medium ${
                              strength <= 1 ? "text-red-500" :
                              strength === 2 ? "text-amber-500" :
                              strength === 3 ? "text-amber-400" : "text-emerald-500"
                            }`}>
                              {strengthLabel || "Weak"}
                            </span>
                            <span className="text-text-muted text-[11px]">8+ chars, 1 uppercase, 1 number, 1 symbol</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <Input
                      label=""
                      type={showPass ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError("");
                      }}
                      autoComplete="new-password"
                      className="h-[52px] rounded-full border-border bg-surface px-5 pr-12 text-[15px] placeholder:text-text-muted focus:ring-1 focus:ring-text-primary focus:border-text-primary"
                      error={confirmPasswordError}
                      required
                    />
                  </>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  className="h-[52px] rounded-full bg-cyan text-white hover:bg-cyan-dim text-[15px] font-medium mt-2 shadow-none border-none"
                >
                  Continue
                </Button>
              </form>
              )}

              <div className="mt-8 text-center text-[14px]">
                <p className="text-text-primary font-medium">
                  Already have an account?{" "}
                  {embedded ? (
                    <button
                      type="button"
                      onClick={onSwitchToLogin}
                      className="text-[#3b82f6] hover:text-[#2563eb] transition-colors"
                    >
                      Log in
                    </button>
                  ) : (
                    <Link to="/login" replace className="text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                      Log in
                    </Link>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 2: OTP Verification ══ */}
          {step === 2 && (
            <motion.div key="reg-step2" {...slideIn}>
              <div className="mb-8 text-center relative">
                <button
                  onClick={goBack}
                  className="absolute -left-2 top-0 p-2 text-text-muted hover:text-text-primary transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border text-text-primary shadow-sm">
                  <KeyRound size={22} />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-[32px] mb-2">
                  Verify account
                </h1>
                <p className="text-[15px] text-text-secondary">
                  {signupOtpIsSms ? (
                    <>
                      We sent a {otpLength}-digit code{otpChannel ? ` via ${otpChannel}` : ""} to <br />
                      <span className="font-semibold text-text-primary">{otpDestinationLabel}</span>
                    </>
                  ) : (
                    <>
                      We emailed a {otpLength}-digit code to <br />
                      <span className="font-semibold text-text-primary">{otpDestinationLabel}</span>
                    </>
                  )}
                </p>
              </div>

              {signupDevOtp.length >= 4 && (
                <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[14px] text-amber-700">
                  <p className="mb-1 font-medium">Testing mode</p>
                  <p className="mb-2">
                    Your signup OTP:{" "}
                    <span className="font-mono font-bold tracking-widest text-amber-900">{signupDevOtp}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtpDigits(signupDevOtp.split("").slice(0, otpLength))}
                    className="font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline"
                  >
                    Fill OTP boxes
                  </button>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="err2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-[14px] text-red-500"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  <label className="block text-center text-[13px] font-medium text-text-secondary">
                    Enter verification code
                  </label>
                  <OtpInput value={otpDigits} onChange={setOtpDigits} disabled={isLoading} length={otpLength} />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={otpDigits.join("").length !== otpLength}
                  className="h-[52px] rounded-full bg-cyan text-white hover:bg-cyan-dim text-[15px] font-medium shadow-none border-none"
                >
                  Verify
                </Button>
              </form>

              {/* Resend */}
              <div className="mt-6 text-center">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-cyan transition-colors hover:text-cyan-dim disabled:opacity-50"
                  >
                    <RefreshCw size={14} />
                    Resend code
                  </button>
                ) : (
                  <p className="text-[13px] text-text-muted">
                    Resend available in{" "}
                    <span className="font-mono font-semibold text-text-primary">
                      0:{String(timeLeft).padStart(2, "0")}
                    </span>
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <ProfileCompletionStep
              values={completionValues}
              errors={completionErrors}
              showEmail={Boolean(completionContext?.showEmail)}
              onChange={handleCompletionChange}
              onSubmit={handleProfileCompletionSubmit}
              loading={isLoading}
            />
          )}

        </AnimatePresence>
      </div>

      {!embedded && <div className="absolute z-10 bottom-6 w-full text-center text-[12px] text-text-muted flex justify-center gap-3">
        <a href="#" className="hover:text-text-primary transition-colors">
          Terms of Use
        </a>
        <span>|</span>
        <a href="#" className="hover:text-text-primary transition-colors">
          Privacy Policy
        </a>
      </div>}
    </div>
  );
};

export default RegisterPage;
