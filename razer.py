import requests
import time

BASE_URL = "http://localhost:54235/razer/chromasdk"

app = {
    "title": "Python RGB Test",
    "description": "Simple keyboard RGB test",
    "author": {
        "name": "Python",
        "contact": "www.razerzone.com"
    },
    "device_supported": [
        "keyboard"
    ],
    "category": "application"
}

print("1. Registering...")

r = requests.post(BASE_URL, json=app)

print("HTTP:", r.status_code)
print("Response:", r.text)

r.raise_for_status()

data = r.json()
uri = data["uri"]

print("URI:", uri)


print("\n2. Making keyboard RED...")

payload = {
    "effect": "CHROMA_STATIC",
    "param": {
        "color": 255
    }
}

r = requests.put(
    uri + "/keyboard",
    json=payload
)

print("HTTP:", r.status_code)
print("Response:", r.text)


print("\n3. Keeping session alive...")

try:
    while True:
        r = requests.put(uri + "/heartbeat")

        print("Heartbeat:", r.status_code)

        time.sleep(5)

except KeyboardInterrupt:

    print("\nTurning lights off...")

    r = requests.put(
        uri + "/keyboard",
        json={
            "effect": "CHROMA_NONE"
        }
    )

    print("OFF:", r.status_code, r.text)

    requests.delete(uri)