import { PETSTORE_SPEC } from './petstore';
import { GITHUB_SPEC } from './github';
import { STRIPE_SPEC } from './stripe';
import { ECOMMERCE_SPEC } from './ecommerce';
import { BROKEN_SPEC } from './broken';
import { MINIMAL_SPEC } from './minimal';
import { SWAGGER_LEGACY_SPEC } from './swaggerLegacy';
import { WEBHOOKS_SPEC } from './webhooks';
import { DISCRIMINATOR_SPEC } from './discriminator';
import { IOT_SPEC } from './iot';
import { GEO_SPEC } from './geo';
import { FINANCIAL_SPEC } from './financial';
import { CIRCULAR_SPEC } from './circular';
import { MULTIPART_SPEC } from './multipart';
import { JSONAPI_SPEC } from './jsonapi';

export interface SampleSpecOption {
  id: string;
  name: string;
  category: string;
  description: string;
  spec: string;
}

export const SAMPLE_SPECS: readonly SampleSpecOption[] = [
  {
    id: 'petstore',
    name: 'Petstore (OpenAPI 3.0)',
    category: 'Standard',
    description: 'Classic Petstore with CRUD operations, models, tags, and OAuth2 security.',
    spec: PETSTORE_SPEC,
  },
  {
    id: 'github',
    name: 'GitHub API (Subset)',
    category: 'Real-world',
    description: 'Repositories, issues, users, and nested schema references.',
    spec: GITHUB_SPEC,
  },
  {
    id: 'stripe',
    name: 'Stripe API (Subset)',
    category: 'Polymorphic',
    description: 'PaymentIntents, Customers, and oneOf polymorphic payment methods.',
    spec: STRIPE_SPEC,
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Platform',
    category: 'Comprehensive',
    description: 'Multi-auth, paginated catalogs, carts, orders, and nested checkout models.',
    spec: ECOMMERCE_SPEC,
  },
  {
    id: 'broken',
    name: 'Broken / Warning-Heavy',
    category: 'Diagnostics',
    description:
      'Deliberate lint issues, broken refs, and missing success responses for diagnostics.',
    spec: BROKEN_SPEC,
  },
  {
    id: 'minimal',
    name: 'Minimal Spec',
    category: 'Simple',
    description: 'Single health-check endpoint with minimal schema footprint.',
    spec: MINIMAL_SPEC,
  },
  {
    id: 'swagger-legacy',
    name: 'Swagger 2.0 Legacy',
    category: 'Legacy',
    description:
      'Swagger 2.0 with host, basePath, schemes, collectionFormat csv and multi, file params and OAuth2 implicit.',
    spec: SWAGGER_LEGACY_SPEC,
  },
  {
    id: 'webhooks',
    name: 'Webhooks (OpenAPI 3.1)',
    category: 'Event-driven',
    description: 'OpenAPI 3.1 webhooks, callbacks, binary payloads and nullable types.',
    spec: WEBHOOKS_SPEC,
  },
  {
    id: 'discriminator',
    name: 'Discriminator Animals',
    category: 'Inheritance',
    description:
      'allOf inheritance with discriminator mapping and oneOf polymorphism for Dog, Cat and Bird.',
    spec: DISCRIMINATOR_SPEC,
  },
  {
    id: 'iot',
    name: 'IoT Fleet',
    category: 'IoT',
    description:
      'Device registry with server variables, map schemas, header and cookie params, deepObject and allowReserved.',
    spec: IOT_SPEC,
  },
  {
    id: 'geo',
    name: 'Geospatial GeoJSON',
    category: 'Geo',
    description:
      'GeoJSON features with array styles form, spaceDelimited, pipeDelimited and object styles deepObject.',
    spec: GEO_SPEC,
  },
  {
    id: 'financial',
    name: 'Open Banking',
    category: 'Financial',
    description:
      'Banking accounts and payments with multiple auth, idempotency keys, JWS signatures and pagination links.',
    spec: FINANCIAL_SPEC,
  },
  {
    id: 'circular',
    name: 'Circular Org Graph',
    category: 'Graph',
    description:
      'Deep circular and self referencing User, Team and Project schemas to test graph reuse and cycle guards.',
    spec: CIRCULAR_SPEC,
  },
  {
    id: 'multipart',
    name: 'File Multipart',
    category: 'Upload',
    description:
      'multipart form data, urlencoded, octet-stream, binary and byte formats with single and multiple file arrays.',
    spec: MULTIPART_SPEC,
  },
  {
    id: 'jsonapi',
    name: 'JSON API',
    category: 'JSON API',
    description:
      'JSON API with sparse fieldsets, included resources, relationships, filtering, sorting and pagination.',
    spec: JSONAPI_SPEC,
  },
];
