# Access Razer Chroma RESTful API from Node.js / browsers

This library can be used to interact with the RESTful API of the [Razer Chroma SDK](https://assets.razerzone.com/dev_portal/REST/html/index.html).

## Usage

You can use this library from Node.js or your browser.

Internally, the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) will
be used to direct web requests towards the Chroma SDK RESTful endpoint on a local machine.

### Full example

The following TypeScript example shows how to obtain an instance of the `RazerChromaSDK` client
(the component that speaks to the RESTful endpoint on localhost) and how to use the instance to
perform some basic operations:

```typescript
import { RazerChromaSDK, Category, Device, Effect, Color } from "razer-chroma-sdk";

(async () => {

    const sdk = await RazerChromaSDK.initialize({
        title: "My kewl game",
        description: "My game is really kewl. You should try it.",
        author: {
            name: "ACME Inc.",
            contact: "http://example.com/"
        },
        device_supported: [ Device.MOUSE, Device.KEYBOARD ],
        category: Category.GAME
    });

    const mouseBlueFx = await sdk.effects.create(Device.MOUSE, {
        effect: Effect.STATIC,
        param: { color: Color.BLUE }
    });
    await sdk.effects.set(mouseBlueFx);

    // Don't forget to un-initialize the SDK after using it, to free up resources.
    await sdk.uninitialize();

})();
```

### Important note about un-initialization

As a user of this library you are always responsible for calling the `async uninitialize()` method
on all SDK instances created by your code to free up resources.

## Further documentation

Since this API is basically only a very thin wrapper around the RESTful API of the Razer Chroma SDK,
you might want to check the [Razer Chroma SDK REST Documentation](https://assets.razerzone.com/dev_portal/REST/html/index.html) for further details about how to create different more elaborated
effects.
