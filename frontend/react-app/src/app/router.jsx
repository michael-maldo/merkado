import React from "react";
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import LoginPage
  from "../identity/pages/LoginPage";

import MePage
  from "../identity/pages/MePage";

export default function Router() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/identity/login"
          element={<LoginPage />}
        />

        <Route
          path="/identity/me"
          element={<MePage />}
        />

      </Routes>

    </BrowserRouter>

  );
}