/* @flow */
const _ = require(`lodash`)
const { GraphQLSchema, GraphQLObjectType } = require(`graphql`)
const {
  makeRemoteExecutableSchema,
  mergeSchemas,
  transformSchema,
  introspectSchema,
} = require(`graphql-tools`)
import { createHttpLink } from "apollo-link-http"
import fetch from "node-fetch"

const {
  NamespaceUnderFieldTransform,
  StripNonQueryTransform,
} = require(`./transforms`)
const buildNodeTypes = require(`./build-node-types`)
const buildNodeConnections = require(`./build-node-connections`)
const { store } = require(`../redux`)
const invariant = require(`invariant`)

module.exports = async () => {
  const typesGQL = await buildNodeTypes()
  const connections = buildNodeConnections(_.values(typesGQL))

  // Pull off just the graphql node from each type object.
  const nodes = _.mapValues(typesGQL, `node`)

  invariant(!_.isEmpty(nodes), `There are no available GQL nodes`)
  invariant(!_.isEmpty(connections), `There are no available GQL connections`)

  const link = createHttpLink({
    uri: `https://api.graphcms.com/simple/v1/swapi`,
    fetch,
  })
  const remoteSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(link),
    link,
  })

  const transformedSchema = transformSchema(remoteSchema, [
    new StripNonQueryTransform(),
    new NamespaceUnderFieldTransform({
      typeName: `SWAPI`,
      fieldName: `swapi`,
    }),
  ])

  const gatsbySchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: `RootQueryType`,
      fields: { ...connections, ...nodes },
    }),
  })

  const schema = mergeSchemas({
    schemas: [gatsbySchema, transformedSchema],
  })

  store.dispatch({
    type: `SET_SCHEMA`,
    payload: schema,
  })
}
