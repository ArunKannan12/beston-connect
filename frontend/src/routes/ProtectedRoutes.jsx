
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import LoadingScreen from "../components/helpers/LoadinScreen";

const ProtectedRoutes = ({ allowedRoles }) => {
  const { user, isAuthenticated,loading} = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen/>
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
 const allowedRolesArray = allowedRoles || [];
  
  if (allowedRolesArray.length && !allowedRolesArray.includes(user?.active_role || user?.role)) {
    return <Navigate to="/" replace />;
  }


  return <Outlet />;
};

export default ProtectedRoutes;
