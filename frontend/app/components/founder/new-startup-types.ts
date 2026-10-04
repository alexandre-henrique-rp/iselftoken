import type { UseFormReturn } from "react-hook-form";
import type { NewStartupFormData } from "~/lib/new-startup-schema";
import type { Country } from "~/lib/queries";

export type SubmitProgress = "creating" | "checkout" | null;

export interface StartupStepProps {
  form: UseFormReturn<NewStartupFormData>;
  countries: Country[];
}
