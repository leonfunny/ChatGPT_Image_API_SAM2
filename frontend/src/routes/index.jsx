import RouteGuard from "@/helpers/RouteGuard";
import NotFoundPage from "@/pages/not-found";
import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { RouteName } from "./routeName";
import SideBar from "@/components/side-bar/index";

const LoginPage = lazy(() => import("@/pages/login"));
const GenerateImagePage = lazy(() => import("@/pages/generate-image"));

const MainRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LoginPage />} path={RouteName.LOGIN} />
        <Route path="/" element={<RouteGuard />}>
          <Route path="/" element={<SideBar />}>
            <Route
              element={<GenerateImagePage />}
              path={RouteName.GENERATE_IMAGE}
              index
            />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouter;
