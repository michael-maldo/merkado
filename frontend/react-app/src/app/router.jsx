import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";

import MainLayout from "../layouts/MainLayout";

import LoginPage from "../identity/pages/LoginPage";

import DashboardPage from "../dashboard/pages/DashboardPage";
import ProductsPage from "../catalog/pages/ProductsPage";
import ClientsPage from "../clients/pages/ClientsPage";
import OrdersPage from "../orders/pages/OrdersPage";
import FulfillmentPage from "../warehouse/pages/FulfillmentPage";
import ManagementPage from "../management/pages/ManagementPage";
import UsersPage from "../identity/pages/UsersPage";

import ProtectedRoute from "../identity/components/ProtectedRoute";
import HomeRedirect from "../routes/HomeRedirect";

export default function AppRouter() {
  return (
    <Routes>
      <Route
          path="/"
          element={<HomeRedirect/>}
      />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/fulfillment" element={<FulfillmentPage />} />
        <Route path="/management" element={<ManagementPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
/*
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import LoginPage
  from "../identity/pages/LoginPage";

import MePage
  from "../identity/pages/MePage";

import DashboardPage
from "../dashboard/pages/DashboardPage";
import ProtectedRoute from "../identity/components/ProtectedRoute";

export default function Router() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={
            <Navigate
                to="/identity/login"
                replace
            />
          }
        />

        <Route
          path="/identity/login"
          element={<LoginPage />}
        />

        <Route
          path="/identity/me"
          element={<MePage />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

      </Routes>


    </BrowserRouter>

  );
}

 */
