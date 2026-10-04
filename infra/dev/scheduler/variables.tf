variable "project" {
  description = "Nome do projeto"
  type        = string
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
}

variable "ec2_instance_ids" {
  description = "Lista de IDs das instâncias EC2 para schedule"
  type        = list(string)
}

variable "rds_instance_id" {
  description = "Identifier da instância RDS"
  type        = string
}

variable "schedule_start" {
  description = "Cron expression para ligar (UTC). Ex: cron(0 11 ? * MON-FRI *) = 08:00 BRT"
  type        = string
  default     = "cron(0 11 ? * MON-FRI *)"
}

variable "schedule_stop" {
  description = "Cron expression para desligar (UTC). Ex: cron(0 23 ? * MON-FRI *) = 20:00 BRT"
  type        = string
  default     = "cron(0 23 ? * MON-FRI *)"
}

variable "common_tags" {
  description = "Tags comuns a todos os recursos"
  type        = map(string)
  default     = {}
}
