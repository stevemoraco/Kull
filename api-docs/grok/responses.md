#### [Guides](#guides)

# [Stateful Response with Responses API](#stateful-response-with-responses-api)

Responses API is a new way of interacting with our models via API. It allows a **stateful interaction** with our models, where **previous input prompts, reasoning content and model responses are saved by us**. A user can continue the interaction by appending new prompt messages, rather than sending all of the previous messages.

Although you don't need to enter the conversation history in the request body, you will still be billed for the entire conversation history when using Responses API. The cost might be reduced as the conversation history might be [automatically cached](../models#cached-prompt-tokens).

**The responses will be stored for 30 days, after which they will be removed.** If you want to continue a response after 30 days, please store your responses history as well as the encrypted thinking content to create a new response. The encrypted thinking content can then be sent in the request body to give you a better result. See [Returning encrypted thinking content](#returning-encrypted-thinking-content) for more information on retrieving encrypted content.

* * *

## [Prerequisites](#prerequisites)

*   xAI Account: You need an xAI account to access the API.
*   API Key: Ensure that your API key has access to the chat endpoint and the chat model is enabled.

If you don't have these and are unsure of how to create one, follow [the Hitchhiker's Guide to Grok](../tutorial).

You can create an API key on the [xAI Console API Keys Page](https://console.x.ai/team/default/api-keys).

Set your API key in your environment:

bash

```
export XAI_API_KEY="your_api_key"
```

* * *

## [Creating a new model response](#creating-a-new-model-response)

The first step in using Responses API is analogous to using Chat Completions API. You will create a new response with prompts.

`instructions` parameter is currently not supported. The API will return an error if it is specified.

When sending images, it is advised to set `store` parameters to `false`. Otherwise the request may fail.

python (xAI SDK)

```
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    timeout=3600,
)

chat = client.chat.create(model="grok-4", store_messages=True)
chat.append(system("You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy."))
chat.append(user("What is the meaning of life, the universe, and everything?"))
response = chat.sample()

print(response)

# The response id that can be used to continue the conversation later

print(response.id)
```

If no system prompt is desired, for non-xAI SDK users, the request's input parameter can be simplified as a string user prompt:

python (xAI SDK)

```
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    timeout=3600,
)

chat = client.chat.create(model="grok-4", store_messages=True)
chat.append(user("What is 101*3"))
response = chat.sample()

print(response)

# The response id that can be used to continue the conversation later

print(response.id)
```

### [Returning encrypted thinking content](#returning-encrypted-thinking-content)

If you want to return the encrypted thinking traces, you need to specify `use_encrypted_content=True` in xAI SDK or gRPC request message, or `include: ["reasoning.encrypted_content"]` in the request body.

Modify the steps to create a chat client (xAI SDK) or change the request body as following:

python (xAI SDK)

```
chat = client.chat.create(model="grok-4",
        store_messages=True,
        use_encrypted_content=True)
```

See [Adding encrypted thinking content](#adding-encrypted-thinking-content) on how to use the returned encrypted thinking content.

* * *

## [Chaining the conversation](#chaining-the-conversation)

We now have the `id` of the first response. With Chat Completions API, we typically send a stateless new request with all the previous messages.

With Responses API, we can send the `id` of the previous response, and the new messages to append to it.

python (xAI SDK)

```
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    timeout=3600,
)

chat = client.chat.create(model="grok-4", store_messages=True)
chat.append(system("You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy."))
chat.append(user("What is the meaning of life, the universe, and everything?"))
response = chat.sample()

print(response)

# The response id that can be used to continue the conversation later

print(response.id)

# New steps

chat = client.chat.create(
    model="grok-4",
    previous_response_id=response.id,
    store_messages=True,
)
chat.append(user("What is the meaning of 42?"))
second_response = chat.sample()

print(second_response)

# The response id that can be used to continue the conversation later

print(second_response.id)
```

### [Adding encrypted thinking content](#adding-encrypted-thinking-content)

After returning the encrypted thinking content, you can also add it to a new response's input:

python (xAI SDK)

```
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    timeout=3600,
)

chat = client.chat.create(model="grok-4", store_messages=True, use_encrypted_content=True)
chat.append(system("You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy."))
chat.append(user("What is the meaning of life, the universe, and everything?"))
response = chat.sample()

print(response)

# The response id that can be used to continue the conversation later

print(response.id)

# New steps

chat.append(response)  ## Append the response and the SDK will automatically add the outputs from response to message history

chat.append(user("What is the meaning of 42?"))
second_response = chat.sample()

print(second_response)

# The response id that can be used to continue the conversation later

print(second_response.id)
```

* * *

## [Retrieving a previous model response](#retrieving-a-previous-model-response)

If you have a previous response's ID, you can retrieve the content of the response.

python (xAI SDK)

```
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    timeout=3600,
)

response = client.chat.get_stored_completion("<The previous response's id>")

print(response)
```

* * *

## [Delete a model response](#delete-a-model-response)

If you no longer want to store the previous model response, you can delete it.

python (xAI SDK)

```
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    timeout=3600,
)

response = client.chat.delete_stored_completion("<The previous response's id>")
print(response)
```

\[data-radix-scroll-area-viewport\]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}\[data-radix-scroll-area-viewport\]::-webkit-scrollbar{display:none}

*   [Stateful Response with Responses API](#stateful-response-with-responses-api)
*   [Prerequisites](#prerequisites)
*   [Creating a new model response](#creating-a-new-model-response)
*   [Returning encrypted thinking content](#returning-encrypted-thinking-content)
*   [Chaining the conversation](#chaining-the-conversation)
*   [Adding encrypted thinking content](#adding-encrypted-thinking-content)
*   [Retrieving a previous model response](#retrieving-a-previous-model-response)
*   [Delete a model response](#delete-a-model-response)

Copy page