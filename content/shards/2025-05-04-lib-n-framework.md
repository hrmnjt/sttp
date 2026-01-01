+++
title = "build libraries before frameworks"
slug = "lib-n-framework"
date = 2025-05-04
publishedDraft = true
+++

Start of this year, we had a re-org at work, which merged 2 data engineering
teams together. As part of the merge, engineers started discussing internal
projects --- one of them was about a framework created to ingest data from
multiple sources into central data infrastructure. During the "knowledge
transfer" sessions, one detail that kept bothering me was the word
**framework**.

I believe the word --- **framework** is an overloaded term as it
has different meaning everyone I know at work. This shard (aka. post) is my
understanding for what is a framework, how does it differ from a library
and, how should an individual or team start building them.

So lets draw a line in sand and define a library and a framework.

A library (or sometimes called package) and a framework are means to increase
developer productivity, code organization and allowing teams to scale their
work while keeping it maintainable. The place where they differ are notably
(a) control flow (b) purpose specificity. Taking Python ecosystem example,
`psycopg`, `boto`, `requests` and `pandas` are examples of libraries while,
Apache Airflow, Django Project and Apache Spark are examples of frameworks. Now
a lot of people think of Spark (or others) as libraries because you can import
them as libraries in your script to build mega-frameworks and abstractions on
top of them but fundamentally, Spark itself is an multi-language engine which
exposes APIs to compute data at scale. To improve on this nuanced take, let me
be very specific on how I classify a library separately from a framework.

## inversion of control flow

Libraries let you define the control flow i.e. I can call a library and, I will
define how I intend to use the library in the execution model.

```python
# "I" control the flow - library calls happen when YOU decide
import pandas as pd

# Step 1: "I" initialize the library
df = pd.read_csv('data.csv')

# Step 2: "I" decide what operations to perform
df_filtered = df[df['age'] > 25]

# Step 3: "I" decide how to process data
result = df_filtered.groupby('category').mean()

# Step 4: "I" decide when to save
result.to_parquet('output.parquet')
```

Frameworks, on other hand, invert the control flow. The user is now not in
charge of defining "how" to do an operation. User still defines "what" needs to
be done; the framework controls the flow and execution model generally improving
upon the functionality for performance gains or standardization.

```python
# "FRAMEWORK" controls the flow - you just define what to do
import apache_beam as beam

# "FRAMEWORK" decides when to call this function
def filter_by_age(element):
    return element['age'] > 25

# "FRAMEWORK" decides when to call this function
def format_output(element):
    return f"{element['category']}: {element['value']}"

# "FRAMEWORK" controls execution order
with beam.Pipeline() as pipeline:
    (pipeline
     | beam.io.ReadFromText('data.csv')
     | beam.Map(filter_by_age)
     | beam.Map(format_output)
     | beam.io.WriteToText('output'))
```

As seen in above examples, frameworks generally improve the code execution flow
and provide distributed/parallel processing, simplify complex orchestration
that might be required, remove the need for user-defined error handling, and
help standardize practices across teams. However, they do all of this at the
cost i.e. ownership of control flow.

## am I being specific?

Libraries are more generic in their implementation.

...more thoughts...
