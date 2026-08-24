export const JSONAPI_SPEC = `openapi: 3.0.3
info:
  title: JSON API Compliant Service
  description: JSON API style with sparse fieldsets, included resources, relationships, filtering, sorting and pagination links.
  version: 1.0.0
servers:
  - url: https://api.jsonapi.example.com/v1
tags:
  - name: articles
    description: Articles with JSON API conventions
paths:
  /articles:
    get:
      tags:
        - articles
      summary: List articles with JSON API query features
      operationId: listArticles
      parameters:
        - name: include
          in: query
          schema:
            type: array
            items:
              type: string
              enum: [author, comments, comments.author]
          style: form
          explode: false
          description: Include related resources
          example: author,comments
        - name: fields[articles]
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: false
          description: Sparse fieldset for articles
        - name: fields[people]
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: false
          description: Sparse fieldset for included people
        - name: filter[title]
          in: query
          schema:
            type: string
        - name: sort
          in: query
          schema:
            type: string
            enum: [created, -created, title, -title]
            default: -created
          description: Sort with dash for descending
        - name: page[number]
          in: query
          schema:
            type: integer
            default: 1
        - name: page[size]
          in: query
          schema:
            type: integer
            default: 10
            maximum: 100
      responses:
        '200':
          description: Article collection
          content:
            application/vnd.api+json:
              schema:
                type: object
                required:
                  - data
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Article'
                  included:
                    type: array
                    items:
                      $ref: '#/components/schemas/Person'
                  links:
                    $ref: '#/components/schemas/PaginationLinks'
                  meta:
                    $ref: '#/components/schemas/Meta'
    post:
      tags:
        - articles
      summary: Create article with relationships
      operationId: createArticle
      requestBody:
        required: true
        content:
          application/vnd.api+json:
            schema:
              type: object
              required:
                - data
              properties:
                data:
                  $ref: '#/components/schemas/ArticleCreate'
      responses:
        '201':
          description: Created
          content:
            application/vnd.api+json:
              schema:
                type: object
                required:
                  - data
                properties:
                  data:
                    $ref: '#/components/schemas/Article'
                  included:
                    type: array
                    items:
                      $ref: '#/components/schemas/Person'
  /articles/{id}:
    get:
      tags:
        - articles
      summary: Get article with relationships
      operationId: getArticle
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: include
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: false
      responses:
        '200':
          description: Article
          content:
            application/vnd.api+json:
              schema:
                type: object
                required:
                  - data
                properties:
                  data:
                    $ref: '#/components/schemas/Article'
                  included:
                    type: array
                    items:
                      $ref: '#/components/schemas/Person'
        '404':
          description: Not found
    patch:
      tags:
        - articles
      summary: Update article
      operationId: updateArticle
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/vnd.api+json:
            schema:
              type: object
              required:
                - data
              properties:
                data:
                  $ref: '#/components/schemas/ArticleUpdate'
      responses:
        '200':
          description: Updated
          content:
            application/vnd.api+json:
              schema:
                type: object
                required:
                  - data
                properties:
                  data:
                    $ref: '#/components/schemas/Article'
components:
  schemas:
    Article:
      type: object
      required:
        - type
        - id
        - attributes
        - relationships
      properties:
        type:
          type: string
          example: articles
        id:
          type: string
          example: "1"
        attributes:
          type: object
          required:
            - title
          properties:
            title:
              type: string
              example: JSON API paints my bikeshed
            body:
              type: string
              example: The shortest article ever
            created:
              type: string
              format: date-time
            updated:
              type: string
              format: date-time
        relationships:
          type: object
          properties:
            author:
              type: object
              required:
                - data
              properties:
                data:
                  $ref: '#/components/schemas/ResourceIdentifier'
            comments:
              type: object
              required:
                - data
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/ResourceIdentifier'
        links:
          $ref: '#/components/schemas/ResourceLinks'
    ArticleCreate:
      type: object
      required:
        - type
        - attributes
      properties:
        type:
          type: string
          example: articles
        attributes:
          type: object
          required:
            - title
          properties:
            title:
              type: string
              example: New article
            body:
              type: string
        relationships:
          type: object
          properties:
            author:
              type: object
              required:
                - data
              properties:
                data:
                  $ref: '#/components/schemas/ResourceIdentifier'
    ArticleUpdate:
      type: object
      required:
        - type
        - id
        - attributes
      properties:
        type:
          type: string
          example: articles
        id:
          type: string
          example: "1"
        attributes:
          type: object
          properties:
            title:
              type: string
            body:
              type: string
    Person:
      type: object
      required:
        - type
        - id
        - attributes
      properties:
        type:
          type: string
          example: people
        id:
          type: string
          example: "9"
        attributes:
          type: object
          required:
            - firstName
            - lastName
          properties:
            firstName:
              type: string
              example: Dan
            lastName:
              type: string
              example: Gebhardt
            twitter:
              type: string
              nullable: true
              example: danGeb
    ResourceIdentifier:
      type: object
      required:
        - type
        - id
      properties:
        type:
          type: string
          example: people
        id:
          type: string
          example: "9"
    ResourceLinks:
      type: object
      properties:
        self:
          type: string
          format: uri
          example: https://api.jsonapi.example.com/v1/articles/1
    PaginationLinks:
      type: object
      required:
        - self
      properties:
        self:
          type: string
          format: uri
        first:
          type: string
          format: uri
          nullable: true
        prev:
          type: string
          format: uri
          nullable: true
        next:
          type: string
          format: uri
          nullable: true
        last:
          type: string
          format: uri
          nullable: true
    Meta:
      type: object
      properties:
        total:
          type: integer
          example: 42
`;
