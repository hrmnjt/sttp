+++
title = "reading files with duckdb"
slug = "readdatawithduck"
date = 2024-10-05
description = "swiss army knife to read data"
+++

Couple weeks ago, I was troubleshooting a data pipeline and in the process
checking couple of CSV and Parquet file from S3. The workflow for checking CSV
files is simple enough and fastest way on MacOS is to have CyberDuck open and
previewing file from S3. This feature from Cyberduck is a godsend and it saves
so much time and bloat when dealing with data files on S3.

However, for Parquet files, I had to download and inspect the file or use
`parquet-tools` to read the file. It's very nifty again but because I want to
inspect the data, I need to deal with AWS sessions and the command is verbose
too.

I have use DuckDB in past for exploring data on the fly and wondered if I can
create a simpler workflow with is homogenous for both CSV and Parquet files from
S3. Additionally, I just didn't want the row count or size but also to inspect
the files and if I could load the files into a DuckDB shell, I can slice and
dice data in any which way.

Solution was pretty simple - a python script to create a CLI which can handle
S3 path and other arguments and using a Justfile to make it dead simple to
invoke said CLI. First version of raw code that could do this is here -
https://github.com/hrmnjt/x/tree/c67e412a5716f734a1cd18bdf644f217aee903e4/queryfile

Core of the logic is DuckDB charm.

```SQL
-- Install AWS extension on DuckDB
INSTALL aws;
LOAD aws;

-- Load an AWS profile which is passed a parameter
CALL load_aws_credentials('{profile_name}');

-- Create a table called "data" and load the file (CSV or Parquet) from S3 URI
-- both of them are passed as parameters. In case of CSV, `read_function` is
-- `read_csv` or for Parquet, it is `read_parquet`
CREATE OR REPLACE TABLE data AS SELECT * FROM {read_function}('{s3_uri}');

-- Quality of life improvements on DuckDB shell
.mode box
.echo on

-- Print schema for loaded data to make queries contextual
PRAGMA table_info('data');
```

This logic is run while initializing DuckDB in a temporary location by doing

```python
subprocess.run(['duckdb', '-init', temp_file_path], check=True)
```

To make interactions with CLI easier, I added a `Justfile` which makes me type
lesser characters on terminal

```justfile
# Justfile
default:
    @just --list

# Query a CSV file from S3
queryc S3_URI PROFILE="grid2-prod":
    python duckdb_s3_query.py csv {{S3_URI}} {{PROFILE}}

# Query a Parquet file from S3
queryp S3_URI PROFILE="grid2-prod":
    python duckdb_s3_query.py parquet {{S3_URI}} {{PROFILE}}
```

This quick and dirty hack helped me a lot while troubleshooting the project,
providing the sanity to be in my terminal and reduced cognitive load from
switching tools and grokking code.

## What next?

This week I added some small enhacements to the script. It now handles local or
S3 files, has type hints, uses `argparse` instead of system arguments, and has
minimal docstrings and logger to make it easier to play with it (if someone
wants to). I don't want to, I don't need to get more mileage from this hack; so
no next for this script.

However, this sparked some curiousity regarding the tools that are present
right now to read Parquet files, which ones of them are faster and would it be
faster if `parquet-tools` used DuckDB backend instead of Arrow implementation in
Go. For later :)

Fin.
