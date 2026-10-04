/**
 * Testes do RepasseMonthlyReportFields (FIN-11 §8.2).
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  RepasseMonthlyReportFields,
  type MonthlyReportValues,
} from "../repasse-monthly-report-fields";

describe("RepasseMonthlyReportFields", () => {
  it("renderiza titulo e dicas para o fundador", () => {
    render(<RepasseMonthlyReportFields />);
    expect(screen.getByText("Relatorio do Mes")).toBeInTheDocument();
    expect(screen.getByTestId("monthly-msg-input")).toBeInTheDocument();
    expect(screen.getByTestId("monthly-uso-input")).toBeInTheDocument();
  });

  it("aplica defaultValues quando passado", () => {
    render(
      <RepasseMonthlyReportFields
        defaultValues={{
          mensagemInvestidores: "Mes de marcos",
          usoRecurso: "Captacao para ads",
          teveLucro: true,
          marcoAlcancado: true,
          marcoDescricao: "Beta fechada",
        }}
      />,
    );
    expect(screen.getByTestId("monthly-msg-input")).toHaveValue("Mes de marcos");
    expect(screen.getByTestId("monthly-uso-input")).toHaveValue("Captacao para ads");
    // MarcoSim pressionado: campo descricao visivel
    expect(screen.getByTestId("monthly-marco-desc-input")).toBeInTheDocument();
    expect(screen.getByTestId("monthly-marco-desc-input")).toHaveValue(
      "Beta fechada",
    );
  });

  it("expande campo descricao do marco somente quando marcoAlcancado=Sim", () => {
    render(<RepasseMonthlyReportFields />);
    expect(screen.queryByTestId("monthly-marco-desc-input")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("monthly-marco-sim"));
    expect(screen.getByTestId("monthly-marco-desc-input")).toBeInTheDocument();
    // Voltar para "Nao" esconde o campo
    fireEvent.click(screen.getByTestId("monthly-marco-nao"));
    expect(screen.queryByTestId("monthly-marco-desc-input")).not.toBeInTheDocument();
  });

  it("emite onChange com valores consolidados", () => {
    const onChange = vi.fn<(values: MonthlyReportValues) => void>();
    render(<RepasseMonthlyReportFields onChange={onChange} />);

    fireEvent.change(screen.getByTestId("monthly-msg-input"), {
      target: { value: "Mensagem teste" },
    });
    fireEvent.change(screen.getByTestId("monthly-uso-input"), {
      target: { value: "Uso teste" },
    });
    fireEvent.click(screen.getByTestId("monthly-lucro-sim"));
    fireEvent.click(screen.getByTestId("monthly-marco-sim"));
    fireEvent.change(screen.getByTestId("monthly-marco-desc-input"), {
      target: { value: "Marco teste" },
    });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      mensagemInvestidores: "Mensagem teste",
      usoRecurso: "Uso teste",
      teveLucro: true,
      marcoAlcancado: true,
      marcoDescricao: "Marco teste",
    });
  });

  it("limpa descricao do marco quando usuario troca para Nao", () => {
    const onChange = vi.fn<(values: MonthlyReportValues) => void>();
    render(
      <RepasseMonthlyReportFields
        defaultValues={{
          marcoAlcancado: true,
          marcoDescricao: "Algum marco",
        }}
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId("monthly-marco-desc-input")).toHaveValue("Algum marco");
    fireEvent.click(screen.getByTestId("monthly-marco-nao"));
    expect(screen.queryByTestId("monthly-marco-desc-input")).not.toBeInTheDocument();
    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.marcoDescricao).toBe("");
    expect(lastCall?.marcoAlcancado).toBe(false);
  });

  it("respeita limite maximoa dos textareas", () => {
    render(<RepasseMonthlyReportFields />);
    const msgInput = screen.getByTestId("monthly-msg-input") as HTMLTextAreaElement;
    expect(msgInput.maxLength).toBe(5000);
    const usoInput = screen.getByTestId("monthly-uso-input") as HTMLTextAreaElement;
    expect(usoInput.maxLength).toBe(2000);
  });

  it("desabilita todos os campos quando disabled=true", () => {
    render(<RepasseMonthlyReportFields disabled />);
    expect(screen.getByTestId("monthly-msg-input")).toBeDisabled();
    expect(screen.getByTestId("monthly-uso-input")).toBeDisabled();
    expect(screen.getByTestId("monthly-lucro-sim")).toBeDisabled();
    expect(screen.getByTestId("monthly-marco-sim")).toBeDisabled();
  });
});