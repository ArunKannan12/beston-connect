// router.js
import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import ProtectedRoutes from "./ProtectedRoutes";
import LoadingScreen from "../components/helpers/LoadinScreen";
import { useAuth } from "../contexts/authContext";


// 🔄 Lazy-loaded Admin components
const AdminReplacements = lazy(() => import("../components/admin/pages/AdminReplacements.jsx"));
const AdminReturns = lazy(() => import("../components/admin/pages/AdminReturns.jsx"));
const AdminOrders = lazy(() => import("../components/admin/pages/AdminOrders.jsx"));
const AdminCustomers = lazy(() => import("../components/admin/pages/AdminCustomers.jsx"));
const AdminCategories = lazy(() => import("../components/admin/pages/AdminCategories.jsx"));
const AdminProducts = lazy(() => import("../components/admin/pages/AdminProducts.jsx"));
const AdminAllBanner = lazy(() => import('../components/admin/pages/AdminAllBanner.jsx'));
const AdminDashboard = lazy(() => import("../components/admin/AdminDashboard"));
const AdminDashboardHome = lazy(() => import('../components/admin/pages/AdminDashboardHome.jsx'));
const AdminPromoters =lazy(()=>import("../components/admin/pages/AdminPromoters.jsx")) ;
const AdminCommissionLevel = lazy(()=>import("../components/admin/pages/AdminCommissionLevel.jsx")) ;
const AdminPremiumSettings = lazy(()=>import("../components/admin/pages/AdminPremiumSettings.jsx")) ;
const PickupRequestPage = lazy(()=>import("../components/admin/pages/PickupRequest.jsx")) ;
// const AdminWarehouse = lazy(()=>import('../components/admin/pages/AdminWarehouse.jsx'))

const AdminPromoterWithdrwalRequest = lazy(()=>import("../components/admin/pages/AdminPromoterWithdrwalRequest.jsx"));
const Wallet = lazy(()=>import("../components/promoter/Paid/Wallet.jsx"));
// 🔄 Lazy-loaded Visitor/Customer components
const VisitorHomePage = lazy(() => import("../components/visitor/VisitorHomePage"));
const Home = lazy(() => import("../components/visitor/Home"));
const Store = lazy(() => import("../components/visitor/Store"));
const ProductDetail = lazy(() => import("../components/visitor/ProductDetail"));
const Cart = lazy(() => import("../components/visitor/Cart"));
const Checkout = lazy(() => import("../components/visitor/Checkout"));
const OrderList = lazy(() => import("../components/visitor/OrderList"));
const OrderDetail = lazy(() => import("../components/visitor/OrderDetail"));
const LoginAndSignup = lazy(() => import("../components/visitor/LoginAndSignup"));
const About = lazy(() => import("../components/visitor/About"));
const ReturnRequest = lazy(() => import("../components/visitor/returnReplacement/ReturnRequest.jsx"));
const ReplacementRequest = lazy(() => import("../components/visitor/returnReplacement/ReplacementRequest.jsx"));
const ReturnList = lazy(() => import('../components/visitor/returnReplacement/ReturnList.jsx'));
const ReplacementList = lazy(() => import('../components/visitor/returnReplacement/ReplacementList.jsx'));
const ChangePassword = lazy(() => import("../components/visitor/ChangePassword"));
const Profile = lazy(() => import("../components/visitor/Profile"));
const ForgotPassword = lazy(() => import("../components/visitor/ForgotPassword"));
const ConfirmResetPassword = lazy(() => import("../components/visitor/ConfirmResetPassword"));
const ActivateAccount = lazy(() => import("../components/visitor/ActivateAccount"));
const VerifyEmail = lazy(() => import("../components/visitor/VerifyEmail"));
const FacebookAuth = lazy(() => import("../components/visitor/FacebookAuth"));
const GoogleAuth = lazy(() => import("../components/visitor/GoogleAuth"));
const PromoterPage = lazy(()=>import("../components/visitor/PromoterPage.jsx"));
const Withdrawals = lazy(()=>import("../components/promoter/Paid/Withdrawals.jsx"));


const PromoterDashboardWrapper = lazy(()=>import("../components/promoter/PromoterDashboardWrapper.jsx")) ;
const PaidDashboard = lazy(()=>import('../components/promoter/Paid/PaidDashboard.jsx'))
const UnpaidDashboard = lazy(()=>import('../components/promoter/Unpaid/UnpaidDashboard.jsx'))
const AddPromotedProdcts = lazy(()=>import("../components/promoter/AddPromotedProdcts.jsx"));

const PromoterNavbar = lazy(()=>import("../components/promoter/PromoterNavbar.jsx")) ;
const PremiumPage = lazy(()=>import('../components/promoter/Unpaid/PremiumPage.jsx')) 
const PromoterProfile = lazy(()=>import("../components/promoter/PromoterProfile.jsx")) ;

// 🌀 Suspense wrapper
const withSuspense = (Component) => (
  <Suspense fallback={<LoadingScreen />}>{Component}</Suspense>
);

// 🚀 Redirect `/` depending on role
const RedirectHome = () => {
  const { isAdmin, isPromoter, user } = useAuth();


  if (isAdmin()) {
    
    return <Navigate to="/admin" replace />;
  }

  if (isPromoter()) {
    
    return <Navigate to='/promoter/dashboard' replace />;
  }

  if (user?.active_role === 'customer') {
  
    return <VisitorHomePage />;
  }

  return <VisitorHomePage />;
};


// 🚀 Router setup
export const router = createBrowserRouter([
  // Public routes
  {
    path: "/",
    element: withSuspense(<RedirectHome />),
    children: [
      { index: true, element: withSuspense(<Home />) },
      { path: "store", element: withSuspense(<Store />) },
      { path: "store/:categorySlug", element: withSuspense(<Store />) },
      { path: "products/:productSlug", element: withSuspense(<ProductDetail />) },
      { path: "cart", element: withSuspense(<Cart />) },
      { path: "login", element: withSuspense(<LoginAndSignup />) },
      { path: "about", element: withSuspense(<About />) },
      { path: "forgot-password", element: withSuspense(<ForgotPassword />) },
      { path: "reset-password-confirm/:uid/:token", element: withSuspense(<ConfirmResetPassword />) },
      { path: "activation/:uid/:token", element: withSuspense(<ActivateAccount />) },
      { path: "verify-email", element: withSuspense(<VerifyEmail />) },
      { path: "auth/facebook", element: withSuspense(<FacebookAuth />) },
      { path: "auth/google", element: withSuspense(<GoogleAuth />) },
    ],
  },
  
  // Customer routes
  {
    element: <ProtectedRoutes allowedRoles={["customer"]} />,
    children: [
      {
        element: withSuspense(<VisitorHomePage />),
        children: [
          { path: "/profile", element: withSuspense(<Profile />) },
          { path: "/change-password", element: withSuspense(<ChangePassword />) },
          { path: "/checkout", element: withSuspense(<Checkout />) },
          { path: "/orders/", element: withSuspense(<OrderList />) },
          { path: "/orders/:order_number", element: withSuspense(<OrderDetail />) },
          { path: "/returns", element: withSuspense(<ReturnList />) },
          { path: "replacements", element: withSuspense(<ReplacementList />) },
          { path: "/returns/create/:orderNumber", element: withSuspense(<ReturnRequest />) },
          { path: "/returns/:returnId", element: withSuspense(<ReturnRequest />) },
          { path: "/replacements/create/:orderNumber", element: withSuspense(<ReplacementRequest />) },
          {path:"become-a-promoter",element:withSuspense(<PromoterPage/>)}
        ],
      },
    ],
  },

  // Admin routes
  {
    element: <ProtectedRoutes allowedRoles={["admin"]} />,
    children: [
      {
        path: "/admin",
        element: withSuspense(<AdminDashboard />),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<AdminDashboardHome />) },
          { path: "products", element: withSuspense(<AdminProducts />) },
          { path: "categories", element: withSuspense(<AdminCategories />) },
          { path: "customers", element: withSuspense(<AdminCustomers />) },
          { path: "orders", element: withSuspense(<AdminOrders />) },
          { path: "returns", element: withSuspense(<AdminReturns />) },
          { path: "replacements", element: withSuspense(<AdminReplacements />) },
          { path: "banners", element: withSuspense(<AdminAllBanner />) },
          {path:"promoters",element:withSuspense(<AdminPromoters/>)},
          {path:"premium-settings",element:withSuspense(<AdminPremiumSettings/>)},
          {path:"commission-levels",element:withSuspense(<AdminCommissionLevel/>)},
          {path:"withdrawal-requests",element:withSuspense(<AdminPromoterWithdrwalRequest/>)},
          {path:"delhivery-pickup-requests",element:withSuspense(<PickupRequestPage/>)},
          // {path:"warehouses",element:withSuspense(<AdminWarehouse/>)},

        ],
      },
      { path: "/profile", element: withSuspense(<Profile />) },
      { path: "/change-password", element: withSuspense(<ChangePassword />) },
    ],
  },
  {
  element: <ProtectedRoutes allowedRoles={["promoter"]} />,
  children: [
    {
      path: "/promoter",
      element:withSuspense (<PromoterNavbar />), // this allows nested children to render
      children: [
        {path:'dashboard',element:withSuspense(<PromoterDashboardWrapper/>)},
        { path:'dashboard/paid', element:withSuspense(<PaidDashboard/>)},
        { path:'dashboard/unpaid', element:withSuspense(<UnpaidDashboard/>)},
        {path:'become-premium-promoter',element:withSuspense(<PremiumPage/>)},
        {path:'become-premium-promoter',element:withSuspense(<PremiumPage/>)},
        { path: "withdrawals", element: withSuspense(<Withdrawals />) },
        { path: "wallet", element: withSuspense(<Wallet />) },
        {path:'add-promoted-products',element:withSuspense(<AddPromotedProdcts/>)},
        { path: "profile", element: withSuspense(<PromoterProfile/>) },
      ],
    },
  ],
},


  
  // Fallback
  { path: "*", element: withSuspense(<VisitorHomePage />) },
]);
