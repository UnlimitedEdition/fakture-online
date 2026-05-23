// Shared SEF status pill config (label + color) for use in client components.

import { SEF_STATUS_COLOR, SEF_STATUS_LABEL, type SefStatus } from "./types";

export interface StatusPill {
  label: string;
  color: string;
}

export function getSefStatusPill(status: SefStatus | null | undefined): StatusPill | null {
  if (!status) return null;
  return {
    label: SEF_STATUS_LABEL[status],
    color: SEF_STATUS_COLOR[status],
  };
}

export function isSefTerminal(status: SefStatus | null | undefined): boolean {
  if (!status) return false;
  return ["odobreno", "odbijeno", "storniran", "otkazan"].includes(status);
}

export function canCancelSef(status: SefStatus | null | undefined): boolean {
  return status === "poslato" || status === "slanje";
}

export function canStornoSef(status: SefStatus | null | undefined): boolean {
  return status === "poslato" || status === "odobreno" || status === "odbijeno";
}

export function canSendToSef(status: SefStatus | null | undefined): boolean {
  if (!status) return true;
  return status === "nacrt" || status === "greska";
}
