// Conceptual device-adapter interface (§19 of the GuardBand brief).
//
// The simulator (routes/monitoring.js) talks to devices through exactly this
// shape. A future physical GuardBand, BP monitor, CGM etc. would each
// implement a RealXAdapter with the same functions — nothing above this
// layer (the routes, the risk logic, the UI) would need to change.
//
// This file is deliberately thin: for the prototype it just documents and
// type-shapes the interface; routes/monitoring.js writes directly to the DB
// via logic/store.js-style helpers, exactly like every other route in this
// app, rather than routing through a fake indirection layer.

/**
 * @typedef {Object} MonitoringDeviceAdapter
 * @property {() => Promise<void>} connect
 * @property {() => Promise<void>} disconnect
 * @property {() => Promise<{status:string, battery:number, connection:string}>} getStatus
 * @property {() => Promise<Array<Object>>} getObservations
 * @property {(observation: Object) => Promise<void>} sendObservation
 * @property {(event: Object) => Promise<void>} sendEvent
 */

// MockMonitoringAdapter: the only implementation that exists today. It is
// literally the GuardBand Simulator UI + the /api/patients/:id/observations
// and /safety-events routes — there is no separate hardware-facing process
// to mock, since nothing is connected to real hardware yet.
export const ADAPTER_KIND = "MockMonitoringAdapter";
