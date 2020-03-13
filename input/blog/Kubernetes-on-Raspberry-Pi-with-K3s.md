Title: Kubernetes on Raspberry Pi with K3s
Published: 03/10/2020
Tags: 
  - Raspberry Pi
  - Docker
  - Kubernetes
  - K3s
  - MongoDB
Lead: 
---

Kubernetes makes it possible to describe an application and deploy it to the cloud or to on-premise infrastructure using the same code and deployment tools. Using K3s, that on-premise infrastructure can even be a Raspberry Pi (or a cluster of them!). This post describes deploying MongoDB to Kubernetes running on a Raspberry Pi 3. 

## Preparing the Raspberry Pi
The first step is to install an operating system image on the Pi. There are plenty of tutorials out there for this, so I won't cover it here. The [official instructions](https://github.com/Azure/azure-cli/issues/12242){rel="noopener" target="_blank"} work just fine. 

I'll be deploying MongoDB, which is 64-bit only so I need an OS image with at least a 64-bit kernel. The [latest Raspbian image](https://github.com/Azure/azure-cli/issues/12242){rel="noopener" target="_blank"} (Buster Lite, 2020-02-13) can support this with a simple option change.

I'm starting fresh, so I'll apply the image and then set a couple of config options before booting up the Pi:

* Enable 64-bit support
* Enable SSH

### Enable 64-bit kernel
All that's necessary for this is to tell the Pi to load a 64-bit kernel. I'll do that by opening config.txt in the root of the boot partition and adding this line at the bottom:
```
arm_64bit=1
```
![screenshot of config.txt enabling arm_64bit](/images/raspi-config-txt-arm64.png "screenshot of config.txt enabling arm_64bit") 

>If this isn't your first boot and you've already got a recent Raspbian image, you can make this change quickly with ``` echo 'arm_64bit=1' >> /boot/config.txt ``` and then rebooting

### Enable SSH at first boot
This isn't strictly necessary, but I don't have a spare monitor around so SSH is a must for me, and I want it to be enabled from first boot. Adding an empty file named 'ssh' (ssh.txt works too) to the root of the boot partition will accomplish this:

![screenshot of ssh.txt in boot partition](/images/ssh-raspi.png "screenshot of ssh.txt in boot partition")

That's it! At this point I have a fresh Raspbian image that will boot up with a 64-bit kernel and have ssh enabled. All I have to do is plug in the SD card and boot it up.

### Installing Kubernetes

Kubernetes on it's own is too much for my little Raspberry Pi 3. I'm going to use a minimal Kubernetes distribution from Rancher called K3s. The great thing about K3s is that it's designed for small embedded systems but also scales to large clusters. The default configuration replaces etcd with a sqlite database and uses containerd as the container runtime rather than a full install of Docker. This all adds up to a smaller footprint and simpler installation. 

> The script below will install the version of k3s appropriate for your current kernel. If you haven't switched to a 64-bit kernel yet, now is the time. See the steps above for details, and confirm your current kernel architecture with ```uname -a ```, looking for 'aarch64 GNU/Linux'

Installing K3s is easy. I'll just login to the Pi and run -
```bash
curl -sfL https://get.k3s.io | sh -
```

In a couple of minutes, I'm up and running with a single node Kubernetes cluster. 

K3s, unlike a standard Kubernetes install, writes the kubeconfig file to /etc/rancher/k3s/k3s.yaml. Kubectl installed by K3s will automatically use this configuration. 

> By default, only root will be able to access this kubeconfig meaning you would have to prefix all of your kubectl commands with 'sudo'. You can permit other users to access the file with ```sudo chmod 644 /etc/rancher/k3s/k3s.yaml  ```

You can also copy /etc/rancher/k3s/k3s.yaml to your local PC, and replace '127.0.0.1' with the IP address of the Pi to manage Kubernetes remotely.

### Deploying MongoDB

I've defined a minimal configuration for mongodb and saved it as mongo.yaml.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: database
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
        selector: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo
        env:
          - name: MONGO_INITDB_ROOT_USERNAME
            value: admin
          - name: MONGO_INITDB_ROOT_PASSWORD
            value: password
---
```

This will deploy a single replica of the latest official mongo image from DockerHub, with some *very* insecure credentials and no persistent storage. It's really the bare minimum to get the application up and running, which I can do with this command:

```bash
pi@raspberrypi:~ $ kubectl apply -f mongo.yaml
statefulset.apps/mongodb created
```
I can verify that the pod is up and running with this:

```bash
pi@raspberrypi:~ $ kubectl get pod
NAME        READY   STATUS    RESTARTS   AGE
mongodb-0   1/1     Running   0          3m48s
```

This doesn't expose mongodb on my local network, only to other pods running in the cluster. I could add simple web app to the cluster and use mongo as the data store. Or I could add a service definition and expose it to apps running elsewhere on the network. 

This is a good starting point for a basic deployment in Kubernetes, and K3s is the easiest and fastest Kubernetes install I've seen so far.

### BONUS: Adding persistent storage

A database isn't very useful without persistent storage. I have a Synology NAS on my network that serves storage over iSCSI, so I'll quickly add that to my deployment by adding a volume and mounting it in the pod:

```yaml
        env:
          - name: MONGO_INITDB_ROOT_USERNAME
            value: admin
          - name: MONGO_INITDB_ROOT_PASSWORD
            value: password
        volumeMounts:
        - name: iscsipd-rw
          mountPath: /data/db
      volumes:
      - name: iscsipd-rw
        iscsi:
          targetPortal: 192.168.0.226:3260
          portals: ['192.168.0.226:3260']
          iqn: iqn.2000-01.com.synology:media.Target-1.2818f865af
          lun: 1
          fsType: xfs
          readOnly: false
---
```