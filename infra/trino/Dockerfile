FROM trinodb/trino:latest

USER root

# Download Hadoop AWS for S3A support (matching Trino's Hadoop version 3.3.5)
# Place it in the hdfs/ subdirectory where Trino's Hadoop classloader can find it
# Trino already has the necessary AWS SDK v1 libraries (1.12.794) in this directory
RUN cd /usr/lib/trino/plugin/iceberg/hdfs && \
    curl -L -o hadoop-aws-3.3.5.jar https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.5/hadoop-aws-3.3.5.jar

USER trino
