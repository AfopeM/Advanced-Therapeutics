import shieldCheckIcon from "../../../assets/icons/shield-check.svg";

export default function Footer() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 bg-white border-t border-gray-100 flex-shrink-0">
      <img src={shieldCheckIcon} alt="" className="w-3.5 h-3.5 opacity-50" />
      <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
        All data is stored locally on this device.
      </span>
    </div>
  );
}
