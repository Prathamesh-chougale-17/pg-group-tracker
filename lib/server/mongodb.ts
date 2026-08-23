import "server-only"
import { MongoClient, type Db } from "mongodb"

const globalMongo = globalThis as typeof globalThis & {
  __pgMongo?: Promise<MongoClient>
}
function connectionUriFromEnvironment() {
  let uri = process.env.MONGODB_URI
  if (!uri) throw new Error("Database is not configured")
  // This Windows runtime blocks SRV lookups. Credentials and the selected
  // database still come exclusively from the server-only environment value.
  if (uri.includes("@andy.e65j96g.mongodb.net")) {
    const separator = uri.includes("?") ? "&" : "?"
    uri = uri
      .replace("mongodb+srv://", "mongodb://")
      .replace(
        "andy.e65j96g.mongodb.net",
        [
          "ac-me0ygnb-shard-00-00.e65j96g.mongodb.net:27017",
          "ac-me0ygnb-shard-00-01.e65j96g.mongodb.net:27017",
          "ac-me0ygnb-shard-00-02.e65j96g.mongodb.net:27017",
        ].join(",")
      )
    uri += `${separator}tls=true&authSource=admin&replicaSet=atlas-142zca-shard-0`
  }
  return uri
}
async function client() {
  globalMongo.__pgMongo ??= new MongoClient(connectionUriFromEnvironment(), {
    maxPoolSize: 10,
  }).connect()
  return globalMongo.__pgMongo
}
export async function getDb(): Promise<Db> {
  return (await client()).db(process.env.MONGODB_APP_DB || "pgGroupTracker")
}
export async function getRawDb(): Promise<Db> {
  return (await client()).db(process.env.MONGODB_SOURCE_DB || "test")
}
export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("students").createIndexes([
      {
        key: { normalizedPhone: 1 },
        unique: true,
        name: "unique_normalized_phone",
      },
      { key: { normalizedName: 1 }, name: "normalized_name" },
      { key: { visited: 1 }, name: "visited" },
      { key: { currentGroup: 1 }, name: "current_group" },
      { key: { gender: 1 }, name: "gender" },
      { key: { isException: 1 }, name: "exception" },
      {
        key: { "source.candidateNameDocumentId": 1 },
        unique: true,
        sparse: true,
        name: "unique_source_name",
      },
      {
        key: { "source.phoneNumberDocumentId": 1 },
        unique: true,
        sparse: true,
        name: "unique_source_phone",
      },
    ]),
    db.collection("reconciliationMatches").createIndexes([
      { key: { candidateNameDocumentId: 1 }, unique: true },
      { key: { phoneNumberDocumentId: 1 }, unique: true },
    ]),
    db.collection("importSessions").createIndex({ status: 1, updatedAt: -1 }),
    db.collection("desktopPairs").createIndex({ pairKey: 1 }, { unique: true }),
  ])
}
