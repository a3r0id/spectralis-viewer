import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { HomeScreen, SessionListPage, SessionMapPage } from "@/pages/home-screen";
import { NotFound } from "@/pages/not-found";
import { RouteProvider } from "@/providers/router-provider";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <BrowserRouter>
                <RouteProvider>
                    <SessionProvider>
                        <Routes>
                            <Route path="/" element={<HomeScreen />}>
                                <Route index element={<SessionListPage />} />
                                <Route path="analyze" element={<SessionMapPage />} />
                            </Route>
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </SessionProvider>
                </RouteProvider>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>,
);
