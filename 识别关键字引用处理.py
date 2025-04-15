from wxauto import WeChat
import pyautogui
import threading
from queue import Queue
from typing import Optional, List
import time
import sys


class HuiTuHandler:
    def __init__(self, num_threads: int = 1):
        self.wx = WeChat()
        self.num_threads = num_threads
        self.message_queue = Queue()
        self.running = False
        self.threads: List[threading.Thread] = []
        self.lock = threading.Lock()
        self.current_thread = 0
        self.condition_met = False

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
                            sender = msg.sender
                            last_message = msg.content

                    if last_message:
                        print(f'线程 {thread_id} - 最后一条消息：{sender}: {last_message}')

                        is_valid_message = last_message is not None
                        contains_target_words = any(word in last_message for word in ['所有人'])
                        excluded_words = ['引用', '北极', '重复', '几', '是', '什么', '天', '人数', '接单', '挑', '发', '收', '码',
                                      '支付宝', '挑', '转', '我', '君杨', '测', '不', '脚', '抢', '测', '别', '语音', '70', '80', '点赞', '+', '-']
                        does_not_contain_quote = all(word not in last_message for word in excluded_words)
                        name = '发单客服' in sender

                        if is_valid_message and contains_target_words and does_not_contain_quote and name:
                            print(f'线程 {thread_id} - 符合条件')
                            msg.quote('1车')  # 引用消息进行回复
                            self.condition_met = True 
                            print("条件已满足，程序即将退出...")
                            self.stop()
                            sys.exit(0)

                except Exception as e:
                    print(f"线程 {thread_id} - 处理消息时发生错误: {e}")

                self.current_thread = (self.current_thread + 1) % self.num_threads
                
            time.sleep(0)

    def start(self):
        """启动消息处理线程"""
        print("启动消息处理器...")
        self.running = True
        self.condition_met = False
        for i in range(self.num_threads):
            thread = threading.Thread(target=self.process_message, args=(i,))
            thread.daemon = True
            thread.start()
            self.threads.append(thread)
        print(f"已启动 {self.num_threads} 个处理线程")

    def stop(self):
        """停止所有处理线程"""
        self.running = False
        for thread in self.threads:
            if thread.is_alive():
                thread.join(timeout=0)
        self.threads.clear()

def main():
    handler = HuiTuHandler(num_threads=10)
    try:
        handler.start()
        while not handler.condition_met:
            time.sleep(0)
    except KeyboardInterrupt:
        print("正在停止程序...")
        handler.stop()
    finally:
        if handler.condition_met:
            print("任务完成，程序退出")
            sys.exit(0)

if __name__ == "__main__":
    main()