FROM apache/hive:3.1.3

USER root

# Copy Hadoop AWS and AWS SDK JARs for S3A support in Hive Metastore
COPY hadoop-aws-3.1.0.jar /opt/hive/lib/
COPY aws-java-sdk-bundle-1.11.375.jar /opt/hive/lib/

# Copy Hadoop configuration for S3A filesystem
COPY core-site.xml /opt/hadoop/etc/hadoop/core-site.xml

USER hive
