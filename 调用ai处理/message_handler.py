from wxauto import WeChat
import re
import time
import threading
from queue import Queue
from typing import Optional, List
import asyncio
import sys
import requests
import json


class MessageHandler:
    def __init__(self, num_threads: int = 1):
        self.wx = WeChat()
        self.num_threads = num_threads
        self.message_queue = Queue()
        self.running = False
        self.threads: List[threading.Thread] = []
        self.lock = threading.Lock()
        self.current_thread = 0
        self.condition_met = False
        # API配置
        self.api_url = "https://api.siliconflow.cn/v1/chat/completions"
        self.api_headers = {
            "Authorization": "Bearer sk-osluoiriuqgyatrufvhtwelywptxyzzxmaubdhveqwcynwex",
            "Content-Type": "application/json"
        }

    def call_api(self, message_content: str) -> Optional[str]:
        """调用API处理数学方程"""
        try:
            payload = {
                "model": "Pro/Qwen/Qwen2.5-7B-Instruct",
                "stream": False,
                "max_tokens": 512,
                "temperature": 0.7,
                "top_p": 0.7,
                "top_k": 50,
                "frequency_penalty": 0.5,
                "n": 1,
                "messages": [
                    {
                        "content": "求解数学方程并返回 ? 的值。例如： ？+3=7 ？+5=19 7+5=？ 7+？=26 ，请直接返回 ? 的值，不要多余的文字。如果包含英文字符请返回'1' ，例如：11+b=？",
                        "role": "system"
                    },
                    {
                        "content": message_content,
                        "role": "user"
                    }
                ],
                "stop": []
            }

            response = requests.request("POST", self.api_url, json=payload, headers=self.api_headers)
            result = response.json()
            # 从API响应中提取答案
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content'].strip()
            return None
        except Exception as e:
            print(f"API调用错误: {e}")
            return None

    def extract_last_number(self, last_message: str) -> Optional[str]:
        match = re.search(r'(\d+)(?!.*\d)', last_message.strip())
        return match.group(1) if match else None

    def is_pure_number(self, text: str) -> bool:
        """检查字符串是否为纯数字"""
        return text.isdigit()

    def confirm_large_number(self, number: str) -> bool:
        """当数字大于10时请求用户确认"""
        try:
            if int(number) > 100:
                print(f"\n警告：API返回的数字 {number} 大于100")
                response = input("是否确认发送？按回车确认，输入其他内容取消: ")
                return response.strip() == ""
            return True
        except ValueError:
            return False

    def normalize_message(self, message: str) -> str:
        """将消息中的 * 替换为 ？"""
        return message.replace('*', '？')

    def process_message(self, thread_id: int):
        while self.running and not self.condition_met:
            with self.lock:
                if thread_id != self.current_thread:
                    continue

                try:
                    msgs = self.wx.GetAllMessage()
                    last_message = None
                    sender = None

                    for msg in msgs:
                        if msg.type == 'friend':
                            sender = msg.sender_remark
                            last_message = msg.content

                    if last_message:
                        print(f'线程 {thread_id} - 最后一条消息：{sender}: {last_message}')
                        is_valid_message = last_message is not None
                        contains_target_words = any(word in last_message for word in ['@所有人'])
                        excluded_words = ['引用', '测', '不', '脚', '抢', '测', '别']
                        does_not_contain_quote = all(word not in last_message for word in excluded_words)
                        names = '+' in last_message or '-' in last_message
                        name = '发单客服' in sender

                        if is_valid_message and contains_target_words and does_not_contain_quote and name and names:
                            print(f'线程 {thread_id} - 符合条件，调用API处理')
                            normalized_message = self.normalize_message(last_message)
                            api_result = self.call_api(normalized_message)
                            if api_result:
                                print(f'API返回结果: {api_result}')
                                if not self.is_pure_number(api_result):
                                    print("API返回结果不是纯数字，终止处理")
                                    continue

                                if not self.confirm_large_number(api_result):
                                    print("用户取消发送")
                                    continue

                                self.wx.SendMsg(msg=api_result)
                                self.condition_met = True
                                print("条件已满足，程序即将退出...")

                                # 使用标志退出线程
                                self.running = False
                                break  # 退出当前线程循环

                except Exception as e:
                    print(f"线程 {thread_id} - 处理消息时发生错误: {e}")

                self.current_thread = (self.current_thread + 1) % self.num_threads

            time.sleep(0)

        print(f"线程 {thread_id} 退出.")

    def start(self):
        """启动消息处理线程"""
        self.running = True
        self.condition_met = False
        for i in range(self.num_threads):
            thread = threading.Thread(target=self.process_message, args=(i,))
            thread.daemon = True
            thread.start()
            self.threads.append(thread)

    def stop(self):
        """停止所有处理线程"""
        self.running = False
        for thread in self.threads:
            if thread.is_alive():
                thread.join()  # 等待线程结束
        self.threads.clear()
        print("所有线程已停止.")
