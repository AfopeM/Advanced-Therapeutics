import { useState, useEffect } from "react";

interface PatientInfoCardProps {
  sharedPillValues: Record<string, string>;
  onSave: (pillValues: Record<string, string>) => void;
}

export function PatientInfoCard({
  sharedPillValues,
  onSave,
}: PatientInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const pillKeys = Object.keys(sharedPillValues);

  useEffect(() => {
    if (isEditing) setDraftValues({ ...sharedPillValues });
  }, [isEditing]);

  const handleSave = () => {
    onSave(draftValues);
    setIsEditing(false);
  };

  return (
    <div
      data-testid="patient-info-card"
      className="border rounded-lg p-4 bg-gray-50"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Patient Info</h2>
        {!isEditing ? (
          <button
            data-testid="info-card-edit"
            onClick={() => setIsEditing(true)}
            className="text-xs text-purple-600 underline"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              data-testid="info-card-cancel"
              onClick={() => setIsEditing(false)}
              className="text-xs text-gray-500 underline"
            >
              Cancel
            </button>
            <button
              data-testid="info-card-save"
              onClick={handleSave}
              className="text-xs text-purple-600 font-semibold underline"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {pillKeys.length === 0 ? (
        <p className="text-xs text-gray-400">
          No pill values recorded yet. Fill a script in the workspace to see
          them here.
        </p>
      ) : (
        <dl className="flex flex-col gap-2">
          {pillKeys.map((key) => (
            <div key={key} className="flex flex-col">
              <dt className="text-xs text-gray-500 font-medium">{key}</dt>
              {isEditing ? (
                <input
                  data-testid={`info-pill-input-${key}`}
                  className="border rounded px-2 py-1 text-sm mt-0.5"
                  value={draftValues[key] ?? ""}
                  onChange={(e) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              ) : (
                <dd
                  data-testid={`info-pill-value-${key}`}
                  className="text-sm text-gray-800"
                >
                  {sharedPillValues[key] || (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
