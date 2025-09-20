# RabbitMQ Integration Guide

This application now includes RabbitMQ message broker integration for asynchronous communication between services.

## Important Notes

⚠️ **Database Schema Compatibility**: The current User model in `prisma/schema.prisma` includes a `token` field that supports authentication for the message API endpoints.

⚠️ **Event Publishing**: User CRUD operations automatically publish events to RabbitMQ. The event data includes user information like `id`, `email`, `name`, and timestamps using the actual database field names (`created_at`, `updated_at`).

⚠️ **Message Persistence**: All messages are published with `persistent: true` option, meaning they will survive RabbitMQ server restarts.

## Features

- **Message Publisher Service**: Publish messages to RabbitMQ exchanges
- **Message Consumer Service**: Consume and process messages from queues
- **Automatic Event Publishing**: User CRUD operations automatically publish events
- **REST API**: Endpoints to publish messages via HTTP

## Configuration

Add these environment variables to your `.env` file:

```env
RABBITMQ_URL=amqp://localhost
RABBITMQ_EXCHANGE=app_exchange
RABBITMQ_QUEUE_PREFIX=app_queue
```

## Starting RabbitMQ

Using Docker:
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

Access management UI at: http://localhost:15672 (guest/guest)

## Message Types

### User Events
- `user.created` - Published when a user is created
- `user.updated` - Published when a user is updated
- `user.deleted` - Published when a user is deleted

### System Events
- `system.startup` - System startup events
- `system.shutdown` - System shutdown events
- `system.health_check` - Health check events

### Notifications
- `notification.email` - Email notifications
- `notification.push` - Push notifications
- `notification.sms` - SMS notifications

## API Endpoints

**Note**: The message API endpoints are currently set up without authentication for testing purposes. In production, you should enable the `authMiddleware` in `src/routes/message.route.ts`.

### Authentication (Optional)
To enable authentication, uncomment the authMiddleware in the route file and ensure users have valid tokens in the database:

```typescript
// In src/routes/message.route.ts
import { authMiddleware } from "../middlewares/auth.middleware";

router.post("/publish", authMiddleware, messageController.publishMessage);
```

Then include the `X-API-TOKEN` header in your requests:
```bash
X-API-TOKEN: your-user-token-here
```

### Publish Custom Message
```bash
POST /api/messages/publish
Content-Type: application/json

{
  "routingKey": "custom.event",
  "type": "custom.event",
  "data": {
    "key": "value"
  }
}
```

### Publish Notification
```bash
POST /api/messages/notification
Content-Type: application/json

{
  "recipientId": "user-123",
  "type": "email",
  "title": "Welcome!",
  "message": "Welcome to our platform",
  "data": {
    "template": "welcome_email"
  }
}
```

### Publish System Event
```bash
POST /api/messages/system-event
Content-Type: application/json

{
  "eventType": "maintenance",
  "data": {
    "start": "2023-12-01T10:00:00Z",
    "duration": "2h"
  }
}
```

## Database Integration

The RabbitMQ integration is tightly coupled with the database schema:

### User Events Auto-Publishing
When user operations occur, events are automatically published:

```typescript
// User creation publishes user.created event
const newUser = await userService.create(userData);
// → Publishes: { userId: newUser.id, email: newUser.email, name: newUser.name, createdAt: newUser.created_at }

// User update publishes user.updated event
const updatedUser = await userService.update(userId, updateData);
// → Publishes: { userId: updatedUser.id, email: updatedUser.email, name: updatedUser.name, updated_at: updatedUser.updated_at, changes: [...] }

// User deletion publishes user.deleted event
await userService.remove(userId);
// → Publishes: { userId: user.id, email: user.email, name: user.name, deletedAt: new Date() }
```

### Message Queue Tables (Optional)
For advanced use cases, you might want to add message tracking tables:

```sql
-- Optional: Add message audit table
CREATE TABLE message_audit (
  id VARCHAR(36) PRIMARY KEY,
  message_type VARCHAR(100) NOT NULL,
  routing_key VARCHAR(100) NOT NULL,
  payload JSON,
  status ENUM('published', 'failed') DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_message_type (message_type),
  INDEX idx_routing_key (routing_key),
  INDEX idx_status (status)
);
```

## Programmatic Usage

### Publishing Messages

```typescript
import { messagePublisher } from './services/message-publisher.service';

// Publish user event
await messagePublisher.publishUserEvent('profile_updated', userId, {
  changes: ['email', 'name']
});

// Publish notification
await messagePublisher.publishNotification(userId, 'email', {
  subject: 'Password Reset',
  template: 'password_reset'
});

// Publish system event
await messagePublisher.publishSystemEvent('backup_completed', {
  size: '1.2GB',
  duration: '15min'
});
```

### Custom Message Handlers

To add custom message handlers, edit `src/handlers/message.handlers.ts`:

```typescript
// Register a new handler
messageConsumer.registerHandler('custom.event', async (message) => {
  console.log('Processing custom event:', message.data);
  // Your processing logic here
});
```

## Queue Structure

The application creates these queues:
- `app_queue.user_events` - Handles user.* routing keys
- `app_queue.system_events` - Handles system.* routing keys
- `app_queue.notifications` - Handles notification.* routing keys

## Message Format

All messages follow this structure:

```typescript
interface MessagePayload {
  id: string;           // Unique message ID
  type: string;         // Message type (e.g., "user.created")
  data: any;           // Message payload
  timestamp: Date;      // When message was created
  source: string;       // Source application name
}
```

## Error Handling

- Failed message processing is logged with full context
- Messages are nacked and can be requeued or sent to dead letter queue
- Connection failures trigger automatic reconnection attempts
- Publishing failures are logged but don't crash the application

## Monitoring

- All message operations are logged with structured data
- Check application logs for message processing status
- Use RabbitMQ management UI to monitor queue depths and processing rates

## Environment Setup & Troubleshooting

### Required Environment Variables
Ensure these are set in your `.env` file:
```env
# Database
DATABASE_URL="mysql://root:root@localhost:3307/boiler_express"

# RabbitMQ (Required for message broker)
RABBITMQ_URL=amqp://localhost
RABBITMQ_EXCHANGE=app_exchange
RABBITMQ_QUEUE_PREFIX=app_queue

# Optional but recommended
REDIS_URL=redis://localhost:6380
```

### Common Issues

**1. RabbitMQ Connection Failed**
```bash
# Start RabbitMQ with Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Or install locally on macOS
brew install rabbitmq
brew services start rabbitmq
```

**2. Database Schema Mismatch**
If you see auth middleware errors, ensure the User model has a `token` field:
```sql
-- Check if token field exists
DESCRIBE users;

-- Add if missing
ALTER TABLE users ADD COLUMN token VARCHAR(255);
```

**3. Message Processing Errors**
Check logs for specific error details. Messages are automatically nacked and can be requeued or sent to dead letter exchange.

**4. Performance Monitoring**
- RabbitMQ Management UI: http://localhost:15672 (guest/guest)
- Monitor queue depths and message rates
- Check application logs for processing times

### Testing the Integration

1. **Start RabbitMQ**: `docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management`
2. **Start Application**: `npm run dev`
3. **Create a User**: Make POST request to `/api/users` - watch logs for `user.created` event
4. **Publish Custom Message**: Make POST request to `/api/messages/publish`
5. **Monitor Queues**: Visit http://localhost:15672 to see message flow