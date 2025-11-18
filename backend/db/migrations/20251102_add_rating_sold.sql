-- Add rating and sold columns to product table
-- Safe on MySQL 8.0+: uses IF NOT EXISTS to avoid errors if already added

ALTER TABLE `product`
  ADD COLUMN IF NOT EXISTS `rating` DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS `sold` INT NOT NULL DEFAULT 0;
