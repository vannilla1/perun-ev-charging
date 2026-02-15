/**
 * OCPP 1.6J Type Definitions
 * Pre integraciu s eCarUp OCPP Central System
 */

// OCPP Message Types
export enum OCPPMessageType {
  CALL = 2,        // Request
  CALLRESULT = 3,  // Response
  CALLERROR = 4,   // Error
}

// OCPP Actions
export type OCPPAction =
  | 'RemoteStartTransaction'
  | 'RemoteStopTransaction'
  | 'StatusNotification'
  | 'MeterValues'
  | 'StartTransaction'
  | 'StopTransaction'
  | 'Heartbeat'
  | 'Authorize'
  | 'BootNotification';

// Generic OCPP Message formats
export type OCPPCall = [OCPPMessageType.CALL, string, OCPPAction, Record<string, unknown>];
export type OCPPCallResult = [OCPPMessageType.CALLRESULT, string, Record<string, unknown>];
export type OCPPCallError = [OCPPMessageType.CALLERROR, string, string, string, Record<string, unknown>];
export type OCPPMessage = OCPPCall | OCPPCallResult | OCPPCallError;

// RemoteStartTransaction
export interface RemoteStartTransactionRequest {
  connectorId: number;
  idTag: string;
  chargingProfile?: ChargingProfile;
  [key: string]: unknown;
}

export interface RemoteStartTransactionResponse {
  status: 'Accepted' | 'Rejected';
  [key: string]: unknown;
}

// RemoteStopTransaction
export interface RemoteStopTransactionRequest {
  transactionId: number;
  [key: string]: unknown;
}

export interface RemoteStopTransactionResponse {
  status: 'Accepted' | 'Rejected';
  [key: string]: unknown;
}

// StartTransaction (incoming from charger)
export interface StartTransactionRequest {
  connectorId: number;
  idTag: string;
  meterStart: number;
  timestamp: string;
  reservationId?: number;
}

export interface StartTransactionResponse {
  idTagInfo: IdTagInfo;
  transactionId: number;
}

// StopTransaction (incoming from charger)
export interface StopTransactionRequest {
  idTag?: string;
  meterStop: number;
  timestamp: string;
  transactionId: number;
  reason?: StopTransactionReason;
  transactionData?: MeterValue[];
}

export interface StopTransactionResponse {
  idTagInfo?: IdTagInfo;
}

// StatusNotification
export interface StatusNotificationRequest {
  connectorId: number;
  errorCode: ChargePointErrorCode;
  status: ChargePointStatus;
  timestamp?: string;
  info?: string;
  vendorId?: string;
  vendorErrorCode?: string;
}

export interface StatusNotificationResponse {
  // Empty response
}

// MeterValues
export interface MeterValuesRequest {
  connectorId: number;
  transactionId?: number;
  meterValue: MeterValue[];
}

export interface MeterValuesResponse {
  // Empty response
}

export interface MeterValue {
  timestamp: string;
  sampledValue: SampledValue[];
}

export interface SampledValue {
  value: string;
  context?: ReadingContext;
  format?: ValueFormat;
  measurand?: Measurand;
  phase?: Phase;
  location?: Location;
  unit?: UnitOfMeasure;
}

// Heartbeat
export interface HeartbeatRequest {
  // Empty request
}

export interface HeartbeatResponse {
  currentTime: string;
}

// Authorize
export interface AuthorizeRequest {
  idTag: string;
}

export interface AuthorizeResponse {
  idTagInfo: IdTagInfo;
}

// Supporting types
export interface IdTagInfo {
  status: AuthorizationStatus;
  expiryDate?: string;
  parentIdTag?: string;
}

export type AuthorizationStatus =
  | 'Accepted'
  | 'Blocked'
  | 'Expired'
  | 'Invalid'
  | 'ConcurrentTx';

export type ChargePointStatus =
  | 'Available'
  | 'Preparing'
  | 'Charging'
  | 'SuspendedEVSE'
  | 'SuspendedEV'
  | 'Finishing'
  | 'Reserved'
  | 'Unavailable'
  | 'Faulted';

export type ChargePointErrorCode =
  | 'ConnectorLockFailure'
  | 'EVCommunicationError'
  | 'GroundFailure'
  | 'HighTemperature'
  | 'InternalError'
  | 'LocalListConflict'
  | 'NoError'
  | 'OtherError'
  | 'OverCurrentFailure'
  | 'OverVoltage'
  | 'PowerMeterFailure'
  | 'PowerSwitchFailure'
  | 'ReaderFailure'
  | 'ResetFailure'
  | 'UnderVoltage'
  | 'WeakSignal';

export type StopTransactionReason =
  | 'EmergencyStop'
  | 'EVDisconnected'
  | 'HardReset'
  | 'Local'
  | 'Other'
  | 'PowerLoss'
  | 'Reboot'
  | 'Remote'
  | 'SoftReset'
  | 'UnlockCommand'
  | 'DeAuthorized';

export type ReadingContext =
  | 'Interruption.Begin'
  | 'Interruption.End'
  | 'Other'
  | 'Sample.Clock'
  | 'Sample.Periodic'
  | 'Transaction.Begin'
  | 'Transaction.End'
  | 'Trigger';

export type ValueFormat = 'Raw' | 'SignedData';

export type Measurand =
  | 'Current.Export'
  | 'Current.Import'
  | 'Current.Offered'
  | 'Energy.Active.Export.Register'
  | 'Energy.Active.Import.Register'
  | 'Energy.Reactive.Export.Register'
  | 'Energy.Reactive.Import.Register'
  | 'Energy.Active.Export.Interval'
  | 'Energy.Active.Import.Interval'
  | 'Energy.Reactive.Export.Interval'
  | 'Energy.Reactive.Import.Interval'
  | 'Frequency'
  | 'Power.Active.Export'
  | 'Power.Active.Import'
  | 'Power.Factor'
  | 'Power.Offered'
  | 'Power.Reactive.Export'
  | 'Power.Reactive.Import'
  | 'RPM'
  | 'SoC'
  | 'Temperature'
  | 'Voltage';

export type Phase =
  | 'L1'
  | 'L2'
  | 'L3'
  | 'N'
  | 'L1-N'
  | 'L2-N'
  | 'L3-N'
  | 'L1-L2'
  | 'L2-L3'
  | 'L3-L1';

export type Location = 'Body' | 'Cable' | 'EV' | 'Inlet' | 'Outlet';

export type UnitOfMeasure =
  | 'Wh'
  | 'kWh'
  | 'varh'
  | 'kvarh'
  | 'W'
  | 'kW'
  | 'VA'
  | 'kVA'
  | 'var'
  | 'kvar'
  | 'A'
  | 'V'
  | 'Celsius'
  | 'Fahrenheit'
  | 'K'
  | 'Percent';

// Charging Profile
export interface ChargingProfile {
  chargingProfileId: number;
  transactionId?: number;
  stackLevel: number;
  chargingProfilePurpose: ChargingProfilePurpose;
  chargingProfileKind: ChargingProfileKind;
  recurrencyKind?: RecurrencyKind;
  validFrom?: string;
  validTo?: string;
  chargingSchedule: ChargingSchedule;
}

export type ChargingProfilePurpose =
  | 'ChargePointMaxProfile'
  | 'TxDefaultProfile'
  | 'TxProfile';

export type ChargingProfileKind = 'Absolute' | 'Recurring' | 'Relative';

export type RecurrencyKind = 'Daily' | 'Weekly';

export interface ChargingSchedule {
  duration?: number;
  startSchedule?: string;
  chargingRateUnit: ChargingRateUnit;
  chargingSchedulePeriod: ChargingSchedulePeriod[];
  minChargingRate?: number;
}

export type ChargingRateUnit = 'A' | 'W';

export interface ChargingSchedulePeriod {
  startPeriod: number;
  limit: number;
  numberPhases?: number;
}

// Connection state
export type OCPPConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// Event types for the client
export interface OCPPClientEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  statusNotification: (data: StatusNotificationRequest) => void;
  meterValues: (data: MeterValuesRequest) => void;
  startTransaction: (data: StartTransactionRequest) => void;
  stopTransaction: (data: StopTransactionRequest) => void;
}
