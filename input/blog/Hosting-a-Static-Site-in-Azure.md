Title: Hosting a Static Site in Azure
Published: 9/04/2019
Tags: 
  - Azure
  - Wyam
  - blob storage
  - dotnet
Lead:
Card: /images/mbdotnet-azure-storage-account.png
---

When I decided to start a blog, I wanted to run it without paying for a dedicated server. After all, this is a simple blog with mostly text articles and only a few images which shouldn't amount to much more than some basic HTML.  In this post, I'll walk through the options I evaluated and the process of getting content into Azure Storage and configuring it for static site hosting.

There are plenty of options for running a blog, (like Wordpress.com, running it your own server hardware, a VPS, etc.) but most of them require a server running database software and an HTTP server. That's a very common and reliable way of hosting a site, but for this project I  wanted to explore other options. I decided to create a static site -  just a pile of HTML, CSS and images - and host it in Azure Blob Storage.

## Goals
First, I had a few goals in mind for the site:

* Zero server maintenance required on my part
* Easy to author content (I will *not* format articles in HTML)
* Must use SSL on a custom domain (because it's 2019)
* Must use a design pattern I've never used before
* Low cost and no ads

Wordpress.com seems like a good fit for most of these goals. If you just want to get started blogging, this is probably the way to go. The Wordpress editor is easy, hosting plans are inexpensive, and custom domains with free SSL from Let's Encrypt are available. Wordpress itself is a great blogging platform, and I've used it for other sites and really enjoyed it. The only reason I didn't go this way is that it's a familiar design pattern and I am specifically looking for something new.

I briefly considered hosting the site on a Raspberry Pi; I have an extra one, it's probably a low traffic site that could easily be hosted on my home Internet connection but there are the occasional power outages and even the Pi requires security updates.

I also considered writing a full serverless CMS, which would definitely be fun, cost effective and an interesting new challenge, but I wanted to spend more time writing articles than code for a serverless CMS. There are a few out there already (like Webiny), but most seem overly complicated.

## Static Site

After exploring other options, I decided on using a static site generator to produce my content and Azure Blob Storage to host it. This met my goals in the following ways:

* Hosted without a server or VM (or even an App Service plan!)
* Content is authored in Markdown (which I can write easily in VS Code)
* Built-in HTTPS support with support for custom domain
* A new (to me) design pattern
* Very inexpensive (~$0.30/month for storage)

I first looked at Hugo [https://gohugo.io](https://gohugo.io){rel="noopener" target="_blank"} as it's billed as "the world's fastest framework for building websites". And it lives up to that claim. I was able to generate my site in an amazing ~40ms. I liked Hugo, except for the templating system (which originates from Jekyl, I believe). I have more experience with dotnet and Razor Pages than I do with Go and so I kept looking.

Ultimately, I chose Wyam from [https://wyam.io](https://wyam.io){rel="noopener" target="_blank"}. The two features that got my attention were that it's based in .NET and it's [low ceremony](https://wyam.io/docs/usage/obtaining){rel="noopener" target="_blank"}. I can write my posts in Markdown, using my editor of choice (VSCode), and Wyam takes care of generating the HTML for me. In fact, the command in my build pipeline that creates the site (generates HTML, compiles SASS, minifies CSS and JS, etc) is literally just:

```pwsh
 pwsh -C $env:USERPROFILE\.dotnet\tools\wyam build -o $(Build.ArtifactStagingDirectory)\content
 ```

I'll cover the Azure pipeline I used for deploying in a future post, but this was so simple that I was ready to make my decision.

## Hosting
Once Wyam has produced my site content, I upload it into an Azure storage account which I have configured for static hosting:

![alt text](/images/mbdotnet-azure-storage-account.png "storage account config screenshot")

The storage account itself does not allow public access, but files can be read publicly by using the HTTPS endpoint that I have associated with the site. This is a secure, simple, and efficient way to host my site content. I've also configured RA-GRS replication on the storage account which gives me a level of safety I can't reproduce with a Raspberry Pi at my house.

I am not currently using the custom domain or CDN features which are also an option for Azure Blob Storage, because I decided to use Azure Frontdoor instead. I hope to cover that configuration in a future post.
