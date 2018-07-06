const { buildSchema, printSchema } = require(`graphql`)
const {
  makeRemoteExecutableSchema,
  transformSchema,
  introspectSchema,
  RenameTypes,
} = require(`graphql-tools`)
const { createHttpLink } = require(`apollo-link-http`)
const fetch = require(`node-fetch`)
const invariant = require(`invariant`)
const {
  NamespaceUnderFieldTransform,
  StripNonQueryTransform,
} = require(`./transforms`)

exports.sourceNodes = async ({ boundActionCreators, cache }, options) => {
  const { addThirdPartySchema } = boundActionCreators
  const {
    url,
    typeName,
    fieldName,
    headers = {},
    fetchOptions = {},
    createLink,
    createSchema,
  } = options

  invariant(
    typeName && typeName.length > 0,
    `gatsby-source-graphql requires option \`typeName\` to be specified`
  )
  invariant(
    fieldName && fieldName.length > 0,
    `gatsby-source-graphql requires option \`fieldName\` to be specified`
  )
  invariant(
    (url && url.length > 0) || createLink,
    `gatsby-source-graphql requiers either option \`url\` or \`createLink\` callback`
  )

  let link
  if (createLink) {
    link = await createLink(options)
  } else {
    link = createHttpLink({
      uri: url,
      fetch,
      headers,
      fetchOptions,
    })
  }

  let introspectionSchema

  if (createSchema) {
    introspectionSchema = await createSchema(options)
  } else {
    const cacheKey = `gatsby-source-graphql-schema-${typeName}-${fieldName}`
    let sdl = await cache.get(cacheKey)

    if (!sdl) {
      introspectionSchema = await introspectSchema(link)
      sdl = printSchema(introspectionSchema)
    } else {
      introspectionSchema = buildSchema(sdl)
    }

    await cache.set(cacheKey, sdl)
  }

  const remoteSchema = makeRemoteExecutableSchema({
    schema: introspectionSchema,
    link,
  })

  const schema = transformSchema(remoteSchema, [
    new StripNonQueryTransform(),
    new RenameTypes(name => `${typeName}_${name}`),
    new NamespaceUnderFieldTransform({
      typeName: typeName,
      fieldName: fieldName,
    }),
  ])

  addThirdPartySchema({ schema })
}
