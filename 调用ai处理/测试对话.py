import requests

url = "https://api.siliconflow.cn/v1/chat/completions"

payload = {
    "model": "Qwen/Qwen2.5-Coder-7B-Instruct",
    "stream": False,
    "max_tokens": 512,
    "temperature": 0.7,
    "top_p": 0.7,
    "top_k": 50,
    "frequency_penalty": 0.5,
    "n": 1,
    "messages": [
        {
            "content": "求解数学方程并返回 ? 的值。例如： ？+3=7 ？+5=19 7+5=？ 7+？=26 请直接返回 ? 的值，不要多余的文字。",
            "role": "system"
        },
        {
            "content": "发单客服: Q 366   ？+8=9",
            "role": "user"
        }
    ],
    "stop": []
}
headers = {
    "Authorization": "Bearer sk-osluoiriuqgyatrufvhtwelywptxyzzxmaubdhveqwcynwex",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

print(response.text)