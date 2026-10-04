import { describe, expect, it } from "vitest";
import { analyzeInjection } from "./injection-guard";

describe("analyzeInjection", () => {
  it("câmera física normal não é suspeita", () => {
    const r = analyzeInjection({
      label: "FaceTime HD Camera",
      deviceId: "abc123",
      frameRate: 30,
    });
    expect(r.suspicious).toBe(false);
    expect(r.reasons).toHaveLength(0);
  });

  it("label de câmera virtual (OBS) é suspeita por si só", () => {
    const r = analyzeInjection({
      label: "OBS Virtual Camera",
      deviceId: "abc123",
      frameRate: 30,
    });
    expect(r.suspicious).toBe(true);
    expect(r.reasons).toContain("virtual_label");
  });

  it("detecta várias labels virtuais conhecidas", () => {
    for (const label of ["ManyCam", "Snap Camera", "DroidCam", "XSplit VCam"]) {
      expect(analyzeInjection({ label, deviceId: "x", frameRate: 30 }).suspicious).toBe(
        true,
      );
    }
  });

  it("deviceId ausente sozinho NÃO marca suspeita (evita falso positivo)", () => {
    const r = analyzeInjection({
      label: "Integrated Webcam",
      deviceId: "",
      frameRate: 30,
    });
    expect(r.reasons).toContain("missing_device_id");
    expect(r.suspicious).toBe(false);
  });

  it("dois sinais fracos combinados marcam suspeita", () => {
    const r = analyzeInjection({
      label: "Integrated Webcam",
      deviceId: null,
      frameRate: 60,
    });
    expect(r.reasons).toContain("missing_device_id");
    expect(r.reasons).toContain("suspicious_framerate");
    expect(r.suspicious).toBe(true);
  });

  it("framerate alto inteiro sozinho não marca suspeita", () => {
    const r = analyzeInjection({
      label: "Webcam",
      deviceId: "dev-1",
      frameRate: 60,
    });
    expect(r.reasons).toEqual(["suspicious_framerate"]);
    expect(r.suspicious).toBe(false);
  });

  it("normaliza a label para minúsculas", () => {
    const r = analyzeInjection({ label: "  FaceTime  ", deviceId: "x" });
    expect(r.normalizedLabel).toBe("facetime");
  });

  it("lida com entrada vazia sem lançar", () => {
    const r = analyzeInjection({});
    expect(r.normalizedLabel).toBeNull();
    // deviceId undefined não conta como ausente explícito.
    expect(r.suspicious).toBe(false);
  });
});
