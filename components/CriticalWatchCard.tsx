"use client";

import { useState } from "react";
import { CriticalWatch } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  ArrowUpCircle,
  AlertTriangle,
  Clock,
  Box,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  GitBranch,
} from "lucide-react";

interface CriticalWatchCardProps {
  watch: CriticalWatch;
  onRefresh?: () => void;
}

export default function CriticalWatchCard({ watch, onRefresh }: CriticalWatchCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "warn" | "error"; text: string } | null>(null);

  const isUpToDate = watch.status === "up_to_date";
  const isUpdateAvailable = watch.status === "update_available";
  const isMissing = watch.status === "diverged" || watch.installed_version === "Not installed";

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async () => {
    if (!watch.action_command) return;

    // If it's a multi-step cd + makepkg script, copying to terminal is the safest and expected flow
    if (watch.action_command.includes("makepkg") || watch.action_command.includes("cd ")) {
      handleCopy(watch.action_command);
      setFeedback({
        type: "warn",
        text: "Command copied! Run in terminal to build the local fork package.",
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setInstalling(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/dependencies/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_name: watch.name }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({ type: "success", text: data.message || "Installed successfully!" });
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      } else if (data.requires_sudo) {
        handleCopy(data.command || watch.action_command);
        setFeedback({
          type: "warn",
          text: "Root authorization needed — command copied to clipboard for your terminal!",
        });
      } else {
        setFeedback({ type: "error", text: data.message || "Action failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Installation request failed." });
    } finally {
      setInstalling(false);
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 5000);
    }
  };

  return (
    <div
      className={`rounded-xl p-5 border transition-colors overflow-hidden flex flex-col justify-between ${
        isUpdateAvailable
          ? "bg-[#32302f] border-[#fabd2f]/50 hover:border-[#fabd2f]"
          : isUpToDate
          ? "bg-[#32302f] border-[#504945] hover:border-[#665c54]"
          : "bg-[#32302f] border-[#fb4934]/50 hover:border-[#fb4934]"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                isUpdateAvailable
                  ? "bg-[#fabd2f]/15 text-[#fabd2f] border-[#fabd2f]/30"
                  : isUpToDate
                  ? "bg-[#b8bb26]/15 text-[#b8bb26] border-[#b8bb26]/30"
                  : "bg-[#fb4934]/15 text-[#fb4934] border-[#fb4934]/30"
              }`}
            >
              {isUpdateAvailable ? (
                watch.is_ahead ? (
                  <GitBranch className="w-5 h-5 text-[#fabd2f]" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5" />
                )
              ) : isUpToDate ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-bold text-[#fbf1c7] text-base tracking-tight break-words min-w-0" title={watch.name}>
                  {watch.name}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#282828] text-[#d5c4a1] border border-[#3c3836] font-mono shrink-0">
                  {watch.installed_version}
                </span>
              </div>
              <p className="text-xs text-[#a89984] mt-0.5 line-clamp-1">{watch.description}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 pt-0.5">
            {isUpToDate ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compatible</span>
              </span>
            ) : isUpdateAvailable ? (
              watch.is_ahead ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#fabd2f]/15 text-[#fabd2f] border border-[#fabd2f]/30 whitespace-nowrap">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Local Fork Ahead</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#fabd2f]/15 text-[#fabd2f] border border-[#fabd2f]/30 whitespace-nowrap">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Update Ready</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/30 whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Missing</span>
              </span>
            )}
          </div>
        </div>

        {/* Version Comparison Bar */}
        <div className="mt-4 pt-3 border-t border-[#3c3836] grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[#282828] p-2.5 rounded-lg border border-[#3c3836]">
            <span className="text-[#a89984] block text-[11px] font-mono">INSTALLED</span>
            <span className={`font-mono font-semibold ${isMissing ? "text-[#fb4934]" : "text-[#ebdbb2]"}`}>
              {watch.installed_version}
            </span>
          </div>
          <div className="bg-[#282828] p-2.5 rounded-lg border border-[#3c3836]">
            <span className="text-[#a89984] block text-[11px] font-mono">UPSTREAM</span>
            <span
              className={`font-mono font-semibold ${
                isUpdateAvailable ? "text-[#fabd2f]" : "text-[#ebdbb2]"
              }`}
            >
              {watch.upstream_version}
            </span>
          </div>
          <div className="bg-[#282828] p-2.5 rounded-lg border border-[#3c3836]">
            <span className="text-[#a89984] block text-[11px] flex items-center space-x-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>AGE</span>
            </span>
            <span className="font-medium text-[#d5c4a1]">
              {watch.age_days > 0 ? `${watch.age_days}d ago` : "Recent"}
            </span>
          </div>
        </div>

        {/* Dependents footer */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#a89984]">
          <span className="flex items-center space-x-1.5">
            <Box className="w-3.5 h-3.5 text-[#83a598]" />
            <span>
              Required by <strong className="text-[#ebdbb2]">{watch.dependents_count}</strong>{" "}
              workspace project(s)
            </span>
          </span>
          {isUpdateAvailable && (
            <span className="text-[#fabd2f] font-mono text-[10px]">
              {watch.is_ahead ? "Custom Wayland fork" : "Test plugins before updating"}
            </span>
          )}
        </div>
      </div>

      {/* Action Banner for Yellow & Red Alerts */}
      {!isUpToDate && watch.action_command && (
        <div className="mt-4 pt-3 border-t border-[#3c3836] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#ebdbb2] font-medium flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#fe8019]" />
              <span>
                {watch.is_ahead
                  ? "Local fork has custom commits ahead of AUR:"
                  : isMissing
                  ? "Dependency missing from system:"
                  : "Recommended update command:"}
              </span>
            </span>
            {feedback && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  feedback.type === "success"
                    ? "bg-[#b8bb26]/20 text-[#b8bb26]"
                    : feedback.type === "warn"
                    ? "bg-[#fabd2f]/20 text-[#fabd2f]"
                    : "bg-[#fb4934]/20 text-[#fb4934]"
                }`}
              >
                {feedback.text}
              </span>
            )}
          </div>

          {/* Command Pill */}
          <div className="flex items-center justify-between bg-[#1d2021] border border-[#3c3836] rounded-lg px-3 py-2 font-mono text-xs">
            <code className="text-[#b8bb26] truncate mr-2" title={watch.action_command}>
              {watch.action_command}
            </code>
            <button
              onClick={() => handleCopy(watch.action_command!)}
              className="shrink-0 text-[#a89984] hover:text-[#fbf1c7] p-1 rounded hover:bg-[#282828] transition cursor-pointer"
              title="Copy command to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#b8bb26]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAction}
              disabled={installing}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                isMissing
                  ? "bg-[#fb4934] hover:bg-[#fb4934]/90 text-[#1d2021]"
                  : "bg-[#fe8019] hover:bg-[#fe8019]/90 text-[#1d2021]"
              } disabled:opacity-50`}
            >
              {installing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <span>{watch.action_label || (isMissing ? "Install Package" : "Update Package")}</span>
              )}
            </button>

            <button
              onClick={() => handleCopy(watch.action_command!)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#282828] hover:bg-[#3c3836] border border-[#504945] text-[#ebdbb2] hover:text-[#fbf1c7] transition cursor-pointer flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#b8bb26]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

