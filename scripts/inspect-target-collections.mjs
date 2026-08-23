import { MongoClient } from "mongodb"

let uri = process.env.MONGODB_URI
if (!uri) throw new Error("MONGODB_URI is not set")

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
      ].join(","),
    )
  uri += `${separator}tls=true&authSource=admin&replicaSet=atlas-142zca-shard-0`
}

const client = new MongoClient(uri)
try {
  const db = client.db("cdac")
  const existingCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  )
  const result = {}
  for (const name of ["student", "phone-number"]) {
    result[name] = existingCollections.has(name)
      ? { exists: true, count: await db.collection(name).countDocuments() }
      : { exists: false, count: 0 }
  }
  console.log(JSON.stringify(result, null, 2))
} finally {
  await client.close()
}
