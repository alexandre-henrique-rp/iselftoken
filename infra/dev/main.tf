# =============================================================================
# IselfToken — Infraestrutura DEV (AWS)
# =============================================================================
# Arquitetura:
#   - VPC dedicada com 2 subnets públicas (multi-AZ)
#   - EC2 API (t3.small): NestJS + Nginx + Redis + RabbitMQ
#   - EC2 Frontend (t3.micro): React SSR + Nginx
#   - RDS MySQL (db.t3.micro): Single-AZ, público
#   - ALB: HTTPS termination com certificado ACM wildcard
#   - Route 53: dev.iselftoken.com + api-dev.iselftoken.com
#   - Scheduler: EventBridge + Lambda (liga/desliga seg-sex)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }

  # Backend S3 (descomentar quando tiver bucket para state)
  # backend "s3" {
  #   bucket         = "iselftoken-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "iselftoken-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# =============================================================================
# Módulos
# =============================================================================

# --- Network ---
module "network" {
  source = "./network"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  common_tags = local.common_tags
}

# --- Security ---
module "security" {
  source = "./security"

  project     = var.project
  environment = var.environment
  vpc_id      = module.network.vpc_id
  my_ip       = var.my_ip
  common_tags = local.common_tags
}

# --- EC2 API ---
module "ec2_api" {
  source = "./ec2-api"

  project           = var.project
  environment       = var.environment
  instance_type     = "t3.small"
  subnet_id         = module.network.subnet_public_a_id
  security_group_id = module.security.sg_ec2_api_id
  key_pair_name     = module.security.key_pair_name
  common_tags       = local.common_tags
}

# --- EC2 Frontend ---
module "ec2_frontend" {
  source = "./ec2-frontend"

  project           = var.project
  environment       = var.environment
  instance_type     = "t3.micro"
  subnet_id         = module.network.subnet_public_a_id
  security_group_id = module.security.sg_ec2_frontend_id
  key_pair_name     = module.security.key_pair_name
  common_tags       = local.common_tags
}

# --- RDS MySQL ---
module "rds" {
  source = "./rds"

  project           = var.project
  environment       = var.environment
  db_name           = var.db_name
  db_username       = var.db_username
  db_password       = var.db_password
  subnet_ids        = module.network.public_subnet_ids
  security_group_id = module.security.sg_rds_id
  common_tags       = local.common_tags
}

# --- ALB ---
module "alb" {
  source = "./alb"

  project                  = var.project
  environment              = var.environment
  vpc_id                   = module.network.vpc_id
  subnet_ids               = module.network.public_subnet_ids
  security_group_id        = module.security.sg_alb_id
  ec2_api_instance_id      = module.ec2_api.instance_id
  ec2_frontend_instance_id = module.ec2_frontend.instance_id
  domain_name              = var.domain_name
  common_tags              = local.common_tags
}

# --- DNS ---
module "dns" {
  source = "./dns"

  project      = var.project
  environment  = var.environment
  domain_name  = var.domain_name
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
  common_tags  = local.common_tags
}

# --- Scheduler ---
module "scheduler" {
  source = "./scheduler"

  project     = var.project
  environment = var.environment
  ec2_instance_ids = [
    module.ec2_api.instance_id,
    module.ec2_frontend.instance_id
  ]
  rds_instance_id = "${var.project}-${var.environment}-mysql"
  schedule_start  = var.schedule_start
  schedule_stop   = var.schedule_stop
  common_tags     = local.common_tags
}
