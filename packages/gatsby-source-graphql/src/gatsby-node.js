const {
  makeRemoteExecutableSchema,
  transformSchema,
  introspectSchema,
} = require(`graphql-tools`)
const { createHttpLink } = require(`apollo-link-http`)
const fetch = require(`node-fetch`)

const {
  NamespaceUnderFieldTransform,
  StripNonQueryTransform,
} = require(`./transforms`)

exports.sourceNodes = async ({ boundActionCreators, cache }, options) => {
  const { addThirdPartySchema } = boundActionCreators
  const { url, typeName, fieldName } = options

  const cacheKey = `gatsby-source-graphql-schema-${typeName}-${fieldName}`
  let schema = await cache.get(cacheKey)
  if (!schema) {
    const link = createHttpLink({
      uri: url,
      fetch,
    })
    const remoteSchema = makeRemoteExecutableSchema({
      schema: await introspectSchema(link),
      link,
    })

    schema = transformSchema(remoteSchema, [
      new StripNonQueryTransform(),
      new NamespaceUnderFieldTransform({
        typeName: `SWAPI`,
        fieldName: `swapi`,
      }),
    ])
    await cache.set(cacheKey, schema)
  }

  addThirdPartySchema({ schema })
}
