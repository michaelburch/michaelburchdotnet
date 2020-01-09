Title: Enable SSL for Kafka on Azure HDInsight
Published: 01/07/2020
Tags: Cloud, Azure, Kafka, HDInsight, SSL
Lead: 
---

Azure HDInsight is a great way to get started with popular open source frameworks like Hadoop and Kafka. Besides offering simplified deployment, it also offers native integration with other Azure services like Data Lake Storage, CosmosDB and Data Factory. Kafka on HDInsight is an easy way to get started establishing a data integration layer and enabling analysis with modern tools. The out of the box configuration doesn't provide much in the way of security though, and enabling SSL is a good first step.

> The out of the box configuration does provide a dedicated VNET, which is good and the Enterprise Security Package offers a much more complete solution. This post is intended to show minimal steps to encrypt Kafka traffic with SSL on HDInsight.

Microsoft provides a good tutorial for this purpose, but there are a couple of errors (as of this writing) and some of the options have changed. That tutorial, for reference,  is here:

[https://docs.microsoft.com/en-us/azure/hdinsight/kafka/apache-kafka-ssl-encryption-authentication](https://docs.microsoft.com/en-us/azure/hdinsight/kafka/apache-kafka-ssl-encryption-authentication){rel="noopener" target="_blank"} 

For this post I'll focus on fixing the errors, share some extra details around creating a CA and certificates and demonstrate some code for validating the configuration. 
At a minimum, Kafka traffic should be encrypted.  I've deployed a basic HDInsight cluster accepting defaults using the Azure Portal. 

``` 
Cluster Name: hdimichael
clusterLoginUserName: admin
clusterVersion: 3.6
clusterKind: KAFKA
sshUserName: sshUser

```

## Creating a Certificate Authority 
If you already have a CA, or know how it works and want to follow the Microsoft tutorial that works just as well and you can [skip right to the Kafka config and validation part](#configure-kafka-for-ssl). I will need a CA (Certificate Authority) to sign certificate requests and issue certificates for my Kafka Brokers. For convenience, I'll use the first headnode in my cluster just like in the Microsoft tutorial. In production, the CA would likely be provided by AD.

```bash
ssh sshuser@hdimichael-ssh.azurehdinsight.net
# Create a new directory 'ssl' and change into it
mkdir ssl
cd ssl
# Create CA cert and key
openssl req -new -newkey rsa:4096 -days 365 -x509 -subj "/CN=Kafka-Security-CA" -keyout ca-key -out ca-cert -nodes
```
The above command will create a certificate and key for signing certificate requests. This is a good time to store the CA certificate in a JKS trust store. This is important when configuring java applications to trust the new CA. Whether you are using this simple CA or an enterprise CA, you will still want to store the CA certificate in a JKS trust store. 

```bash
keytool -keystore kafka.server.truststore.jks -alias CARoot -import -file ca-cert -storepass "8t6q5>7BCAa!" -keypass "8t6q5>7BCAa!" -noprompt
```
## Create certificates for worker nodes
Now I can connect to each of my worker nodes, trust the new CA, and generate certificate requests. I'll store my cluster name and password as variables first since I will be using them again. HDInsight provides the Ambari REST API by default, so I will use that to find the names of my worker nodes. Since I'll be working with the REST API, I'll install jq to help parse the responses. 

```bash
sudo apt install jq -y
export CLUSTERNAME="hdimichael"
export password="8t6q5>7BCAa!"

# This will show a simple list of all nodes
curl -u admin:$password -sS -G "https://$CLUSTERNAME.azurehdinsight.net/api/v1/clusters/$CLUSTERNAME/hosts" | jq '.items[].Hosts.host_name'
"hn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"hn1-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"wn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"wn1-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"wn2-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"wn3-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"zk0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"zk1-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"
"zk4-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net"

# Retrieve just the worker nodes
curl -u admin:$password -sS -G "https://$CLUSTERNAME.azurehdinsight.net/api/v1/clusters/$CLUSTERNAME/hosts" | jq -r '.items[] | select(.Hosts.host_name |startswith("wn")).Hosts.host_name'
wn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net
wn1-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net
wn2-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net
wn3-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net
```

HDInsight names all workers nodes with a 'wn' prefix. Here, I've used jq to parse the API response and just show the nodes with that prefix. Now that I have a list of worker nodes, I can SSH *from the head node* to ***each*** of them and run the following:

```bash
# Create a new directory 'ssl' and change into it
mkdir ssl
cd ssl
# Copy trust store from head node 0
scp hn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net:~/ssl/kafka.server.truststore.jks ./

# Create a keystore and populate it with a new private key
# The -ext "SAN=dns:$(hostname -f),ip:$(hostname -i) parameter is optional (our simple CA won't actually include these when signing)
# but if you are using an AD certificate authority this is where you would specify additional names 
keytool -genkey -keystore kafka.server.keystore.jks -validity 365 -storepass "8t6q5>7BCAa!" -keypass "8t6q5>7BCAa!" -dname "CN=$(hostname -f)" -ext "SAN=dns:$(hostname -f),ip:$(hostname -i)" -storetype pkcs12

# Create a new certificate request and copy it to the headnode
keytool -keystore kafka.server.keystore.jks -certreq -file cert-file -storepass "8t6q5>7BCAa!" -keypass "8t6q5>7BCAa!"
scp cert-file sshuser@hn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net:~/ssl/$(hostname)-csr
```

Now back to the head node, where I should have a certificate signing request (CSR) for each of my worker nodes in the /home/sshuser/ssl folder:

![alt text](/images/kafka-csr-ls.png "directory listing of csrs")

```bash
# Sign requests
for f in *-csr
do
 name=$(echo $f | awk -F '-csr' '{print $1}')
 openssl x509 -req -CA ca-cert -CAkey ca-key -in $f -out $name-cert-signed -days 365 -CAcreateserial -passin pass:"8t6q5>7BCAa!"
done
```

Running this will sign each of the certificates using the CA private key I created earlier. The output should look similar to this:

![alt text](/images/kafka-signed-csrs.png "directory listing of certs")

Now that I've got signed certificates, I will again SSH to each worker and install the certificates. Run the following on each worker node:

```bash
cd ~/ssl
# Copy CA certificate from headnode
scp sshuser@hn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net:~/ssl/ca-cert ./
# Copy signed certificate from headnode
scp sshuser@hn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net:~/ssl/$(hostname)-cert-signed ./cert-signed

# Import CA certificate and signed certificate into this servers keystore
keytool -keystore kafka.server.keystore.jks -alias CARoot -import -file ca-cert -storepass "8t6q5>7BCAa!" -keypass "8t6q5>7BCAa!" -noprompt
keytool -keystore kafka.server.keystore.jks -import -file cert-signed -storepass "8t6q5>7BCAa!" -keypass "8t6q5>7BCAa!" -noprompt
```

## Configure Kafka for SSL
I'll use the Ambari UI to reconfigure my Kafka brokers to use SSL. By default, the UI is exposed at https://clustername.azurehdinsight.net. 

After logging in, I'll do the following:

Under Kafka Broker set the listeners property to PLAINTEXT://localhost:9092,SSL://localhost:9093

![alt text](/images/editing-configuration-ambari.png "ambari ui for listener config")

Under Advanced kafka-broker set the following:
  1. security.inter.broker.protocol

Here's where the MS tutorial misleads us a little. In HDI 3.6 the version of Ambari does not expose options for configuring the ssl keystore and trust store locations. The tutorial tries to overcome that like so:

![alt text](/images/ms-tutorial-kafka-error.png "config values in bash script")

I didn't catch it a first, but there's configuration data in that bash script! None of which are valid commands. The Kafka error log states the problem clearly:

```bash
cat /var/log/kafka/kafka.err
/usr/hdp/2.6.5.3016-3/kafka/bin/../config/kafka-env.sh: line 37: ssl.keystore.location=/home/sshuser/ssl/kafka.server.keystore.jks: No such file or directory
```

I'll solve that by using sed to first remove any lines starting with 'ssl.', then echo those config lines into the proper configuration file like this:

```bash
sed -i '/ssl./d' /usr/hdp/current/kafka-broker/config/server.properties
echo "ssl.keystore.location=/home/sshuser/ssl/kafka.server.keystore.jks" >> /usr/hdp/current/kafka-broker/config/server.properties
echo "ssl.keystore.password=8t6q5>7BCAa!" >> /usr/hdp/current/kafka-broker/config/server.properties
echo "ssl.key.password=8t6q5>7BCAa!" >> /usr/hdp/current/kafka-broker/config/server.properties
echo "ssl.truststore.location=/home/sshuser/ssl/kafka.server.truststore.jks" >> /usr/hdp/current/kafka-broker/config/server.properties
echo "ssl.truststore.password=8t6q5>7BCAa!" >> /usr/hdp/current/kafka-broker/config/server.properties

```

For HDI 4.0, those options are exposed as fields in Ambari -
Under Advanced kafka-broker set the following:
1. ssl.key.password
2. ssl.keystore.password
3. ssl.keystore.location
4. ssl.keystore.password
5. ssl.truststore.location
6. ssl.truststore.password

![alt text](/images/kafka-advanced-ssl.png "ambari ui for kafka advanced config")

## Making sure that it works
 After saving these changes and restarting all brokers, Kafka will be ready to accept SSL connections. Once I had this configured, I found myself wanting a way to verify connectivity. I can check that the port is open, which is helpful but even better would be to check if the certificate is being presented. That's easy enough to do with this command:

 ```bash
 openssl s_client -debug -connect wn0-hdimic.4kmntzthpuzezhg5vzpbm43dde.gx.internal.cloudapp.net:9093 -tls1_2
 ```

 That's a great way to check the certificate and the port, and that it's reachable from another machine but I still would like to see some actual messaging traffic. It turns out that Microsoft has a good tutorial for how to do this, along with some example code here:

[https://docs.microsoft.com/en-us/azure/hdinsight/kafka/apache-kafka-producer-consumer-api ](https://docs.microsoft.com/en-us/azure/hdinsight/kafka/apache-kafka-producer-consumer-api ){rel="noopener" target="_blank"} 


However, the example code doesn't support SSL connections as is. I've forked the example repo and added a prebuilt jar file with my changes. You can check out the changes yourself (be kind, I don't spend a lot of time writing Java these days), 

[https://github.com/michaelburch/hdinsight-kafka-java-get-started/](https://github.com/michaelburch/hdinsight-kafka-java-get-started/commit/5cf168cb6eefbf7e0c50f7318decf76651b6cad1){rel="noopener" target="_blank"} 

You can also download my prebuilt jar and test Kafka using the head node like so:

```bash
# Download jar
cd ~/ssl
wget https://github.com/michaelburch/hdinsight-kafka-java-get-started/raw/master/Prebuilt-Jars/kafka-producer-consumer-ssl.jar

# Create topic (note this method still runs over plaintext)
java -Djavax.net.ssl.trustStore=~/ssl/kafka.server.truststore.jks -jar kafka-producer-consumer-ssl.jar create sslTestTopic wn0-hdimic.4kmntzthpuzhg5vzpbm43dde.gx.internal.cloudapp.net:9092

# Produce records
java -Djavax.net.ssl.trustStore=~/ssl/kafka.server.truststore.jks -jar kafka-producer-consumer-ssl.jar producer_ssl sslTestTopic wn0-hdimic:9093

# Consume records
java -Djavax.net.ssl.trustStore=~/ssl/kafka.server.truststore.jks -jar kafka-producer-consumer-ssl.jar consumer_ssl sslTestTopic wn1-hdimic:9093
```

This is by no means a complete security configuration, but it's a start and hopefully it saves someone else the time trying to sort out the configuration.

