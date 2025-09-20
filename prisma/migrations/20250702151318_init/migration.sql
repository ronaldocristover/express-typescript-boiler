-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groups` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `admin_id` VARCHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 0,
    `start_at` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DONE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `groups_admin_id_idx`(`admin_id`),
    INDEX `groups_status_idx`(`status`),
    INDEX `groups_start_at_idx`(`start_at`),
    INDEX `groups_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_members` (
    `id` VARCHAR(36) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `join_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` VARCHAR(36) NOT NULL,
    `group_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `group_members_user_id_idx`(`user_id`),
    INDEX `group_members_group_id_idx`(`group_id`),
    INDEX `group_members_status_idx`(`status`),
    INDEX `group_members_join_date_idx`(`join_date`),
    INDEX `group_members_created_at_idx`(`created_at`),
    UNIQUE INDEX `group_members_user_id_group_id_key`(`user_id`, `group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_events` (
    `id` VARCHAR(36) NOT NULL,
    `group_id` VARCHAR(36) NOT NULL,
    `period_number` INTEGER NOT NULL,
    `period_description` TEXT NULL,
    `cashout_date` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'DONE', 'CANCELED') NOT NULL DEFAULT 'SCHEDULED',
    `winner_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `group_events_group_id_idx`(`group_id`),
    INDEX `group_events_period_number_idx`(`period_number`),
    INDEX `group_events_status_idx`(`status`),
    INDEX `group_events_cashout_date_idx`(`cashout_date`),
    INDEX `group_events_winner_id_idx`(`winner_id`),
    INDEX `group_events_created_at_idx`(`created_at`),
    UNIQUE INDEX `group_events_group_id_period_number_key`(`group_id`, `period_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_event_payments` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `group_id` VARCHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `method` ENUM('TRANSFER', 'CASH') NOT NULL DEFAULT 'TRANSFER',
    `group_event_id` VARCHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `evidence` TEXT NULL,
    `payment_date` DATETIME(3) NULL,

    INDEX `group_event_payments_user_id_idx`(`user_id`),
    INDEX `group_event_payments_group_id_idx`(`group_id`),
    INDEX `group_event_payments_group_event_id_idx`(`group_event_id`),
    INDEX `group_event_payments_status_idx`(`status`),
    INDEX `group_event_payments_payment_date_idx`(`payment_date`),
    UNIQUE INDEX `group_event_payments_user_id_group_event_id_key`(`user_id`, `group_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_events` ADD CONSTRAINT `group_events_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_event_payments` ADD CONSTRAINT `group_event_payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_event_payments` ADD CONSTRAINT `group_event_payments_group_event_id_fkey` FOREIGN KEY (`group_event_id`) REFERENCES `group_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
