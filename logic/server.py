import os.path
import requests
import threading
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import const
import logging


class Default(tornado.web.RequestHandler):
    def get(self):
        self.render("404.html")


class Top(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")


def start_waker():
    def ping():
        requests.get(const.ROOT_URL)
        task = threading.Timer(const.PING_SPAN_SEC, ping)
        task.daemon = True
        task.start()

    task = threading.Timer(const.PING_SPAN_SEC, ping)
    task.daemon = True
    task.start()


def start(handlers, debug=False):
    handlers.append((r"/", Top))
    resouce_path = os.path.join(os.getcwd(), const.RESOURCE_DIR)
    template_path = os.path.join(os.getcwd(), const.TEMPLATE_DIR)
    app = tornado.web.Application(
        handlers=handlers,
        template_path=template_path,
        static_path=resouce_path,
        default_handler_class=Default,
        debug=debug,
    )
    server = tornado.httpserver.HTTPServer(app)
    server.listen(tornado.options.options.port)
    if not debug and const.ENABLE_PING:
        start_waker()
    logging.getLogger("tornado.access").disabled = True
    tornado.ioloop.IOLoop.instance().start()
