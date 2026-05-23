// UBL 2.1 namespaces required by the Serbian SEF profile.
// Order of attributes is significant for some validators — emit cbc/cac/sbt
// before the default xmlns.

export const NS = {
  cec: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  sbt: "http://mfin.gov.rs/srbdt/srbdtext",
  invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  creditNote: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
};

export const CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022";

export function rootAttributes(documentRoot: "Invoice" | "CreditNote"): Record<string, string> {
  const defaultNs = documentRoot === "Invoice" ? NS.invoice : NS.creditNote;
  return {
    "xmlns:cec": NS.cec,
    "xmlns:cac": NS.cac,
    "xmlns:cbc": NS.cbc,
    "xmlns:sbt": NS.sbt,
    xmlns: defaultNs,
  };
}
