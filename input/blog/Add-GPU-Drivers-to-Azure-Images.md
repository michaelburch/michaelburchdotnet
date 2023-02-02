Title: Add GPU drivers to Azure Images
Published: 1/31/2023
Tags: 
  - Azure
  - GPU
  - NVIDIA
  - CUDA
  - RHEL
  - RedHat
  - Linux
  - Packer
Card: /images/cuda-card.jpg
---

Cloud-based GPUs provide a flexible, scalable, and cost-effective solution for training complex machine learning and deep learning models. NVIDIA is the vendor to beat in this space, providing high-performance GPUs and the CUDA programming model used by many A.I. workloads including ChatGPT. Despite the popularity of NVIDIA GPUs and wide support for GPU equipped virtual machines in the the cloud, the CUDA drivers are not included with many stock VM images. Installing these drivers on your own custom images enables you to spin up more GPUs faster, whether on virtual machines or scale sets.  
 
## Packer Configuration

For this post, I'll be using the ARM Builder for [Packer](https://developer.hashicorp.com/packer/plugins/builders/azure/arm){rel="noopener" 
target="_blank"} to install the CUDA drivers in RHEL 8.6. This will use the existing Azure RHEL 8.6 image as a baseline, and then perform the installation scripts and commands that are needed to add the CUDA drivers from NVIDIA. You can find the official CUDA install instructions on the [NVIDIA download page](https://developer.nvidia.com/cuda-downloads?target_os=Linux&target_arch=x86_64&Distribution=RHEL&target_version=8&target_type=rpm_network){rel="noopener" target="_blank"}.

> I recommend trying out any customizations on a VM before attempting to capture an image with Packer.   

I started by creating a Packer configuration file, rhel8-nvidia-nc.pkr.hcl. Note that you will need a service principal that Packer can use to connect to Azure and create virtual machines and images. Replace the tenant_id, subscription_id, client_id, and client_secret values below with your own Azure details. The [Microsoft documentation](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/build-image-with-packer#create-azure-credentials){rel="noopener" target="_blank"} for this process details exactly what you need.

```
source "azure-arm" "rhel8_nvidia_t4" {
  azure_tags = {
    OS = "RHEL8"
    task = "Image deployment"
  }
  client_id                            = "<your-sp-client-id-here>"
  client_secret                        = "<your-sp-client-secret-here>"
  image_offer                          = "RHEL"
  image_publisher                      = "RedHat"
  image_sku                            = "86-gen2"
  location                             = "West US 3"
  managed_image_name                   = "rhel8-nvidia-t4"
  managed_image_resource_group_name    = "rg-hub-wus3-demo"
  os_type                              = "Linux"
  os_disk_size_gb                      = "128"
  subscription_id                      = "<your-azure-subscription-id-here>"
  tenant_id                            = "<your-azure-tenant-id-here>"
  vm_size                              = "Standard_NC4as_T4_v3"
  virtual_network_name                 = "vnet-hub-wus3-demo"
  virtual_network_subnet_name          = "vnets-srv-hub-wus3-demo"
  virtual_network_resource_group_name  = "rg-hub-wus3-demo"
}

build {
  sources = ["source.azure-arm.rhel8_nvidia_t4"]

  provisioner "shell" {
    execute_command = "chmod +x {{ .Path }}; {{ .Vars }} sudo -E sh '{{ .Path }}'"
    inline          = [ 
    "dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm", 
    "dnf config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/rhel8/x86_64/cuda-rhel8.repo", 
    "dnf clean all", 
    "dnf -y module install nvidia-driver:latest-dkms", 
    "dnf install -y kernel kernel-tools kernel-headers kernel-devel", 
    "/usr/sbin/waagent -force -deprovision+user && export HISTSIZE=0 && sync" ]
    inline_shebang  = "/bin/sh -x"
  }

}

```

Some of the options here are self-explanatory, but here are a few that might not be. These three identify the base image that Packer will start with:

* image_offer
* image_publisher
* image_sku

You can find the values for these with the Azure CLI, for example to list all the images published by RedHat with the associated offer and sku values:

```
az vm image list --publisher RedHat --all
```

> Note that the SKU value also indicates which VM generation the image is for. In my case, I am deploying a *Standard_NC4as_T4_v3* which supports both Generation 1 and 2 on Azure. Check your VM size to see what Generations are supported and select an appropriate image. 

There are two settings that control how you can find the customized image later in the Azure portal. You can control the name of the image and the resource group where it will be stored. I named my image *rhel8-nvidia-t4* because it's a RHEL image with NVIDIA drivers using the Tesla T4 GPU. Packer will create it's own resource group for the temporary VM it builds to capture the image and then delete it when complete. The resulting image will be stored in the resource group I specified, *rg-hub-wus3-demo*, which is my West US 3 regional hub. I've also specified the os_disk_size_gb parameter - the CUDA drivers (and toolkit) are fairly large and won't fit on the 64GB default disk.

I've also configured Packer to connect the temporary build VM to an existing virtual network. This isn't required, but if you don't connect to an existing VNET Packer will create a public IP address for the temp VM and I don't want that in this case. I have an existing hub and spoke deployment and would rather use that to handle routing my egress traffic, even for a temporary VM.

You can also take advantage of [spot pricing](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms){rel="noopener" target="_blank"} in Azure for Packer builds. If you're using a spot-eligible size you can configure images for which you might otherwise not have sufficient quota. Spot pricing can be configured by adding the following snippet to the source properties:

```

source "azure-arm" "rhel8_nvidia_t4" {
...
  virtual_network_resource_group_name  = "rg-hub-wus3-demo"
  spot {
      eviction_policy = "Deallocate"
    }
}
...   
```

You may also need to append the following plugin configuration to the end of your Packer configuration file:

```
packer {
  required_plugins {
    azure = {
      version = ">= 1.4.0"
      source  = "github.com/hashicorp/azure"
    }
  }
}
```

The remainder of the file is the script that is run to install the GPU drivers. Note that there is an additional command at the end that deprovisions the Azure agent, removes user accounts, and cleans the history. This ensures that VMs created from this image later are clean and will have a functional Azure agent. This should be the last command run, so if you need to perform addition customizations you should add them above this line. Now that the configuration is complete, let's run Packer and see if the build succeeds.

## Create an image with Packer

I was disappointed that packer isn't available via [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/){rel="noopener" target="_blank"}, but thankfully the install was as easy as downloading one executable and dropping in a folder in my path. After that, there are just two commands to run to kick off the build:

```
michaelburch ❯ packer init rhel8-nvidia-nc.pkr.hcl
michaelburch ❯ packer build rhel8-nvidia-nc.pkr.hcl         
azure-arm.rhel8_nvidia_t4: output will be in this color.

==> azure-arm.rhel8_nvidia_t4: Running builder ...
==> azure-arm.rhel8_nvidia_t4: Getting tokens using client secret
==> azure-arm.rhel8_nvidia_t4: Getting tokens using client secret
    azure-arm.rhel8_nvidia_t4: Creating Azure Resource Manager (ARM) client ...
```

After about 10 minutes, the build is complete (cleanup and all!) and Packer provides the ID of the new image. Overall it took about a minute to provision the temporay VM, 6 minutes to run my customizations, and 3 minutes to capture the image and cleanup. 6 minutes doesn't seem like a long time, unless you need to provision a lot of these very quickly and then it seems like an eternity. Performing this step once when we create the image saves us 6 minutes each time we start a new instance, since we don't have to wait for these steps to be completed by cloud-init or some configuration management tool. 

```
==> azure-arm.rhel8_nvidia_t4: Resource group has been deleted.
Build 'azure-arm.rhel8_nvidia_t4' finished after 10 minutes 18 seconds.

==> Wait completed after 10 minutes 18 seconds

==> Builds finished. The artifacts of successful builds are:
--> azure-arm.rhel8_nvidia_t4: Azure.ResourceManagement.VMImage:

OSType: Linux
ManagedImageResourceGroupName: rg-hub-wus3-demo
ManagedImageName: rhel8-nvidia-t4
ManagedImageId: /subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/resourceGroups/rg-hub-wus3-demo/providers/Microsoft.Compute/images/rhel8-nvidia-t4
ManagedImageLocation: West US 3

michaelburch ❯
```
Now the image is complete and I can find in in my resource group. The Packer output shows the "ManagedImageId" and I can copy that value directly into a bicep or ARM template to deploy a new VM, I can also find it in the Azure portal later if I forget (or never saw this output because it was part of a build pipeline).

![alt text](/images/packer-image-props.png "azure portal screenshot")

<p></p>

## Deploy a VM with the new image

The ManagedImageId can be used to reference the image when deploying a VM using Bicep, ARM or Azure CLI. I usually deploy with bicep templates so I just need to update the image reference property on the VM. All that's needed is to find the platform image reference in the template, which looks something like this:

![alt text](/images/bicep-image-ref-rhel.png "bicep image reference")

and replace it with the ManagedImageId:

![alt text](/images/bicep-image-ref-custom.png "bicep image reference with custom image")

With that change made, I can deploy the bicep template and have a new VM up and running with my custom image. The same can be achieved with the following Azure CLI command in powershell (replace the ` with \ for bash):

> I'm deploying this into an existing vnet with no public IP and using an existing SSH key and NSG. The most relevant parameter is *--image*  

```pwsh
az vm create --resource-group rg-packer-demo `
--name vm-nvt4-demo-1 `
--image /subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/resourceGroups/rg-hub-wus3-demo/providers/Microsoft.Compute/images/rhel8-nvidia-t4 `
--admin-username michael `
--ssh-key-values  c:\users\michaelburch\.ssh\id_rsa.pub `
--vnet-name vnet-packer-demo `
--subnet server-subnet `
--nsg nsg-packer-default `
--size Standard_NC4as_T4_v3 `
--public-ip-address '""'

It is recommended to use parameter "--public-ip-sku Standard" to create new VM with Standard public IP. Please note that the default public IP used for VM creation will be changed from Basic to Standard in the future.
{
  "fqdns": "",
  "id": "/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/resourceGroups/rg-packer-demo/providers/Microsoft.Compute/virtualMachines/vm-nvt4-demo-1",
  "location": "westus3",
  "macAddress": "60-45-BD-CC-55-47",
  "powerState": "VM running",
  "privateIpAddress": "192.168.49.133",
  "publicIpAddress": "",
  "resourceGroup": "rg-packer-demo",
  "zones": ""
}
michaelburch ❯ $command = Get-History -Count 1 
michaelburch ❯ $($command.EndExecutionTime - $command.StartExecutionTime).TotalSeconds     
99.5999679

```

It's easy to see that deploying a VM using a custom image is significantly faster, just 99.5 seconds! The real question is, does it actually *work* ? We can SSH to the VM and find out:

```
michaelburch ❯ ssh michael@192.168.49.133
The authenticity of host '192.168.49.133 (192.168.49.133)' can't be established.
ED25519 key fingerprint is SHA256:W1CknBZ2sGSCNLELhmIx9F2fXXyZsrKTfSPMAuseFlw.
This key is not known by any other names
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '192.168.49.133' (ED25519) to the list of known hosts.
Activate the web console with: systemctl enable --now cockpit.socket

[michael@vm-nvt4-demo-1 ~]$ nvidia-smi       
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 525.85.12    Driver Version: 525.85.12    CUDA Version: 12.0     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|                               |                      |               MIG M. |
|===============================+======================+======================|
|   0  Tesla T4            Off  | 00000001:00:00.0 Off |                    0 |
| N/A   51C    P0    26W /  70W |      2MiB / 15360MiB |      0%      Default |
|                               |                      |                  N/A |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|  No running processes found                                                 |
+-----------------------------------------------------------------------------+
[michael@vm-nvt4-demo-1 ~]$ exit

```

Success! Running `nvidia-smi` shows us that the drivers are loaded and the Tesla T4 GPU is successfully detected.  


## Dive Deeper

This is a fairly minimal example of creating and using custom images in Azure. More advanced scenarios, such as versioning, sharing images across tenants, or deploying at greater scale are enabled with the use of [Shared Image Galleries](https://learn.microsoft.com/en-us/cli/azure/sig/image-version?view=azure-cli-latest#az-sig-image-version-create-examples){rel="noopener" target="_blank"}. You can also take advantage of [Azure VM Image Builder](https://learn.microsoft.com/en-us/azure/virtual-machines/image-builder-overview?tabs=azure-powershell){rel="noopener" target="_blank"} to deploy your existing HCL or JSON Packer configurations without needing to install anything. Below are links to reference documentation that I used or found helpful while writing this post:

* [Microsoft Documentation for Packer](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/build-image-with-packer){rel="noopener" target="_blank"}
* [Azure N-Series Driver Setup](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/n-series-driver-setup){rel="noopener" target="_blank"}
* [NVIDIA CUDA Driver Install](https://developer.nvidia.com/cuda-downloads?target_os=Linux&target_arch=x86_64&Distribution=RHEL&target_version=8&target_type=rpm_local){rel="noopener" target="_blank"}
* [Packer Reference Guide](https://developer.hashicorp.com/packer/plugins/builders/azure/arm){rel="noopener" target="_blank"}



