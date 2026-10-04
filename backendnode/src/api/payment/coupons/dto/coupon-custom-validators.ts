/**
 * Custom validators para cupons.
 */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validador customizado para percentual de cupom.
 * Whitelist: [20, 30, 50, 60, 100]
 */
@ValidatorConstraint({ name: 'isCouponPercent', async: false })
export class IsCouponPercentConstraint implements ValidatorConstraintInterface {
  private readonly validPercentages = [20, 30, 50, 60, 100];

  validate(value: any): boolean {
    return typeof value === 'number' && this.validPercentages.includes(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um dos valores permitidos: 20, 30, 50, 60 ou 100`;
  }
}

/**
 * Decorator para validar percentual de cupom.
 * Uso: @IsCouponPercent()
 */
export function IsCouponPercent(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCouponPercentConstraint,
    });
  };
}

/**
 * Validador customizado para código de cupom.
 * Regex: ^[A-Z0-9_-]{3,32}$
 */
@ValidatorConstraint({ name: 'isCouponCode', async: false })
export class IsCouponCodeConstraint implements ValidatorConstraintInterface {
  private readonly regex = /^[A-Z0-9_-]{3,32}$/;

  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    // Normaliza para uppercase antes de validar
    const normalized = value.toUpperCase().trim();
    return this.regex.test(normalized);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ter 3-32 caracteres alfanuméricos [A-Z0-9_-]`;
  }
}

/**
 * Decorator para validar código de cupom.
 * Uso: @IsCouponCode()
 */
export function IsCouponCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCouponCodeConstraint,
    });
  };
}
