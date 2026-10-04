variable "project" {
  description = "Nome do projeto"
  type        = string
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Domínio principal (ex: iselftoken.com)"
  type        = string
}

variable "zone_id" {
  description = "Zone ID da Hosted Zone (criada no main.tf)"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name do ALB"
  type        = string
}

variable "alb_zone_id" {
  description = "Zone ID do ALB"
  type        = string
}

variable "common_tags" {
  description = "Tags comuns a todos os recursos"
  type        = map(string)
  default     = {}
}
