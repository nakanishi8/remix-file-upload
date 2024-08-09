provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_instance" "ec2" {
  ami                    = var.ami
  instance_type          = "t2.large"
  key_name               = var.key_name

  ebs_block_device {
    device_name = "/dev/xvda"
    volume_size = 32
  }

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras install docker
              sudo service docker start
              sudo systemctl enable docker
              sudo usermod -a -G docker ec2-user
              EOF

  tags = {
    Name = "nakanishi-ec2"
  }

}
