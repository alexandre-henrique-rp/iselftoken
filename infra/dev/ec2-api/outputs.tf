output "instance_id" {
  description = "ID da instância EC2 API"
  value       = aws_instance.api.id
}

output "elastic_ip" {
  description = "Elastic IP da EC2 API"
  value       = aws_eip.api.public_ip
}

output "private_ip" {
  description = "IP privado da EC2 API"
  value       = aws_instance.api.private_ip
}
