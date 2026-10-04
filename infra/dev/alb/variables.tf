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

variable "subnet_ids" {
  description = "Lista de IDs das subnets públicas (mínimo 2 AZs)"
  type        = list(string)
}

variable "security_group_id" {
  description = "ID do Security Group do ALB"
  type        = string
}

variable "ec2_api_instance_id" {
  description = "Instance ID da EC2 API"
  type        = string
}

variable "ec2_frontend_instance_id" {
  description = "Instance ID da EC2 Frontend"
  type        = string
}

variable "domain_name" {
  description = "Domínio principal (ex: iselftoken.com)"
  type        = string
}

variable "common_tags" {
  description = "Tags comuns a todos os recursos"
  type        = map(string)
  default     = {}
}
