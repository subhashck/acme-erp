import * as React from "react";

export interface HospitalSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  floorCount: number;
  icuBeds: number;
  emergencyCapacity: number;
}

export interface PayrollSettings {
  epfRate: number;
  esiRate: number;
  ptDefault: number;
  basicPct: number;
  hraPct: number;
  conveyancePct: number;
  medicalPct: number;
  specialPct: number;
}

export interface SystemSettings {
  currencySymbol: string;
  theme: "light" | "dark";
  language: string;
}

const DEFAULT_HOSPITAL: HospitalSettings = {
  name: "Acme Hospital",
  address: "123 Healthcare Ave, Medical District",
  phone: "+91 98765 43210",
  email: "admin@acmehospital.com",
  website: "www.acmehospital.com",
  floorCount: 5,
  icuBeds: 25,
  emergencyCapacity: 50,
};

const DEFAULT_PAYROLL: PayrollSettings = {
  epfRate: 12,
  esiRate: 1.75,
  ptDefault: 200,
  basicPct: 50,
  hraPct: 30,
  conveyancePct: 10,
  medicalPct: 5,
  specialPct: 5,
};

const DEFAULT_SYSTEM: SystemSettings = {
  currencySymbol: "₹",
  theme: "dark",
  language: "en",
};

export function getHospitalSettings(): HospitalSettings {
  try {
    const val = localStorage.getItem("acme_erp_hospital_settings");
    return val ? { ...DEFAULT_HOSPITAL, ...JSON.parse(val) } : DEFAULT_HOSPITAL;
  } catch {
    return DEFAULT_HOSPITAL;
  }
}

export function saveHospitalSettings(settings: HospitalSettings) {
  localStorage.setItem("acme_erp_hospital_settings", JSON.stringify(settings));
  window.dispatchEvent(new Event("acme_settings_change"));
}

export function getPayrollSettings(): PayrollSettings {
  try {
    const val = localStorage.getItem("acme_erp_payroll_settings");
    return val ? { ...DEFAULT_PAYROLL, ...JSON.parse(val) } : DEFAULT_PAYROLL;
  } catch {
    return DEFAULT_PAYROLL;
  }
}

export function savePayrollSettings(settings: PayrollSettings) {
  localStorage.setItem("acme_erp_payroll_settings", JSON.stringify(settings));
  window.dispatchEvent(new Event("acme_settings_change"));
}

export function getSystemSettings(): SystemSettings {
  try {
    const val = localStorage.getItem("acme_erp_system_settings");
    return val ? { ...DEFAULT_SYSTEM, ...JSON.parse(val) } : DEFAULT_SYSTEM;
  } catch {
    return DEFAULT_SYSTEM;
  }
}

export function saveSystemSettings(settings: SystemSettings) {
  localStorage.setItem("acme_erp_system_settings", JSON.stringify(settings));
  // Apply theme immediately
  const root = window.document.documentElement;
  if (settings.theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  window.dispatchEvent(new Event("acme_settings_change"));
}

export function useHospitalSettings() {
  const [settings, setSettings] = React.useState(getHospitalSettings);
  React.useEffect(() => {
    const handle = () => setSettings(getHospitalSettings());
    window.addEventListener("acme_settings_change", handle);
    return () => window.removeEventListener("acme_settings_change", handle);
  }, []);
  return settings;
}

export function usePayrollSettings() {
  const [settings, setSettings] = React.useState(getPayrollSettings);
  React.useEffect(() => {
    const handle = () => setSettings(getPayrollSettings());
    window.addEventListener("acme_settings_change", handle);
    return () => window.removeEventListener("acme_settings_change", handle);
  }, []);
  return settings;
}

export function useSystemSettings() {
  const [settings, setSettings] = React.useState(getSystemSettings);
  React.useEffect(() => {
    const handle = () => setSettings(getSystemSettings());
    window.addEventListener("acme_settings_change", handle);
    return () => window.removeEventListener("acme_settings_change", handle);
  }, []);
  return settings;
}

export interface SalaryTemplate {
  id: string;
  name: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medical: number;
  special: number;
  epf: number;
  esi: number;
  professionalTax: number;
  otherDeductions: number;
  lateAttendance?: number;
}

export function getSalaryTemplates(): SalaryTemplate[] {
  try {
    const val = localStorage.getItem("acme_erp_salary_templates");
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export function saveSalaryTemplates(templates: SalaryTemplate[]) {
  localStorage.setItem("acme_erp_salary_templates", JSON.stringify(templates));
  window.dispatchEvent(new Event("acme_settings_change"));
}

export function useSalaryTemplates() {
  const [templates, setTemplates] = React.useState(getSalaryTemplates);
  React.useEffect(() => {
    const handle = () => setTemplates(getSalaryTemplates());
    window.addEventListener("acme_settings_change", handle);
    return () => window.removeEventListener("acme_settings_change", handle);
  }, []);
  return templates;
}

export function initializeSettings() {
  const settings = getSystemSettings();
  const root = window.document.documentElement;
  if (settings.theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
