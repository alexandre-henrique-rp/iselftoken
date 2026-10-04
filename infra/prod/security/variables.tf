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
  description = "IP público IPv6 do desenvolvedor para SSH (formato CIDR: xxxx::/128)"
  type        = string
}

variable "my_ipv4" {
  description = "IP público IPv4 do desenvolvedor para SSH (formato CIDR: x.x.x.x/32)"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Tags comuns a todos os recursos"
  type        = map(string)
  default     = {}
}
