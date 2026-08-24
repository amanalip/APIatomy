export const GEO_SPEC = `openapi: 3.0.3
info:
  title: Geospatial Features API
  description: GeoJSON powered features with diverse array and object query serialization styles and path level servers.
  version: 1.3.0
servers:
  - url: https://api.geo.example.com/v1
    description: Primary
tags:
  - name: features
    description: GeoJSON feature operations
  - name: tiles
    description: Map tile serving
paths:
  /features:
    get:
      tags:
        - features
      summary: Search features by bbox and filters
      operationId: searchFeatures
      parameters:
        - name: bbox
          in: query
          required: false
          description: Bounding box as 4 comma separated numbers
          schema:
            type: array
            items:
              type: number
          style: form
          explode: false
          example: [-122.5, 37.7, -122.3, 37.8]
        - name: categories
          in: query
          schema:
            type: array
            items:
              type: string
              enum: [park, water, building, road]
          style: spaceDelimited
          explode: false
        - name: ids
          in: query
          schema:
            type: array
            items:
              type: string
          style: pipeDelimited
          explode: false
        - name: filter
          in: query
          schema:
            type: object
            additionalProperties:
              type: string
          style: form
          explode: true
          description: Object explode like filter[name]=Golden Gate
        - name: filterFlat
          in: query
          schema:
            type: object
            additionalProperties:
              type: string
          style: form
          explode: false
          description: Object delimited
        - name: deepFilter
          in: query
          schema:
            type: object
            additionalProperties:
              type: string
          style: deepObject
          explode: true
          description: Deep object like deepFilter[region]=bay
      responses:
        '200':
          description: Feature collection
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FeatureCollection'
    post:
      tags:
        - features
      summary: Create a feature
      operationId: createFeature
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Feature'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Feature'
  /features/{featureId}:
    get:
      tags:
        - features
      summary: Get feature by id
      operationId: getFeature
      parameters:
        - name: featureId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Feature
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Feature'
        '404':
          description: Not found
      servers:
        - url: https://api.geo.example.com/v1/features
          description: Feature specific server
    delete:
      tags:
        - features
      summary: Delete feature
      operationId: deleteFeature
      parameters:
        - name: featureId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted
  /tiles/{z}/{x}/{y}.png:
    get:
      tags:
        - tiles
      summary: Get map tile
      operationId: getTile
      parameters:
        - name: z
          in: path
          required: true
          schema:
            type: integer
            minimum: 0
            maximum: 22
        - name: x
          in: path
          required: true
          schema:
            type: integer
        - name: y
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: PNG tile
          content:
            image/png:
              schema:
                type: string
                format: binary
components:
  schemas:
    Geometry:
      type: object
      required:
        - type
        - coordinates
      properties:
        type:
          type: string
          enum: [Point, LineString, Polygon, MultiPolygon]
          example: Point
        coordinates:
          type: array
          items:
            type: number
          example: [-122.4194, 37.7749]
    Feature:
      type: object
      required:
        - id
        - geometry
        - properties
      properties:
        id:
          type: string
          example: feat_123
        geometry:
          $ref: '#/components/schemas/Geometry'
        properties:
          type: object
          additionalProperties: true
          properties:
            name:
              type: string
              example: Golden Gate Park
            category:
              type: string
              enum: [park, water, building, road]
            area:
              type: number
              example: 4.12
    FeatureCollection:
      type: object
      required:
        - type
        - features
      properties:
        type:
          type: string
          example: FeatureCollection
        features:
          type: array
          items:
            $ref: '#/components/schemas/Feature'
        total:
          type: integer
          example: 2
`;
