CREATE DATABASE IF NOT EXISTS church_erp_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS church_erp_stg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS church_erp_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'church_erp'@'%' IDENTIFIED BY 'change_me';

GRANT ALL PRIVILEGES ON church_erp_dev.* TO 'church_erp'@'%';
GRANT ALL PRIVILEGES ON church_erp_stg.* TO 'church_erp'@'%';
GRANT ALL PRIVILEGES ON church_erp_prod.* TO 'church_erp'@'%';

FLUSH PRIVILEGES;
