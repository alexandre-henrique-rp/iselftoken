/**
 * DTO para RESUBMETER uma InstallmentRequest previamente REJECTED.
 * Mesma forma do CreateInstallmentRequestDto (soma 100% + observacao opcional).
 */
export {
  CreateInstallmentRequestDto as ResubmitInstallmentRequestDto,
  AllocationPercentsDto,
} from './create-installment-request.dto';
