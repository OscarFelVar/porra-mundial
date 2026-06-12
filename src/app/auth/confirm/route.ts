import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verifica el token de los emails de Supabase (recovery, etc.) vía verifyOtp.
// SIN estado (no depende de la cookie PKCE), así funciona aunque el enlace se abra
// en un navegador distinto del que lo pidió — caso típico de la PWA en iOS, cuyo
// almacenamiento está aislado del navegador del sistema.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Solo rutas relativas internas (anti open-redirect).
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
