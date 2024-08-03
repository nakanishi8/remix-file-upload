variable "key_name" {
  description = "The name of the key"
  type        = string
}
variable "ami" {
  description = "The name of the ami"
  type        = string
}

variable "subnet_id" {
  description = "The name of the subnet"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
  default     = []
}

variable "private_key" {
  description = "The name of the private_key"
  type        = string
}