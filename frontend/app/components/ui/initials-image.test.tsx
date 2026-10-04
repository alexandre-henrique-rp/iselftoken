import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InitialsImage } from "./initials-image";

describe("InitialsImage", () => {
  it("renderiza somente o fallback durante SSR", () => {
    const html = renderToString(
      <InitialsImage name="Neural Forge" src="/logo-invalida.png" />,
    );

    expect(html).toContain("NF");
    expect(html).not.toContain("<img");
  });

  it("mostra as iniciais quando não existe URL", () => {
    render(<InitialsImage name="Maria Silva" />);

    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("mostra as iniciais quando a imagem falha", () => {
    render(<InitialsImage name="iSelfToken" src="/logo-invalida.png" />);

    const image = screen.getByRole("img", { name: "iSelfToken" });
    fireEvent.error(image);

    expect(screen.getByText("IS")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("volta a tentar quando a URL muda", () => {
    const { rerender } = render(
      <InitialsImage name="Ana Costa" src="/primeira.png" />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Ana Costa" }));
    expect(screen.getByText("AC")).toBeInTheDocument();

    rerender(<InitialsImage name="Ana Costa" src="/segunda.png" />);
    expect(screen.getByRole("img", { name: "Ana Costa" })).toHaveAttribute(
      "src",
      expect.stringContaining("/segunda.png"),
    );
  });
});
