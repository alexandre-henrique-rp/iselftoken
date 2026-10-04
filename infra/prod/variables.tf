# =============================================================================
# Variáveis Globais — Ambiente PROD
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
  default     = "prod"
}

variable "my_ip" {
  description = "IP público IPv6 do desenvolvedor para SSH (formato: xxxx::/128)"
  type        = string
}

variable "my_ipv4" {
  description = "IP público IPv4 do desenvolvedor para SSH (formato: x.x.x.x/32)"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domínio principal registrado no Route 53"
  type        = string
  default     = "iselftoken.com"
}

variable "s3_bucket_name" {
  description = "Nome do bucket S3 para uploads"
  type        = string
  default     = "iselftoken-prod-uploads"
}
