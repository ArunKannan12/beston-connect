import requests

url = "https://track.delhivery.com/api/kinko/v1/invoice/charges/.json"

params = {
    "md": "E",
    "ss": "Delivered",
    "o_pin": "643212",
    "d_pin": "560001",
    "cgm": 15000,
    "pt": "Pre-paid"
}

headers = {
    "Authorization": "Token 6163ac501012c5d4bbde43b9a693dd9ca943b65a"  # your production token
}

response = requests.get(url, params=params, headers=headers)
print(response.status_code)
print(response.json())
