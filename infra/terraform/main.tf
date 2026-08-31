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
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── 1. Fetch Default VPC & Subnet ──────────────────────────────────────────────
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── 2. Fetch Latest Ubuntu 24.04 LTS ARM64 AMI (Optimized for Graviton) ────────
data "aws_ami" "ubuntu_arm64" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── 3. Security Group (HTTP :80, HTTPS :443, SSH :22) ─────────────────────────
resource "aws_security_group" "cropx_sg" {
  name        = "${var.project_name}-sg"
  description = "Allow HTTP, HTTPS, and SSH traffic for CropX"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    description = "HTTP web traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS secure web traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    description = "SSH administrative & CI/CD access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-security-group"
  }
}

# ── 4. Automated SSH Key Pair Generation ──────────────────────────────────────
resource "tls_private_key" "cropx_key" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "cropx_deployer" {
  key_name   = "${var.project_name}-deployer-key"
  public_key = tls_private_key.cropx_key.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.cropx_key.private_key_openssh
  filename        = "${path.module}/cropx_key.pem"
  file_permission = "0600"
}

# ── 5. EC2 Instance (t4g.small ARM64 Graviton2) ────────────────────────────────
resource "aws_instance" "cropx_server" {
  ami                    = data.aws_ami.ubuntu_arm64.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.cropx_deployer.key_name
  vpc_security_group_ids = [aws_security_group.cropx_sg.id]
  subnet_id              = data.aws_subnets.default.ids[0]

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
    tags = {
      Name = "${var.project_name}-root-volume"
    }
  }

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "${var.project_name}-production-server"
  }
}

# ── 6. Static Elastic IP ───────────────────────────────────────────────────────
resource "aws_eip" "cropx_ip" {
  instance = aws_instance.cropx_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-elastic-ip"
  }
}
