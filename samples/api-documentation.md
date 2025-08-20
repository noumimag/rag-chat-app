# API Documentation

## Overview

This document describes the REST API endpoints for the User Management System. The API provides comprehensive user management capabilities including authentication, profile management, and administrative functions.

## Base URL

```
https://api.usermanagement.com/v1
```

## Authentication

All API requests require authentication using Bearer tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-access-token>
```

### Getting Access Tokens

To obtain an access token, use the authentication endpoint:

```http
POST /auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securepassword123"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "expires_in": 3600
}
```

## User Management Endpoints

### Get User Profile

Retrieves the current user's profile information.

```http
GET /users/profile
```

**Response:**

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

### Update User Profile

Updates the current user's profile information.

```http
PUT /users/profile
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1-555-0123"
}
```

**Response:**

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1-555-0123",
  "role": "user",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T15:00:00Z"
}
```

### List Users (Admin Only)

Retrieves a list of all users in the system.

```http
GET /admin/users?page=1&limit=20&role=user
```

**Query Parameters:**

- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of users per page (default: 20, max: 100)
- `role` (optional): Filter by user role
- `search` (optional): Search by name or email

**Response:**

```json
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns error details in the response body.

### Common Error Codes

- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute
- **User management endpoints**: 100 requests per minute
- **Admin endpoints**: 50 requests per minute

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

## Pagination

List endpoints support pagination using the `page` and `limit` query parameters. The response includes pagination metadata to help with navigation.

## Webhooks

The API supports webhooks for real-time notifications. Configure webhook endpoints to receive notifications about user events.

### Supported Events

- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deleted` - User account deleted
- `user.login` - User logged in

### Webhook Payload

```json
{
  "event": "user.created",
  "timestamp": "2024-01-20T15:00:00Z",
  "data": {
    "user_id": "user_123",
    "email": "user@example.com"
  }
}
```

## SDKs and Libraries

Official SDKs are available for popular programming languages:

- **JavaScript/Node.js**: `npm install @usermanagement/api`
- **Python**: `pip install usermanagement-api`
- **Java**: Maven dependency available
- **PHP**: Composer package available

## Support

For API support and questions:

- **Documentation**: https://docs.usermanagement.com
- **Email**: api-support@usermanagement.com
- **Slack**: #api-support channel
- **GitHub Issues**: https://github.com/usermanagement/api/issues

## Changelog

### Version 1.0.0 (2024-01-15)

- Initial API release
- User authentication and management
- Admin functions
- Webhook support

### Version 1.1.0 (2024-01-20)

- Added user search functionality
- Enhanced error handling
- Rate limiting improvements
- Additional webhook events
