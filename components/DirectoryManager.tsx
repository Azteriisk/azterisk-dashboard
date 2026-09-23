"use client";

import { useState, useEffect } from "react";
import { Folder, FolderPlus, Trash2, CheckCircle2, AlertCircle, RefreshCw, HardDrive } from "lucide-react";

export default function DirectoryManager() {
  const [directories, setDirectories] = useState<string[]>([]);
  const [isLocal, setIsLocal] = useState(false);
  const [newDir, setNewDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDirectories = async () => {
    try {
      const res = await fetch("/api/directories");
      const data = await res.json();
      if (data.directories) {
        setDirectories(data.directories);
        const isLocalHost =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1" ||
            window.location.hostname.endsWith(".local"));
        setIsLocal(isLocalHost && data.is_local);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to fetch indexed directories" });
    }
  };

  useEffect(() => {
    fetchDirectories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDir.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory: newDir.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setDirectories(data.directories);
        setNewDir("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add directory" });
      }
    } catch {
      setMessage({ type: "error", text: "Network request failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (dirToRemove: string) => {
    if (directories.length <= 1) {
      alert("You must keep at least one indexed directory.");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${dirToRemove} from indexed projects?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/directories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory: dirToRemove }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setDirectories(data.directories);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to remove directory" });
      }
    } catch {
      setMessage({ type: "error", text: "Network request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#32302f] border border-[#504945] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#83a598]/15 border border-[#83a598]/30 flex items-center justify-center text-[#83a598]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#fbf1c7]">Indexed Project Roots</h2>
            <p className="text-xs text-[#a89984]">
              Directories scanned for Git repositories, PKGBUILDs, and dependencies
            </p>
          </div>
        </div>
      </div>

      {/* Directory List */}
      <div className="space-y-2 mb-5">
        {directories.map((dir) => (
          <div
            key={dir}
            className="flex items-center justify-between p-3 rounded-lg bg-[#282828] border border-[#3c3836] hover:border-[#504945] transition"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Folder className="w-4 h-4 text-[#83a598] flex-shrink-0" />
              <span className="font-mono text-xs text-[#ebdbb2] truncate">{dir}</span>
            </div>
            {isLocal && (
              <button
                onClick={() => handleRemove(dir)}
                disabled={loading}
                title="Remove indexed folder"
                className="p-1.5 rounded-md text-[#928374] hover:text-[#fb4934] hover:bg-[#fb4934]/15 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Directory Form */}
      {isLocal ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newDir}
            onChange={(e) => setNewDir(e.target.value)}
            placeholder="e.g. /home/azterisk/my-other-projects or ~/dev"
            disabled={loading}
            className="flex-1 px-3.5 py-2 rounded-lg bg-[#1d2021] border border-[#504945] text-xs text-[#ebdbb2] placeholder-[#7c6f64] focus:outline-none focus:border-[#fe8019] font-mono transition"
          />
          <button
            type="submit"
            disabled={loading || !newDir.trim()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#d65d0e] hover:bg-[#fe8019] text-[#fbf1c7] text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FolderPlus className="w-4 h-4" />
            )}
            <span>Add & Scan</span>
          </button>
        </form>
      ) : (
        <p className="text-xs text-[#a89984] bg-[#282828] border border-[#3c3836] rounded-lg p-3">
          Directory filesystem management is available when running locally on your Linux machine.
        </p>
      )}

      {/* Feedback Messages */}
      {message && (
        <div
          className={`mt-3 p-3 rounded-lg flex items-center space-x-2 text-xs ${
            message.type === "success"
              ? "bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30"
              : "bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/30"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
