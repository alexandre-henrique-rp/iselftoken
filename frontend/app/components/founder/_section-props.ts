export interface SectionStatus {
  id: string;
  dirty: number;
  filled: number;
  total: number;
}

export type SectionStatusReporter = (status: SectionStatus) => void;

export type SectionResetRegistrar = (sectionId: string, reset: () => void) => void;

export type SectionGetValuesRegistrar = (
  sectionId: string,
  getValues: () => unknown,
) => void;

export interface EditSectionProps {
  reportStatus: SectionStatusReporter;
  registerReset?: SectionResetRegistrar;
  registerGetValues?: SectionGetValuesRegistrar;
}
