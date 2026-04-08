import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renders MycoNote heading", () => {
    render(<Home />);
    expect(screen.getByText("MycoNote")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<Home />);
    expect(screen.getByText("きのこフィールドガイド")).toBeInTheDocument();
  });
});
