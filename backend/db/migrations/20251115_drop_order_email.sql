-- Drop deprecated shipping email column from orders
-- IMPORTANT: Back up your database before running this migration.
-- MySQL 8+: DROP COLUMN IF EXISTS is supported.
ALTER TABLE `orders` DROP COLUMN IF EXISTS `email`;
