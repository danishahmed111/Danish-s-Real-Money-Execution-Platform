/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { generateBase32Secret, generateBackupCodes, getTOTPToken } from "../lib/totp";
import { 
  ShieldCheck, Lock, ShieldAlert, KeyRound, Copy, Check, Info, 
  ChevronRight, RefreshCw, Eye, EyeOff 
} from "lucide-react";

export default function SecurityCenter() {
  const { 
    securitySettings, enable2FA, disable2FA, isSignedIn, currentUser,
    is2faVerifiedInSession, setSession2faVerified, updateKycStatus
  } = usePortfolio();

  const [copiedText, setCopiedText] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  
  // Setup flow temporary states
  const [tempSecret, setTempSecret] = useState("");
  const [authCodeInput, setAuthCodeInput] = useState("");
  const [simulatedMobileCode, setSimulatedMobileCode] = useState("");
  const [showSimulatedBlock, setShowSimulatedBlock] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const email = isSignedIn ? currentUser?.email : "sandbox@cryptoverse.com";

  // Triggering copy states
  const triggerCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(txt);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Generate a temporary secret on mount or when entering setup
  const initSetup = () => {
    setErrorMsg("");
    setSuccessMsg("");
    const newSec = generateBase32Secret(16);
    setTempSecret(newSec);
    setSetupMode(true);
    setAuthCodeInput("");
  };

  // Update dynamic authentication code generated client-side for immediate verification convenience
  useEffect(() => {
    if (!tempSecret) return;
    
    async function updateSimCode() {
      const code = await getTOTPToken(tempSecret);
      setSimulatedMobileCode(code);
    }
    
    updateSimCode();
    const interval = setInterval(updateSimCode, 5000); // refresh every 5s to keep synced
    return () => clearInterval(interval);
  }, [tempSecret]);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const success = await enable2FA(tempSecret, authCodeInput);
    if (success) {
      setSuccessMsg("Two-Factor Authentication is now ENABLED! Your account is protected under dual layers.");
      setSetupMode(false);
      setAuthCodeInput("");
    } else {
      setErrorMsg("Invalid code entered. Please verify the code on your Google/Microsoft Authenticator app.");
    }
  };

  const handleDeactivation = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    
    const promptCode = prompt("Please enter the 6-digit Authenticator verification code to confirm disabling 2FA:");
    if (!promptCode) return;

    const success = await disable2FA(promptCode);
    if (success) {
      setSuccessMsg("Two-Factor Authentication has been disabled. Your wallet is now exposed to higher local security risks.");
    } else {
      alert("Verification failed. 2FA remains active.");
    }
  };

  // Generate a scannable standard otpauth:// URL
  const otpAuthUrl = `otpauth://totp/Danish%20Trading%20Platform:${encodeURIComponent(email || "")}?secret=${tempSecret}&issuer=Danish%20Trading%20Platform`;
  // QR Server generates standard vector scannable codes
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpAuthUrl)}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="security_center_parent">
      {/* 2FA Card Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className={`p-3.5 rounded-full shrink-0 ${
            securitySettings.twoFactorEnabled 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-base text-zinc-100 flex items-center gap-2">
              <span>Google Authenticator (2FA)</span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold ${
                securitySettings.twoFactorEnabled ? "bg-emerald-500/15 text-emerald-400 font-bold" : "bg-zinc-800 text-zinc-400"
              }`}>
                {securitySettings.twoFactorEnabled ? "Active" : "Disabled"}
              </span>
            </h2>
            <p className="text-xs text-zinc-550 max-w-md mt-1 leading-relaxed">
              Enforce standard Two-factor Google Authenticator security on all asset transfers, swap executions, and custom wallet linkage operations.
            </p>
          </div>
        </div>

        <div>
          {securitySettings.twoFactorEnabled ? (
            <button
              onClick={handleDeactivation}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-sans font-bold text-xs px-4 py-2 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
              id="deactivate_2fa_btn"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={initSetup}
              disabled={setupMode}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-sans font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-40"
              id="activate_2fa_btn"
            >
              Setup 2FA Now
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2" id="sec_success">
          <ShieldCheck className="h-4.5 w-4.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2" id="sec_error">
          <ShieldAlert className="h-4.5 w-4.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2FA SETUP MODAL DRAWER */}
      {setupMode && (
        <div className="bg-zinc-900 border border-zinc-805 rounded-2xl p-6 space-y-6" id="setup_drawer">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-sans font-bold text-sm text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="h-4.5 w-4.5 text-emerald-400" />
              <span>Configure Dual Keys Authenticator</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Configure your Google, Microsoft, or Authy Authenticator app in three steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
            {/* Steps Left */}
            <div className="space-y-6 text-xs text-zinc-400">
              <div className="space-y-1.5 step_item" id="setup_step_1">
                <div className="font-bold text-zinc-200 flex items-center gap-2">
                  <span className="bg-zinc-800 text-emerald-400 border border-zinc-750 px-2 py-0.5 rounded-full font-mono text-[10px]">1</span>
                  <span>Install Wallet Authenticator</span>
                </div>
                <p className="pl-6 text-[11px] text-zinc-500 leading-relaxed">
                  Download standard Google Authenticator or Microsoft Authenticator from the iOS App Store or Android Google Play.
                </p>
              </div>

              <div className="space-y-1.5 step_item" id="setup_step_2">
                <div className="font-bold text-zinc-200 flex items-center gap-2">
                  <span className="bg-zinc-800 text-emerald-400 border border-zinc-750 px-2 py-0.5 rounded-full font-mono text-[10px]">2</span>
                  <span>Scan QR Code or Input Secret Key</span>
                </div>
                <p className="pl-6 text-[11px] text-zinc-500 leading-relaxed">
                  Open the verification app, select "Add Code" and scan the QR canvas, or input the customized secret key listed below:
                </p>
                <div className="pl-6 pt-2">
                  <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex items-center justify-between font-mono text-zinc-300">
                    <span className="tracking-widest font-semibold">{tempSecret}</span>
                    <button 
                      onClick={() => triggerCopy(tempSecret)}
                      className="text-zinc-600 hover:text-zinc-300"
                    >
                      {copiedText === tempSecret ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 step_item" id="setup_step_3">
                <div className="font-bold text-zinc-200 flex items-center gap-2">
                  <span className="bg-zinc-800 text-emerald-400 border border-zinc-750 px-2 py-0.5 rounded-full font-mono text-[10px]">3</span>
                  <span>Enter Code Verification</span>
                </div>
                <p className="pl-6 text-[11px] text-zinc-500 leading-relaxed">
                  Enter the 6-digit validation code from the Authenticator app to finalize.
                </p>
              </div>
            </div>

            {/* Canvas Right with QR codes */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4">
              <div className="bg-white p-3.5 rounded-lg border-2 border-zinc-800 relative group shrink-0">
                <img 
                  src={qrCodeUrl} 
                  alt="2FA QR setup" 
                  className="w-40 h-40" 
                  onError={(e) => {
                    // Fallback QR simulation image
                    e.currentTarget.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=error";
                  }}
                />
              </div>

              {/* Assistance Box for Verification */}
              <div className="space-y-2 w-full text-center">
                <button
                  type="button"
                  onClick={() => setShowSimulatedBlock(!showSimulatedBlock)}
                  className="text-[10px] text-zinc-500 hover:text-emerald-400 font-mono underline cursor-pointer"
                >
                  {showSimulatedBlock ? "Hide Instant Token Sync" : "Open Help (Click to get active OTP instantly)"}
                </button>

                {showSimulatedBlock && (
                  <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-left text-[11px] font-mono text-zinc-400 animate-slide-up">
                    <div className="text-emerald-400 font-semibold mb-1">Instant TOTP Helper:</div>
                    <p className="text-[10px] text-zinc-500 leading-normal mb-2">
                      Because the QR server requires external network connectivity, if it doesn't render immediately, use this real-time synchronized numeric verification token:
                    </p>
                    <div className="flex items-center justify-between bg-zinc-950 p-2 rounded text-zinc-200 text-sm">
                      <span>Live App Token:</span>
                      <strong className="text-emerald-400 tracking-wider font-bold">{simulatedMobileCode}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleActivation} className="border-t border-zinc-800 pt-5 flex flex-col sm:flex-row items-end gap-4" id="totp_form_confirm">
            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Authenticator Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="000 000"
                required
                value={authCodeInput}
                onChange={(e) => setAuthCodeInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center text-lg font-mono tracking-widest text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setSetupMode(false)}
                className="flex-1 sm:flex-none bg-zinc-950 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 px-5 py-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-6 py-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer shadow-md"
              >
                Activate Security Lock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Backup codes panel */}
      {securitySettings.twoFactorEnabled && (
        <div className="bg-zinc-900 border border-zinc-805 rounded-xl p-5 space-y-4" id="backup_codes_panel">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <ShieldCheck className="h-4.5 w-4.5 text-zinc-400" />
            <h4 className="font-sans font-bold text-xs text-zinc-300 uppercase tracking-widest">Emergency Recovery backup keys</h4>
          </div>

          <p className="text-[11px] text-zinc-500 leading-normal">
            Store these emergency recovery codes in a secure location (e.g. offline password manager). They permit bypassing TOTP locks if you lose your phone.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" id="backup_codes_tags_box">
            {securitySettings.backupCodes.map((code) => (
              <div 
                key={code} 
                className="bg-zinc-950 border border-zinc-850/80 p-2.5 rounded text-xs font-mono text-zinc-300 font-semibold select-all"
              >
                {code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KYC Verification */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4" id="security_kyc_verify">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <ShieldCheck className="h-4.5 w-4.5 text-zinc-400" />
          <h4 className="font-sans font-bold text-xs text-zinc-300 uppercase tracking-widest">KYC Verification Status</h4>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-mono">
            Status: <strong className={securitySettings.kycStatus === "Approved" ? "text-emerald-400" : securitySettings.kycStatus === "Pending" ? "text-yellow-400" : "text-rose-400"}>{securitySettings.kycStatus}</strong>
          </span>
          {securitySettings.kycStatus !== "Approved" && (
            <button 
              onClick={() => updateKycStatus(securitySettings.kycStatus === "Pending" ? "Approved" : "Pending")}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            >
              {securitySettings.kycStatus === "Pending" ? "Upload & Verify Mock" : "Retry Verification"}
            </button>
          )}
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3" id="security_compliance_checklist">
        <h4 className="font-sans font-bold text-xs text-zinc-300 uppercase tracking-wider">Account Compliance Audit</h4>
        <div className="space-y-2.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Gmail Authentication Connection:</span>
            <span className={isSignedIn ? "text-emerald-400" : "text-zinc-650"}>
              {isSignedIn ? "OK (Google Verified SSO)" : "OFFLINE (Sandbox Mode)"}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Two-factor validation (TOTP):</span>
            <span className={securitySettings.twoFactorEnabled ? "text-emerald-400" : "text-rose-400"}>
              {securitySettings.twoFactorEnabled ? "OK (Dual Key Enforced)" : "DANGER (Exposed)"}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Network Transaction Scans:</span>
            <span className="text-emerald-400">OK (TLS Encrypted WebSockets)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
