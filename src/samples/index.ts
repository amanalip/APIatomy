import { PETSTORE_SPEC } from './petstore';
import { GITHUB_SPEC } from './github';
import { STRIPE_SPEC } from './stripe';
import { ECOMMERCE_SPEC } from './ecommerce';
import { BROKEN_SPEC } from './broken';
import { MINIMAL_SPEC } from './minimal';

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
    description: 'Deliberate lint issues, broken refs, and missing success responses for diagnostics.',
    spec: BROKEN_SPEC,
  },
  {
    id: 'minimal',
    name: 'Minimal Spec',
    category: 'Simple',
    description: 'Single health-check endpoint with minimal schema footprint.',
    spec: MINIMAL_SPEC,
  },
];
