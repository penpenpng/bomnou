import requests
import threading


def start_pinger(url):
    def ping():
        requests.get(url)
        threading.Timer(15*60, ping).start()

    threading.Timer(15*60, ping).start()
