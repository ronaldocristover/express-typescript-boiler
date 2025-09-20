-- CreateIndex
CREATE INDEX `users_email_idx` ON `users`(`email`);

-- CreateIndex
CREATE INDEX `users_is_active_idx` ON `users`(`is_active`);

-- CreateIndex
CREATE INDEX `users_created_at_idx` ON `users`(`created_at`);
