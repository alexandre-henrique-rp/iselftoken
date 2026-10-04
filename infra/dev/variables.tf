# =============================================================================
# Variáveis Globais — Ambiente DEV
# =============================================================================

variable "aws_region" {
  description = "Região AWS"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Nome do projeto"
  type        = string
  default     = "iselftoken"
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "my_ip" {
  description = "IP público do desenvolvedor para SSH e RDS (formato: x.x.x.x/32)"
  type        = string
}

variable "domain_name" {
  description = "Domínio principal registrado no Route 53"
  type        = string
  default     = "iselftoken.com"
}

variable "db_name" {
  description = "Nome do banco de dados MySQL"
  type        = string
  default     = "iselftoken_dev"
}

variable "db_username" {
  description = "Usuário master do RDS"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Senha master do RDS"
  type        = string
  sensitive   = true
}

variable "schedule_start" {
  description = "Cron UTC para ligar. Default: seg-sex 08:00 BRT = 11:00 UTC"
  type        = string
  default     = "cron(0 11 ? * MON-FRI *)"
}

variable "schedule_stop" {
  description = "Cron UTC para desligar. Default: seg-sex 20:00 BRT = 23:00 UTC"
  type        = string
  default     = "cron(0 23 ? * MON-FRI *)"
}
