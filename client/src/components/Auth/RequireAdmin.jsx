import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "../../lib/userStorage"; 

export default function RequireAdmin({ children }) {
  const user = getUser();
  const location = useLocation();

  if (!user || !user.accountType) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.accountType !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}