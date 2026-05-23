import { el, elText } from "../builder-base";
import type { SefSupplier, SefCustomer } from "../../types";

// Build cac:Party node for a supplier (with VAT scheme + legal entity).
export function buildSupplierParty(supplier: SefSupplier): string {
  return el(
    "cac:Party",
    null,
    elText("cbc:EndpointID", supplier.pib, { schemeID: "9948" }),
    supplier.jbkjs
      ? el(
          "cac:PartyIdentification",
          null,
          elText("cbc:ID", `JBKJS:${supplier.jbkjs}`),
        )
      : "",
    el("cac:PartyName", null, elText("cbc:Name", supplier.tradingName ?? supplier.registrationName)),
    el(
      "cac:PostalAddress",
      null,
      elText("cbc:StreetName", supplier.streetName),
      elText("cbc:CityName", supplier.cityName),
      elText("cbc:PostalZone", supplier.postalZone),
      el(
        "cac:Country",
        null,
        elText("cbc:IdentificationCode", supplier.countryCode || "RS"),
      ),
    ),
    el(
      "cac:PartyTaxScheme",
      null,
      elText("cbc:CompanyID", `RS${supplier.pib}`),
      el("cac:TaxScheme", null, elText("cbc:ID", "VAT")),
    ),
    el(
      "cac:PartyLegalEntity",
      null,
      elText("cbc:RegistrationName", supplier.registrationName),
      elText("cbc:CompanyID", supplier.maticniBroj),
    ),
    supplier.email || supplier.phone
      ? el(
          "cac:Contact",
          null,
          elText("cbc:Telephone", supplier.phone),
          elText("cbc:ElectronicMail", supplier.email),
        )
      : "",
  );
}

// Build cac:Party node for a customer (handles RS B2B, B2G, and foreign).
export function buildCustomerParty(customer: SefCustomer): string {
  const isRs = !customer.isForeign && customer.countryCode === "RS";
  return el(
    "cac:Party",
    null,
    customer.pib
      ? elText("cbc:EndpointID", customer.pib, { schemeID: "9948" })
      : "",
    customer.jbkjs
      ? el(
          "cac:PartyIdentification",
          null,
          elText("cbc:ID", `JBKJS:${customer.jbkjs}`),
        )
      : "",
    el("cac:PartyName", null, elText("cbc:Name", customer.registrationName)),
    customer.streetName || customer.cityName
      ? el(
          "cac:PostalAddress",
          null,
          elText("cbc:StreetName", customer.streetName),
          elText("cbc:CityName", customer.cityName),
          elText("cbc:PostalZone", customer.postalZone),
          el(
            "cac:Country",
            null,
            elText("cbc:IdentificationCode", customer.countryCode || "RS"),
          ),
        )
      : "",
    isRs && customer.pib
      ? el(
          "cac:PartyTaxScheme",
          null,
          elText("cbc:CompanyID", `RS${customer.pib}`),
          el("cac:TaxScheme", null, elText("cbc:ID", "VAT")),
        )
      : "",
    el(
      "cac:PartyLegalEntity",
      null,
      elText("cbc:RegistrationName", customer.registrationName),
      customer.maticniBroj ? elText("cbc:CompanyID", customer.maticniBroj) : "",
    ),
    customer.email || customer.phone
      ? el(
          "cac:Contact",
          null,
          elText("cbc:Telephone", customer.phone),
          elText("cbc:ElectronicMail", customer.email),
        )
      : "",
  );
}
