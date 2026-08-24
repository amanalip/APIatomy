export const DISCRIMINATOR_SPEC = `openapi: 3.0.3
info:
  title: Polymorphic Animals with Discriminator
  description: Demonstrates allOf inheritance, discriminator mapping and oneOf composition for extended polymorphism.
  version: 1.1.0
servers:
  - url: https://api.zoo.example.com/v1
tags:
  - name: animals
    description: Animal polymorphism
paths:
  /animals:
    post:
      tags:
        - animals
      summary: Create an animal
      operationId: createAnimal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Animal'
            examples:
              dog:
                value:
                  petType: dog
                  name: Rex
                  breed: German Shepherd
                  barkVolume: 8
              cat:
                value:
                  petType: cat
                  name: Whiskers
                  livesLeft: 7
      responses:
        '201':
          description: Created animal
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Animal'
    get:
      tags:
        - animals
      summary: List animals with type filter
      operationId: listAnimals
      parameters:
        - name: petType
          in: query
          schema:
            type: string
            enum: [dog, cat, bird]
        - name: sort
          in: query
          schema:
            type: string
            enum: [name, createdAt]
            default: name
      responses:
        '200':
          description: List
          content:
            application/json:
              schema:
                type: object
                required:
                  - items
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/Animal'
  /animals/{id}:
    get:
      tags:
        - animals
      summary: Get animal by id
      operationId: getAnimal
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Animal
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Animal'
        '404':
          description: Not found
components:
  schemas:
    Animal:
      type: object
      required:
        - petType
        - name
      properties:
        petType:
          type: string
          description: Discriminator property
        name:
          type: string
          example: Buddy
        age:
          type: integer
          minimum: 0
          example: 3
      discriminator:
        propertyName: petType
        mapping:
          dog: '#/components/schemas/Dog'
          cat: '#/components/schemas/Cat'
          bird: '#/components/schemas/Bird'
      oneOf:
        - $ref: '#/components/schemas/Dog'
        - $ref: '#/components/schemas/Cat'
        - $ref: '#/components/schemas/Bird'
    Dog:
      allOf:
        - $ref: '#/components/schemas/Animal'
        - type: object
          required:
            - breed
          properties:
            breed:
              type: string
              example: Labrador
            barkVolume:
              type: integer
              minimum: 1
              maximum: 10
              example: 7
            trained:
              type: boolean
              default: false
    Cat:
      allOf:
        - $ref: '#/components/schemas/Animal'
        - type: object
          properties:
            livesLeft:
              type: integer
              minimum: 1
              maximum: 9
              example: 9
            indoor:
              type: boolean
              example: true
            favoriteToy:
              type: string
              nullable: true
              example: laser pointer
    Bird:
      allOf:
        - $ref: '#/components/schemas/Animal'
        - type: object
          required:
            - wingspan
          properties:
            wingspan:
              type: number
              format: float
              example: 0.35
            canFly:
              type: boolean
              example: true
            color:
              type: string
              enum: [red, green, blue, yellow, multicolor]
`;
