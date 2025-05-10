import RouteGuard from "@/helpers/RouteGuard";
import NotFoundPage from "@/pages/not-found";
import { lazy } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import { RouteName } from "./routeName";
import SideBar from "@/components/side-bar/index";

const LoginPage = lazy(() => import("@/pages/login"));
const HistoryPage = lazy(() => import("@/pages/history"));
const SegmentImagePage = lazy(() => import("@/pages/segment-image"));
const GenerateImagePage = lazy(() => import("@/pages/generate-image"));

const MainRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={RouteName.GENERATE_IMAGE} replace />}
        />

        <Route element={<LoginPage />} path={RouteName.LOGIN} />

        <Route element={<RouteGuard />}>
          <Route element={<SideBar />}>
            <Route
              element={<GenerateImagePage />}
              path={RouteName.GENERATE_IMAGE}
            />
            <Route element={<HistoryPage />} path={RouteName.HISTORY} />
            <Route
              element={<SegmentImagePage />}
              path={RouteName.SEGMENT_IMAGE}
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouter;
