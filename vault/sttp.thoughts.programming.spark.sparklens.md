---
id: P7sCkUZQZt1CyKwq5jDOr
title: Sparklens
desc: ''
updated: 1635630172814
created: 1635630171095
---


Source: http://sparklens.qubole.com/

Performance Tuning Principles

- Make some part of your computation faster
- Don't do what you don't need to do
- Don't do again what you have already done
- Use more resources: parallelise & distribute


Executor is idle - improve driver computation
- file listing & split computation e.g. S3 file listing will take lot of time
- Loading Hive table from Spark e.g. write data = write data to temporary location + write data from temporary location (hadoop) to hive
- `df.collect.foreach` e.g. OOM errors, all computation happen on driver and executor is free
- REST API calls from Spark
- `df.toPandas()` e.g. distributed spark is now driver executed

