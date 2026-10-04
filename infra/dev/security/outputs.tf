output "sg_ec2_api_id" {
  description = "Security Group da EC2 API"
  value       = aws_security_group.ec2_api.id
}

output "sg_ec2_frontend_id" {
  description = "Security Group da EC2 Frontend"
  value       = aws_security_group.ec2_frontend.id
}

output "sg_rds_id" {
  description = "Security Group do RDS"
  value       = aws_security_group.rds.id
}

output "sg_alb_id" {
  description = "Security Group do ALB"
  value       = aws_security_group.alb.id
}

output "key_pair_name" {
  description = "Nome do Key Pair SSH"
  value       = aws_key_pair.main.key_name
}
