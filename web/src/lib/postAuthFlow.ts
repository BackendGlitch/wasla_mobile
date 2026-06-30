import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { authApi, type AuthTokenResponse } from "./authApi";
import {
  deleteStoredRefreshToken,
  persistStoredRefreshToken,
  persistStoredToken,
  persistStoredUser,
} from "./sessionStorage";
import type { User } from "@/store/authStore";

export async function finishAuthAndNavigate(
  result: AuthTokenResponse,
  router: AppRouterInstance,
  setToken: (t: string | null) => void,
  setUser: (u: User | null) => void,
): Promise<void> {
  persistStoredToken(result.access_token);
  const rt = result.refresh_token?.trim();
  if (rt) persistStoredRefreshToken(rt);
  else deleteStoredRefreshToken();
  setToken(result.access_token);

  const u = result.user;
  const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  const email = (u.email?.trim() || "").trim();
  const phone = (u.phone?.trim() || "").trim();

  const storeUser: User = {
    id: u.id,
    name: fullName || (email ? email.split("@")[0] : phone || "User"),
    phone,
    email,
  };

  persistStoredUser(storeUser);
  setUser(storeUser);

  // Route to email verification if not yet verified
  if (email && !u.emailVerified) {
    try {
      await authApi.requestOtp({ email });
      router.replace(`/verify-email?email=${encodeURIComponent(email)}&skipInitialOtp=1`);
    } catch {
      router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    return;
  }

  router.replace("/");
}
