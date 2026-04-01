"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email i lozinka su obavezni." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Pogrešan email ili lozinka." };
  }

  redirect("/dashboard");
}

export async function register(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  if (!email || !password || !fullName) {
    return { error: "Sva polja su obavezna." };
  }

  if (password.length < 6) {
    return { error: "Lozinka mora imati najmanje 6 karaktera." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Korisnik sa ovim emailom već postoji." };
    }
    return { error: "Greška pri registraciji. Pokušajte ponovo." };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
