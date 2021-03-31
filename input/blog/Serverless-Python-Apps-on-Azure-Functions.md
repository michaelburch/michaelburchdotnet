Title: Serverless Python Apps on Azure Functions
Published: 10/30/2020
Tags: 
  - Azure Functions
  - Python
  - CosmosDB
  - Azure
  - Serverless
  - Svelte
  - Todo
Card: /images/serverless-python-azure-card.jpeg
---

Azure Functions makes it easy to run apps written in Python (or Java/dotnet/JS/TS/etc) in a scalable, fully managed environment. I like to see my code come to life and make it available for others but don't want to think about High Availability, scaling, or OS updates. Azure Functions takes care of all of that and has a very generous free tier. In this post I'll cover how to get Python code for a Todo API running in Azure Functions with a Svelte (JS) front-end and a serverless database with Azure CosmosDB

## The Todo Application
I've blogged about [the app we'll be deploying before](deploying-an-app-on-openshift.html). This is a very basic Todo list app that can add, update, and delete todo items from a list.  The frontend is written in [Svelte](https://svelte.dev/){rel="noopener" target="_blank"}, a Javascript framework known for it's speed and simplicity. I'll be reusing the same frontend code from that post, but I'll replace the API with Azure Functions written in Python.

I wanted to make this a true serverless app across all tiers - frontend, app, and database so I'll be using Azure CosmosDB. CosmosDB is a document database that can support multiple APIs including SQL and Mongo. I'm using the SQL API because I prefer the query syntax. Cosmos also offers a generous free tier that will be more than enough for this small app.

The code for both the web app and API is available in my [GitHub todo repo](https://github.com/michaelburch/todo){rel="noopener" target="_blank"}. I also have deployed a working example of this code so you can see the app in action here: [https://todo.trailworks.io](https://todo.trailworks.io){rel="noopener" target="_blank"}

## Todo Item Data Model
I like to start a project by defining what my data model will look like. In this case, I'm defining my Todo Item as follows:

```json
{
    "tenantId": "d1119361-0ff2-4aa5-93d9-439f31afbbcf",
    "name": "get coffee",
    "isComplete": false,
    "id": "a68024ff-34d8-4bfb-a8c7-0b3cbb66efda"
}
```
The 'tenantId' field is a GUID that uniquely identifies the user, so that each user has their own unique Todo list. In the Svelte frontend, I'm using a cookie to populate this field. The other fields defined here give the Todo item a name, a boolean value that tells us if this Todo has been completed, and a unique identifier for the item itself. There are many other fields you might want on a Todo list (category, priority, assignee, etc.) but this will do for a basic example.

I'll define my TodoItem as a Python class and give it a helper function to deserialize it from JSON. 

```python
import uuid

class TodoItem(dict):
    def __init__(self, tenantId, name, isComplete, itemId):
        dict.__init__(self, tenantId=tenantId, name=name, isComplete=isComplete, id=itemId)

def from_json(dct):
    complete = dct.get('isComplete', False)
    tenantId = dct.get('tenantId', str(uuid.uuid4()))
    itemId = dct.get('id', str(uuid.uuid4()))
    return TodoItem(tenantId, dct['name'], complete, itemId)
```

I decided to use Azure CosmosDB to store the Todo Items. Using a document database like this, I can easily store objects in JSON format. Cosmos has a free tier and with that, you'll get the first 400 RU/s (per month)and 5 GB of storage in the account free for the lifetime of the account.  As with any "free" offering, there are plenty of caveats. It's worth reviewing the [documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/optimize-dev-test#azure-cosmos-db-free-tier){rel="noopener" target="_blank"} to understand them all. I have been running this particular account with a couple of databases for a few months now and it's cost me nothing. 

## Azure Function Setup
Azure Functions is another service with a generous [free tier](https://azure.microsoft.com/en-us/pricing/details/functions/){rel="noopener" target="_blank"}. Again, my cost for running these functions over the last 3 months has been very low at $0.01. This is less than what electricity would cost me to run this on a server at my house.

I've defined four functions for this project:

1. get-todos
2. create-todo
3. update-todo
4. delete-todo

Each function uses an HTTP trigger, since it will be accessed by the frontend app over HTTP. I'm using route parameters to pass the tenantId and itemId values. The function.json file for the get-todos function looks like this:
```json
{
  "scriptFile": "__init__.py",
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [
        "get"
      ],
      "route": "{tenantId}/todos/"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

## Using CosmosDB with Python
Microsoft has some great [examples](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-input?tabs=python#http-trigger-look-up-id-from-route-data-5){rel="noopener" target="_blank"} of how to make use of the CosmosDB bindings in multiple langauges, including Python. These are a good starting point and I found them very helpful when getting started. However, my original C# version of this app uses an Entity Framework code first database and I wanted similar functionality here. I found I could achieve something similar with the [Cosmos Client](https://docs.microsoft.com/en-us/python/api/azure-cosmos/azure.cosmos.cosmos_client.cosmosclient?view=azure-python){rel="noopener" target="_blank"} and the following code:

```python
import logging
import json
import os
import azure.functions as func
from ..shared_code import TodoItem
from azure.cosmos import exceptions, CosmosClient, PartitionKey

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Listing todo items')
    headers = {"Content-Type": "application/json"}
    try:
        # Read client settings from environment
        database_name = os.environ['DB_NAME']
        collection_name = os.environ['COLLECTION_NAME']
        # Read tenantId from route param
        tenantId = req.route_params.get('tenantId')
        logging.info(f'tenant {tenantId} ')
        # Create an empty documentlist
        todos = func.DocumentList()
        # Create database and collection if not already existing
        client = CosmosClient.from_connection_string(os.environ['DB_CSTR'])
        client.create_database_if_not_exists(database_name,False,0)
```

Once deployed, I can configure the 'os.environ' settings like DB_NAME and COLLECTION_NAME in the function app:

![screenshot of function app config](/images/todo-function-config.png "screenshot of function app config"){ style=max-height:350px} 

During development and testing, these same settings can be defined in a local.settings.json file using the following format:

```json
// local.settings.json
{
  "IsEncrypted": false,
  "Values": {
    "DB_NAME": "freetierdb",
    "COLLECTION_NAME":"todos",
    "DB_CSTR": "<azure-cosmos-connection-string>"
  }
}
```

Working with the CosmosDB SDK in Python is fun, even if the documentation is a bit sparse. There are some good general examples but finding specific documentation was frustrating at times. One thing I really appreciate about Python is how simple it is to accept a JSON payload and store it in the database:

```python
        # Create item using JSON from request body
        req_body = req.get_json()
        todoItem = TodoItem.from_json(req_body)
        todoItem["tenantId"] = f'{tenantId}'
        # Create item in database
        doc.set(func.Document.from_dict(todoItem))
```

## Deploying the frontend
There are pletny of ways that I **could** deploy the frontend application, and in this case I decided to deploy it as a static website in Azure Storage (just like I do with [this blog](/blog/hosting-a-static-site-in-azure.html)). Static Web Apps is an Azure feature that is currently in Preview that looks really promising, but since I'm already familiar with static websites in Azure Storage that's how I've deployed it. 

![screenshot of storage config](/images/todo-storage.png "screenshot of storage config"){ style=max-height:350px} 

I like this option because I can quickly create a storage account in Azure, enable static web hosting, enable Azure CDN and define a custom domain for HTTPS and have a very robust web host that costs me next to nothing. The storage account cost and CDN costs over the last 3 months total $0.02. All together for this project, albeit with very little traffic, I spent less than 5 cents over the last 3 months. This isn't representative of actual production costs for a commercial project, but for simple proof of concept type work or hobby projects this is a great way to go. 

Azure Functions could also be a good low-cost option for teaching cloud based development to people who are new to technology and looking to get right into the code instead of spending a lot of time on setup and hardware configuration.