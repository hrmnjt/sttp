
Organizations are moving away from Data silos to Lake House structure

![](/assets/images/2021-11-10-15-18-01.png)

Lake House architecture
- scalable data lakes
- purpose built data services
- seamless data movement
- unified movement
- performant and cost-affective

![](/assets/images/2021-11-10-15-19-04.png)

Lake House architecture on AWS

![](/assets/images/2021-11-10-15-20-53.png)

For real-time analytics, shelf life of data diminishes quickly over time.
- We need approach which allows us to analyse and store analysed information as quickly as possible
- Customer experience, marketing campaign and fraudulent cases
- Confluent partner with AWS for the realtime analytics use case

Confluent compliments Event Streaming
- Better experience with managed services or Serverless instead

![](/assets/images/2021-11-10-15-24-42.png)

What is event streaming?
- Ingest data in realtime
- Analytics or transactions
- Send A-->B but producer and consumers need to be decoupled as speed differs
    - warehouses are slow layers (batch)
    - realtime applications might require realtime

![](/assets/images/2021-11-10-15-30-17.png)

Kafka is defacto standard for Event Streaming

![](/assets/images/2021-11-10-15-31-06.png)

Confluent gives cloud-native approach for Kafka
- Connectors - source, sink
- stream processing - ksqlDB, Kafka Streams

![](/assets/images/2021-11-10-15-32-11.png)

![](/assets/images/2021-11-10-15-33-18.png)

Example architecture
- ingest data in realtime; use for reports, dashboards, and create warehouses
- realtime applications
- bi-directional linking between on-prem & cloud or cloud1 & cloud2

![](/assets/images/2021-11-10-15-36-45.png)
![](/assets/images/2021-11-10-15-37-52.png)
![](/assets/images/2021-11-10-15-39-22.png)
