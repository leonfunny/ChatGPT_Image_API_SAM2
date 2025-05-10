import { RouteName } from "@/routes/routeName";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router";

const RouteGuard = () => {
  const { access_token } = useSelector((state) => state["feature/user"]);
  const location = useLocation();
  if (access_token && !location?.search && location?.pathname === "/") {
    return (
      <div>
        <Navigate to={RouteName.PROGRAM_DELIVERY} />
        <Outlet />
      </div>
    );
  }
  if (access_token) {
    return <Outlet />;
  }
  return <Navigate to={RouteName.LOGIN} replace />;
};

export default RouteGuard;
