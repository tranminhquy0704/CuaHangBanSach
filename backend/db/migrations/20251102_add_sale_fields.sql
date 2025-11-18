-- Add sale_total (total units available for sale/promo) and sale_sold (units sold in sale)
-- MySQL 8+: use IF NOT EXISTS to avoid errors if columns already exist

ALTER TABLE `product`
  ADD COLUMN IF NOT EXISTS `sale_total` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `sale_sold` INT NOT NULL DEFAULT 0;
