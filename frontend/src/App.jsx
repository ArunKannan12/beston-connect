import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/authContext";

const GOOGLE_CLIENT_ID = "515268703203-o83dfbc2p62qeek11id94nesc41le4h6.apps.googleusercontent.com";// replace with your actual client ID

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastContainer 
          position="top-right" 
          autoClose={3000} 
          hideProgressBar={false} 
          newestOnTop={false} 
          closeOnClick 
          rtl={false} 
          pauseOnFocusLoss 
          draggable={true}
          draggablePercent={60}
          pauseOnHover 
          theme="light"
        />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
