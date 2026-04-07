import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  clearAuthSession,
  getAccessToken,
  isAccessTokenExpired,
} from "@/lib/authStorage";

/**
 * Chỉ cho phép vào layout app khi còn token hợp lệ (theo mốc hạn client, nếu có).
 */
export function RequireAuth() {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isAccessTokenExpired()) {
    clearAuthSession();
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
