Title: Geo-distributed Internal API with Azure Traffic Manager
Published: 1/30/2021
Tags: 
  - Azure Traffic Manager
  - HA/DR
  - API
  - Azure
  - App Gateway
  - Todo
Card: /images/serverless-python-azure-card.jpeg
---

Deploying applications to multiple geographic locations is a common way to achieve high availability for publicly available web applications. This setup relies on a Global Server Load Balancer (which itself must be deployed to multiple geographies). Azure Traffic Manager is an example of a GSLB that you can also use to make your internal apps and APIs geo-distributed and highly available. 

## What problem does this solve?

The pattern I am showing here solves the problem of deploying an internal API (for use by private network users only) to different geographic locations with automatic failover. This is a more complicated problem to solve because it's less common to have geo-distributed load balancers available for use on a private network. 

## The backend API

In this example, I'm deploying my [Todo Sample API](https://github.com/michaelburch/todo){rel="noopener" target="_blank"} to Azure App Service in the South Central US and North Central US regions. I'll enable [Private Endpoints for Azure Web Apps](https://docs.microsoft.com/en-us/azure/app-service/networking/private-endpoint){rel="noopener" target="_blank"} to block all Internet access and ensure that these are only accessible on my private network. 
 
 - Private Endpoint NorthCentral, 10.1.1.10
 - Private Endpoint SouthCentral, 10.0.1.10

There's some complexity here that's not important to this post. The point is - these could be any two HTTP/S endpoints on my private network. At this point, I have two instances of my Todo API running in different regions with private IPs. Next, I'll stand-up Azure Application Gateways in region.

## Azure App Gateway

App Gateway will provide a way for Azure Traffic Manager to check the health of these two API endpoints. 
