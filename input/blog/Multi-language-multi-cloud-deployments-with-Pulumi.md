Title: Multi-language, multi-cloud deployments with Pulumi
Published: 04/07/2020
Tags: 
  - Pulumi
  - Azure
  - ASP.NET
  - C#
  - TypeScript
Card: /images/vmss-appgw.jpeg
---

Pulumi is a SDK that can be used to describe an entire application stack using modern programming languages and deploy that stack to multiple cloud providers. This is an exciting new approach to infrastructure as code that can help development teams collaborate more effectively. If you've ever used a product like Terraform, Packer or CloudFoundry you may appreciate being able to use the same language as your application code to describe and deploy the infrastructure. In today's post, I'll detail an example of deploying common components for a web application using Pulumi, C# and Typescript.

## Modern Infrastructure as Code
Infrastructure as Code (IaC) is widely regarded as essential to any DevOps practice. It brings the promise of repeatable, predictable deployments for new projects and streamlined scaling for existing apps. Seven years ago, I can remember racking and stacking a server, manually installing software on it, applying OS and security configurations and then spending weeks going back and forth with the application team to get an app deployed and functioning. When it was all said and done, some steps were automated, fewer were accurately documented, and pretty much all were repeated next time. Times have changed. 

For this post, I'll be deploying a set of servers in Azure that scales up and down based on load, a layer-7 load balancer that distributes traffic to them, and separate public and private subnets. The complete source for the stack is available on [GitHub](https://github.com/michaelburch/pulumi-examples){rel="noopener" target="_blank"} I will also automate the installation of some basic OS components to get the web servers up and running. Here's a crude diagram of the environment to be created:

![diagram of VMSS and AppGateway](/images/vmss-appgw.jpeg "diagram of Azure VMSS and AppGateway") 

This is a common setup that you might see for an ASP.NET application. Even the IaC approach itself is fairly common, in fact I've deployed a similar stack using Terraform with relative ease. Terraform code for this type of stack would look something like this:

```
# Create a virtual network within the resource group
resource "azurerm_virtual_network" "example" {
  name                = "example-network"
  resource_group_name = azurerm_resource_group.example.name
  location            = var.location
  address_space       = [var.addressSpace]
}
```

This is simple enough, but it does require an understanding of [Terraform's domain specific language](https://www.terraform.io/docs/configuration/syntax.html){rel="noopener" target="_blank"}. Not a problem for a DevOps team, but as we start to see DevOps staff become integrated into other teams there a some serious productivity gains to be had from everyone working in the same language. Just think of all the extra PR reviewers that could be available to you! That's where [Pulumi](https://www.pulumi.com/){rel="noopener" target="_blank"} comes in - as an SDK, it can be used from a number of languages:

<pre>
<table>
<tr>
<td style="text-align: center;">C#</td><td style="text-align: center">TypeScript</td>
</tr>
<tr>
<td><pre><code class="hljs csharp">
// Create Networking components
var vnet = new VirtualNetwork($"{stackId}-vnet", new VirtualNetworkArgs
{
    ResourceGroupName = resourceGroup.Name,
    AddressSpaces = addressSpace
});
</pre></code></td>
<td><pre><code class="hljs ts">
// Create Networking components
const network = new azure.network.VirtualNetwork(`${stackId}-vnet`, 
{
    resourceGroupName,
    addressSpaces: addressSpace
});
</pre></code>
</td>
</tr>
</table>
</pre>

### Starting a Pulumi project
Installing Pulumi is easy - I'm using Ubuntu on Windows with WSL, so I just open a terminal and run:
```bash
curl -fsSL https://get.pulumi.com | sh
```

I'll be deploying to Azure, and I'm not (yet) using any CI/CD tools so I followed the excellent [Azure setup instructions](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/){rel="noopener" target="_blank"} on the Pulumi website to configure my project for Service Principal Authentication. 

I'll start a new C# project with 'pulumi new azure-csharp ' and give it some basic details
![screenshot 'pulumi' new command output](/images/pulumi-new-az-cs-1.png "screenshot 'pulumi new' command output")

Now that my project is created and configured to access my Azure subscription, I can start defining resources.

### Defining config values
The above Azure setup instructions also provide a great introduction to providing configuration values to the project. This is similar to what you might do with Terraform variables - provide a way to reuse this code as a template for future deployments by supplying different values at runtime. The example above sets these values for the specific Azure environment:

```
pulumi config set azure:clientId <clientID> && 
pulumi config set azure:clientSecret <clientSecret> --secret && 
pulumi config set azure:tenantId <tenantID> && 
pulumi config set azure:subscriptionId <subscriptionId>
```

I want to add more configuration settings for things like the region, address ranges, DNS name, and credentials that I will use in my deployment. 

```
pulumi config set region CentralUS
pulumi config set adminUser michael
...
```


### Defining resources

Rather than post all of the code for the project here, I'll highlight some of the more important steps and encourage you to review the complete stack in my [GitHub repo](https://github.com/michaelburch/pulumi-examples){rel="noopener" target="_blank"}, and also review the much more complete examples provided by the Pulumi team.

First, I'll configure my Virtual Network, subnets, and app Gateway referencing config settings that I created earlier:

```
// Create Networking components
var vnet = new VirtualNetwork($"{stackId}-vnet", new VirtualNetworkArgs
{
    ResourceGroupName = resourceGroup.Name,
    AddressSpaces = addressSpace
});

// Create a private subnet for the VMSS
var privateSubnet = new Subnet($"{stackId}-privateSubnet", new SubnetArgs
{
    ResourceGroupName = resourceGroup.Name,
    AddressPrefix = privateSubnetPrefix,
    VirtualNetworkName = vnet.Name
});

// Create a public subnet for the Application Gateway
var publicSubnet = new Subnet($"{stackId}-publicSubnet", new SubnetArgs
{
    ResourceGroupName = resourceGroup.Name,
    AddressPrefix = publicSubnetPrefix,
    VirtualNetworkName = vnet.Name
});

// Create a public IP and App Gateway
var publicIp = new PublicIp($"{stackId}-pip", new PublicIpArgs
{
    ResourceGroupName = resourceGroup.Name,
    Sku = "Basic",
    AllocationMethod = "Dynamic",
    DomainNameLabel = dnsPrefix
}, new CustomResourceOptions { DeleteBeforeReplace = true });

var appGw = new ApplicationGateway($"{stackId}-appgw", new ApplicationGatewayArgs
{
    ResourceGroupName = resourceGroup.Name,
    Sku = new ApplicationGatewaySkuArgs
    {
        Tier = "Standard",
        Name = "Standard_Small",
        Capacity = 1
    }...}
```

Next, I'll create the VM Scale Set for my web servers. I'm using the Azure VM CustomScript Extension to run a very short command to install IIS. In a typical environment, this would be a much larger script that would be stored elsewhere and downloaded by the extension before running. 


```
// Enable VM agent and script extension
UpgradePolicyMode = "Automatic",
OsProfileWindowsConfig = new ScaleSetOsProfileWindowsConfigArgs
{
    ProvisionVmAgent = true
},
Extensions = new InputList<ScaleSetExtensionsArgs>
{
    new ScaleSetExtensionsArgs
    {
        Publisher = "Microsoft.Compute",
        Name = "IIS-Script-Extension",
        Type = "CustomScriptExtension",
        TypeHandlerVersion = "1.4",
        // Settings is a JSON string
        // This command uses powershell to install windows webserver features
        Settings = "{\"commandToExecute\":\"powershell Add-WindowsFeature Web-Server,Web-Asp-Net45,NET-Framework-Features\"}"
    }
}
```

### Deploying and Validating

Finally, I'll deploy this stack and make sure that everything worked with the following command:

```bash
pulumi up
```

Pulumi will evaluate the project, determine which actions will be taken and then prompt for approval. When the deployment is complete, I get a nice summary screen with confirmation:

![screenshot 'pulumi up' command output](/images/pulumi-up-az-cs-complete.png "screenshot 'pulumi up' command output")

From this output I can see the URL given to my application gateway, 'aspnettodo.centralus.cloudapp.azure.com'. Browsing to that confirms that IIS is installed and responding to requests. 

![screenshot of browser loading content from this project](/images/iis-welcome.png "screenshot of browser loading content from this project")

Now that it's complete, I can tear down the entire stack with 'pulumi destroy'. And in just a few minutes I've built, deployed and destroyed a complete web server environment using Pulumi and C#! The IIS Welcome page isn't very interesting though - maybe next time I'll deploy an actual application and try out more capabilities of Pulumi. 

