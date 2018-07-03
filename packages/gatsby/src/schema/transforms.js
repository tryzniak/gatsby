const { GraphQLObjectType, GraphQLSchema } = require(`graphql`)
const {
  visitSchema,
  VisitSchemaKind,
} = require(`graphql-tools/dist/transforms/visitSchema`)
const {
  createResolveType,
  fieldMapToFieldConfigMap,
} = require(`graphql-tools/dist/stitching/schemaRecreation`)

class NamespaceUnderFieldTransform {
  constructor({ typeName, fieldName }) {
    this.typeName = typeName
    this.fieldName = fieldName
  }

  transformSchema(schema) {
    const query = schema.getQueryType()
    const nestedType = new GraphQLObjectType({
      name: this.typeName,
      fields: () =>
        fieldMapToFieldConfigMap(
          query.getFields(),
          createResolveType(typeName => schema.getType(typeName)),
          true
        ),
    })
    const newQuery = new GraphQLObjectType({
      name: query.name,
      fields: {
        [this.fieldName]: {
          type: nestedType,
          resolve() {
            return {}
          },
        },
      },
    })
    return new GraphQLSchema({
      query: newQuery,
    })
  }
}

class StripNonQueryTransform {
  transformSchema(schema) {
    return visitSchema(schema, {
      [VisitSchemaKind.MUTATION]() {
        return null
      },
      [VisitSchemaKind.SUBSCRIPTION]() {
        return null
      },
    })
  }
}

module.exports = {
  NamespaceUnderFieldTransform,
  StripNonQueryTransform,
}
