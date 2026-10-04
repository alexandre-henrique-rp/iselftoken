# =============================================================================
# Outputs Consolidados — Ambiente PROD
# =============================================================================

# --- URLs ---

output "frontend_url" {
  description = "URL do frontend"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "URL da API"
  value       = "https://api.${var.domain_name}"
}

# --- EC2 ---

output "ec2_api_elastic_ip" {
  description = "IP fixo da EC2 API (para SSH)"
  value       = module.ec2_api.elastic_ip
}

output "ec2_frontend_elastic_ip" {
  description = "IP fixo da EC2 Frontend (para SSH)"
  value       = module.ec2_frontend.elastic_ip
}

# --- S3 ---

output "s3_bucket_name" {
  description = "Nome do bucket S3 de uploads"
  value       = module.s3.bucket_name
}

# --- ALB ---

output "alb_dns_name" {
  description = "DNS do ALB"
  value       = module.alb.alb_dns_name
}

# --- SSH ---

output "ssh_api_command" {
  description = "Comando SSH para EC2 API"
  value       = "ssh -i keys/${var.project}-${var.environment}.pem admin@${module.ec2_api.elastic_ip}"
}

output "ssh_frontend_command" {
  description = "Comando SSH para EC2 Frontend"
  value       = "ssh -i keys/${var.project}-${var.environment}.pem admin@${module.ec2_frontend.elastic_ip}"
}

# --- DNS (delegar na conta Neswork) ---

output "nameservers" {
  description = "Nameservers para configurar na conta Neswork (NS record)"
  value       = aws_route53_zone.main.name_servers
}
