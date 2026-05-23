// Map technical SEF error codes / HTTP statuses to user-friendly Serbian messages.
// Based on documented errors from Minimax, ND.rs, and SEF FAQ.

export interface MappedSefError {
  userMessage: string;
  category: "auth" | "validation" | "recipient" | "rate_limit" | "server" | "unknown";
  retryable: boolean;
}

export function mapSefError(
  httpStatus: number,
  rawMessage: string | null | undefined,
): MappedSefError {
  const msg = (rawMessage ?? "").toLowerCase();

  if (httpStatus === 401 || httpStatus === 403) {
    return {
      userMessage: "SEF API ključ nije važeći ili nije aktivan. Proverite u podešavanjima.",
      category: "auth",
      retryable: false,
    };
  }

  if (httpStatus === 429) {
    return {
      userMessage: "Previše zahteva ka SEF-u u kratkom roku. Sačekajte par minuta.",
      category: "rate_limit",
      retryable: true,
    };
  }

  if (httpStatus >= 500) {
    return {
      userMessage: "SEF trenutno nije dostupan. Pokušaćemo automatski ponovo.",
      category: "server",
      retryable: true,
    };
  }

  if (httpStatus === 400) {
    // Pattern matching on Serbian error text
    if (msg.includes("primalac") && msg.includes("nije registrovan")) {
      return {
        userMessage: "Klijent nije registrovan na SEF sistemu — ne možete mu poslati fakturu.",
        category: "recipient",
        retryable: false,
      };
    }
    if (msg.includes("pib") && (msg.includes("nepoznat") || msg.includes("not found"))) {
      return {
        userMessage: "PIB klijenta nije pronađen u SEF registru. Proverite tačnost PIB-a.",
        category: "recipient",
        retryable: false,
      };
    }
    if (msg.includes("duplicate") || msg.includes("postoji") || msg.includes("vec") || msg.includes("već")) {
      return {
        userMessage: "Faktura sa ovim brojem već postoji u SEF-u. Promenite broj.",
        category: "validation",
        retryable: false,
      };
    }
    if (msg.includes("date") || msg.includes("datum")) {
      return {
        userMessage: "Datum izdavanja mora biti današnji datum. Ažurirajte i pokušajte ponovo.",
        category: "validation",
        retryable: false,
      };
    }
    if (msg.includes("schema") || msg.includes("schematron") || msg.includes("validation")) {
      return {
        userMessage: "Greška u strukturi fakture (XML validacija). Proverite obavezna polja.",
        category: "validation",
        retryable: false,
      };
    }
    if (msg.includes("tax") || msg.includes("porez") || msg.includes("pdv")) {
      return {
        userMessage: "Greška u PDV podacima. Proverite kategorije i stope poreza.",
        category: "validation",
        retryable: false,
      };
    }
    if (msg.includes("budget user") || msg.includes("jbkjs") || msg.includes("ugovor") || msg.includes("order")) {
      return {
        userMessage: "Za fakturu prema državnoj instituciji potreban je broj porudžbine ili ugovora.",
        category: "validation",
        retryable: false,
      };
    }
    return {
      userMessage: rawMessage
        ? `SEF je odbio fakturu: ${rawMessage.slice(0, 200)}`
        : "SEF je odbio fakturu zbog greške u podacima.",
      category: "validation",
      retryable: false,
    };
  }

  if (httpStatus === 404) {
    return {
      userMessage: "Dokument nije pronađen na SEF-u.",
      category: "validation",
      retryable: false,
    };
  }

  return {
    userMessage: rawMessage
      ? `SEF greška: ${rawMessage.slice(0, 200)}`
      : "Nepoznata SEF greška. Pokušajte ponovo ili kontaktirajte podršku.",
    category: "unknown",
    retryable: false,
  };
}
