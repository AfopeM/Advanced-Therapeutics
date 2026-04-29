import { useState, useEffect } from "react";
import { useUserStore } from "../../shared/store/useUserStore";
import profileIcon from "../../../assets/icons/profile.svg";
import saveIcon from "../../../assets/icons/save.svg";
import downloadIcon from "../../../assets/icons/download.svg";
import trashIcon from "../../../assets/icons/trash.svg";
import infoIcon from "../../../assets/icons/info.svg";
import shieldCheckIcon from "../../../assets/icons/shield-check.svg";

interface SettingsProps {
  onClose: () => void;
  guardrailMessage?: string;
}

export function Settings({ onClose, guardrailMessage }: SettingsProps) {
  const { name, setName } = useUserStore();
  const [input, setInput] = useState(name);

  useEffect(() => {
    setInput(name);
  }, [name]);

  const handleSave = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    await setName(trimmed);
    onClose();
  };

  return (
    <div
      data-testid="settings-overlay"
      className="flex flex-col h-screen bg-gray-100"
    >
      {/* ── Green header ── */}
      <div className="bg-[#7A9E2E] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          data-testid="settings-back"
          onClick={onClose}
          className="text-white text-xl font-bold leading-none p-1 -ml-1"
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="flex-1 text-white font-bold text-lg tracking-wide">
          Settings
        </h1>
        <button
          className="text-white/80 text-xl leading-none p-1"
          aria-label="More options"
        >
          ⋮
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        {/* Guardrail message */}
        {guardrailMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p
              data-testid="guardrail-message"
              className="text-sm text-amber-700 font-medium"
            >
              {guardrailMessage}
            </p>
          </div>
        )}

        {/* ── YOUR NAME section ── */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Your Name
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-1">
              <img
                src={profileIcon}
                alt=""
                className="w-5 h-5 opacity-40 flex-shrink-0"
              />
              <input
                data-testid="name-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 py-3 text-sm text-gray-800 bg-transparent focus:outline-none placeholder:text-gray-300"
                placeholder="Enter your name"
              />
            </div>
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          data-testid="save-name"
          onClick={handleSave}
          className="w-full bg-[#7A9E2E] hover:bg-[#6B8D28] text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2.5 shadow-sm transition-colors"
        >
          <img src={saveIcon} alt="" className="w-5 h-5 brightness-0 invert" />
          Save
        </button>

        {/* ── DATA section ── */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            Data
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {/* Export All Data */}
            <button className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                <img
                  src={downloadIcon}
                  alt=""
                  className="w-4 h-4"
                  style={{
                    filter:
                      "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  Export All Data
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Download a backup of all your data
                </p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>

            {/* Clear All Data */}
            <button className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-red-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <img
                  src={trashIcon}
                  alt=""
                  className="w-4 h-4"
                  style={{
                    filter:
                      "invert(30%) sepia(80%) saturate(500%) hue-rotate(330deg)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-500">
                  Clear All Data
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  This action cannot be undone
                </p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          </div>
        </div>

        {/* ── ABOUT section ── */}
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2 px-1">
            About
          </p>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF6DC] flex items-center justify-center flex-shrink-0">
                <img
                  src={infoIcon}
                  alt=""
                  className="w-4 h-4"
                  style={{
                    filter:
                      "invert(40%) sepia(60%) saturate(500%) hue-rotate(60deg)",
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  About Advanced Therapeutics
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-2 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <img src={shieldCheckIcon} alt="" className="w-3.5 h-3.5 opacity-40" />
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          All data is stored locally on this device.
        </span>
      </div>
    </div>
  );
}
