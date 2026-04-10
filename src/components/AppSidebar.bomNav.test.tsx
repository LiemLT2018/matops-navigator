import { describe, it, expect } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import "@/i18n";

function LayoutWithSidebar() {
  return (
    <SidebarProvider>
      <div className="flex">
        <AppSidebar />
        <Outlet />
      </div>
    </SidebarProvider>
  );
}

describe("AppSidebar — Quản lý BOM", () => {
  it("điều hướng tới /bom khi bấm mục menu", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<LayoutWithSidebar />}>
            <Route path="/" element={<div data-testid="home">Home</div>} />
            <Route path="/bom" element={<div data-testid="bom-page">BOM</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const link = await screen.findByRole("link", { name: /Quản lý BOM/i });
    expect(link).toHaveAttribute("href", "/bom");

    fireEvent.click(link);

    await waitFor(() => {
      expect(screen.getByTestId("bom-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });
});
