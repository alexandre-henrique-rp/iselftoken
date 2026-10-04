# Relatório de Custos — Infraestrutura AWS (Ambiente DEV)

**Data:** 21/08/2026  
**Cotação USD/BRL utilizada:** R$ 5,17 (comercial — 21/08/2026)  
**Região AWS:** us-east-1 (N. Virginia)  
**Conta:** Sem Free Tier ativo (verificar elegibilidade ao plano RDS Free)

---

## Arquitetura Aprovada (2 EC2s)

| # | Recurso | Tipo/Config | Função |
|---|---------|-------------|--------|
| 1 | EC2 - API | t3.small (2 vCPU, 2GB RAM) | NestJS + Nginx + Redis + RabbitMQ (Docker) |
| 2 | EC2 - Frontend | t3.micro (2 vCPU, 1GB RAM) | React SSR + Nginx (Docker) |
| 3 | RDS MySQL | db.t3.micro, 20GB gp3, Single-AZ, público | Banco principal |
| 4 | ALB | Application Load Balancer + 2 Target Groups | HTTPS termination |
| 5 | Elastic IP | 2 unidades (API, Frontend) | IP fixo para SSH |
| 6 | Route 53 | Records A (hosted zone já existente) | DNS |
| 7 | ACM | Wildcard *.iselftoken.com (verificar existente) | Certificado SSL (grátis com ALB) |
| 8 | VPC | Dedicada, 2 subnets públicas (multi-AZ) | Rede isolada |
| 9 | Scheduler | EventBridge + Lambda | Liga/desliga automático |

### URLs
- **Frontend:** `dev.iselftoken.com` → ALB → EC2 Frontend
- **API:** `api-dev.iselftoken.com` → ALB → EC2 API

### Acesso
- **SSH:** Porta 22 liberada apenas para IP do desenvolvedor
- **RDS:** Público, security group liberando IP do desenvolvedor
- **Key Pair:** 1 compartilhada para todas as EC2s

---

## Cenário 1 — EC2s Ligadas 24/7 (730h/mês)

| Recurso | Preço/hora (USD) | Horas/mês | USD/mês | BRL/mês |
|---------|-----------------|-----------|---------|---------|
| EC2 t3.small (API + Redis + RabbitMQ) | $0.0208 | 730 | $15.18 | R$ 78,48 |
| EC2 t3.micro (Frontend) | $0.0104 | 730 | $7.59 | R$ 39,24 |
| RDS db.t3.micro (MySQL) | $0.026 | 730 | $18.98 | R$ 98,13 |
| RDS Storage (20GB gp3) | — | — | $2.30 | R$ 11,89 |
| ALB (fixo por hora) | $0.0252 | 730 | $18.40 | R$ 95,13 |
| ALB LCU (tráfego dev baixo) | ~$0.008/LCU | ~2 LCU | $1.00 | R$ 5,17 |
| Elastic IP × 2 (associados, IPv4) | $0.005 | 730 × 2 | $7.30 | R$ 37,74 |
| Route 53 (hosted zone — já existente) | — | — | $0.00 | R$ 0,00 |
| Route 53 (queries ~100k) | — | — | $0.04 | R$ 0,21 |
| ACM (certificado) | — | — | $0.00 | R$ 0,00 |
| VPC / Subnets / IGW | — | — | $0.00 | R$ 0,00 |
| EventBridge + Lambda (scheduler) | — | — | $0.00 | R$ 0,00 |
| EBS 8GB gp3 × 2 (EC2s) | — | — | $1.44 | R$ 7,44 |
| **TOTAL Cenário 1** | | | **$72.23** | **R$ 373,43** |

---

## Cenário 2 — Com Schedule (Seg-Sex, 12h/dia = ~260h/mês)

> EC2s e RDS desligam automaticamente fora do horário de trabalho.  
> Fins de semana totalmente desligados.

| Recurso | Horas/mês | USD/mês | BRL/mês |
|---------|-----------|---------|---------|
| EC2 t3.small (API + Redis + RabbitMQ) | 260 | $5.41 | R$ 27,97 |
| EC2 t3.micro (Frontend) | 260 | $2.70 | R$ 13,96 |
| RDS db.t3.micro (MySQL) | 260 | $6.76 | R$ 34,95 |
| RDS Storage (20GB gp3) | — | $2.30 | R$ 11,89 |
| ALB (roda 24/7 para manter DNS) | 730 | $18.40 | R$ 95,13 |
| ALB LCU | — | $0.50 | R$ 2,59 |
| Elastic IP × 2 (cobram 24/7 — IPv4) | 730 × 2 | $7.30 | R$ 37,74 |
| Route 53 | — | $0.04 | R$ 0,21 |
| EBS 8GB gp3 × 2 | — | $1.44 | R$ 7,44 |
| **TOTAL Cenário 2** | | **$44.85** | **R$ 231,87** |

---

## Cenário 3 — Schedule + Sem ALB (Certbot/Let's Encrypt no Nginx)

> HTTPS gerenciado pelo Certbot diretamente no Nginx das EC2s.  
> Elimina ALB (~$19/mês). Route 53 aponta direto para os Elastic IPs.

| Recurso | USD/mês | BRL/mês |
|---------|---------|---------|
| EC2 t3.small (260h) | $5.41 | R$ 27,97 |
| EC2 t3.micro (260h) | $2.70 | R$ 13,96 |
| RDS db.t3.micro (260h) + Storage | $9.06 | R$ 46,84 |
| Elastic IPs × 2 (730h) | $7.30 | R$ 37,74 |
| Route 53 | $0.04 | R$ 0,21 |
| EBS 8GB gp3 × 2 | $1.44 | R$ 7,44 |
| **TOTAL Cenário 3** | **$25.95** | **R$ 134,16** |

---

## Comparativo Final

| Cenário | USD/mês | BRL/mês | Economia vs 24/7 |
|---------|---------|---------|-------------------|
| **1 — 24/7 (ALB)** | $72.23 | R$ 373,43 | — |
| **2 — Schedule 12h + ALB** ⭐ | $44.85 | R$ 231,87 | 38% |
| **3 — Schedule 12h + Certbot** | $25.95 | R$ 134,16 | 64% |

> ⭐ **Cenário escolhido:** Cenário 2 (Schedule + ALB) — a ser confirmado horário do schedule.

---

## Consumo de Memória — EC2 API (t3.small = 2GB)

| Processo | RAM estimada |
|----------|-------------|
| NestJS (Docker) | 200-300MB |
| Nginx | 50MB |
| Redis | 50-100MB |
| RabbitMQ | 150-300MB |
| Sistema operacional | 200MB |
| **Total estimado** | **650MB - 950MB** |
| **Disponível** | **2048MB ✅** |

---

## Observações Importantes

### Sobre o RDS "Free Plan"
- A AWS lançou em julho/2025 um novo programa que oferece até $200 em créditos.
- Se a conta for elegível, o RDS pode ficar sem custo por até 6 meses.
- Verificar: AWS Console → Billing → Free Tier.

### Custos NÃO incluídos
- **Data transfer out** (~$0.09/GB após 100GB, dev usa pouco)
- **Snapshots/Backups** extras do RDS (7 dias inclusos)
- **CloudWatch logs** (primeiros 5GB grátis)

### Sobre Elastic IPs
- Desde fev/2024, a AWS cobra $0.005/h por todo IP público IPv4, associado ou não.
- Com 2 EIPs rodando 24/7: $7.30/mês fixo independente do schedule.

---

## Estrutura Terraform Planejada

```
infra/dev/
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars
├── network/          → VPC, subnets, IGW, route tables
├── security/         → Security groups, key pair
├── ec2-api/          → EC2 t3.small + EIP + user-data
├── ec2-frontend/     → EC2 t3.micro + EIP + user-data
├── rds/              → RDS MySQL db.t3.micro
├── alb/              → ALB + Target Groups + ACM
├── dns/              → Route 53 records
└── scheduler/        → EventBridge + Lambda (start/stop)
```

---

## Fontes de Preço (consultadas em 21/08/2026)

- [EC2 On-Demand Pricing](https://aws.amazon.com/ec2/pricing/on-demand/) — t3.micro: $0.0104/h, t3.small: $0.0208/h
- [RDS MySQL Pricing](https://www.economize.cloud/resources/aws/pricing/rds/db.t3.micro/) — db.t3.micro: ~$0.026/h ($21.90/mês)
- [ALB Pricing](https://cloudchipr.com/blog/aws-load-balancer-pricing) — $0.0252/h + $0.008/LCU-h
- [Public IPv4 Pricing](https://repost.aws/knowledge-center/vpc-optimize-ipv4-usage) — $0.005/IP/h
- [Route 53 Pricing](https://aws.amazon.com/route53/pricing/) — $0.50/hosted zone + $0.40/1M queries
- [RDS Free Plan](https://aws.amazon.com/rds/free/) — até $200 em créditos (contas novas pós jul/2025)
- Cotação USD/BRL: R$ 5,17 (21/08/2026)

*Content was rephrased for compliance with licensing restrictions.*
