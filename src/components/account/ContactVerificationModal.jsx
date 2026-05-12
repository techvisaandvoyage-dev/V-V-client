import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { isValidEmail } from "../../utils/authIdentifier";
import { normalizePhoneInputTo10 } from "../../utils/contactVerificationGate";

/**
 * Inline phone or email capture (saved via profile API). No redirect.
 * @param {"phone"|"email"} mode
 */
const ContactVerificationModal = ({ isOpen, mode, onClose, onCompleted, allowSkip = false, onSkip }) => {
  const { user, updateProfile, refreshUserFromServer, isLoading } = useAuthStore();
  const { showToast } = useUIStore();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "phone") {
      setValue(String(user?.phone || "").replace(/\D/g, "").slice(-10) || "");
    } else {
      setValue(String(user?.email || "").trim());
    }
  }, [isOpen, mode, user?.phone, user?.email]);

  const handleSave = async () => {
    if (mode === "phone") {
      const key = normalizePhoneInputTo10(value);
      if (!key) {
        showToast("Enter a valid 10-digit mobile number.", "error");
        return;
      }
      const { success, message } = await updateProfile({ phone: key });
      if (!success) {
        showToast(message || "Could not save phone.", "error");
        return;
      }
    } else {
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
    }
    await refreshUserFromServer();
    showToast(mode === "phone" ? "Phone number saved." : "Email saved.", "success");
    onCompleted?.();
    onClose?.();
  };

  const title = mode === "phone" ? "Add your mobile number" : "Add your email address";
  const subtitle =
    mode === "phone"
      ? "We use this for SMS updates and to reach you about your visa application. You can change it later in Profile."
      : "We use this for receipts and important updates about your application. You can change it later in Profile.";

  return (
    <Modal
      isOpen={isOpen}
      onClose={allowSkip ? onClose : () => {}}
      title={title}
      size="md"
      hideCloseButton={!allowSkip}
      closeOnBackdropClick={allowSkip}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {allowSkip && (
            <Button type="button" variant="ghost" className="sm:min-w-[120px]" onClick={onSkip}>
              Remind me later
            </Button>
          )}
          <Button type="button" variant="primary" className="sm:min-w-[140px]" loading={isLoading} onClick={handleSave}>
            Save &amp; continue
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-secondary mb-4">{subtitle}</p>
      {mode === "phone" ? (
        <Input
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit mobile (with or without +91)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
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
