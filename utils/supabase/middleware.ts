import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

// يجدد جلسة الدخول تلقائياً حتى لا يُطلب من المستخدم كلمة السر مرة أخرى
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            maxAge: 60 * 60 * 24 * 400, // الجلسة تبقى سنة تقريباً
          })
        );
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
};