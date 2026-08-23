export const ECOMMERCE_SPEC = `openapi: 3.0.3
info:
  title: Modern E-Commerce Platform API
  description: Multi-tenant e-commerce backend with OAuth2 authentication, product catalogs, cart management, and order fulfillment.
  version: 2.4.0
servers:
  - url: https://api.storecraft.dev/v2
    description: Production Cluster
  - url: https://staging.storecraft.dev/v2
    description: Staging Environment
tags:
  - name: Products
    description: Product catalog and inventory management
  - name: Cart
    description: Shopping cart sessions
  - name: Orders
    description: Checkout and payment processing
  - name: Auth
    description: Token issuing and identity verification
paths:
  /auth/token:
    post:
      tags:
        - Auth
      summary: Obtain OAuth2 Bearer Token
      description: Exchange client credentials or refresh tokens for an access token.
      operationId: getAuthToken
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthTokenRequest'
      responses:
        '200':
          description: Token issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthTokenResponse'
        '401':
          description: Invalid client credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /products:
    get:
      tags:
        - Products
      summary: Search and list products
      description: Retrieve catalog products with multi-facet filtering and pagination.
      operationId: listProducts
      parameters:
        - name: query
          in: query
          description: Text search query
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
        - name: minPrice
          in: query
          schema:
            type: number
        - name: maxPrice
          in: query
          schema:
            type: number
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Paginated product list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedProducts'

    post:
      tags:
        - Products
      summary: Create new product
      description: Adds a new product to the catalog. Requires catalog:write scope.
      operationId: createProduct
      security:
        - OAuth2Bearer:
            - 'catalog:write'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductInput'
      responses:
        '201':
          description: Product successfully created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '400':
          description: Invalid payload schema
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /cart/{cartId}/items:
    post:
      tags:
        - Cart
      summary: Add line item to cart
      description: Appends a product item and quantity into the active user cart.
      operationId: addItemToCart
      parameters:
        - name: cartId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CartItemInput'
      responses:
        '200':
          description: Updated cart state
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cart'

  /orders:
    post:
      tags:
        - Orders
      summary: Place customer order
      description: Finalize checkout, lock inventory, and process payment.
      operationId: createOrder
      security:
        - OAuth2Bearer:
            - 'orders:write'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderCreateInput'
      responses:
        '201':
          description: Order placed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '402':
          description: Payment Required
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  schemas:
    AuthTokenRequest:
      type: object
      required:
        - grant_type
        - client_id
      properties:
        grant_type:
          type: string
          enum: [client_credentials, refresh_token]
        client_id:
          type: string
          example: client_live_89a0
        client_secret:
          type: string
        refresh_token:
          type: string

    AuthTokenResponse:
      type: object
      required:
        - access_token
        - token_type
        - expires_in
      properties:
        access_token:
          type: string
          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        token_type:
          type: string
          example: Bearer
        expires_in:
          type: integer
          example: 3600
        scope:
          type: string
          example: catalog:write orders:write

    Product:
      type: object
      required:
        - id
        - sku
        - title
        - price
        - inventoryCount
      properties:
        id:
          type: string
          format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
        sku:
          type: string
          example: PROD-9981
        title:
          type: string
          example: Wireless Noise-Cancelling Headphones
        description:
          type: string
          example: Premium audio with 40-hour battery life.
        price:
          type: number
          format: double
          example: 249.99
        currency:
          type: string
          example: USD
        inventoryCount:
          type: integer
          example: 45
        tags:
          type: array
          items:
            type: string
          example: [audio, electronics, bluetooth]

    ProductInput:
      type: object
      required:
        - sku
        - title
        - price
      properties:
        sku:
          type: string
        title:
          type: string
        description:
          type: string
        price:
          type: number
        inventoryCount:
          type: integer
          default: 0

    PaginatedProducts:
      type: object
      required:
        - items
        - total
        - page
        - totalPages
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Product'
        total:
          type: integer
          example: 120
        page:
          type: integer
          example: 1
        totalPages:
          type: integer
          example: 6

    CartItem:
      type: object
      required:
        - product
        - quantity
        - unitPrice
      properties:
        product:
          $ref: '#/components/schemas/Product'
        quantity:
          type: integer
          example: 2
        unitPrice:
          type: number
          example: 249.99

    Cart:
      type: object
      required:
        - id
        - items
        - subtotal
      properties:
        id:
          type: string
          format: uuid
        items:
          type: array
          items:
            $ref: '#/components/schemas/CartItem'
        subtotal:
          type: number
          example: 499.98

    CartItemInput:
      type: object
      required:
        - productId
        - quantity
      properties:
        productId:
          type: string
          format: uuid
        quantity:
          type: integer
          minimum: 1
          example: 1

    Order:
      type: object
      required:
        - id
        - cart
        - status
        - totalAmount
      properties:
        id:
          type: string
          format: uuid
          example: ord_987654321
        cart:
          $ref: '#/components/schemas/Cart'
        status:
          type: string
          enum: [pending, paid, shipped, delivered, cancelled]
          example: paid
        totalAmount:
          type: number
          example: 524.98
        trackingNumber:
          type: string
          example: 1Z9999999999999999

    OrderCreateInput:
      type: object
      required:
        - cartId
        - paymentToken
      properties:
        cartId:
          type: string
          format: uuid
        paymentToken:
          type: string
          example: tok_visa_4242
        shippingAddress:
          type: string
          example: 123 Market St, San Francisco, CA 94105

    ErrorResponse:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: INVALID_CREDENTIALS
        message:
          type: string
          example: Provided client credentials could not be verified.
        timestamp:
          type: string
          format: date-time

  securitySchemes:
    OAuth2Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
`;
