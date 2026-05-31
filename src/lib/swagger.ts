import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BluePrint ERP API',
      version: '1.0.0',
      description:
        'Comprehensive API documentation for BluePrint ERP — Engineering Consultancy Management System. ' +
        'All endpoints require authentication via HTTP-only cookies unless explicitly marked as public.',
      contact: {
        name: 'BluePrint ERP Support',
        url: 'https://blueprint-erp.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server (relative)',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'blue_token',
          description: 'HTTP-only JWT access token cookie set after login',
        },
        refreshCookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'blue_refresh_token',
          description: 'HTTP-only refresh token cookie for token renewal',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
          required: ['error'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Validation error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
              description: 'Detailed validation errors',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, description: 'Current page number' },
            limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Items per page' },
            total: { type: 'integer', description: 'Total items count' },
            totalPages: { type: 'integer', description: 'Total number of pages' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'engineer', 'viewer'] },
            department: { type: 'string' },
            position: { type: 'string' },
            avatar: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            twoFactorEnabled: { type: 'boolean' },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/app/api/**/*.ts'],
};

export function getSwaggerSpec() {
  return swaggerJsdoc(options);
}

export default options;
