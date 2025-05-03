import RouteGuard from "@/helpers/RouteGuard";
import NotFoundPage from "@/pages/not-found";
import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { RouteName } from "./routeName";
import SideBar from "@/components/side-bar/index";

const LoginPage = lazy(() => import("@/pages/login"));

const MainRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LoginPage />} path={RouteName.LOGIN} />
        <Route path="/" element={<RouteGuard />}>
          <Route path="/" element={<SideBar />}></Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouter;
