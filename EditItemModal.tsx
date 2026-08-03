import { useRef, useState } from 'react';
import type { AppSettings, CurrentUser } from '@/types';
import { CURRENCIES } from '@/lib/currency';

export function SettingsPanel({
  settings,
  onSaveSettings,
  currentUser,
  onChangePassword,
  onExportBackup,
  onImportBackup,
  onClearData,
}: {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  currentUser: CurrentUser;
  onChangePassword: (current: string, next: string) => { success: boolean; error?: string };
  onExportBackup: () => void;
  onImportBackup: (raw: string) => void;
  onClearData: () => void;
}) {
  const [businessForm, setBusinessForm] = useState(settings);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const businessDirty = businessForm.businessName !== settings.businessName || businessForm.currency !== settings.currency;

  const handleSaveBusiness = () => {
    if (!businessForm.businessName.trim()) return;
    onSaveSettings({ businessName: businessForm.businessName.trim(), currency: businessForm.currency });
  };

  const handleChangePassword = () => {
    setPwError('');
    setPwSuccess('');
    if (!pwForm.current || !pwForm.next) {
      setPwError('Fill in both your current and new password.');
      return;
    }
    if (pwForm.next.length < 4) {
      setPwError('New password must be at least 4 characters.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    const result = onChangePassword(pwForm.current, pwForm.next);
    if (!result.success) {
      setPwError(result.error || 'Could not change password.');
      return;
    }
    setPwSuccess('Password updated.');
    setPwForm({ current: '', next: '', confirm: '' });
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onImportBackup(reader.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Business & Currency */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Business</h3>
        <p className="text-neutral-500 text-sm mb-5">This name and currency are used across your dashboard, reports, and exports.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Business Name</label>
            <input
              type="text"
              value={businessForm.businessName}
              onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Currency</label>
            <select
              value={businessForm.currency}
              onChange={(e) => setBusinessForm({ ...businessForm, currency: e.target.value })}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveBusiness}
          disabled={!businessDirty || !businessForm.businessName.trim()}
          className="mt-5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Changes
        </button>
      </div>

      {/* Account */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Account</h3>
        <p className="text-neutral-500 text-sm mb-5">
          Signed in as <span className="text-neutral-300">{currentUser.name}</span> ({currentUser.username})
        </p>

        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Current Password</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {pwError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{pwError}</div>}
          {pwSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">{pwSuccess}</div>
          )}

          <button
            onClick={handleChangePassword}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium rounded-xl transition-all"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Data Backup */}
      <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Data Backup</h3>
        <p className="text-neutral-500 text-sm mb-5">
          Your data lives only in this browser. Export a backup regularly, or before switching devices.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onExportBackup}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium rounded-xl hover:from-cyan-600 hover:to-emerald-600 transition-all"
          >
            Export Backup (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-medium rounded-xl transition-all"
          >
            Import Backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChosen} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-1">Danger Zone</h3>
        <p className="text-neutral-500 text-sm mb-5">Permanently erase all inventory, sales, and notes for this account.</p>
        <button
          onClick={onClearData}
          className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl transition-all"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}
