import time
import sys
from message_handler import MessageHandler


def main():
    print("欢迎使用消息处理系统！")

    try:
        # 创建一个消息处理器对象，假设我们用 2 个线程来处理消息
        handler = MessageHandler(num_threads=10)

        # 启动处理线程
        handler.start()

        print("消息处理系统已启动，按Ctrl+C停止。")

        # 在主线程中等待，直到用户手动终止程序
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n收到停止信号，正在停止线程...")
        handler.stop()
        print("消息处理系统已停止。")
        sys.exit(0)


if __name__ == "__main__":
    main()
