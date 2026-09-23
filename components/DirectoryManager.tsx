"use client";

import { useState, useEffect } from "react";
import { Folder, FolderPlus, Trash2, CheckCircle2, AlertCircle, RefreshCw, HardDrive } from "lucide-react";

export default function DirectoryManager() {
  const [directories, setDirectories] = useState<string[]>([]);
  const [isLocal, setIsLocal] = useState(true);
  const [newDir, setNewDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDirectories = async () => {
    try {
      const res = await fetch("/api/directories");
      const data = await res.json();
      if (data.directories) {
        setDirectories(data.directories);
        setIsLocal(data.is_local);
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
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Indexed Project Roots</h2>
            <p className="text-xs text-gray-400">
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
            className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/60 hover:border-gray-700 transition"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="font-mono text-xs text-gray-200 truncate">{dir}</span>
            </div>
            {isLocal && (
              <button
                onClick={() => handleRemove(dir)}
                disabled={loading}
                title="Remove indexed folder"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
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
            className="flex-1 px-3.5 py-2 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 font-mono transition"
          />
          <button
            type="submit"
            disabled={loading || !newDir.trim()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50 shadow-sm shadow-blue-500/20"
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
        <p className="text-xs text-purple-400/80 bg-purple-500/5 border border-purple-500/20 rounded-xl p-3">
          Directory filesystem management is available when running locally on your Linux machine.
        </p>
      )}

      {/* Feedback Messages */}
      {message && (
        <div
          className={`mt-3 p-3 rounded-xl flex items-center space-x-2 text-xs ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
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
