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

The code for both the web app and API is available in my [GitHub todo repo](https://github.com/michaelburch/todo){rel="noopener" target="_blank"}. 

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

## 