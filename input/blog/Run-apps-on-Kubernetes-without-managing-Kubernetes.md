Title: Run apps on Kubernetes without managing Kubernetes
Published: 01/20/2023
Tags: 
  - Azure
  - Kubernetes
  - Containers
Card: /images/aca-card.jpg
---

Kubernetes is a great platform for running scalable apps and is available pretty much everywhere. Many who own or deploy apps have enough to manage already and don't have the cycles to operate their own Kubernetes clusters. Azure Container Apps (ACA) is the fastest way to get started running apps on Kubernetes in Azure, with service mesh, ingress, and secure defaults. Best of all, it shifts the operational burden to the cloud provider.  This post reviews the advantages of ACA as well as some of the key features that aren't available to help determine if ACA is a good fit for your application.
 

## Powered by Kubernetes

Microsoft launched Azure Container Apps in 2022 and describes the service as being ["powered by Kubernetes and open-source technologies"](https://learn.microsoft.com/en-us/azure/container-apps/compare-options#azure-container-apps){rel="noopener" 
target="_blank"}. Practically, this means that Azure runs a Kubernetes cluster for you and exposes a subset of the platform's features for you to deploy and manage your app. When compared to other Kubernetes deployment options, like running your own bare-metal cluster or building one in AKS this method significantly cuts back on the stuff you have to manage yourself.

<div class="container-right container-row">
<?# CaptionImage Src="/images/aca-compare.png"  AltText="a table comparing features of AKS and ACA" Style="container-left"?>Shared Responsibility table<?#/CaptionImage ?>
</div>

The table I show here may not match other shared responsibility models out there. I currently run a Mastodon instance on an AKS cluster, and even though I am using Azure-provided Ubuntu images for the nodes and security updates are automatically installed I still consider that I am responsible for maintaining these items. After all, the node images won't be updated unless I trigger or configure that to happen and security patches won't be applied unless I reboot the node (manually or via kured). In short, if a classic shared responsibility model identifies that I (as the app owner) share the responsibility then I am ultimately responsible.

Cloud providers like Azure have made a lot of progress toward helping customers automate the management and maintenance of Kubernetes clusters. A common challenge that I see is that Kubernetes itself is updated frequently, and often will introduce breaking changes. Even when operating an AKS or EKS cluster, teams still need to stay current on all of the changes and ensure their clusters are on appropriate versions. ACA and services like it eliminate this challenge - with a few trade offs. 

<p></p>

## Optimized for microservices

The target use case for Azure Container Apps is microservices and general purpose containers. This makes it ideal for long running background tasks, web apps, and API endpoints. Some of the main Kubernetes features that are available when using ACA include:

* Event-driven auto scaling
* Traffic splitting
* HTTP/S Ingress

KEDA and HTTP scaling triggers are supported, and greatly simplified. ACA also includes a managed service mesh which enables you to deploy mutliple revisions of an app an split traffic between them. This service mesh also secures traffic between apps, which means that unless DAPR is used the only communication that is allowed between container apps is HTTP/S. Additionally, the only *ingress* traffic that can be allowed is HTTP/S. 

Ingress on Kubernetes is a large complex topic. ACA is a highly opinionated service, which reduces this complexity. This can be very limiting, since you aren't able to allow any other traffic into your app except HTTP/S (and only on ports 80 and 443). There's a significant reward for this - only HTTP/S traffic on well-known ports is allowed to reach your app *out of the box*. 

## Limitations

Things change quickly in the world of Kubernetes and containers. As of this writing, there are some signifcant limitations that might make you consider deploying to AKS or another service instead of ACA. I'll save you the trouble of digging through the documentation to find the limitations that I have found to be the most significant:

* No [Internet Egress routing](https://learn.microsoft.com/en-us/azure/container-apps/firewall-integration){rel="noopener" 
target="_blank"} <br/>
  If you are an enterprise and want to route all of the traffic leaving your containers and going to the Internet through your own central firewall - ACA is not for you. The docs word it this way "Using custom user-defined routes (UDRs) or ExpressRoutes, other than with UDRs of selected destinations that you own, are not yet supported for Container App Environments with VNETs. Therefore, securing outbound traffic with a firewall is not yet supported." 

* Only [linux/amd64 container images](https://learn.microsoft.com/en-us/azure/container-apps/containers#limitations){rel="noopener" 
target="_blank"} are supported <br/>
  I'm fairly sure this is the most commonly deployed platform, but with the rise of ARM64 and Microsoft's own efforts with Windows containers this could be a deal breaker for some.

* No privileged containers <br/>
  Generally, even if you can run privileged containers, you shouldn't. There are some edge cases though so if you need them, consider AKS instead.

* [Resource Limits](https://learn.microsoft.com/en-us/azure/container-apps/containers#configuration){rel="noopener" 
target="_blank"} <br/>
  Apps running in ACA are limited to 2 CPU Cores and 4GB of memory. This is a cumulative limit so if you've got multiple containers in one app (like a DAPR sidecar with mongodb container) their combined CPU cannot exceed 2 cores.

* Port restrictions <br/>
  Unless you are using DAPR, apps running in ACA can only communicate *with each other* over HTTP/S on ports 80 and 443. Egress traffic to external services is not restrcited by ACA. It seems likely that for the target use case this will be the most common desired configuration, but if you are hoping to migrate an existing app and it requires communicating between two services on other ports you'll need to consider AKS or another service.

Overall, ACA delivers on it's goal to enable teams to easily deploy containerized apps in the cloud. While similar to Azure Kubernetes Service, Azure Container Apps is generally easier to use and requires less prior knowledge of Kubernetes. There are some meaningful limits that may make it a non-starter for some projects, although it is actively developed and I'm sure it will continue to grow and evolve with input from customers. 