import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/Login.tsx"),
  // you can use index or layout for nested routes
  layout("routes/protected/layout.tsx", [
    route("dashboard", "routes/protected/Dashboard.tsx"),
    route("admins", "routes/protected/Admins.tsx"),
    route("doctors", "routes/protected/Doctors.tsx"),
    route("nurses", "routes/protected/Nurses.tsx"),
    route("patients", "routes/protected/Patients.tsx"),
    route("activities-log", "routes/protected/ActivitiesLog.tsx"),
    route("profile/:id", "routes/protected/Profile.tsx"),
    route("financial-history", "routes/protected/FinancialHistory.tsx"),
  ]),
] satisfies RouteConfig;
