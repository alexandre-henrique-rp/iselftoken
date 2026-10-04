output "vpc_id" {
  description = "ID da VPC"
  value       = aws_vpc.main.id
}

output "subnet_public_a_id" {
  description = "ID da subnet pública AZ-a"
  value       = aws_subnet.public_a.id
}

output "subnet_public_b_id" {
  description = "ID da subnet pública AZ-b"
  value       = aws_subnet.public_b.id
}

output "public_subnet_ids" {
  description = "Lista de IDs das subnets públicas"
  value       = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}
