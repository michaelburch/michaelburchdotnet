Title: RBAC Roles for Azure CLI storage operations
Published: 3/03/2020
Tags: 
  - Azure
  - CLI
  - blob storage
  - Azure DevOps
  - Azure CLI
  - RBAC
  - PowerShell
Lead: 
---

I depend on the Azure CLI in my deployment pipeline for this site to push content into Blob Storage. The pipeline failed yesterday, with only the following message in the logs *WARNING: No connection string, account key or sas token found, we will query account keys for your storage account. Please try to use --auth-mode login or provide one of the following parameters: connection string, account key or sas token for your storage account.*

The deployment pipeline is in Azure DevOps and consists of the following tasks:

![alt text](/images/deploy-pipeline-tasks.png "screenshot of azure devops deployment pipeline task listing")

Interestingly, the task that copies site content to the storage blob succeeded. This task uses the 'AzureFileCopy@3' task, which is basically a wrapper around AzCopy. 

The failed task actually only has the warning message above, but is clearly the source of the failure: 
![alt text](/images/set-cache-control-fail.png "screenshot of azure devops log error message")

The task itself updates the cache-control setting on static assets to allow for efficient caching. I'm using a PowerShell script to accomplish that
```powershell
 # iterate all blobs with a different cache control setting
          foreach($blob in ($blobs | ? {$_.Properties.contentSettings.cacheControl -notlike $contentCacheControl}))
          {
              # use name as identifier
              $blobName = $blob.name;
          
              # get extension
              $extension = [System.IO.Path]::GetExtension($blobName).ToLower();
           
              # update blob if extension is affected
              if($extensions.Contains($extension))
              {
                  az storage blob update --account-name $env:StorageAccountName --container-name $env:StorageContainer --name $blobName --content-cache-control $contentCacheControl
                  Write-Host "Updated $blobName with cache-control setting" 
              }
          }
``` 

This is part of my pipeline in Azure DevOps, so it uses a Service Principal to authenticate to my Azure subscription. The error log shows that at least one blob was updated, so I can be sure the authentication is working. After [a little bit of googling](https://github.com/Azure/azure-cli/issues/12242){rel="noopener" target="_blank"}, it appears that there are two problems here:

* Warnings are treated as errors, causing the task to fail
* The Azure CLI is deprecating key based authentication

To fix the first problem, I updated my task definition and set my errorActionPreference to 'continue':

```yaml
 - task: AzureCLI@2
      displayName: set-cache-control
      inputs:
        azureSubscription: 'michael-azure'
        scriptType: 'pscore'
        scriptLocation: 'inlineScript'
        powerShellErrorActionPreference: 'continue'
        inlineScript: |
          $containerName = "$web";
          
```

For the second problem, I first needed to configure the service principal I am using for Azure DevOps with the correct RBAC roles. I configured this by selecting *Access Control (IAM)* on the storage account in the Azure portal and ensuring that the service principal has both 'Storage Blob Data Contributor' and 'Storage Blob Reader' permissions

![alt text](/images/storage-iam-sp.png "screenshot of azure portal IAM permissions")

Next, I updated my Azure CLI script in the pipeline step to use the new *--auth-mode login* setting

```powershell
# update blob if extension is affected
if($extensions.Contains($extension))
{
  az storage blob update  --auth-mode login --account-name $env:StorageAccountName --container-name $env:StorageContainer --name $blobName --content-cache-control $contentCacheControl
  Write-Host "Updated $blobName with cache-control setting" 
}
```

With these changes, my Azure DevOps pipeline is working again. I'll go back and remove the *powerShellErrorActionPreference* setting now that I'm using the most current login method. 