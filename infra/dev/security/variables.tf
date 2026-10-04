variable "project" {
  description = "Nome do projeto"
  type        = string
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID da VPC"
  type        = string
}

variable "my_ip" {
  description = "IP público do desenvolvedor para SSH e acesso ao RDS (formato CIDR: x.x.x.x/32)"
  type        = string
}

variable "common_tags" {
  description = "Tags comuns a todos os recursos"
  type        = map(string)
  default     = {}
}
