variable "project" {
  description = "Nome do projeto"
  type        = string
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "Região AWS"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block da VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "subnet_public_a_cidr" {
  description = "CIDR da subnet pública AZ-a"
  type        = string
  default     = "10.1.1.0/24"
}

variable "subnet_public_b_cidr" {
  description = "CIDR da subnet pública AZ-b"
  type        = string
  default     = "10.1.2.0/24"
}

variable "common_tags" {
  description = "Tags comuns a todos os recursos"
  type        = map(string)
  default     = {}
}
