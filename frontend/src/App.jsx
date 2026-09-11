import { useState } from "react";
import { S, C, NavBtn } from "./theme.jsx";
import { api } from "./api.js";
import { useAsync, ConfigContext } from "./hooks.js";
import { Loading, ErrorNote } from "./components.jsx";

import DashboardScreen from "./screens/Dashboard.jsx";
import PatientsScreen from "./screens/Patients.jsx";
import NewDischargeScreen from "./screens/NewDischarge.jsx";
import UploadSummaryScreen from "./screens/UploadSummary.jsx";
import PatientDetailScreen from "./screens/PatientDetail.jsx";
import WorklistScreen from "./screens/Worklist.jsx";
import PathwayBuilderScreen from "./screens/PathwayBuilder.jsx";
import MoreScreen from "./screens/More.jsx";
import AnalyticsScreen from "./screens/Analytics.jsx";
import EvidenceScreen from "./screens/Evidence.jsx";
import CareTeamScreen from "./screens/CareTeam.jsx";
import PatientPreviewScreen from "./screens/PatientPreview.jsx";
import LiveCallModal from "./screens/LiveCallModal.jsx";
import RealCallModal from "./screens/RealCallModal.jsx";

export default function App() {
  const config = useAsync(api.config, []);
  const careTeam = useAsync(api.careTeam, []);
  const patients = useAsync(api.patients, []);
  const [screen, setScreen] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [calling, setCalling] = useState(null);

  const selected = useAsync(
    () => (selectedId == null ? Promise.resolve(null) : api.patient(selectedId)),
    [selectedId]
  );

  function openPatient(id) { setSelectedId(id); setScreen("patientdetail"); }
  function refreshAll() { patients.refetch(); if (selectedId != null) selected.refetch(); }

  async function addPatientFromPlan(form) {
    await api.createPatient(form);
    await patients.refetch();
    setScreen("patients");
  }
  async function addPatientFromSummary() {
    const created = await api.syncEhr();
    await patients.refetch();
    setSelectedId(created.id);
    setScreen("patientdetail");
  }
  async function submitDecision(id, decision, destination, urgency, note) {
    await api.submitDecision(id, { decision, destination, urgency, note });
    refreshAll();
  }
  async function submitOutcome(id, outcome) {
    await api.submitOutcome(id, outcome);
    refreshAll();
  }
  function executeFromWorklist(patient) {
    if (patient.recommendation.kind === "call") setCalling(patient);
    else openPatient(patient.id);
  }

  const navItems = [
    ["🏠", "Home", "dashboard"],
    ["🗂️", "Patients", "patients"],
    ["🧭", "Worklist", "worklist"],
    ["🧩", "Pathways", "builder"],
    ["⋯", "More", "more"],
  ];

  function render() {
    const list = patients.data || [];
    switch (screen) {
      case "dashboard":
        return <DashboardScreen patients={list} onNavigate={setScreen} onOpenPatient={openPatient} />;
      case "patients":
        return <PatientsScreen patients={list} onOpenPatient={openPatient} onNewDischarge={() => setScreen("newdischarge")} onUploadSummary={() => setScreen("uploadsummary")} />;
      case "newdischarge":
        return <NewDischargeScreen onBack={() => setScreen("patients")} onSave={addPatientFromPlan} />;
      case "uploadsummary":
        return <UploadSummaryScreen onBack={() => setScreen("patients")} onSave={addPatientFromSummary} />;
      case "patientdetail":
        if (selected.loading && !selected.data) return <Loading label="Loading patient…" />;
        if (selected.error) return <ErrorNote error={selected.error} onRetry={selected.refetch} />;
        return selected.data ? (
          <PatientDetailScreen
            patient={selected.data}
            onBack={() => setScreen("patients")}
            onStartCall={(p) => setCalling(p)}
            onSubmitDecision={submitDecision}
            onSubmitOutcome={submitOutcome}
          />
        ) : null;
      case "worklist":
        return <WorklistScreen patients={list} onExecute={executeFromWorklist} onOpenPatient={openPatient} />;
      case "builder":
        return <PathwayBuilderScreen />;
      case "more":
        return <MoreScreen onNavigate={setScreen} />;
      case "analytics":
        return <AnalyticsScreen onBack={() => setScreen("more")} />;
      case "evidence":
        return <EvidenceScreen onBack={() => setScreen("more")} />;
      case "team":
        return <CareTeamScreen onBack={() => setScreen("more")} />;
      case "patientview":
        return <PatientPreviewScreen onBack={() => setScreen("more")} />;
      default:
        return null;
    }
  }

  const ready = config.data && patients.data && careTeam.data;
  const configValue = config.data && { ...config.data, careTeam: careTeam.data };

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.02em" }}>
            The Discharge<span style={{ color: C.teal }}>Hub</span>
          </div>
          <div style={{ fontSize: "0.54rem", color: C.textDim }}>Coordinating the transition from hospital to home</div>
        </div>
        <span style={{ background: C.tealBg, color: C.teal, padding: "0.14rem 0.45rem", borderRadius: 50, fontSize: "0.56rem", fontWeight: 700 }}>PROTOTYPE</span>
      </header>

      <div style={S.content}>
        {config.error || careTeam.error || patients.error ? (
          <ErrorNote
            error={config.error || careTeam.error || patients.error}
            onRetry={() => { config.refetch(); careTeam.refetch(); patients.refetch(); }}
          />
        ) : !ready ? (
          <Loading label="Connecting to the Discharge Hub…" />
        ) : (
          <ConfigContext.Provider value={configValue}>{render()}</ConfigContext.Provider>
        )}
      </div>

      <nav style={S.nav}>
        {navItems.map(([icon, label, sc]) => (
          <NavBtn
            key={sc}
            icon={icon}
            label={label}
            active={screen === sc || (sc === "patients" && ["patientdetail", "newdischarge", "uploadsummary"].includes(screen))}
            onClick={() => setScreen(sc)}
          />
        ))}
      </nav>

      {calling && configValue && (
        <ConfigContext.Provider value={configValue}>
          {calling.phone && configValue.telephonyEnabled ? (
            <RealCallModal patient={calling} onClose={() => setCalling(null)} onComplete={refreshAll} />
          ) : (
            <LiveCallModal patient={calling} onClose={() => setCalling(null)} onComplete={refreshAll} />
          )}
        </ConfigContext.Provider>
      )}
    </div>
  );
}
