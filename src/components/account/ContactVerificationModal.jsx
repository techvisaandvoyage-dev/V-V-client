import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, RefreshCw } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import OtpInput from "../ui/OtpInput";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { isValidEmail } from "../../utils/authIdentifier";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  filterPhoneCountryOptions,
  findPhoneCountryOption,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
  parsePhoneWithCountryCode,
} from "../../utils/phoneCountryCodes";

const createEmptyOtp = (length = 6) => Array.from({ length: length === 4 ? 4 : 6 }, () => "");

/**
 * Inline phone or email capture (phone is saved only after OTP verification). No redirect.
 * @param {"phone"|"email"} mode
 */
const ContactVerificationModal = ({
  isOpen,
  mode,
  onClose,
  onCompleted,
  allowSkip = false,
  onSkip,
  skipLabel = "Remind me later",
}) => {
  const {
    user,
    updateProfile,
    refreshUserFromServer,
    requestProfilePhoneOtp,
    verifyProfilePhoneOtp,
    isLoading,
  } = useAuthStore();
  const { showToast } = useUIStore();
  const countryCodeDropdownRef = useRef(null);
  const [value, setValue] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const [phoneCountryOptions, setPhoneCountryOptions] = useState(() => getPhoneCountryOptions());
  const [phoneError, setPhoneError] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(createEmptyOtp(6));
  const [phoneOtpLength, setPhoneOtpLength] = useState(6);
  const [phoneOtpChannel, setPhoneOtpChannel] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState("");

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
    if (!isOpen) return;
    if (mode === "phone") {
      const parsedPhone = parsePhoneWithCountryCode(user?.phone, phoneCountryOptions);
      setValue(parsedPhone.phone);
      setPhoneCountryCode("+91");
      setPhoneError("");
      setCountryCodeOpen(false);
      setCountryCodeSearch("");
      setPhoneOtpSent(false);
      setPhoneOtpDigits(createEmptyOtp(6));
      setPhoneOtpLength(6);
      setPhoneOtpChannel("");
      setPhoneDevOtp("");
    } else {
      setValue(String(user?.email || "").trim());
    }
  }, [isOpen, mode, phoneCountryOptions, user?.phone, user?.email]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!countryCodeDropdownRef.current?.contains(event.target)) {
        setCountryCodeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const getEnteredFullPhone = () => `${phoneCountryCode}${String(value || "").replace(/\D/g, "")}`;

  const validatePhone = () => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length !== 10) {
      const message = digits.length ? "Number is incomplete." : "Enter a valid mobile number.";
      setPhoneError(message);
      showToast(message, "error");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const resetPhoneOtp = () => {
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(phoneOtpLength));
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
  };

  const handleSendPhoneOtp = async () => {
    if (!validatePhone()) return;

    const { success, message, devOtp, channel, otpLength } = await requestProfilePhoneOtp(getEnteredFullPhone());
    if (!success) {
      showToast(message || "Could not send OTP.", "error");
      return;
    }

    const nextLength = otpLength === 4 ? 4 : 6;
    const nextDevOtp = devOtp != null ? String(devOtp).slice(0, nextLength) : "";
    setPhoneOtpSent(true);
    setPhoneOtpLength(nextLength);
    setPhoneOtpDigits(nextDevOtp ? nextDevOtp.split("").slice(0, nextLength) : createEmptyOtp(nextLength));
    setPhoneOtpChannel(channel || "");
    setPhoneDevOtp(nextDevOtp);
    showToast(nextDevOtp ? "Testing OTP filled automatically." : "OTP sent to your mobile number.", "success");
  };

  const handleVerifyPhoneOtp = async () => {
    if (!validatePhone()) return;

    const otp = phoneOtpDigits.join("");
    if (otp.length !== phoneOtpLength) {
      showToast(`Please enter the ${phoneOtpLength}-digit OTP.`, "error");
      return;
    }

    const { success, message } = await verifyProfilePhoneOtp(getEnteredFullPhone(), otp);
    if (!success) {
      showToast(message || "Invalid OTP.", "error");
      return;
    }

    await refreshUserFromServer();
    showToast("Phone number verified and saved.", "success");
    onCompleted?.();
    onClose?.();
  };

  const handleSaveEmail = async () => {
    const em = String(value || "").trim().toLowerCase();
    if (!isValidEmail(em)) {
      showToast("Enter a valid email address.", "error");
      return;
    }
    const { success, message } = await updateProfile({ email: em });
    if (!success) {
      showToast(message || "Could not save email.", "error");
      return;
    }
    await refreshUserFromServer();
    showToast("Email saved.", "success");
    onCompleted?.();
    onClose?.();
  };

  const title = mode === "phone" ? "Add your mobile number" : "Add your email address";

  const filteredCountryOptions = filterPhoneCountryOptions(countryCodeSearch, phoneCountryOptions);
  const selectedCountryOption = findPhoneCountryOption(phoneCountryCode, phoneCountryOptions);
  const footerActionLabel = mode === "phone" ? (phoneOtpSent ? "Verify & continue" : "Send OTP") : "Save & continue";
  const footerAction = mode === "phone" ? (phoneOtpSent ? handleVerifyPhoneOtp : handleSendPhoneOtp) : handleSaveEmail;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      hideCloseButton={false}
      closeOnBackdropClick={allowSkip}
      allowOverflow={mode === "phone"}
      footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            {allowSkip && (
              <Button type="button" variant="ghost" className="sm:min-w-[120px]" onClick={onSkip}>
                {skipLabel}
              </Button>
          )}
          <Button type="button" variant="primary" className="sm:min-w-[140px]" loading={isLoading} onClick={footerAction}>
            {footerActionLabel}
          </Button>
        </div>
      }
    >

      {mode === "phone" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Country code
            </label>
            <div className="relative">
              <div className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-primary cursor-default opacity-90">
                <span className="truncate text-left">🇮🇳 India (+91)</span>
              </div>
            </div>
          </div>
          <Input
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Enter phone number"
            value={value}
            error={phoneError}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setValue(digits);
              if (phoneOtpSent) resetPhoneOtp();
              if (!digits.length || digits.length >= 10) {
                setPhoneError("");
              } else {
                setPhoneError("Number is incomplete.");
              }
            }}
            disabled={phoneOtpSent}
            helper={!phoneError ? "Enter a 10-digit mobile number." : ""}
          />
          {phoneOtpSent && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Enter OTP</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Code sent{phoneOtpChannel ? ` via ${phoneOtpChannel}` : ""} to {phoneCountryCode} ******{String(value).slice(-4)}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:text-cyan-dim disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  Resend
                </button>
              </div>
              {phoneDevOtp && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  Test OTP: <span className="font-mono font-bold tracking-widest text-amber-900">{phoneDevOtp}</span>
                </div>
              )}
              <OtpInput value={phoneOtpDigits} onChange={setPhoneOtpDigits} disabled={isLoading} length={phoneOtpLength} />
            </div>
          )}
        </div>
      ) : (
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
    </Modal>
  );
};

export default ContactVerificationModal;
