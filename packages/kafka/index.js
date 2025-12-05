// Shared Kafka helpers package.
// Exports the Kafka producer/admin implementations that were previously
// defined under services/lib so that collectors and services can depend on
// a stable @purplesector/kafka API.

module.exports = {
  KafkaProducer: require('./kafka-producer'),
  KafkaAdmin: require('./kafka-admin'),
  KafkaConsumer: require('./kafka-consumer'),
};
