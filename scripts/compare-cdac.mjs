import { readFile } from "node:fs/promises"
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
      ].join(",")
    )
  uri += `${separator}tls=true&authSource=admin&replicaSet=atlas-142zca-shard-0`
}
const [names, phones] = await Promise.all([
  readFile(
    new URL("../admission-candidate-names.json", import.meta.url),
    "utf8"
  ).then(JSON.parse),
  readFile(new URL("../phone-numbers.json", import.meta.url), "utf8").then(
    JSON.parse
  ),
])
const client = new MongoClient(uri)
try {
  const db = client.db(process.env.MONGODB_SOURCE_DB || "test"),
    collection = db.collection("cdac")
  const [rawNames, rawPhones] = await Promise.all([
    collection
      .find({ type: "candidate_name" }, { projection: { name: 1 } })
      .toArray(),
    collection
      .find({ type: "phone_number" }, { projection: { phoneNumber: 1 } })
      .toArray(),
  ])
  const localNames = new Set(names),
    localPhones = new Set(phones),
    dbNames = new Set(rawNames.map((d) => d.name)),
    dbPhones = new Set(rawPhones.map((d) => d.phoneNumber))
  console.log(
    JSON.stringify(
      {
        counts: {
          localNames: names.length,
          mongoNames: rawNames.length,
          localPhones: phones.length,
          mongoPhones: rawPhones.length,
        },
        onlyLocal: {
          names: [...localNames].filter((x) => !dbNames.has(x)),
          phones: [...localPhones].filter((x) => !dbPhones.has(x)),
        },
        onlyMongo: {
          names: [...dbNames].filter((x) => !localNames.has(x)),
          phones: [...dbPhones].filter((x) => !localPhones.has(x)),
        },
      },
      null,
      2
    )
  )
} finally {
  await client.close()
}
