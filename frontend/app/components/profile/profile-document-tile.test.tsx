import { render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ProfileDocumentTile } from "./profile-document-tile";

describe("ProfileDocumentTile — preview local de selfie", () => {
  it("renderiza o vídeo capturado mesmo enquanto o status ainda é EMPTY", () => {
    const { container } = render(
      <ProfileDocumentTile
        label="Selfie"
        icon={Plus}
        status="EMPTY"
        previewUrl="blob:selfie-preview"
        previewType="video"
      />,
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", "blob:selfie-preview");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
  });
});

describe("ProfileDocumentTile — BUG-FT-005 (REJECTED_NO_DOC)", () => {
  it("REJECTED_NO_DOC mostra chip 'Faça upload novamente' sem preview", () => {
    const { container } = render(
      <ProfileDocumentTile
        label="Avatar"
        icon={Plus}
        status="REJECTED_NO_DOC"
        rejectionReason="imagem contra foto"
      />,
    );

    // Chip correto
    expect(screen.getByText(/Faça upload novamente/i)).toBeInTheDocument();
    // Sem <img> nem <video> (preview suprimido quando doc=null)
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
    // aria-label inclui o motivo da rejeição (acessibilidade)
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("imagem contra foto");
  });
});
