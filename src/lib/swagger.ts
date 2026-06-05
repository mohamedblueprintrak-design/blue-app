import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api', 
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'BluePrint ERP API',
        version: '1.0.0',
        description: 'API documentation for BluePrint ERP SaaS Platform',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [],
    },
  });
  return spec;
};
