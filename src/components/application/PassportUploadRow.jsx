import { useRef } from "react";
import { AlertCircle, CheckCircle, FileText } from "lucide-react";

const PassportUploadRow = ({
  inputId,
  label = "Passport Upload",
  file,
  error,
  uploading = false,
  optimizing = false,
  saved = false,
  disabled = false,
  helperText = "",
  fileSizeText = "",
  savedText = "Passport uploaded",
  reuploadLabel = "Re-upload",
  onChange,
  onReupload,
  onPreview,
  previewEnabled = true,
  onRemove,
  removeLabel = "Remove",
  className = "",
  accept = "image/jpeg,image/png",
}) => {
  const inputRef = useRef(null);
  const normalizeHelperText = (text) => String(text || "")
    .replace(/Ãƒâ€šÃ‚Â·/g, " - ")
    .replace(/Ã‚Â·/g, " - ")
    .replace(/Â·/g, " - ");

  const statusText = normalizeHelperText(
    file
      ? helperText
      : saved && helperText
        ? helperText
        : saved
          ? savedText
          : helperText
  );
  const normalizedFileSizeText = normalizeHelperText(fileSizeText);
  const canPreview = Boolean(onPreview && previewEnabled);

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div
        role={canPreview ? "button" : undefined}
        tabIndex={canPreview ? 0 : undefined}
        onClick={canPreview ? () => onPreview?.() : undefined}
        onKeyDown={canPreview ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPreview?.();
          }
        } : undefined}
        className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
          error
            ? "border-red-500/45 bg-background"
            : saved
              ? "border-emerald-500/25 bg-emerald-500/5"
              : "border-border bg-background"
        } ${canPreview ? "cursor-pointer hover:border-emerald-500/45 hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" : ""}`}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              saved ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan/10 text-cyan"
            }`}
          >
            <FileText size={14} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text-primary">{label}</p>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[10px] text-text-muted">{statusText}</p>
              {normalizedFileSizeText ? (
                <span className="shrink-0 text-[10px] text-text-muted">{normalizedFileSizeText}</span>
              ) : null}
            </div>
          </div>
        </div>
        {saved ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
              <CheckCircle size={10} /> Successful
            </span>
            {onRemove && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
                className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-500 transition-colors hover:bg-red-500/20"
              >
                {removeLabel}
              </button>
            )}
            {onReupload && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReupload?.();
                  inputRef.current?.click();
                }}
                className="rounded-md bg-cyan/15 px-2 py-1 text-[10px] font-semibold text-cyan transition-colors hover:bg-cyan/25"
              >
                {reuploadLabel}
              </button>
            )}
          </div>
        ) : file && optimizing ? (
          <div className="flex items-center gap-1.5 rounded-md border border-cyan/20 bg-cyan/5 px-2.5 py-1.5 text-[10px] text-cyan shrink-0 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-ping" />
            Optimizing document...
          </div>
        ) : file && uploading ? (
          <div className="flex items-center gap-1.5 rounded-md border border-cyan/20 bg-cyan/5 px-2.5 py-1.5 text-[10px] text-cyan shrink-0 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-ping" />
            Uploading...
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {onRemove && file && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
                className="rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-500 transition-colors hover:bg-red-500/20"
              >
                {removeLabel}
              </button>
            )}
            <label
              htmlFor={inputId}
              onClick={(e) => e.stopPropagation()}
              className={`shrink-0 rounded-md bg-cyan/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan transition-colors ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-cyan/25"
              }`}
            >
              {file ? "Replace" : "Upload"}
            </label>
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onChange?.(e.target.files?.[0] || null);
            e.target.value = "";
          }}
        />
      </div>
      {saved && <p className="text-xs font-medium text-emerald-400">{savedText}</p>}
      {error && (
        <p className="flex items-center gap-1 px-0.5 text-xs font-medium text-red-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

export default PassportUploadRow;
