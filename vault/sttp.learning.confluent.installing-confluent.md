---
id: EllzM6lP8X2mOK9W08CZx
title: Installing Confluent
desc: ''
updated: 1638706734607
created: 1638703296238
---

All installations below are for Ubuntu

## Install CP via Tarball for Local Development

Installation and configuration
```bash
## Install dependencies
sudo apt-get install openjdk-11-jre-headless

## Download and extract package
curl -O http://packages.confluent.io/archive/6.0/confluent-6.0.0.tar.gz
tar xzf confluent-6.0.0.tar.gz

## Configure CLI
export CONFLUENT_HOME=${HOME}/confluent-6.0.0 \
    && echo "export CONFLUENT_HOME=$CONFLUENT_HOME" >> ~/.bashrc
echo "export PATH=$CONFLUENT_HOME/bin:${PATH}" >> ~/.bashrc
~/confluent-6.0.0/bin/confluent completion bash | sudo tee /etc/bash_completion.d/confluent \
    && echo "source /etc/bash_completion.d/confluent" >> ~/.bashrc \
    && source ~/.bashrc
```

Starting services
```bash
## Start services
confluent local services start
```
> Check https://docs.confluent.io/confluent-cli/current/command-reference/local/index.html

Produce and Consume Avro data
```bash
## create Avro schema
cat <<EOF > ~/temperature_reading.avsc
{
 "namespace": "io.confluent.examples",
 "type": "record",
 "name": "temperature_reading",
 "fields": [
    {"name": "city", "type": "string"},
    {"name": "temp", "type": "int", "doc": "temperature in Fahrenheit"} ]
}
EOF

## Start a command line producer to produce events
confluent local services \
    kafka produce temperatures \
    --property parse.key=true --property key.separator=, \
    --property key.serializer=org.apache.kafka.common.serialization.StringSerializer \
    --value-format avro \
    --property value.schema.file=$HOME/temperature_reading.avsc


## In a new window, setup command line consumer
confluent local services \
    kafka consume temperatures \
    --property print.key=true \
    --property key.deserializer=org.apache.kafka.common.serialization.StringDeserializer \
    --value-format avro
```

Sample correct input
```json
alameda,{"city":"alameda","temp":58}
ashland,{"city":"ashland","temp":62}
nairobi,{"city":"nairobi","temp":65}
sydney,{"city":"sydney","temp":75}
```

Sample incorrect value
```json
jaipur,{"city":"jaipur","temp":"87"}
```

Destroy local CP
```bash
confluent local destroy
```

Read more?

- https://docs.confluent.io/platform/current/installation/installing_cp/zip-tar.html#get-the-software
- https://docs.confluent.io/confluent-cli/current/command-reference/local/services/kafka/confluent_local_services_kafka_produce.html
- https://docs.confluent.io/confluent-cli/current/command-reference/local/services/kafka/confluent_local_services_kafka_consume.html


## Install CP via Package Manager

- https://docs.confluent.io/platform/current/installation/installing_cp/overview.html#on-premises-deployments
- https://docs.confluent.io/platform/current/installation/installing_cp/deb-ubuntu.html#systemd-ubuntu-debian-install
- https://www.loggly.com/ultimate-guide/using-systemctl/

## Explore run-class Scripts and Environment Variables

![](/assets/images/2021-12-05-16-08-51.png)

1. `systemd` invokes the `kafka-server-start` script, which takes a configuration file `/etc/kafka/server.properties` as an argument.

1. The `kafka-server-start` invokes the `kafka-run-class` script, which does most of the "heavy lifting".

1. In the `kafka-run-class` script, environment variables are used to customize the JVM options passed to the `java` command.

1. The `CLASSPATH` variable is used to load classes from `.jar` files located under various subdirectories of `/usr/share/java/`

1. The `java` process starts and server logs are output to various `.log` files under `/var/log/kafka/`.

Read more?
- JVM tuning - https://docs.confluent.io/platform/current/kafka/deployment.html#jvm
- Scripts - https://github.com/apache/kafka/tree/trunk/bin

## Property files

- ZooKeeper: `/etc/kafka/zookeeper.properties`
- Kafka Broker: `/etc/kafka/server.properties`
- Schema Registry: `/etc/schema-registry/schema-registry.properties`
- ksqlDB: `/etc/ksqldb/ksql-server.properties`
- Kafka Connect: `/etc/schema-registry/connect-avro-distributed.properties`
- Confluent REST Proxy: `/etc/kafka-rest/kafka-rest.properties`

Read more?
- https://docs.confluent.io/platform/current/installation/configuration/index.html
- https://docs.confluent.io/platform/current/kafka/dynamic-config.html