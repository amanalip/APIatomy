export const STRIPE_SPEC = `openapi: 3.0.3
info:
  title: Stripe API (Subset)
  description: Subset of the Stripe API focusing on Payments, Customers, and Polymorphic Payment Methods.
  version: 2024-06-20
servers:
  - url: https://api.stripe.com/v1
    description: Stripe Production
tags:
  - name: PaymentIntents
    description: Core payment transaction flows
  - name: Customers
    description: Customer profiles and saved payment credentials
paths:
  /payment_intents:
    post:
      tags:
        - PaymentIntents
      summary: Create a PaymentIntent
      description: Creates a PaymentIntent object to track and complete a payment.
      operationId: createPaymentIntent
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              $ref: '#/components/schemas/PaymentIntentCreateRequest'
      responses:
        '200':
          description: Successful creation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentIntent'
        '400':
          description: Bad request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StripeError'

  /payment_intents/{intent}:
    get:
      tags:
        - PaymentIntents
      summary: Retrieve a PaymentIntent
      description: Retrieves the details of an existing PaymentIntent.
      operationId: getPaymentIntent
      parameters:
        - name: intent
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful retrieval
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentIntent'
        '404':
          description: Not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StripeError'

  /customers:
    post:
      tags:
        - Customers
      summary: Create a customer
      description: Creates a new customer object.
      operationId: createCustomer
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CustomerCreateRequest'
      responses:
        '200':
          description: Customer created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'

components:
  schemas:
    CardPaymentMethod:
      type: object
      required:
        - brand
        - last4
        - exp_month
        - exp_year
      properties:
        brand:
          type: string
          example: visa
        last4:
          type: string
          example: '4242'
        exp_month:
          type: integer
          example: 12
        exp_year:
          type: integer
          example: 2028
        funding:
          type: string
          example: credit

    BankTransferPaymentMethod:
      type: object
      required:
        - bank_name
        - routing_number
        - account_number_last4
      properties:
        bank_name:
          type: string
          example: Chase
        routing_number:
          type: string
          example: '110000000'
        account_number_last4:
          type: string
          example: '6789'

    PaymentMethodDetails:
      type: object
      description: Polymorphic payment method container
      properties:
        type:
          type: string
          enum: [card, bank_transfer]
        data:
          oneOf:
            - $ref: '#/components/schemas/CardPaymentMethod'
            - $ref: '#/components/schemas/BankTransferPaymentMethod'

    PaymentIntent:
      type: object
      required:
        - id
        - object
        - amount
        - currency
        - status
      properties:
        id:
          type: string
          example: pi_3MtwBwLkdIwHu7ix28a3tqPa
        object:
          type: string
          example: payment_intent
        amount:
          type: integer
          description: Amount in cents
          example: 2000
        currency:
          type: string
          example: usd
        status:
          type: string
          enum: [requires_payment_method, requires_confirmation, requires_action, processing, succeeded, canceled]
          example: succeeded
        customer:
          $ref: '#/components/schemas/Customer'
        payment_method:
          $ref: '#/components/schemas/PaymentMethodDetails'
        created:
          type: integer
          example: 1680877000

    PaymentIntentCreateRequest:
      type: object
      required:
        - amount
        - currency
      properties:
        amount:
          type: integer
          example: 2000
        currency:
          type: string
          example: usd
        customer_id:
          type: string
          example: cus_NffrFeUfNV2Hib
        description:
          type: string
          example: Subscription fee

    Customer:
      type: object
      required:
        - id
        - object
      properties:
        id:
          type: string
          example: cus_NffrFeUfNV2Hib
        object:
          type: string
          example: customer
        email:
          type: string
          format: email
          example: jenny.rosen@example.com
        name:
          type: string
          example: Jenny Rosen
        balance:
          type: integer
          example: 0
        created:
          type: integer
          example: 1680877000

    CustomerCreateRequest:
      type: object
      properties:
        email:
          type: string
          example: user@example.com
        name:
          type: string
          example: Jane Doe
        phone:
          type: string
          example: '+15555555555'

    StripeError:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - message
            - type
          properties:
            message:
              type: string
              example: No such payment_intent: pi_12345
            type:
              type: string
              example: invalid_request_error
            code:
              type: string
              example: resource_missing
`;
